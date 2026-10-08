// Test fixture: a realistic synthetic project (church + bell tower, 7 phases) with
// a deterministic set of transactions, run through buildProjectInsights().
// No database access.

const { buildProjectInsights } = require("../../services/projectInsights");

// Deterministic PRNG so the fixture is stable between runs.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const L = 100000; // ₹1 lakh

// [phase, activities: [name, material, labour, equipment (in lakhs), completed],
//  window: [startMonthOffset, endMonthOffset], spend multipliers per category]
const PLAN = [
  ["Site Preparation", [
    ["Clearing & grubbing", 0.8, 1.2, 1.6, true],
    ["Survey & setting out", 0.3, 0.9, 0.4, true],
    ["Temporary works", 1.4, 0.8, 0.6, true],
  ], [0, 1], { material: 0.94, labour: 0.97, equipment: 0.91 }],
  ["Foundation", [
    ["Excavation", 0.6, 3.2, 4.8, true],
    ["PCC & footing", 9.5, 4.1, 2.2, true],
    ["Plinth beam", 6.8, 3.4, 1.5, true],
    ["Backfilling & DPC", 2.2, 1.9, 1.1, true],
  ], [1, 3], { material: 1.03, labour: 0.96, equipment: 0.88 }],
  ["Superstructure", [
    ["Columns — ground floor", 8.4, 4.6, 1.8, true],
    ["Slab — ground floor", 11.2, 5.1, 2.4, true],
    ["Columns — first floor", 7.9, 4.4, 1.7, true],
    ["Slab — first floor", 10.6, 4.9, 2.3, false],
    ["Masonry walls", 7.2, 6.8, 0.6, false],
  ], [2, 7], { material: 1.08, labour: 1.04, equipment: 0.95 }],
  ["Bell Tower", [
    ["Tower foundation", 4.8, 2.6, 1.9, true],
    ["Tower shaft (0–12 m)", 6.2, 4.4, 3.1, true],
    ["Tower shaft (12–24 m)", 6.0, 4.8, 3.6, true],
    ["Belfry & louvres", 3.4, 2.9, 1.4, false],
    ["Spire & cross", 2.6, 1.8, 2.2, false],
  ], [4, 9], { material: 1.14, labour: 1.52, equipment: 1.38 }],
  ["Roofing", [
    ["Roof trusses", 5.6, 2.4, 1.6, false],
    ["Roof sheeting & tiles", 6.8, 2.2, 0.8, false],
    ["Waterproofing", 2.4, 1.1, 0.3, false],
  ], [6, 10], { material: 0.9, labour: 1.0, equipment: 1.0 }],
  ["MEP Services", [
    ["Electrical conduits", 3.6, 2.2, 0.4, false],
    ["Plumbing & drainage", 3.1, 2.0, 0.3, false],
    ["Bell automation & sound", 4.2, 1.1, 0.6, false],
  ], [6, 11], { material: 0.72, labour: 0.8, equipment: 0.7 }],
  ["Finishing", [
    ["Plastering", 4.4, 5.2, 0.4, false],
    ["Flooring (granite)", 9.8, 3.6, 0.5, false],
    ["Painting & polish", 3.2, 3.4, 0.2, false],
    ["Stained glass & doors", 7.4, 1.8, 0.4, false],
  ], [9, 12], { material: 1, labour: 1, equipment: 1 }],
];

const SUPPLIERS = {
  material: ["UltraTech Cement Depot", "JSW Steel Stockyard", "Sri Balaji Aggregates", "Kajaria Tiles Hub", "Asian Paints Dealer"],
  equipment: ["Sai Crane Services", "Mahalakshmi JCB Hire", "Shree Scaffolding Co."],
};

