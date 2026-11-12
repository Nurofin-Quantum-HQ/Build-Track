/**
 * bugReport.test.js
 *
 * "Report a problem": validation, HMAC signing, support-email MIME, and (against a real in-memory MongoDB)
 * the HTTP routes: idempotency, per-user rate limit, delivery to a fake Chief of Staff, retry sweeper and
 * the CoS status callback that notifies the reporter.
 *
 * The database-backed part needs `mongodb-memory-server`, which is not a project dependency (it downloads a mongod
 * binary). When it cannot be resolved those tests are skipped and only the pure-function tests run.
 *   Run with: npm test tests/bugReport.test.js
 *   With DB tests: NODE_PATH=/path/to/node_modules-containing-mongodb-memory-server npm test tests/bugReport.test.js
 */

'use strict';

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.COS_INTEGRATION_SECRET = 'test-cos-secret';
process.env.BACKEND_URL = 'https://bt.example.test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const service = require('../services/bugReportService');
const { buildBugReportEmail, encodeHeaderValue, buildSubject, formatIst, escapeHtml } = require('../services/bugReportMime');

// A real 8x8 PNG, plus bytes that only look like one by name.
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGNgGAWjYBSMglEAAAQAAAGBSCz8AAAAAElFTkSuQmCC';
const uuid = () => crypto.randomUUID();
const goodBody = (extra = {}) => ({
  clientReportId: uuid(),
  source: 'web',
  description: '  Reports page keeps spinning  ',
  tryingTo: 'Open the monthly report',
  screen: { route: '/reports?token=secret#x', name: 'Reports' },
  breadcrumbs: [{ at: '2026-11-12T09:00:00Z', kind: 'screen', label: '/dashboard?x=1' }],
  screenshot: { mime: 'image/png', base64: PNG_B64 },
  device: { platform: 'web', userAgent: 'UA', viewport: '1440x900' },
  project: null,
  occurredAt: '2026-11-12T09:00:10Z',
  ...extra,
});

// ── validation ───────────────────────────────────────────────────────────────
describe('validateReport', () => {
  it('accepts a good body, trims text, strips query strings and decodes the screenshot', () => {
    const { value, error } = service.validateReport(goodBody());
    expect(error).toBeUndefined();
    expect(value.description).toBe('Reports page keeps spinning');
    expect(value.screen.route).toBe('/reports');
    expect(value.breadcrumbs[0].label).toBe('/dashboard');
    expect(value.screenshot.mime).toBe('image/png');
    expect(Buffer.isBuffer(value.screenshot.data)).toBe(true);
    expect(value.device.platform).toBe('web');
  });

  it.each([
    ['missing clientReportId', { clientReportId: undefined }],
    ['non-uuid clientReportId', { clientReportId: 'abc' }],
    ['bad source', { source: 'tv' }],
    ['missing description', { description: undefined }],
    ['blank description', { description: '   ' }],
    ['description over 2000', { description: 'a'.repeat(2001) }],
    ['tryingTo over 500', { tryingTo: 'a'.repeat(501) }],
    ['breadcrumbs not a list', { breadcrumbs: 'nope' }],
  ])('rejects %s', (_n, extra) => {
    const r = service.validateReport(goodBody(extra));
    expect(typeof r.error).toBe('string');
  });

  it('rejects screenshots with the wrong magic bytes, mismatched mime, bad base64 or >2 MB', () => {
    const fake = Buffer.from('this is not an image').toString('base64');
    expect(service.validateReport(goodBody({ screenshot: { mime: 'image/png', base64: fake } })).error).toMatch(/real PNG or JPEG/);
    expect(service.validateReport(goodBody({ screenshot: { mime: 'image/jpeg', base64: PNG_B64 } })).error).toMatch(/real PNG or JPEG/);
    expect(service.validateReport(goodBody({ screenshot: { mime: 'image/gif', base64: PNG_B64 } })).error).toMatch(/PNG or JPEG/);
    expect(service.validateReport(goodBody({ screenshot: { mime: 'image/png', base64: '!!!not base64!!!' } })).error).toBeDefined();
    const big = Buffer.concat([Buffer.from(PNG_B64, 'base64'), Buffer.alloc(2 * 1024 * 1024 + 10)]).toString('base64');
    expect(service.validateReport(goodBody({ screenshot: { mime: 'image/png', base64: big } })).error).toMatch(/too large/);
  });

  it('keeps only the latest 30 breadcrumbs, clips fields, drops bad kinds and scrubs tokens/queries', () => {
    const crumbs = Array.from({ length: 45 }, (_, i) => ({ at: '2026-11-12T09:00:00Z', kind: 'tap', label: `step ${i}` }));
    crumbs.push({ kind: 'weird', label: 'dropped' });
    crumbs.push({ kind: 'api_error', label: 'x'.repeat(500), detail: 'y'.repeat(500) });
    crumbs.push({ kind: 'error', label: 'GET https://api.example.test/p?token=abc', detail: 'Bearer abc.def.ghi' });
    crumbs.push({ kind: 'error', label: 'jwt eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyJ9.sig12345 leaked' });
    const { value } = service.validateReport(goodBody({ breadcrumbs: crumbs }));
    expect(value.breadcrumbs).toHaveLength(30);
    expect(value.breadcrumbs.some((c) => c.label === 'dropped')).toBe(false);
    const long = value.breadcrumbs.find((c) => c.label.startsWith('xxx'));
    expect(long.label).toHaveLength(120);
    expect(long.detail).toHaveLength(200);
    const flat = JSON.stringify(value.breadcrumbs);
    expect(flat).not.toMatch(/token=abc/);
    expect(flat).not.toMatch(/eyJhbGci/);
    expect(flat).not.toMatch(/abc\.def\.ghi/);
  });

  it('defaults the platform to web for web reports and ignores an invalid one', () => {
    expect(service.validateReport(goodBody({ device: { platform: 'toaster' } })).value.device.platform).toBe('web');
    expect(service.validateReport(goodBody({ source: 'mobile', device: { platform: 'Android' } })).value.device.platform).toBe('android');
  });
});

