// "Report a problem": validation, server-to-server signing, delivery (Chief of Staff + support email),
// retry sweeper and the status callback from Chief of Staff.
//
// Delivery is always asynchronous: the route saves the report, answers 201, then calls deliver().
// Both channels are independent: a CoS outage never stops the support email and vice versa.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const BugReport = require("../models/BugReport");
const BugReportScreenshot = require("../models/BugReportScreenshot");
const Counter = require("../models/Counter");
const { buildBugReportEmail } = require("./bugReportMime");

// ── limits ───────────────────────────────────────────────────────────────────
const LIMITS = {
  description: 2000,
  tryingTo: 500,
  breadcrumbs: 30,
  crumbLabel: 120,
  crumbDetail: 200,
  screenshotBytes: 2 * 1024 * 1024,
  route: 200,
  name: 100,
  deviceField: 200,
};
const REPORTS_PER_HOUR = 10;
const MAX_ATTEMPTS = 8;
const COS_TIMEOUT_MS = 15000;
const SKEW_SECONDS = 300;
const SCREENSHOT_KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const SWEEP_MIN_AGE_MS = 60 * 1000; // leave fresh rows to the immediate delivery that follows the 201

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const CRUMB_KINDS = ["screen", "tap", "api_error", "error"];
const PLATFORMS = ["android", "ios", "web"];

