'use strict';

/**
 * Ledger tests. There is no Mongo in the test environment, so:
 *  - rule logic and balance maths are tested directly,
 *  - the HTTP layer (permission, scope, validation, response shaping) is
 *    tested with the models mocked,
 *  - the aggregation pipelines themselves are only checked for shape here and
 *    must be exercised against a real mongod (see scripts note in the PR).
 */

const http = require('http');
const express = require('express');
const mongoose = require('mongoose');

const {
  ledgerCategoryFor, ledgerCategoryByRules, directionFor, withRunningBalance,
  buildBaseStages, escapeRegex, LEDGER_CATEGORIES,
} = require('../services/ledger');

describe('ledgerCategoryFor', () => {
  const c = (o) => ledgerCategoryFor({ type: 'Expense', ...o });
  test('explicit ledgerCategory always wins', () => {
    expect(c({ ledgerCategory: 'other', title: 'Loan repayment' })).toBe('other');
    expect(ledgerCategoryFor({ type: 'Income', ledgerCategory: 'loan_received', title: 'x' })).toBe('loan_received');
  });
  test('income', () => {
    expect(ledgerCategoryFor({ type: 'Income', title: 'Bank loan tranche 1' })).toBe('loan_received');
    expect(ledgerCategoryFor({ type: 'Income', title: 'x', notes: 'HDFC LOAN' })).toBe('loan_received');
    expect(ledgerCategoryFor({ type: 'Income', title: 'Client advance' })).toBe('client_payment');
  });
  test('expense loan wording', () => {
    expect(c({ title: 'Loan repayment' })).toBe('loan_repayment');
    expect(c({ title: 'May EMI' })).toBe('loan_repayment');
    expect(c({ title: 'x', notes: 'repay to Ramesh' })).toBe('loan_repayment');
    expect(c({ title: 'x', originalTitle: 'emi' })).toBe('loan_repayment');
  });
  test('"emi" inside another word is not a loan', () => {
    expect(c({ type: 'Materials', title: 'Chemical waterproofing' })).toBe('material');
    expect(c({ title: 'Premium shuttering' })).toBe('other');
  });
  test('type / category fallbacks', () => {
    expect(c({ type: 'Materials', title: 'Cement' })).toBe('material');
    expect(c({ type: 'Wages', title: 'Mason' })).toBe('labour');
    expect(c({ type: 'Equipment', title: 'JCB' })).toBe('equipment');
    expect(c({ category: 'Labour', title: 'x' })).toBe('labour');
    expect(c({ category: 'Material - steel', title: 'x' })).toBe('material');
    expect(c({ title: 'Tea' })).toBe('other');
  });
  test('ledgerCategoryByRules ignores a stored tag', () => {
    expect(ledgerCategoryByRules({ type: 'Expense', title: 'EMI', ledgerCategory: 'other' })).toBe('loan_repayment');
  });
  test('direction', () => {
    expect(directionFor({ type: 'Income' })).toBe('in');
    ['Expense', 'Wages', 'Materials', 'Equipment'].forEach((type) => expect(directionFor({ type })).toBe('out'));
  });
  test('result is always a valid category', () => {
    ['Income', 'Expense', 'Wages', 'Materials', 'Equipment'].forEach((type) =>
      expect(LEDGER_CATEGORIES).toContain(ledgerCategoryFor({ type, title: 't' })));
  });
});

describe('withRunningBalance', () => {
  test('is the cumulative net oldest to newest, anchored on total net', () => {
    // oldest -> newest: +1000, -300, -200, +50  => 550
    const newestFirst = [
      { direction: 'in', amount: 50 }, { direction: 'out', amount: 200 },
      { direction: 'out', amount: 300 }, { direction: 'in', amount: 1000 },
    ];
    expect(withRunningBalance(newestFirst, 550).map((r) => r.runningBalance)).toEqual([550, 500, 700, 1000]);
  });
  test('stays exact for a truncated window (older rows are simply not shown)', () => {
    const window = [{ direction: 'out', amount: 100 }, { direction: 'in', amount: 400 }];
    expect(withRunningBalance(window, 1000).map((r) => r.runningBalance)).toEqual([1000, 1100]);
  });
  test('rounds floating point noise', () => {
    const rows = [{ direction: 'in', amount: 0.1 }, { direction: 'in', amount: 0.2 }];
    expect(withRunningBalance(rows, 0.3).map((r) => r.runningBalance)).toEqual([0.3, 0.2]);
  });
});