// ── HMAC ─────────────────────────────────────────────────────────────────────
describe('HMAC signing', () => {
  const secret = 'shh';
  const raw = Buffer.from('{"a":1}');
  const ts = () => String(Math.floor(Date.now() / 1000));

  it('matches HMAC-SHA256 over "<timestamp>.<raw body>"', () => {
    const t = '1700000000';
    const expected = crypto.createHmac('sha256', secret).update(`${t}.{"a":1}`).digest('hex');
    expect(service.signBody(secret, t, raw)).toBe(expected);
  });

  it('accepts a good signature', () => {
    const t = ts();
    expect(service.verifySignature({ secret, timestamp: t, signature: service.signBody(secret, t, raw), rawBody: raw }).ok).toBe(true);
  });

  it('rejects a tampered body, wrong secret, garbage and missing signature', () => {
    const t = ts();
    const sig = service.signBody(secret, t, raw);
    expect(service.verifySignature({ secret, timestamp: t, signature: sig, rawBody: Buffer.from('{"a":2}') })).toMatchObject({ ok: false, status: 401 });
    expect(service.verifySignature({ secret: 'other', timestamp: t, signature: sig, rawBody: raw })).toMatchObject({ ok: false, status: 401 });
    expect(service.verifySignature({ secret, timestamp: t, signature: 'zz', rawBody: raw })).toMatchObject({ ok: false, status: 401 });
    expect(service.verifySignature({ secret, timestamp: t, signature: sig.slice(0, 60), rawBody: raw })).toMatchObject({ ok: false, status: 401 });
    expect(service.verifySignature({ secret, timestamp: undefined, signature: undefined, rawBody: raw })).toMatchObject({ ok: false, status: 401 });
    expect(service.verifySignature({ secret, timestamp: t, signature: sig, rawBody: undefined })).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects stale and future timestamps even with a valid signature', () => {
    const now = Date.now();
    const old = String(Math.floor(now / 1000) - 301);
    const future = String(Math.floor(now / 1000) + 301);
    expect(service.verifySignature({ secret, timestamp: old, signature: service.signBody(secret, old, raw), rawBody: raw, now })).toMatchObject({ ok: false, status: 401 });
    expect(service.verifySignature({ secret, timestamp: future, signature: service.signBody(secret, future, raw), rawBody: raw, now })).toMatchObject({ ok: false, status: 401 });
    const edge = String(Math.floor(now / 1000) - 299);
    expect(service.verifySignature({ secret, timestamp: edge, signature: service.signBody(secret, edge, raw), rawBody: raw, now }).ok).toBe(true);
  });

  it('answers 503 when no secret is configured', () => {
    expect(service.verifySignature({ secret: '', timestamp: ts(), signature: 'a', rawBody: raw })).toMatchObject({ ok: false, status: 503 });
  });
});