// ── validation ───────────────────────────────────────────────────────────────
const clip = (v, n) => (v == null ? "" : String(v)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").slice(0, n);
const clipLine = (v, n) => clip(v, n * 2).replace(/[\r\n\t]+/g, " ").trim().slice(0, n);

// Breadcrumbs must never carry query strings (they can hold tokens/ids) or bearer/JWT-looking text.
const JWT_RE = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g;
const stripQuery = (s) => (s.startsWith("/") ? s.split(/[?#]/)[0] : s.replace(/(https?:\/\/[^\s?#]+)[?#][^\s]*/g, "$1"));
const scrubBreadcrumbText = (v, n) => stripQuery(clipLine(v, n)).replace(JWT_RE, "[redacted]").replace(/Bearer\s+\S+/gi, "Bearer [redacted]");

function detectImageMime(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  return null;
}

/**
 * Validate and normalise a POST /api/bug-reports body.
 * @returns {{ error: string } | { value: object }}  value.screenshot is { mime, data: Buffer } | null
 */
function validateReport(body) {
  const b = body && typeof body === "object" && !Array.isArray(body) ? body : null;
  if (!b) return { error: "Request body must be a JSON object." };

  if (typeof b.clientReportId !== "string" || !UUID_RE.test(b.clientReportId)) {
    return { error: "clientReportId is required and must be a UUID." };
  }
  if (b.source !== "mobile" && b.source !== "web") return { error: "source must be 'mobile' or 'web'." };

  if (typeof b.description !== "string") return { error: "Please tell us what went wrong." };
  const description = b.description.trim();
  if (!description) return { error: "Please tell us what went wrong." };
  if (description.length > LIMITS.description) return { error: `Description is too long (max ${LIMITS.description} characters).` };

  let tryingTo = "";
  if (b.tryingTo != null && b.tryingTo !== "") {
    if (typeof b.tryingTo !== "string") return { error: "tryingTo must be text." };
    tryingTo = b.tryingTo.trim();
    if (tryingTo.length > LIMITS.tryingTo) return { error: `"What were you trying to do" is too long (max ${LIMITS.tryingTo} characters).` };
  }

  const screenIn = b.screen && typeof b.screen === "object" ? b.screen : {};
  const screen = {
    route: stripQuery(clipLine(screenIn.route, LIMITS.route)),
    name: clipLine(screenIn.name, LIMITS.name),
  };

  let crumbsIn = [];
  if (b.breadcrumbs != null) {
    if (!Array.isArray(b.breadcrumbs)) return { error: "breadcrumbs must be a list." };
    crumbsIn = b.breadcrumbs;
  }
  const breadcrumbs = [];
  for (const c of crumbsIn) {
    if (!c || typeof c !== "object" || !CRUMB_KINDS.includes(c.kind)) continue;
    const label = scrubBreadcrumbText(c.label, LIMITS.crumbLabel);
    if (!label) continue;
    const at = c.at ? new Date(c.at) : null;
    breadcrumbs.push({
      at: at && !isNaN(at.getTime()) ? at : null,
      kind: c.kind,
      label,
      detail: scrubBreadcrumbText(c.detail, LIMITS.crumbDetail),
    });
  }
  // keep the most recent 30
  const keptCrumbs = breadcrumbs.slice(-LIMITS.breadcrumbs);

  let screenshot = null;
  if (b.screenshot != null) {
    const s = b.screenshot;
    if (typeof s !== "object" || typeof s.base64 !== "string" || (s.mime !== "image/png" && s.mime !== "image/jpeg")) {
      return { error: "Screenshot must be a PNG or JPEG image." };
    }
    let b64 = s.base64.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
    // reject by size before decoding: 2 MB of bytes is ~2.8 MB of base64
    if (b64.length > Math.ceil((LIMITS.screenshotBytes * 4) / 3) + 8) return { error: "Screenshot is too large (max 2 MB)." };
    if (!b64 || !BASE64_RE.test(b64)) return { error: "Screenshot could not be read." };
    const data = Buffer.from(b64, "base64");
    if (data.length > LIMITS.screenshotBytes) return { error: "Screenshot is too large (max 2 MB)." };
    const detected = detectImageMime(data);
    if (!detected || detected !== s.mime) return { error: "Screenshot must be a real PNG or JPEG image." };
    screenshot = { mime: detected, data };
  }

  const dIn = b.device && typeof b.device === "object" ? b.device : {};
  const device = {};
  for (const k of ["platform", "osVersion", "model", "appVersion", "buildNumber", "locale", "userAgent", "viewport"]) {
    device[k] = clipLine(dIn[k], LIMITS.deviceField);
  }
  if (device.platform) device.platform = device.platform.toLowerCase();
  if (!PLATFORMS.includes(device.platform)) device.platform = b.source === "web" ? "web" : "";

  const pIn = b.project && typeof b.project === "object" ? b.project : null;
  const project = pIn ? { id: clipLine(pIn.id, 64), name: clipLine(pIn.name, LIMITS.name) } : { id: "", name: "" };

  let occurredAt = null;
  if (b.occurredAt) {
    const d = new Date(b.occurredAt);
    if (!isNaN(d.getTime())) occurredAt = d;
  }

  return {
    value: {
      clientReportId: b.clientReportId.toLowerCase(),
      source: b.source,
      description,
      tryingTo,
      screen,
      breadcrumbs: keptCrumbs,
      screenshot,
      device,
      project,
      occurredAt,
    },
  };
}

// ── HMAC signing (BT <-> CoS) ────────────────────────────────────────────────
function signBody(secret, timestamp, rawBody) {
  return crypto
    .createHmac("sha256", secret)
    .update(Buffer.concat([Buffer.from(`${timestamp}.`, "utf8"), Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8")]))
    .digest("hex");
}

/** @returns {{ ok: true } | { ok: false, status: number, message: string }} */
function verifySignature({ secret, timestamp, signature, rawBody, now = Date.now() }) {
  if (!secret) return { ok: false, status: 503, message: "Callback is not configured" };
  if (!timestamp || !signature || !rawBody) return { ok: false, status: 401, message: "Invalid signature" };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > SKEW_SECONDS) {
    return { ok: false, status: 401, message: "Invalid signature" };
  }
  const expected = Buffer.from(signBody(secret, String(timestamp).trim(), rawBody), "hex");
  const given = /^[0-9a-f]{64}$/i.test(String(signature).trim()) ? Buffer.from(String(signature).trim(), "hex") : null;
  if (!given || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return { ok: false, status: 401, message: "Invalid signature" };
  }
  return { ok: true };
}

// ── create ───────────────────────────────────────────────────────────────────
async function companyNameFor(user) {
  if (user.companyName) return user.companyName;
  // Sub-users inherit the account owner's company
  try {
    if (user.createdBy) {
      const User = require("../models/User");
      const owner = await User.findById(user.createdBy).select("companyName").lean();
      if (owner && owner.companyName) return owner.companyName;
    }
  } catch (_) {
    /* best effort */
  }
  return "";
}

/**
 * Save a report. Returns { status: 201|200|400|429, body }.
 * 200 = same clientReportId by the same user already saved (nothing is delivered again).
 */
async function createReport(user, rawBody, { userAgent = "", kickDelivery = true } = {}) {
  const v = validateReport(rawBody);
  if (v.error) return { status: 400, body: { success: false, message: v.error } };
  const input = v.value;

  const publicShape = (r, status) => ({
    status,
    body: { success: true, data: { code: r.code, status: r.status, createdAt: r.createdAt } },
  });

  const existing = await BugReport.findOne({ user: user._id, clientReportId: input.clientReportId });
  if (existing) return publicShape(existing, 200);

  const recent = await BugReport.countDocuments({ user: user._id, createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } });
  if (recent >= REPORTS_PER_HOUR) {
    return {
      status: 429,
      body: { success: false, message: "You've sent a lot of reports in the last hour. Please try again a little later." },
    };
  }

  const number = await Counter.nextSeq("bugReport", 1000);
  const company = await companyNameFor(user);
  let report;
  try {
    report = await BugReport.create({
      code: `BR-${number}`,
      number,
      clientReportId: input.clientReportId,
      source: input.source,
      user: user._id,
      description: input.description,
      tryingTo: input.tryingTo,
      screen: input.screen,
      breadcrumbs: input.breadcrumbs,
      device: input.device,
      project: input.project,
      reporter: {
        id: String(user._id),
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "",
        companyName: company,
      },
      requestUserAgent: clipLine(userAgent, 300),
      occurredAt: input.occurredAt,
      receivedAt: new Date(),
      hasScreenshot: !!input.screenshot,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      // a concurrent request with the same clientReportId won the race
      const winner = await BugReport.findOne({ user: user._id, clientReportId: input.clientReportId });
      if (winner) return publicShape(winner, 200);
    }
    throw err;
  }
  if (input.screenshot) {
    await BugReportScreenshot.create({
      report: report._id,
      mime: input.screenshot.mime,
      data: input.screenshot.data,
      size: input.screenshot.data.length,
    });
  }
  if (kickDelivery) setImmediate(() => deliver(report._id).catch((e) => console.error("[BugReport] delivery crashed:", e.message)));
  return publicShape(report, 201);
}

async function listMine(userId) {
  const rows = await BugReport.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("code description status screen.name createdAt resolvedAt resolutionNote")
    .lean();
  return rows.map((r) => ({
    code: r.code,
    description: String(r.description || "").slice(0, 160),
    status: r.status,
    screenName: (r.screen && r.screen.name) || "",
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt || null,
    resolutionNote: r.resolutionNote || "",
  }));
}

// ── delivery: Chief of Staff ─────────────────────────────────────────────────
const cosConfig = () => ({
  url: String(process.env.COS_API_URL || "").replace(/\/+$/, ""),
  secret: process.env.COS_INTEGRATION_SECRET || "",
});
// No BACKEND_URL → no callback (CoS treats it as optional). A bare path would make CoS reject the whole report.
const callbackUrl = () => {
  const base = String(process.env.BACKEND_URL || "").trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(base) ? `${base}/api/bug-reports/cos-callback` : null;
};
const errText = (e) => String((e && e.message) || e).slice(0, 300);
const iso = (d) => (d ? new Date(d).toISOString() : null);

function buildCosPayload(report, screenshot) {
  const r = report.reporter || {};
  return {
    external_id: report.code,
    client_report_id: report.clientReportId,
    source: report.source,
    description: report.description,
    trying_to: report.tryingTo || null,
    screen: { route: report.screen.route, name: report.screen.name },
    breadcrumbs: (report.breadcrumbs || []).map((c) => ({ at: iso(c.at), kind: c.kind, label: c.label, detail: c.detail || "" })),
    device: { ...(report.device && report.device.toObject ? report.device.toObject() : report.device) },
    reporter: { id: r.id, name: r.name, email: r.email, phone: r.phone, role: r.role, company: r.companyName },
    project: report.project && (report.project.id || report.project.name) ? { id: report.project.id, name: report.project.name } : null,
    occurred_at: iso(report.occurredAt),
    received_at: iso(report.receivedAt),
    screenshot: screenshot ? { mime: screenshot.mime, base64: Buffer.from(screenshot.data).toString("base64") } : null,
    callback_url: callbackUrl(),
  };
}

async function sendToCos(report, screenshot) {
  const { url, secret } = cosConfig();
  if (!url || !secret) {
    await BugReport.updateOne({ _id: report._id }, { $set: { "cos.status": "disabled" } });
    return;
  }
  const raw = Buffer.from(JSON.stringify(buildCosPayload(report, screenshot)), "utf8");
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    const res = await fetch(`${url}/api/v1/integrations/build-track/issues`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BT-Timestamp": timestamp,
        "X-BT-Signature": signBody(secret, timestamp, raw),
      },
      body: raw,
      signal: AbortSignal.timeout(COS_TIMEOUT_MS),
    });
    let json = null;
    try {
      json = await res.json();
    } catch (_) {
      /* non-JSON body */
    }
    if (!res.ok || !json || json.success !== true) {
      throw new Error(`CoS responded ${res.status}${json && json.message ? `: ${json.message}` : ""}`);
    }
    await BugReport.updateOne(
      { _id: report._id },
      {
        $set: {
          "cos.status": "sent",
          "cos.issueId": json.data && json.data.issue_id != null ? Number(json.data.issue_id) : null,
          "cos.lastError": "",
          "cos.sentAt": new Date(),
        },
        $inc: { "cos.attempts": 1 },
      }
    );
  } catch (err) {
    await BugReport.updateOne(
      { _id: report._id },
      { $set: { "cos.status": "failed", "cos.lastError": errText(err) }, $inc: { "cos.attempts": 1 } }
    );
    console.warn(`[BugReport] ${report.code} → CoS failed (${errText(err)})`);
  }
}

// ── delivery: support email ──────────────────────────────────────────────────
const sesConfigured = () => !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.SES_FROM_EMAIL);

async function sendEmail(report, screenshot) {
  const to = process.env.BUG_REPORT_EMAIL || "support@nurofin.com";
  const dryDir = process.env.BUG_REPORT_EMAIL_DRYRUN_DIR;
  const fresh = await BugReport.findById(report._id); // pick up the CoS result from the step before
  const plain = fresh.toObject();
  const { raw } = buildBugReportEmail(plain, {
    from: process.env.SES_FROM_EMAIL || "noreply@localhost",
    to,
    screenshot: screenshot ? { mime: screenshot.mime, data: screenshot.data } : null,
  });

  try {
    if (!sesConfigured()) {
      if (dryDir) {
        fs.mkdirSync(dryDir, { recursive: true });
        const file = path.join(dryDir, `${report.code}.eml`);
        fs.writeFileSync(file, raw);
        await BugReport.updateOne(
          { _id: report._id },
          { $set: { "email.status": "sent", "email.messageId": `dryrun:${path.basename(file)}`, "email.lastError": "", "email.sentAt": new Date() }, $inc: { "email.attempts": 1 } }
        );
        return;
      }
      console.warn(`[BugReport] SES not configured — support email for ${report.code} not sent.`);
      await BugReport.updateOne({ _id: report._id }, { $set: { "email.status": "disabled" } });
      return;
    }
    const { SESClient, SendRawEmailCommand } = require("@aws-sdk/client-ses");
    const ses = new SESClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
    });
    const out = await ses.send(new SendRawEmailCommand({ RawMessage: { Data: raw } }));
    await BugReport.updateOne(
      { _id: report._id },
      { $set: { "email.status": "sent", "email.messageId": (out && out.MessageId) || "", "email.lastError": "", "email.sentAt": new Date() }, $inc: { "email.attempts": 1 } }
    );
  } catch (err) {
    await BugReport.updateOne(
      { _id: report._id },
      { $set: { "email.status": "failed", "email.lastError": errText(err) }, $inc: { "email.attempts": 1 } }
    );
    console.warn(`[BugReport] ${report.code} → email failed (${errText(err)})`);
  }
}

