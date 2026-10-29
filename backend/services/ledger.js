"use strict";
/**
 * Ledger helpers: money in / money out view over the Transaction collection.
 *
 * Nothing here changes how an amount is computed or stored. A row's amount is
 * Transaction.amount (the same field the dashboard sums). Direction is
 * "in" for type Income and "out" for everything else, like the dashboard.
 *
 * The category rules exist twice on purpose and MUST stay in sync:
 *   - ledgerCategoryFor(t)  : JS, for one document (scripts, tests, PATCH)
 *   - categoryExpr()        : Mongo aggregation expression, so the report can
 *                             filter / group / sum in the database
 */

const LEDGER_CATEGORIES = [
  "client_payment",
  "loan_received",
  "loan_repayment",
  "material",
  "labour",
  "equipment",
  "other",
];

const CATEGORY_LABELS = {
  client_payment: "Client payment",
  loan_received: "Loan received",
  loan_repayment: "Loan repayment",
  material: "Material",
  labour: "Labour",
  equipment: "Equipment",
  other: "Other",
};

// "emi" is matched as a whole word so "chemical" / "premium" are not loans.
const LOAN_SRC = "loan";
const REPAY_SRC = "loan|\\bemis?\\b|repay";
const MATERIAL_CAT_SRC = "^\\s*material";
const LABOUR_CAT_SRC = "^\\s*(labou?r|wage)";
const EQUIPMENT_CAT_SRC = "^\\s*equipment";

const LOAN_RE = new RegExp(LOAN_SRC, "i");
const REPAY_RE = new RegExp(REPAY_SRC, "i");

// Fields that can carry the "loan repayment" wording people type today.
const TEXT_FIELDS = ["title", "originalTitle", "notes", "remarks"];

function textOf(t) {
  return TEXT_FIELDS.map((f) => (t && t[f] ? String(t[f]) : "")).join(" ");
}

function directionFor(t) {
  return t && t.type === "Income" ? "in" : "out";
}

function ledgerCategoryFor(t) {
  if (!t) return "other";
  if (t.ledgerCategory && LEDGER_CATEGORIES.includes(t.ledgerCategory)) {
    return t.ledgerCategory;
  }
  const text = textOf(t);
  if (t.type === "Income") {
    return LOAN_RE.test(text) ? "loan_received" : "client_payment";
  }
  if (REPAY_RE.test(text)) return "loan_repayment";
  if (t.type === "Materials") return "material";
  if (t.type === "Wages") return "labour";
  if (t.type === "Equipment") return "equipment";
  const cat = String(t.category || "");
  if (new RegExp(MATERIAL_CAT_SRC, "i").test(cat)) return "material";
  if (new RegExp(LABOUR_CAT_SRC, "i").test(cat)) return "labour";
  if (new RegExp(EQUIPMENT_CAT_SRC, "i").test(cat)) return "equipment";
  return "other";
}