// ── MIME builder ─────────────────────────────────────────────────────────────
describe('buildBugReportEmail', () => {
  const report = {
    code: 'BR-1042',
    description: 'Page <script>alert(1)</script> & "broken"',
    tryingTo: "I <b>wanted</b> to save",
    screen: { route: '/reports', name: 'Reports' },
    reporter: { name: 'Asha Rao', email: 'asha@example.test', phone: '9876543210', role: 'Admin', companyName: 'Rao Builders' },
    device: { platform: 'web', userAgent: 'Mozilla/5.0', viewport: '1440x900', appVersion: '1.2.3' },
    project: { id: 'p1', name: 'Tower <A>' },
    breadcrumbs: [{ at: '2026-11-12T09:00:00Z', kind: 'api_error', label: 'GET /api/x', detail: '500 <oops>' }],
    occurredAt: new Date('2026-11-12T09:00:00Z'),
    receivedAt: new Date('2026-11-12T09:01:00Z'),
    cos: { status: 'sent', issueId: 12 },
  };
  const png = Buffer.from(PNG_B64, 'base64');
  const decodeParts = (raw) => {
    const s = raw.toString('utf8');
    const out = { text: '', html: '' };
    const re = /Content-Type: text\/(plain|html); charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+?)\r\n--/g;
    let m;
    while ((m = re.exec(s))) out[m[1] === 'plain' ? 'text' : 'html'] = Buffer.from(m[2].replace(/\s+/g, ''), 'base64').toString('utf8');
    return out;
  };

  it('builds multipart/mixed with text + html alternatives and the screenshot attached', () => {
    const { raw, subject, to } = buildBugReportEmail(report, { from: 'no-reply@nurofin.test', to: 'support@nurofin.test', screenshot: { mime: 'image/png', data: png }, boundary: 'fixed' });
    const s = raw.toString('utf8');
    expect(to).toEqual(['support@nurofin.test']);
    expect(subject).toBe('[Build-Track] BR-1042 · Asha Rao (Rao Builders) reported a problem on Reports');
    expect(s).toMatch(/^From: no-reply@nurofin\.test\r\nTo: support@nurofin\.test\r\nSubject: =\?UTF-8\?B\?/);
    expect(s).toContain('Content-Type: multipart/mixed; boundary="mix_fixed"');
    expect(s).toContain('Content-Type: multipart/alternative; boundary="alt_fixed"');
    expect(s).toContain('Content-Disposition: attachment; filename="BR-1042-screenshot.png"');
    // attachment bytes round-trip
    const att = /filename="BR-1042-screenshot.png"\r\n\r\n([A-Za-z0-9+/=\r\n]+)\r\n--mix_fixed--/.exec(s);
    expect(Buffer.from(att[1].replace(/\s+/g, ''), 'base64').equals(png)).toBe(true);
    // every line of the encoded body respects the 76 char limit
    expect(s.split('\r\n').every((l) => l.length <= 998)).toBe(true);
    const { text, html } = decodeParts(raw);
    expect(text).toContain('This was raised by Asha Rao in Build-Track. Please rectify.');
    expect(text).toContain('12 Nov 2026, 14:31:00 IST'); // 09:01 UTC
    expect(text).toContain('Sent to Chief of Staff as issue #12');
    expect(html).toContain('This was raised by <strong>Asha Rao</strong>');
  });

  it('HTML-escapes every piece of user text', () => {
    const { raw } = buildBugReportEmail(report, { from: 'a@b.test', to: 'c@d.test', boundary: 'x' });
    const { html } = decodeParts(raw);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>wanted</b>');
    expect(html).not.toContain('Tower <A>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;broken&quot;');
    expect(html).toContain('I &lt;b&gt;wanted&lt;/b&gt; to save');
    expect(html).toContain('500 &lt;oops&gt;');
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('without a screenshot it is a plain multipart/alternative', () => {
    const { raw } = buildBugReportEmail(report, { from: 'a@b.test', to: 'c@d.test', boundary: 'x' });
    const s = raw.toString('utf8');
    expect(s).toContain('Content-Type: multipart/alternative; boundary="alt_x"');
    expect(s).not.toContain('multipart/mixed');
    expect(s).not.toContain('Content-Disposition: attachment');
  });

  it('cannot be header-injected through the subject, name, company or screen', () => {
    const evil = {
      ...report,
      reporter: { ...report.reporter, name: 'Eve\r\nBcc: attacker@evil.test', companyName: 'Co\nX-Evil: 1' },
      screen: { route: '/', name: 'Home\r\n\r\n<html>' },
    };
    const { raw, subject } = buildBugReportEmail(evil, { from: 'a@b.test', to: 'c@d.test', boundary: 'x' });
    expect(subject).not.toMatch(/[\r\n]/);
    const head = raw.toString('utf8').split('\r\n\r\n')[0];
    expect(head).not.toMatch(/^Bcc:/im);
    expect(head).not.toMatch(/^X-Evil:/im);
    // whole header block has only the expected header names
    const names = head.split('\r\n').filter((l) => !/^\s/.test(l)).map((l) => l.split(':')[0]);
    expect(names).toEqual(['From', 'To', 'Subject', 'Date', 'MIME-Version', 'X-Mailer', 'Content-Type']);
    // the visible subject still carries the (flattened) words
    expect(subject).toContain('Eve Bcc: attacker@evil.test');
  });

  it('encodes non-ASCII subjects as RFC 2047 words of at most 75 chars and folds them', () => {
    const enc = encodeHeaderValue('[Build-Track] BR-1 · குமரன் ' + 'x'.repeat(100) + ' 😀');
    const words = enc.split('\r\n ');
    expect(words.length).toBeGreaterThan(1);
    for (const w of words) {
      expect(w).toMatch(/^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);
      expect(w.length).toBeLessThanOrEqual(75);
    }
    const decoded = words.map((w) => Buffer.from(w.slice(10, -2), 'base64').toString('utf8')).join('');
    expect(decoded).toContain('குமரன்');
    expect(decoded.endsWith('😀')).toBe(true);
    expect(encodeHeaderValue('plain ascii')).toBe('plain ascii');
  });

  it('formats times in IST and tolerates junk', () => {
    expect(formatIst('2026-11-12T18:29:59Z')).toBe('12 Nov 2026, 23:59:59 IST');
    expect(formatIst('2026-11-12T18:30:00Z')).toBe('13 Nov 2026, 00:00:00 IST');
    expect(formatIst(null)).toBe('unknown');
    expect(formatIst('nope')).toBe('unknown');
  });

  it('refuses to build without valid addresses', () => {
    expect(() => buildBugReportEmail(report, { from: 'not-an-address', to: 'c@d.test' })).toThrow();
    expect(buildBugReportEmail(report, { from: 'a@b.test', to: 'one@x.test, two@y.test' }).to).toEqual(['one@x.test', 'two@y.test']);
    expect(buildSubject({ code: 'BR-1', reporter: {}, screen: {} })).toBe('[Build-Track] BR-1 · A user reported a problem on the app');
  });
});

// ── database-backed: routes, delivery, sweeper, callback ─────────────────────
let MongoMemoryServer;
try {
  ({ MongoMemoryServer } = require('mongodb-memory-server'));
} catch (_) {
  MongoMemoryServer = null;
}
const dbDescribe = MongoMemoryServer ? describe : describe.skip;

dbDescribe('bug report routes and delivery (in-memory MongoDB)', () => {
  jest.setTimeout(120000);
  const mongoose = require('mongoose');
  const jwt = require('jsonwebtoken');
  const express = require('express');
  let mongod;
  let server;
  let base;
  let cosServer;
  let cosUrl;
  let cosBehaviour = 'ok'; // ok | fail
  let cosCalls = [];
  let dryDir;
  let BugReport;
  let BugReportScreenshot;
  let User;
  let Notification;

  const makeUser = async (name, extra = {}) => {
    const u = await User.create({ name, email: `${name.toLowerCase().replace(/\W/g, '')}-${uuid().slice(0, 6)}@example.test`, password: 'secret12', phone: '9999999999', companyName: 'Acme Builders', role: 'Admin', ...extra });
    const token = jwt.sign({ id: u._id, tokenVersion: 0 }, process.env.JWT_SECRET);
    return { user: u, token };
  };
  const api = (token, method, p, body) =>
    fetch(`${base}${p}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const waitFor = async (fn, ms = 5000) => {
    const end = Date.now() + ms;
    for (;;) {
      const v = await fn();
      if (v) return v;
      if (Date.now() > end) throw new Error('waitFor timed out');
      await new Promise((r) => setTimeout(r, 25));
    }
  };
  const signedCallback = (payload, { secret = process.env.COS_INTEGRATION_SECRET, offset = 0 } = {}) => {
    const raw = JSON.stringify(payload);
    const ts = String(Math.floor(Date.now() / 1000) + offset);
    return fetch(`${base}/api/bug-reports/cos-callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-BT-Timestamp': ts, 'X-BT-Signature': service.signBody(secret, ts, Buffer.from(raw)) },
      body: raw,
    });
  };

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri('bugreport_test'));
    User = require('../models/User');
    Notification = require('../models/Notification');
    BugReport = require('../models/BugReport');
    BugReportScreenshot = require('../models/BugReportScreenshot');
    await BugReport.init();
    await BugReportScreenshot.init();

    // fake Chief of Staff
    cosServer = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const raw = Buffer.concat(chunks);
        const check = service.verifySignature({ secret: process.env.COS_INTEGRATION_SECRET, timestamp: req.headers['x-bt-timestamp'], signature: req.headers['x-bt-signature'], rawBody: raw });
        cosCalls.push({ url: req.url, ok: check.ok, body: check.ok ? JSON.parse(raw.toString()) : null });
        if (!check.ok) { res.writeHead(401); return res.end('{}'); }
        if (cosBehaviour === 'fail') { res.writeHead(500, { 'Content-Type': 'application/json' }); return res.end('{"success":false,"message":"boom"}'); }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: { issue_id: 500 + cosCalls.length, duplicate: false } }));
      });
    });
    await new Promise((r) => cosServer.listen(0, '127.0.0.1', r));
    cosUrl = `http://127.0.0.1:${cosServer.address().port}`;
    process.env.COS_API_URL = cosUrl;

    dryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'br-eml-'));
    process.env.BUG_REPORT_EMAIL_DRYRUN_DIR = dryDir;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.SES_FROM_EMAIL;

    const app = express();
    app.use(express.json({ limit: '50mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
    app.use('/api/bug-reports', require('../routes/bugReportRoutes'));
    await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    service.stopSweeper();
    await new Promise((r) => server && server.close(r));
    await new Promise((r) => cosServer && cosServer.close(r));
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    if (dryDir) fs.rmSync(dryDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    cosBehaviour = 'ok';
    cosCalls = [];
  });

  it('requires a signed-in user', async () => {
    expect((await api(null, 'POST', '/api/bug-reports', goodBody())).status).toBe(401);
    expect((await api(null, 'GET', '/api/bug-reports/mine')).status).toBe(401);
  });

  it('creates a report: 201 with code, stores reporter facts and company, delivers to CoS and email', async () => {
    const { user, token } = await makeUser('Asha Rao');
    const body = goodBody();
    const res = await api(token, 'POST', '/api/bug-reports', body);
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.code).toMatch(/^BR-\d+$/);
    expect(json.data.status).toBe('received');

    const row = await waitFor(async () => {
      const r = await BugReport.findOne({ code: json.data.code });
      return r && r.cos.status === 'sent' && r.email.status === 'sent' ? r : null;
    });
    expect(row.reporter).toMatchObject({ id: String(user._id), name: 'Asha Rao', role: 'Admin', companyName: 'Acme Builders' });
    expect(row.screen.route).toBe('/reports');
    expect(row.description).toBe('Reports page keeps spinning');
    expect(row.cos.issueId).toBeGreaterThan(0);
    expect(row.hasScreenshot).toBe(true);
    // the screenshot is in its own collection, not on the report
    expect(row.toObject().screenshot).toBeUndefined();
    const shot = await BugReportScreenshot.findOne({ report: row._id });
    expect(shot.size).toBeGreaterThan(0);
    expect(shot.purgeAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);

    // CoS saw a correctly signed payload with the contract's shape
    expect(cosCalls).toHaveLength(1);
    const c = cosCalls[0];
    expect(c.url).toBe('/api/v1/integrations/build-track/issues');
    expect(c.ok).toBe(true);
    expect(c.body).toMatchObject({ external_id: json.data.code, client_report_id: body.clientReportId, source: 'web', description: 'Reports page keeps spinning', trying_to: 'Open the monthly report', callback_url: 'https://bt.example.test/api/bug-reports/cos-callback' });
    expect(c.body.reporter).toMatchObject({ name: 'Asha Rao', company: 'Acme Builders', role: 'Admin' });
    expect(c.body.screenshot.mime).toBe('image/png');
    expect(c.body.project).toBeNull();

    // dry-run email was written
    const eml = fs.readFileSync(path.join(dryDir, `${json.data.code}.eml`), 'utf8');
    expect(eml).toContain('attachment; filename="' + json.data.code + '-screenshot.png"');
    expect(eml).toMatch(/Subject: =\?UTF-8\?B\?/);
  });

  it('is idempotent per (user, clientReportId): same report back with 200, nothing delivered twice', async () => {
    const { token } = await makeUser('Idem Potent');
    const body = goodBody();
    const first = await (await api(token, 'POST', '/api/bug-reports', body)).json();
    await waitFor(async () => (await BugReport.findOne({ code: first.data.code })).cos.status === 'sent');
    const calls = cosCalls.length;
    const res = await api(token, 'POST', '/api/bug-reports', body);
    expect(res.status).toBe(200);
    expect((await res.json()).data.code).toBe(first.data.code);
    expect(await BugReport.countDocuments({ clientReportId: body.clientReportId })).toBe(1);
    await new Promise((r) => setTimeout(r, 150));
    expect(cosCalls.length).toBe(calls);
  });

  it('survives two simultaneous submissions of the same clientReportId', async () => {
    const { token } = await makeUser('Race Condition');
    const body = goodBody({ screenshot: null });
    const [a, b] = await Promise.all([api(token, 'POST', '/api/bug-reports', body), api(token, 'POST', '/api/bug-reports', body)]);
    const codes = [(await a.json()).data.code, (await b.json()).data.code];
    expect(codes[0]).toBe(codes[1]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(await BugReport.countDocuments({ clientReportId: body.clientReportId })).toBe(1);
  });

  it('the same clientReportId from a different user is a different report', async () => {
    const one = await makeUser('User One');
    const two = await makeUser('User Two');
    const body = goodBody({ screenshot: null });
    const r1 = await api(one.token, 'POST', '/api/bug-reports', body);
    const r2 = await api(two.token, 'POST', '/api/bug-reports', body);
    expect([r1.status, r2.status]).toEqual([201, 201]);
  });

  it('numbers reports with an atomic counter (no duplicates under concurrency)', async () => {
    const Counter = require('../models/Counter');
    const nums = await Promise.all(Array.from({ length: 25 }, () => Counter.nextSeq('test-seq', 1000)));
    expect(new Set(nums).size).toBe(25);
    expect(Math.min(...nums)).toBe(1001);
    expect(Math.max(...nums)).toBe(1025);
  });

  it('returns 400 with a human message for invalid input', async () => {
    const { token } = await makeUser('Val Idator');
    for (const extra of [{ description: '' }, { clientReportId: 'x' }, { screenshot: { mime: 'image/png', base64: Buffer.from('nope').toString('base64') } }]) {
      const res = await api(token, 'POST', '/api/bug-reports', goodBody(extra));
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message.length).toBeGreaterThan(5);
    }
  });

  it('limits a user to 10 reports per hour (429), without counting idempotent replays', async () => {
    const { token } = await makeUser('Rate Limited');
    const bodies = Array.from({ length: 10 }, () => goodBody({ screenshot: null }));
    for (const b of bodies) expect((await api(token, 'POST', '/api/bug-reports', b)).status).toBe(201);
    const over = await api(token, 'POST', '/api/bug-reports', goodBody({ screenshot: null }));
    expect(over.status).toBe(429);
    expect((await over.json()).success).toBe(false);
    // replaying an already-saved one still answers 200
    expect((await api(token, 'POST', '/api/bug-reports', bodies[0])).status).toBe(200);
    // another user is unaffected
    const other = await makeUser('Other Person');
    expect((await api(other.token, 'POST', '/api/bug-reports', goodBody({ screenshot: null }))).status).toBe(201);
  });

  it('GET /mine lists only my reports, newest first, with a clipped description', async () => {
    const mine = await makeUser('Mine Only');
    const other = await makeUser('Not Mine');
    await api(mine.token, 'POST', '/api/bug-reports', goodBody({ description: 'first', screenshot: null }));
    await api(mine.token, 'POST', '/api/bug-reports', goodBody({ description: 'x'.repeat(500), screenshot: null }));
    await api(other.token, 'POST', '/api/bug-reports', goodBody({ description: 'secret of someone else', screenshot: null }));
    const json = await (await api(mine.token, 'GET', '/api/bug-reports/mine')).json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].description).toHaveLength(160);
    expect(json.data[1].description).toBe('first');
    expect(JSON.stringify(json)).not.toMatch(/someone else/);
    expect(Object.keys(json.data[0]).sort()).toEqual(['code', 'createdAt', 'description', 'resolutionNote', 'resolvedAt', 'screenName', 'status']);
  });

  it('a sub-user inherits the account owner company name', async () => {
    const owner = await makeUser('Owner Boss', { companyName: 'Owner Co' });
    const staff = await makeUser('Site Staff', { companyName: '', role: 'Supervisor', createdBy: owner.user._id });
    const json = await (await api(staff.token, 'POST', '/api/bug-reports', goodBody({ screenshot: null }))).json();
    const row = await BugReport.findOne({ code: json.data.code });
    expect(row.reporter.companyName).toBe('Owner Co');
  });

  it('when CoS is down the report is still saved and emailed; the sweeper retries it later', async () => {
    const { token } = await makeUser('Cos Down');
    cosBehaviour = 'fail';
    const json = await (await api(token, 'POST', '/api/bug-reports', goodBody())).json();
    const failed = await waitFor(async () => {
      const r = await BugReport.findOne({ code: json.data.code });
      return r.cos.status === 'failed' && r.email.status === 'sent' ? r : null;
    });
    expect(failed.cos.attempts).toBe(1);
    expect(failed.cos.lastError).toMatch(/500/);
    // screenshot is kept while CoS has not received it
    expect((await BugReportScreenshot.findOne({ report: failed._id })).purgeAt).toBeNull();

    // too fresh: sweeper leaves it alone
    await service.runSweep();
    expect((await BugReport.findById(failed._id)).cos.attempts).toBe(1);

    cosBehaviour = 'ok';
    await BugReport.collection.updateOne({ _id: failed._id }, { $set: { updatedAt: new Date(Date.now() - 10 * 60 * 1000) } });
    const out = await service.runSweep();
    expect(out.retried).toBeGreaterThanOrEqual(1);
    const healed = await BugReport.findById(failed._id);
    expect(healed.cos.status).toBe('sent');
    expect(healed.cos.attempts).toBe(2);
    expect(healed.email.attempts).toBe(1); // email was not sent again
    expect((await BugReportScreenshot.findOne({ report: failed._id })).purgeAt).not.toBeNull();
  });

  it('stops retrying after 8 attempts', async () => {
    const { token } = await makeUser('Give Up');
    cosBehaviour = 'fail';
    const json = await (await api(token, 'POST', '/api/bug-reports', goodBody({ screenshot: null }))).json();
    const row = await waitFor(async () => {
      const r = await BugReport.findOne({ code: json.data.code });
      return r.cos.status === 'failed' ? r : null;
    });
    await BugReport.collection.updateOne({ _id: row._id }, { $set: { 'cos.attempts': 8, updatedAt: new Date(Date.now() - 3600 * 1000) } });
    const before = cosCalls.length;
    await service.runSweep();
    expect(cosCalls.length).toBe(before);
  });

  it('with CoS not configured: cos "disabled", email still sent; screenshot purge happens after 30 days', async () => {
    const { token } = await makeUser('No Cos');
    const saved = process.env.COS_API_URL;
    delete process.env.COS_API_URL;
    try {
      const json = await (await api(token, 'POST', '/api/bug-reports', goodBody())).json();
      const row = await waitFor(async () => {
        const r = await BugReport.findOne({ code: json.data.code });
        return r.email.status === 'sent' ? r : null;
      });
      expect(row.cos.status).toBe('disabled');
      const shot = await BugReportScreenshot.findOne({ report: row._id });
      expect(shot.purgeAt).not.toBeNull();
      const out = await service.runSweep(new Date(Date.now() + 31 * 24 * 3600 * 1000));
      expect(out.purged).toBeGreaterThanOrEqual(1);
      expect(await BugReportScreenshot.findOne({ report: row._id })).toBeNull();
    } finally {
      process.env.COS_API_URL = saved;
    }
  });

  describe('POST /cos-callback', () => {
    const newReport = async (name) => {
      const u = await makeUser(name);
      const json = await (await api(u.token, 'POST', '/api/bug-reports', goodBody({ screenshot: null }))).json();
      await waitFor(async () => (await BugReport.findOne({ code: json.data.code })).cos.status === 'sent');
      return { ...u, code: json.data.code };
    };

    it('rejects unsigned, wrongly signed and stale callbacks and changes nothing', async () => {
      const r = await newReport('Cb Reject');
      const payload = { external_id: r.code, status: 'resolved', note: 'done', updated_at: new Date().toISOString() };
      expect((await api(null, 'POST', '/api/bug-reports/cos-callback', payload)).status).toBe(401);
      expect((await signedCallback(payload, { secret: 'wrong' })).status).toBe(401);
      expect((await signedCallback(payload, { offset: -600 })).status).toBe(401);
      expect((await signedCallback(payload, { offset: 600 })).status).toBe(401);
      expect((await BugReport.findOne({ code: r.code })).status).toBe('received');
      expect(await Notification.countDocuments({ user: r.user._id })).toBe(0);
    });

    it('answers 503 when the integration secret is not configured', async () => {
      const saved = process.env.COS_INTEGRATION_SECRET;
      delete process.env.COS_INTEGRATION_SECRET;
      try {
        const res = await fetch(`${base}/api/bug-reports/cos-callback`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-BT-Timestamp': '1', 'X-BT-Signature': 'a' }, body: '{}' });
        expect(res.status).toBe(503);
      } finally {
        process.env.COS_INTEGRATION_SECRET = saved;
      }
    });

    it('maps statuses, records the note, and notifies the reporter exactly once when resolved', async () => {
      const r = await newReport('Cb Resolve');
      let res = await signedCallback({ external_id: r.code, issue_id: 42, status: 'in_progress', note: null, updated_at: '2026-11-12T10:00:00Z' });
      expect(res.status).toBe(200);
      let row = await BugReport.findOne({ code: r.code });
      expect(row.status).toBe('in_progress');
      expect(row.cos.issueId).toBe(42);
      expect(await Notification.countDocuments({ user: r.user._id })).toBe(0);

      const resolved = { external_id: r.code, issue_id: 42, status: 'resolved', note: 'Fixed in the 12 Nov release.', updated_at: '2026-11-12T11:00:00Z' };
      expect((await signedCallback(resolved)).status).toBe(200);
      row = await BugReport.findOne({ code: r.code });
      expect(row.status).toBe('resolved');
      expect(row.resolutionNote).toBe('Fixed in the 12 Nov release.');
      expect(row.resolvedAt.toISOString()).toBe('2026-11-12T11:00:00.000Z');

      // CoS retries the same callback: still one notification
      expect((await signedCallback(resolved)).status).toBe(200);
      const notes = await Notification.find({ user: r.user._id });
      expect(notes).toHaveLength(1);
      expect(notes[0].title).toBe(`Fixed: your problem report ${r.code}`);
      expect(notes[0].message).toBe('Thanks for telling us. Fixed in the 12 Nov release.');
      expect(notes[0].type).toBe('system');

      // the user sees it in /mine
      const mine = await (await api(r.token, 'GET', '/api/bug-reports/mine')).json();
      expect(mine.data[0]).toMatchObject({ code: r.code, status: 'resolved', resolutionNote: 'Fixed in the 12 Nov release.' });

      // reopened then resolved again → a fresh notification
      expect((await signedCallback({ external_id: r.code, status: 'open', updated_at: '2026-11-12T12:00:00Z' })).status).toBe(200);
      expect((await BugReport.findOne({ code: r.code })).status).toBe('received');
      expect((await signedCallback({ external_id: r.code, status: 'resolved', note: null, updated_at: '2026-11-12T13:00:00Z' })).status).toBe(200);
      expect(await Notification.countDocuments({ user: r.user._id })).toBe(2);
    });

    it('notifies when an unresolved report is closed, but not when a resolved one is closed', async () => {
      const a = await newReport('Cb Closed A');
      expect((await signedCallback({ external_id: a.code, status: 'closed', note: null, updated_at: '2026-11-12T10:00:00Z' })).status).toBe(200);
      const aNotes = await Notification.find({ user: a.user._id });
      expect(aNotes).toHaveLength(1);
      expect(aNotes[0].message).toBe('Thanks for telling us.');

      const b = await newReport('Cb Closed B');
      await signedCallback({ external_id: b.code, status: 'resolved', updated_at: '2026-11-12T10:00:00Z' });
      await signedCallback({ external_id: b.code, status: 'closed', updated_at: '2026-11-12T11:00:00Z' });
      expect(await Notification.countDocuments({ user: b.user._id })).toBe(1);
      expect((await BugReport.findOne({ code: b.code })).status).toBe('closed');
    });

    it('ignores an out-of-order (older) callback', async () => {
      const r = await newReport('Cb Stale');
      await signedCallback({ external_id: r.code, status: 'resolved', updated_at: '2026-11-12T12:00:00Z' });
      const res = await signedCallback({ external_id: r.code, status: 'in_progress', updated_at: '2026-11-12T11:00:00Z' });
      expect(res.status).toBe(200);
      expect((await BugReport.findOne({ code: r.code })).status).toBe('resolved');
    });

    it('404 for an unknown report, 400 for an unknown status', async () => {
      expect((await signedCallback({ external_id: 'BR-999999', status: 'resolved' })).status).toBe(404);
      const r = await newReport('Cb Bad');
      expect((await signedCallback({ external_id: r.code, status: 'exploded' })).status).toBe(400);
    });
  });
});