const inFlight = new Set();

/** Deliver one report on whichever channels still need it. Safe to call repeatedly. */
async function deliver(reportId) {
  const key = String(reportId);
  if (inFlight.has(key)) return;
  inFlight.add(key);
  try {
    const report = await BugReport.findById(reportId);
    if (!report) return;
    const needsCos = ["pending", "failed"].includes(report.cos.status) && report.cos.attempts < MAX_ATTEMPTS;
    const needsEmail = ["pending", "failed"].includes(report.email.status) && report.email.attempts < MAX_ATTEMPTS;
    if (!needsCos && !needsEmail) return;
    const screenshot = report.hasScreenshot ? await BugReportScreenshot.findOne({ report: report._id }) : null;
    if (needsCos) await sendToCos(report, screenshot);
    if (needsEmail) await sendEmail(report, screenshot);

    // Both channels done → schedule the screenshot for deletion in 30 days
    const after = await BugReport.findById(reportId).select("cos.status email.status").lean();
    const done = (s) => s === "sent" || s === "disabled";
    if (after && done(after.cos.status) && done(after.email.status) && (after.cos.status === "sent" || after.email.status === "sent")) {
      await BugReportScreenshot.updateOne({ report: report._id, purgeAt: null }, { $set: { purgeAt: new Date(Date.now() + SCREENSHOT_KEEP_MS) } });
    }
  } finally {
    inFlight.delete(key);
  }
}