describe('buildBaseStages', () => {
  const scope = { x: 1 };
  test('scope is always the first stage', () => {
    expect(buildBaseStages(scope, {})[0]).toEqual({ $match: scope });
  });
  test('filters become one $match on the derived fields', () => {
    const st = buildBaseStages(scope, { from: '2026-01-01', to: '2026-01-31', direction: 'out', categories: ['material'] });
    expect(st[2].$match).toEqual({ _d: { $gte: '2026-01-01', $lte: '2026-01-31' }, _dir: 'out', _cat: { $in: ['material'] } });
  });
  test('search text is regex-escaped and never a raw regex', () => {
    const st = buildBaseStages(scope, { q: 'a.b(c)+[' });
    const or = st[st.length - 1].$match.$or;
    expect(or[0].title).toEqual({ $regex: 'a\\.b\\(c\\)\\+\\[', $options: 'i' });
    expect(escapeRegex('.*')).toBe('\\.\\*');
  });
});

// ---------------------------------------------------------------- HTTP layer
jest.mock('../models/Transaction', () => ({ aggregate: jest.fn(), findById: jest.fn(), updateOne: jest.fn() }));
jest.mock('../models/Project', () => ({ find: jest.fn(), findOne: jest.fn() }));
jest.mock('../models/Worker', () => ({ find: jest.fn() }));
jest.mock('../models/User', () => ({}));
jest.mock('../middleware/auth', () => {
  const actual = jest.requireActual('../middleware/auth');
  return { ...actual, protect: (req, res, next) => { req.user = global.__user; next(); } };
});

const Transaction = require('../models/Transaction');
const Project = require('../models/Project');
const Worker = require('../models/Worker');

const oid = () => new mongoose.Types.ObjectId();
const lean = (v) => ({ select: () => ({ lean: async () => v }), lean: async () => v });

function call(app, method, path, body) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const data = body ? JSON.stringify(body) : null;
      const req = http.request({ port: server.address().port, path, method, headers: { 'content-type': 'application/json' } }, (res) => {
        let buf = '';
        res.on('data', (d) => (buf += d));
        res.on('end', () => { server.close(); resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null }); });
      });
      req.on('error', (e) => { server.close(); reject(e); });
      if (data) req.write(data);
      req.end();
    });
  });
}

const reportApp = () => { const a = express(); a.use(express.json()); a.use('/api/reports', require('../routes/reportRoutes')); return a; };
const txApp = () => { const a = express(); a.use(express.json()); a.use('/api/transactions', require('../routes/transactionRoutes')); return a; };

const admin = { _id: oid(), role: 'Admin', permissions: [] };
const plain = { _id: oid(), role: 'Supervisor', permissions: ['view_reports'], createdBy: admin._id };
const finance = { ...plain, _id: oid(), permissions: ['view_finances'] };

beforeEach(() => {
  jest.resetAllMocks();
  Project.find.mockReturnValue(lean([{ _id: oid() }]));
  Worker.find.mockReturnValue(lean([]));
});