/** Text rules only (ignores any stored ledgerCategory). Used by the tag script. */
function ledgerCategoryByRules(t) {
  const { ledgerCategory, ...rest } = t || {};
  return ledgerCategoryFor(rest);
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---- Mongo aggregation expressions (mirror of the JS above) ---------------

const s = (f) => ({ $ifNull: [`$${f}`, ""] });
const textExpr = () => ({
  $concat: TEXT_FIELDS.flatMap((f, i) => (i ? [" ", s(f)] : [s(f)])),
});
const rx = (input, regex) => ({ $regexMatch: { input, regex, options: "i" } });

function categoryExpr() {
  const text = textExpr();
  const cat = { $toString: s("category") };
  return {
    $switch: {
      branches: [
        {
          case: { $in: [{ $ifNull: ["$ledgerCategory", null] }, LEDGER_CATEGORIES] },
          then: "$ledgerCategory",
        },
        {
          case: { $and: [{ $eq: ["$type", "Income"] }, rx(text, LOAN_SRC)] },
          then: "loan_received",
        },
        { case: { $eq: ["$type", "Income"] }, then: "client_payment" },
        { case: rx(text, REPAY_SRC), then: "loan_repayment" },
        { case: { $eq: ["$type", "Materials"] }, then: "material" },
        { case: { $eq: ["$type", "Wages"] }, then: "labour" },
        { case: { $eq: ["$type", "Equipment"] }, then: "equipment" },
        { case: rx(cat, MATERIAL_CAT_SRC), then: "material" },
        { case: rx(cat, LABOUR_CAT_SRC), then: "labour" },
        { case: rx(cat, EQUIPMENT_CAT_SRC), then: "equipment" },
      ],
      default: "other",
    },
  };
}

// `date` is documented as YYYY-MM-DD but older rows hold full ISO strings and
// some hold real Date values; normalise all of them to YYYY-MM-DD.
function dateExpr() {
  return {
    $cond: [
      { $eq: [{ $type: "$date" }, "date"] },
      { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
      { $substrCP: [{ $toString: { $ifNull: ["$date", ""] } }, 0, 10] },
    ],
  };
}

function payeeKeyExpr() {
  return {
    $cond: [
      { $gt: [{ $strLenCP: s("supplier") }, 0] },
      { $concat: ["s:", s("supplier")] },
      {
        $cond: [
          { $ne: [{ $ifNull: ["$worker", null] }, null] },
          { $concat: ["w:", { $toString: "$worker" }] },
          "",
        ],
      },
    ],
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Stages shared by summary, groups and rows. `scope` is the already-built
 * company-scope $match (see reportRoutes). `opts`:
 *   from, to, direction, categories[], q, workerIds[]
 */
function buildBaseStages(scope, opts = {}) {
  const stages = [
    { $match: scope },
    {
      $addFields: {
        _d: dateExpr(),
        _dir: { $cond: [{ $eq: ["$type", "Income"] }, "in", "out"] },
        _cat: categoryExpr(),
        _pk: payeeKeyExpr(),
      },
    },
  ];
  const m = {};
  if (opts.from || opts.to) {
    m._d = {};
    if (opts.from) m._d.$gte = opts.from;
    if (opts.to) m._d.$lte = opts.to;
  }
  if (opts.direction === "in" || opts.direction === "out") m._dir = opts.direction;
  if (opts.categories && opts.categories.length) m._cat = { $in: opts.categories };
  if (Object.keys(m).length) stages.push({ $match: m });

  if (opts.q) {
    const re = { $regex: escapeRegex(opts.q), $options: "i" };
    const or = [
      { title: re },
      { originalTitle: re },
      { notes: re },
      { remarks: re },
      { supplier: re },
      { brand: re },
      { transactionId: re },
    ];
    if (opts.workerIds && opts.workerIds.length) {
      or.push({ worker: { $in: opts.workerIds } });
    }
    stages.push({ $match: { $or: or } });
  }
  return stages;
}

const MONEY = {
  moneyIn: { $sum: { $cond: [{ $eq: ["$_dir", "in"] }, { $ifNull: ["$amount", 0] }, 0] } },
  moneyOut: { $sum: { $cond: [{ $eq: ["$_dir", "out"] }, { $ifNull: ["$amount", 0] }, 0] } },
  count: { $sum: 1 },
};

function summaryStages() {
  return [{ $group: { _id: null, ...MONEY } }];
}

function groupKeyExpr(groupBy) {
  switch (groupBy) {
    case "category":
      return "$_cat";
    case "project":
      return { $ifNull: [{ $toString: "$project" }, ""] };
    case "month":
      return { $substrCP: ["$_d", 0, 7] };
    case "payee":
      return "$_pk";
    default:
      return null;
  }
}

function groupStages(groupBy) {
  const key = groupKeyExpr(groupBy);
  if (!key) return null;
  return [{ $group: { _id: key, ...MONEY } }];
}

function rowStages(limit) {
  return [
    { $sort: { _d: -1, createdAt: -1, _id: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        _d: 1,
        _dir: 1,
        _cat: 1,
        project: 1,
        worker: 1,
        supplier: 1,
        title: 1,
        notes: 1,
        amount: 1,
        type: 1,
        paymentStatus: 1,
        approvalStatus: 1,
      },
    },
  ];
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Rows arrive newest first. The running balance is the cumulative (in - out)
 * from the oldest matching entry up to and including that row. It is anchored
 * on the total net of ALL matching entries, so it stays exact even when the
 * row list is truncated.
 */
function withRunningBalance(rowsNewestFirst, totalNet) {
  let bal = round2(totalNet);
  return rowsNewestFirst.map((r) => {
    const out = { ...r, runningBalance: bal };
    const signed = r.direction === "in" ? r.amount : -r.amount;
    bal = round2(bal - signed);
    return out;
  });
}

module.exports = {
  LEDGER_CATEGORIES,
  CATEGORY_LABELS,
  DATE_RE,
  ledgerCategoryFor,
  ledgerCategoryByRules,
  directionFor,
  escapeRegex,
  buildBaseStages,
  summaryStages,
  groupStages,
  rowStages,
  withRunningBalance,
  round2,
};