// ── sweeper ──────────────────────────────────────────────────────────────────
async function runSweep(now = new Date()) {
  let retried = 0;
  const staleBefore = new Date(now.getTime() - SWEEP_MIN_AGE_MS);
  // A channel that was "disabled" only because it was not configured at the time comes back to life once it is.
  if (cosConfig().url && cosConfig().secret) await BugReport.updateMany({ "cos.status": "disabled" }, { $set: { "cos.status": "pending" } });
  if (sesConfigured() || process.env.BUG_REPORT_EMAIL_DRYRUN_DIR) await BugReport.updateMany({ "email.status": "disabled" }, { $set: { "email.status": "pending" } });

  const due = await BugReport.find({
    updatedAt: { $lt: staleBefore },
    $or: [
      { "cos.status": { $in: ["pending", "failed"] }, "cos.attempts": { $lt: MAX_ATTEMPTS } },
      { "email.status": { $in: ["pending", "failed"] }, "email.attempts": { $lt: MAX_ATTEMPTS } },
    ],
  })
    .sort({ updatedAt: 1 })
    .limit(20)
    .select("_id")
    .lean();
  for (const r of due) {
    await deliver(r._id).catch((e) => console.error("[BugReport] sweep delivery crashed:", e.message));
    retried++;
  }
  const purged = await BugReportScreenshot.deleteMany({ purgeAt: { $ne: null, $lte: now } });
  return { retried, purged: purged.deletedCount || 0 };
}