function build(now = new Date("2026-09-30T10:00:00Z")) {
  const rand = rng(20260930);
  const start = new Date("2026-03-01T00:00:00Z");
  const end = new Date("2027-02-28T00:00:00Z");
  const monthMs = (end - start) / 12;

  const selectedPhases = PLAN.map(([phaseName, acts], pi) => ({
    id: `ph-${pi + 1}`,
    phaseName,
    activities: acts.map(([name, m, l, e, done], ai) => ({
      id: `ph-${pi + 1}-a-${ai + 1}`,
      name,
      completed: done,
      completedAt: done ? new Date(start.getTime() + (PLAN[pi][2][0] + (ai + 1) * 0.6) * monthMs) : null,
      budgetMaterial: m * L,
      budgetLabour: l * L,
      budgetEquipment: e * L,
    })),
  }));

  const phaseTotal = selectedPhases.reduce(
    (s, p) => s + p.activities.reduce((t, a) => t + a.budgetMaterial + a.budgetLabour + a.budgetEquipment, 0),
    0
  );

  const transactions = [];
  const push = (tx) => transactions.push(tx);
  const TYPE = { material: "Materials", labour: "Wages", equipment: "Equipment" };

  PLAN.forEach(([, acts, [m0, m1], mult], pi) => {
    const phase = selectedPhases[pi];
    phase.activities.forEach((a, ai) => {
      const done = acts[ai][4];
      // how far through this activity's spend we are
      const phaseMid = m0 + ((m1 - m0) * (ai + 0.5)) / acts.length;
      const actStart = start.getTime() + (m0 + ((m1 - m0) * ai) / acts.length) * monthMs;
      const nowT = now.getTime();
      let frac;
      if (done) frac = 1;
      else if (start.getTime() + phaseMid * monthMs < nowT) frac = 0.45 + rand() * 0.35;
      else if (actStart < nowT) frac = 0.1 + rand() * 0.25;
      else frac = 0;
      if (frac === 0) return;
      for (const cat of ["material", "labour", "equipment"]) {
        const key = cat === "material" ? "budgetMaterial" : cat === "labour" ? "budgetLabour" : "budgetEquipment";
        const target = a[key] * frac * mult[cat] * (0.96 + rand() * 0.08);
        const parts = cat === "labour" ? 4 : 2 + Math.floor(rand() * 2);
        const actEnd = Math.min(nowT - 86400000, actStart + ((m1 - m0) / acts.length) * monthMs * (done ? 1 : frac));
        for (let k = 0; k < parts; k++) {
          const t = actStart + ((actEnd - actStart) * (k + rand() * 0.8)) / parts;
          if (t > nowT) continue;
          const amount = Math.round(target / parts);
          const pending = !done && t > nowT - 12 * 86400000 && rand() < 0.5;
          const paidFrac = done ? (rand() < 0.85 ? 1 : 0.6) : rand() < 0.6 ? 1 : 0.3 + rand() * 0.4;
          const paidAmount = Math.round(amount * paidFrac);
          push({
            type: TYPE[cat],
            amount,
            date: new Date(t),
            approvalStatus: pending ? "Pending" : "Approved",
            phaseId: phase.id,
            phase: phase.phaseName,
            activityId: a.id,
            supplier: cat === "labour" ? "" : SUPPLIERS[cat][Math.floor(rand() * SUPPLIERS[cat].length)],
            paidAmount,
            remainingAmount: amount - paidAmount,
          });
        }
      }
    });
  });

  // a little untagged site spend + client income
  for (let k = 0; k < 6; k++) {
    const t = start.getTime() + (k + 0.5) * monthMs;
    if (t > now.getTime()) break;
    push({ type: "Expense", amount: Math.round(22000 + rand() * 18000), date: new Date(t), approvalStatus: "Approved", paidAmount: 0, remainingAmount: 0, supplier: "" });
  }
  [0, 2, 4, 6].forEach((mo) => push({ type: "Income", amount: 42 * L, date: new Date(start.getTime() + mo * monthMs), approvalStatus: "Approved" }));

  const project = {
    _id: "fixture-st-josephs",
    projectName: "St. Joseph's Church & Bell Tower",
    projectCode: "BT-2026-017",
    clientName: "St. Joseph's Parish Trust",
    location: "Mangaluru, Karnataka",
    status: "Active",
    dates: { startDate: start, expectedEndDate: end },
    budget: { total: Math.round(phaseTotal * 1.04), material: 0, labour: 0, equipment: 0, misc: 0 },
    selectedPhases,
  };
  return { project, transactions, insights: buildProjectInsights(project, transactions, now) };
}

module.exports = { build };