describe('GET /api/reports/ledger', () => {
  test('403 without view_finances, for a non-admin', async () => {
    global.__user = plain;
    const r = await call(reportApp(), 'GET', '/api/reports/ledger');
    expect(r.status).toBe(403);
    expect(Transaction.aggregate).not.toHaveBeenCalled();
  });

  test('admin and view_finances holder are allowed; response is shaped and balanced', async () => {
    const p = oid(); const w = oid();
    Project.find.mockReturnValue(lean([{ _id: p, projectName: 'Tower' }]));
    Project.find.mockImplementationOnce(() => lean([{ _id: p }])).mockImplementationOnce(() => lean([{ _id: p, projectName: 'Tower' }]));
    Worker.find.mockReturnValue(lean([{ _id: w, name: 'Ramesh' }]));
    Transaction.aggregate
      .mockResolvedValueOnce([{ _id: null, moneyIn: 1000, moneyOut: 300, count: 2 }])
      .mockResolvedValueOnce([
        { _id: [p].toString(), moneyIn: 0, moneyOut: 300, count: 1 },
      ])
      .mockResolvedValueOnce([
        { _id: oid(), _d: '2026-02-02', _dir: 'out', _cat: 'labour', project: p, worker: w, title: 'Wages', amount: 300, type: 'Wages', paymentStatus: 'Paid' },
        { _id: oid(), _d: '2026-02-01', _dir: 'in', _cat: 'client_payment', project: p, title: 'Advance', amount: 1000, type: 'Income', paymentStatus: 'Paid' },
      ]);
    global.__user = finance;
    const r = await call(reportApp(), 'GET', '/api/reports/ledger?groupBy=project&direction=all');
    expect(r.status).toBe(200);
    expect(r.body.summary).toEqual({ moneyIn: 1000, moneyOut: 300, net: 700, count: 2 });
    expect(r.body.truncated).toBe(false);
    expect(r.body.rows.map((x) => x.runningBalance)).toEqual([700, 1000]);
    expect(r.body.rows[0]).toMatchObject({ date: '2026-02-02', direction: 'out', category: 'labour', payee: 'Ramesh', projectName: 'Tower', amount: 300 });
    expect(Object.keys(r.body.rows[0])).toEqual(expect.arrayContaining(
      ['id', 'date', 'projectId', 'projectName', 'direction', 'category', 'title', 'payee', 'notes', 'amount', 'paymentStatus', 'runningBalance']));
    expect(r.body.groups).toHaveLength(1);
    expect(r.body.groups[0]).toMatchObject({ moneyOut: 300, net: -300, count: 1 });

    global.__user = admin;
    Transaction.aggregate.mockResolvedValue([]);
    expect((await call(reportApp(), 'GET', '/api/reports/ledger')).status).toBe(200);
  });

  test('caps rows at 5000 and flags truncated', async () => {
    const rows = Array.from({ length: 5001 }, () => ({ _id: oid(), _d: '2026-01-01', _dir: 'in', _cat: 'client_payment', title: 't', amount: 1, type: 'Income' }));
    Transaction.aggregate
      .mockResolvedValueOnce([{ moneyIn: 6000, moneyOut: 0, count: 6000 }])
      .mockResolvedValueOnce(rows); // groupBy=none runs no group pipeline
    global.__user = admin;
    const r = await call(reportApp(), 'GET', '/api/reports/ledger');
    expect(r.body.rows).toHaveLength(5000);
    expect(r.body.truncated).toBe(true);
    expect(r.body.rows[0].runningBalance).toBe(6000);
  });

  test('validates input', async () => {
    global.__user = admin;
    for (const qs of ['from=2026-1-1', 'direction=sideways', 'groupBy=colour', 'category=nope', 'projectId=zzz']) {
      expect((await call(reportApp(), 'GET', `/api/reports/ledger?${qs}`)).status).toBe(400);
    }
  });

  test('403 for a project outside the caller\'s company', async () => {
    Project.findOne.mockReturnValue(lean(null));
    global.__user = admin;
    const r = await call(reportApp(), 'GET', `/api/reports/ledger?projectId=${oid()}`);
    expect(r.status).toBe(403);
  });
});

describe('PATCH /api/transactions/:id/ledger-category', () => {
  const txDoc = (over = {}) => ({ _id: oid(), project: oid(), createdBy: admin._id, ...over });

  test('403 without view_finances', async () => {
    global.__user = plain;
    const r = await call(txApp(), 'PATCH', `/api/transactions/${oid()}/ledger-category`, { ledgerCategory: 'other' });
    expect(r.status).toBe(403);
    expect(Transaction.updateOne).not.toHaveBeenCalled();
  });

  test('rejects an unknown category', async () => {
    global.__user = admin;
    const r = await call(txApp(), 'PATCH', `/api/transactions/${oid()}/ledger-category`, { ledgerCategory: 'gold' });
    expect(r.status).toBe(400);
  });

  test('updates only ledgerCategory with updateOne $set', async () => {
    const tx = txDoc();
    Transaction.findById.mockReturnValue(lean(tx));
    Project.findOne.mockReturnValue(lean({ _id: tx.project }));
    Transaction.updateOne.mockResolvedValue({ modifiedCount: 1 });
    global.__user = admin;
    const r = await call(txApp(), 'PATCH', `/api/transactions/${tx._id}/ledger-category`, { ledgerCategory: 'loan_repayment', amount: 1, title: 'hack' });
    expect(r.status).toBe(200);
    expect(Transaction.updateOne).toHaveBeenCalledWith({ _id: tx._id }, { $set: { ledgerCategory: 'loan_repayment' } });
  });

  test('403 for a transaction of another company', async () => {
    const tx = txDoc();
    Transaction.findById.mockReturnValue(lean(tx));
    Project.findOne.mockReturnValue(lean(null));
    global.__user = admin;
    const r = await call(txApp(), 'PATCH', `/api/transactions/${tx._id}/ledger-category`, { ledgerCategory: 'other' });
    expect(r.status).toBe(403);
    expect(Transaction.updateOne).not.toHaveBeenCalled();
  });

  test('project-less entry: only same-company creators', async () => {
    const tx = txDoc({ project: null, createdBy: oid() });
    Transaction.findById.mockReturnValue(lean(tx));
    global.__user = admin;
    expect((await call(txApp(), 'PATCH', `/api/transactions/${tx._id}/ledger-category`, { ledgerCategory: 'other' })).status).toBe(403);
  });
});