let sweeperTimer = null;
function startSweeper() {
  if (sweeperTimer || process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID) return null;
  sweeperTimer = setInterval(() => {
    if (mongoose.connection.readyState !== 1) return;
    runSweep().catch((e) => console.error("[BugReport] sweep failed:", e.message));
  }, SWEEP_INTERVAL_MS);
  sweeperTimer.unref();
  return sweeperTimer;
}
function stopSweeper() {
  if (sweeperTimer) clearInterval(sweeperTimer);
  sweeperTimer = null;
}

// ── CoS status callback ──────────────────────────────────────────────────────
const STATUS_MAP = { open: "received", in_progress: "in_progress", resolved: "resolved", closed: "closed" };

/** Apply a verified callback payload. Returns { status, body }. */
async function applyCosCallback(payload) {
  const p = payload && typeof payload === "object" ? payload : {};
  const code = typeof p.external_id === "string" ? p.external_id : "";
  const mapped = STATUS_MAP[p.status];
  if (!code || !mapped) return { status: 400, body: { success: false, message: "external_id and a valid status are required" } };

  const report = await BugReport.findOne({ code });
  if (!report) return { status: 404, body: { success: false, message: "Unknown report" } };

  const updatedAt = p.updated_at ? new Date(p.updated_at) : null;
  const validTime = updatedAt && !isNaN(updatedAt.getTime()) ? updatedAt : null;
  // ignore a callback that arrives after a newer one (retries can reorder)
  if (validTime && report.cos.lastCallbackAt && validTime < report.cos.lastCallbackAt) {
    return { status: 200, body: { success: true, data: { code, status: report.status, ignored: "stale" } } };
  }

  const note = p.note == null ? null : String(p.note).slice(0, 1000);
  const $set = { status: mapped, "cos.lastCallbackAt": validTime || new Date() };
  if (p.issue_id != null && Number.isFinite(Number(p.issue_id))) $set["cos.issueId"] = Number(p.issue_id);
  if (note !== null) $set.resolutionNote = note;
  if (mapped === "resolved" || mapped === "closed") {
    if (!report.resolvedAt) $set.resolvedAt = validTime || new Date();
  } else {
    // reopened: forget the resolution so a later fix notifies again
    $set.resolvedAt = null;
    $set.resolvedNotifiedAt = null;
  }
  await BugReport.updateOne({ _id: report._id }, { $set });

  // "Fixed" notification: once per resolution, when it becomes resolved (or is closed without having been resolved)
  const finishing = mapped === "resolved" || (mapped === "closed" && report.status !== "resolved");
  if (finishing) {
    const claimed = await BugReport.findOneAndUpdate(
      { _id: report._id, resolvedNotifiedAt: null },
      { $set: { resolvedNotifiedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (claimed) {
      const NotificationService = require("./NotificationService");
      const finalNote = note !== null ? note : claimed.resolutionNote;
      await NotificationService.send(report.user, {
        title: `Fixed: your problem report ${code}`,
        message: `Thanks for telling us.${finalNote ? ` ${finalNote}` : ""}`,
        type: "system",
        priority: "medium",
        data: { kind: "bug_report_resolved", code },
        relatedId: report._id,
        relatedModel: "BugReport",
      });
    }
  }
  return { status: 200, body: { success: true, data: { code, status: mapped } } };
}

module.exports = {
  LIMITS,
  REPORTS_PER_HOUR,
  MAX_ATTEMPTS,
  validateReport,
  signBody,
  verifySignature,
  createReport,
  listMine,
  buildCosPayload,
  deliver,
  runSweep,
  startSweeper,
  stopSweeper,
  applyCosCallback,
  buildBugReportEmail,
};
