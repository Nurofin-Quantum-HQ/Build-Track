// MANUAL end-to-end check for the ledger (not picked up by jest: name does not end in .test.js).
// Drops and reseeds the DB it points at, so only ever use a scratch mongod:
//   mongod --dbpath <scratch> --port 27071 --fork --logpath <scratch>/m.log
//   env -i PATH=$PATH HOME=$HOME MONGO_URI=mongodb://127.0.0.1:27071/bt_ledger JWT_SECRET=test \
//     CLOUDINARY_CLOUD_NAME=x CLOUDINARY_API_KEY=x CLOUDINARY_API_SECRET=x SKIP_STARTUP_CLEANUP=true \
//     NODE_PATH=<core>/backend/node_modules PORT=5051 node backend/server.js
//   NODE_PATH=<core>/backend/node_modules node backend/tests/ledger.e2e.manual.js
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const assert = require('assert');
const B = 'http://127.0.0.1:5051/api';
let pass = 0, fail = 0;
const t = (name, fn) => Promise.resolve().then(fn).then(() => { pass++; console.log('PASS', name); }, (e) => { fail++; console.log('FAIL', name, '\n   ', e.message); });
const oid = () => new mongoose.Types.ObjectId();
const tok = (u) => jwt.sign({ id: u._id, email: u.email, tokenVersion: 0 }, 'test');
const api = async (user, method, path, body) => {
  const r = await fetch(B + path, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok(user) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};
(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27071/bt_ledger');
  await mongoose.connection.dropDatabase();
  const db = mongoose.connection;
  const mk = (name, role, extra = {}) => ({ _id: oid(), name, email: name + '@t.io', role, permissions: [], isActive: true, tokenVersion: 0, password: 'xxxxxxxx', ...extra });
  const adminA = mk('adminA', 'Admin'), adminB = mk('adminB', 'Admin');
  const supA = mk('supA', 'Supervisor', { createdBy: adminA._id });
  const finA = mk('finA', 'Supervisor', { createdBy: adminA._id, permissions: ['view_finances'] });
  const finB = mk('finB', 'Supervisor', { createdBy: adminB._id, permissions: ['view_finances'] });
  await db.collection('users').insertMany([adminA, adminB, supA, finA, finB]);
  const P1 = oid(), P2 = oid(), PB = oid(), W1 = oid();
  await db.collection('projects').insertMany([
    { _id: P1, projectName: 'Tower One', createdBy: adminA._id }, { _id: P2, projectName: 'Villa Two', createdBy: adminA._id },
    { _id: PB, projectName: 'B Project', createdBy: adminB._id }]);
  await db.collection('workers').insertOne({ _id: W1, name: 'Ramesh Kumar', createdBy: adminA._id });
  const now = new Date();
  const tx = (o) => ({ _id: oid(), createdBy: adminA._id, category: '', notes: '', paymentStatus: 'Paid', approvalStatus: 'Approved', createdAt: now, updatedAt: now, ...o });
  const rows = [
    tx({ type: 'Income', amount: 100000, date: '2026-01-10', title: 'Client advance', project: P1 }),
    tx({ type: 'Income', amount: 50000, date: '2026-02-05T10:30:00.000Z', title: 'Bank LOAN tranche', project: P1 }),
    tx({ type: 'Income', amount: 25000, date: new Date('2026-02-20T00:00:00Z'), title: 'Stage 2 payment', project: P2 }),
    tx({ type: 'Expense', amount: 10000, date: '2026-02-10', title: 'Monthly', notes: 'Loan repayment to HDFC', project: P1 }),
    tx({ type: 'Expense', amount: 5000, date: '2026-03-01', title: 'May EMI', project: P2 }),
    tx({ type: 'Materials', amount: 20000, date: '2026-03-05', title: 'Cement', supplier: 'UltraTech', project: P1 }),
    tx({ type: 'Wages', amount: 8000, date: '2026-03-06', title: 'Mason', worker: W1, project: P1 }),
    tx({ type: 'Equipment', amount: 4000, date: '2026-03-07', title: 'JCB rental', project: P2 }),
    tx({ type: 'Materials', amount: 3000, date: '2026-03-08', title: 'Chemical waterproofing', project: P1 }),
    tx({ type: 'Expense', amount: 700, date: '2026-03-09', title: 'Tea', project: null }),
    tx({ type: 'Expense', amount: 600, date: '2026-03-10', title: 'Loan note', ledgerCategory: 'other', project: P1 }),
    // company B
    tx({ createdBy: adminB._id, type: 'Income', amount: 777777, date: '2026-02-01', title: 'Loan from B bank', project: PB }),
    tx({ createdBy: adminB._id, type: 'Expense', amount: 111, date: '2026-02-02', title: 'B EMI', project: PB }),
    tx({ createdBy: adminB._id, type: 'Expense', amount: 5, date: '2026-02-03', title: 'B tea', project: null }),
  ];
  await db.collection('transactions').insertMany(rows);
  const L = (u, qs = '') => api(u, 'GET', '/reports/ledger' + (qs ? '?' + qs : ''));
  const titles = (r) => r.body.rows.map((x) => x.title).sort();

  await t('403 for non-admin without view_finances', async () => { assert.equal((await L(supA)).status, 403); });
  await t('401 without token', async () => { const r = await fetch(B + '/reports/ledger'); assert.equal(r.status, 401); });
  await t('admin summary totals by hand (in 175000 / out 51300 / net 123700 / 11)', async () => {
    const r = await L(adminA); assert.equal(r.status, 200);
    assert.deepEqual(r.body.summary, { moneyIn: 175000, moneyOut: 51300, net: 123700, count: 11 });
    assert.equal(r.body.rows.length, 11); assert.equal(r.body.truncated, false);
  });
  await t('view_finances user sees same company totals', async () => {
    const r = await L(finA); assert.equal(r.status, 200); assert.equal(r.body.summary.net, 123700);
  });
  await t('cross-company isolation (B sees only B; A sees nothing of B)', async () => {
    const b = await L(finB); assert.deepEqual(b.body.summary, { moneyIn: 777777, moneyOut: 116, net: 777661, count: 3 });
    const a = await L(adminA); assert(!titles(a).some((x) => /^B /.test(x) || x.includes('from B')), JSON.stringify(titles(a)));
    const bAdmin = await L(adminB); assert.equal(bAdmin.body.summary.count, 3);
  });
  await t('A cannot request B project (403); invalid id 400', async () => {
    assert.equal((await L(adminA, 'projectId=' + PB)).status, 403);
    assert.equal((await L(finA, 'projectId=' + PB)).status, 403);
    assert.equal((await L(adminA, 'projectId=abc')).status, 400);
  });
  await t('projectId filter (P2: in 25000, out 9000)', async () => {
    const r = await L(adminA, 'projectId=' + P2); assert.deepEqual(r.body.summary, { moneyIn: 25000, moneyOut: 9000, net: 16000, count: 3 });
    const all = await L(adminA, 'projectId=all'); assert.equal(all.body.summary.count, 11);
  });
  await t('category assignment (rules + explicit + chemical not loan)', async () => {
    const r = await L(adminA); const c = Object.fromEntries(r.body.rows.map((x) => [x.title, x.category]));
    assert.deepEqual(c, { 'Client advance': 'client_payment', 'Bank LOAN tranche': 'loan_received', 'Stage 2 payment': 'client_payment',
      Monthly: 'loan_repayment', 'May EMI': 'loan_repayment', Cement: 'material', Mason: 'labour', 'JCB rental': 'equipment',
      'Chemical waterproofing': 'material', Tea: 'other', 'Loan note': 'other' });
  });
  await t('direction filter', async () => {
    const i = await L(adminA, 'direction=in'); assert.deepEqual(i.body.summary, { moneyIn: 175000, moneyOut: 0, net: 175000, count: 3 });
    const o = await L(adminA, 'direction=out'); assert.deepEqual(o.body.summary, { moneyIn: 0, moneyOut: 51300, net: -51300, count: 8 });
  });
  await t('category filter (loans: 50000 in, 15000 out)', async () => {
    const r = await L(adminA, 'category=loan_received,loan_repayment');
    assert.deepEqual(r.body.summary, { moneyIn: 50000, moneyOut: 15000, net: 35000, count: 3 });
    assert.equal((await L(adminA, 'category=bogus')).status, 400);
  });
  await t('date filter incl. ISO-string and Date-typed rows (Feb: 50000+25000 in, 10000 out)', async () => {
    const r = await L(adminA, 'from=2026-02-01&to=2026-02-28');
    assert.deepEqual(r.body.summary, { moneyIn: 75000, moneyOut: 10000, net: 65000, count: 3 });
    assert(r.body.rows.every((x) => /^2026-02-\d\d$/.test(x.date)), JSON.stringify(r.body.rows.map((x) => x.date)));
    const single = await L(adminA, 'from=2026-02-05&to=2026-02-05'); assert.equal(single.body.summary.count, 1); // the ISO-timestamp row
    const single2 = await L(adminA, 'from=2026-02-20&to=2026-02-20'); assert.equal(single2.body.summary.count, 1); // Date-typed row
    assert.equal((await L(adminA, 'from=2026-2-1')).status, 400);
  });
  await t('search q: title, notes, supplier, worker name, case-insens, regex-escaped', async () => {
    assert.deepEqual(titles(await L(adminA, 'q=hdfc')), ['Monthly']);
    assert.deepEqual(titles(await L(adminA, 'q=ultratech')), ['Cement']);
    assert.deepEqual(titles(await L(adminA, 'q=ramesh')), ['Mason']);
    assert.deepEqual(titles(await L(adminA, 'q=EMI')), ['Chemical waterproofing', 'May EMI']);
    const rx = await L(adminA, 'q=' + encodeURIComponent('.*')); assert.equal(rx.status, 200); assert.equal(rx.body.summary.count, 0);
    const par = await L(adminA, 'q=' + encodeURIComponent('(')); assert.equal(par.status, 200);
    assert(!titles(await L(adminA, 'q=loan from b')).length);
  });
  await t('groupBy category', async () => {
    const g = (await L(adminA, 'groupBy=category')).body.groups; const m = Object.fromEntries(g.map((x) => [x.key, x]));
    assert.equal(m.client_payment.moneyIn, 125000); assert.equal(m.loan_received.moneyIn, 50000);
    assert.equal(m.loan_repayment.moneyOut, 15000); assert.equal(m.material.moneyOut, 23000); assert.equal(m.labour.moneyOut, 8000);
    assert.equal(m.equipment.moneyOut, 4000); assert.equal(m.other.moneyOut, 1300); assert.equal(m.other.count, 2);
    assert.equal(m.loan_repayment.label, 'Loan repayment');
    assert.equal(g.reduce((s, x) => s + x.count, 0), 11);
  });
  await t('groupBy project', async () => {
    const g = (await L(adminA, 'groupBy=project')).body.groups; const by = Object.fromEntries(g.map((x) => [x.label, x]));
    assert.deepEqual([by['Tower One'].moneyIn, by['Tower One'].moneyOut], [150000, 41600]);
    assert.deepEqual([by['Villa Two'].moneyIn, by['Villa Two'].moneyOut], [25000, 9000]);
    assert.deepEqual([by['No project'].moneyIn, by['No project'].moneyOut], [0, 700]);
  });
  await t('groupBy month', async () => {
    const g = (await L(adminA, 'groupBy=month')).body.groups; const by = Object.fromEntries(g.map((x) => [x.key, x]));
    assert.deepEqual([by['2026-01'].moneyIn, by['2026-01'].moneyOut], [100000, 0]);
    assert.deepEqual([by['2026-02'].moneyIn, by['2026-02'].moneyOut], [75000, 10000]);
    assert.deepEqual([by['2026-03'].moneyIn, by['2026-03'].moneyOut], [0, 41300]);
    assert.equal(by['2026-03'].label, 'Mar 2026'); assert.equal(g[0].key, '2026-03');
  });
  await t('groupBy payee', async () => {
    const g = (await L(adminA, 'groupBy=payee')).body.groups; const by = Object.fromEntries(g.map((x) => [x.label, x]));
    assert.equal(by['UltraTech'].moneyOut, 20000); assert.equal(by['Ramesh Kumar'].moneyOut, 8000); assert.equal(by['Unspecified'].count, 9);
  });
  await t('groupBy none -> empty groups; bad groupBy 400', async () => {
    assert.deepEqual((await L(adminA, 'groupBy=none')).body.groups, []);
    assert.equal((await L(adminA, 'groupBy=x')).status, 400);
  });
  await t('rows newest first + runningBalance (cumulative from oldest)', async () => {
    const r = (await L(adminA)).body; const dates = r.rows.map((x) => x.date);
    assert.deepEqual(dates, [...dates].sort().reverse());
    assert.equal(r.rows[0].runningBalance, 123700);
    const asc = [...r.rows].reverse(); let bal = 0;
    asc.forEach((x) => { bal += x.direction === 'in' ? x.amount : -x.amount; assert.equal(x.runningBalance, bal, x.title); });
    assert.equal(bal, 123700);
    const mason = r.rows.find((x) => x.title === 'Mason'); assert.equal(mason.payee, 'Ramesh Kumar'); assert.equal(mason.projectName, 'Tower One');
    const cement = r.rows.find((x) => x.title === 'Cement'); assert.equal(cement.payee, 'UltraTech');
  });
  await t('filtered running balance anchors on filtered net', async () => {
    const r = (await L(adminA, 'direction=out')).body; assert.equal(r.rows[0].runningBalance, -51300); assert.equal(r.rows[r.rows.length - 1].runningBalance, -r.rows[r.rows.length - 1].amount);
  });

  // PATCH
  const target = rows[3]; // Monthly (loan repayment text)
  const before = await db.collection('transactions').findOne({ _id: target._id });
  await t('PATCH 403 without view_finances; unknown category 400', async () => {
    assert.equal((await api(supA, 'PATCH', `/transactions/${target._id}/ledger-category`, { ledgerCategory: 'other' })).status, 403);
    assert.equal((await api(adminA, 'PATCH', `/transactions/${target._id}/ledger-category`, { ledgerCategory: 'gold' })).status, 400);
    assert.deepEqual(await db.collection('transactions').findOne({ _id: target._id }), before);
  });
  await t('PATCH cross-company 403 (B admin / B finance -> A tx), no change', async () => {
    assert.equal((await api(adminB, 'PATCH', `/transactions/${target._id}/ledger-category`, { ledgerCategory: 'other' })).status, 403);
    assert.equal((await api(finB, 'PATCH', `/transactions/${target._id}/ledger-category`, { ledgerCategory: 'other' })).status, 403);
    assert.deepEqual(await db.collection('transactions').findOne({ _id: target._id }), before);
    assert.equal((await api(adminA, 'PATCH', `/transactions/${oid()}/ledger-category`, { ledgerCategory: 'other' })).status, 404);
  });
  await t('PATCH as view_finances changes ONLY ledgerCategory (full doc diff)', async () => {
    const r = await api(finA, 'PATCH', `/transactions/${target._id}/ledger-category`, { ledgerCategory: 'other', amount: 1, title: 'hack' });
    assert.equal(r.status, 200); assert.equal(r.body.ledgerCategory, 'other');
    const after = await db.collection('transactions').findOne({ _id: target._id });
    const { ledgerCategory, ...restAfter } = after; assert.equal(ledgerCategory, 'other');
    assert.deepEqual(restAfter, before);
  });
  await t('ledger now reflects the PATCH (Monthly -> other)', async () => {
    const r = await L(adminA, 'category=loan_repayment'); assert.deepEqual(r.body.summary, { moneyIn: 0, moneyOut: 5000, net: -5000, count: 1 });
  });
  await t('PATCH on project-less entry: admin ok', async () => {
    const tea = rows[9]; assert.equal((await api(adminA, 'PATCH', `/transactions/${tea._id}/ledger-category`, { ledgerCategory: 'other' })).status, 200);
    const bt = rows[13]; assert.equal((await api(adminA, 'PATCH', `/transactions/${bt._id}/ledger-category`, { ledgerCategory: 'other' })).status, 403);
  });
  await t('provisioning accepts view_finances permission; admin register list', async () => {
    const r = await api(adminA, 'PUT', `/auth/users/${supA._id}`, { permissions: ['view_finances'] });
    assert.equal(r.status, 200); assert(r.body.user.permissions.includes('view_finances'));
    assert.equal((await L(supA)).status, 200);
  });
  console.log(`\n${pass} passed, ${fail} failed`);
  await mongoose.disconnect(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
