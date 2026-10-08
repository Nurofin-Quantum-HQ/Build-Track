// Project Pulse — one read-only snapshot of a project's cost & schedule health.
//
// buildProjectInsights() is pure (no DB) so it can be unit-tested; the route
// fetches the project + its transactions and hands them in.
//
// Conventions (kept identical to computeActivityBudgetSummaries in projectRoutes
// so numbers match the activity tracker on Project Detail):
//   Materials -> material, Wages -> labour, Equipment + Expense -> equipment
//   ("Equipment & other"). Only Approved transactions count as actual spend;
//   Pending ones are reported separately. Income never counts as spend.

const DAY_MS = 24 * 60 * 60 * 1000;
const CATS = ["material", "labour", "equipment"];
const TYPE_TO_CAT = {
  Materials: "material",
  Wages: "labour",
  Equipment: "equipment",
  Expense: "equipment",
};

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 };
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round = (v, dp = 2) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};
const emptyBuckets = () => ({ material: 0, labour: 0, equipment: 0, total: 0 });
const addTo = (b, cat, amount) => {
  b[cat] += amount;
  b.total += amount;
};
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const monthKey = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
// Construction spend follows an S-curve: slow mobilisation, fast middle, slow finish.
const sCurve = (t) => {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
};

function buildProjectInsights(project, transactions, now = new Date()) {
  const phasesIn = Array.isArray(project.selectedPhases) ? project.selectedPhases : [];

  // ── Phase plans + activity completion ─────────────────────────────────────
  const activityIndex = new Map(); // activityId -> { phase, activity }
  const phases = phasesIn.map((p) => {
    const planned = emptyBuckets();
    const activities = (p.activities || []).map((a) => {
      const ap = emptyBuckets();
      addTo(ap, "material", num(a.budgetMaterial));
      addTo(ap, "labour", num(a.budgetLabour));
      addTo(ap, "equipment", num(a.budgetEquipment));
      CATS.forEach((c) => addTo(planned, c, ap[c]));
      const act = {
        id: String(a.id || a._id || ""),
        name: a.name || "Activity",
        completed: !!a.completed,
        completedAt: a.completedAt || null,
        planned: ap,
        actual: emptyBuckets(),
      };
      return act;
    });
    const phase = {
      id: String(p.id || p._id || ""),
      name: p.phaseName || "Phase",
      activitiesTotal: activities.length,
      activitiesDone: activities.filter((a) => a.completed).length,
      planned,
      actual: emptyBuckets(),
      activities,
    };
    activities.forEach((a) => activityIndex.set(a.id, { phase, activity: a }));
    return phase;
  });
  const phaseById = new Map(phases.map((p) => [p.id, p]));
  const phaseByName = new Map(phases.map((p) => [p.name.toLowerCase(), p]));

  // ── Transactions ──────────────────────────────────────────────────────────
  const actualByCat = emptyBuckets();
  const unallocated = emptyBuckets();
  const months = new Map();
  const suppliers = new Map();
  const dated = []; // approved spend with a date, for the cumulative curve
  let pendingAmount = 0;
  let pendingCount = 0;
  let paid = 0;
  let outstanding = 0;
  let income = 0;
  let firstSpendDate = null;
  let recentSpend = 0; // last 60 days, for burn rate
  const recentCutoff = now.getTime() - 60 * DAY_MS;

  for (const tx of transactions || []) {
    const amount = num(tx.amount);
    if (amount <= 0) continue;
    if (tx.type === "Income") {
      if (tx.approvalStatus !== "Rejected") income += amount;
      continue;
    }
    const cat = TYPE_TO_CAT[tx.type];
    if (!cat) continue;
    if (tx.approvalStatus === "Pending") {
      pendingAmount += amount;
      pendingCount += 1;
      continue;
    }
    if (tx.approvalStatus !== "Approved") continue;

    addTo(actualByCat, cat, amount);
    paid += num(tx.paidAmount);
    outstanding += Math.max(num(tx.remainingAmount), 0);

    const hit = tx.activityId ? activityIndex.get(String(tx.activityId)) : null;
    const phase =
      hit?.phase ||
      (tx.phaseId && phaseById.get(String(tx.phaseId))) ||
      (tx.phase && phaseByName.get(String(tx.phase).toLowerCase())) ||
      null;
    if (phase) addTo(phase.actual, cat, amount);
    else addTo(unallocated, cat, amount);
    if (hit) addTo(hit.activity.actual, cat, amount);

    const d = toDate(tx.date) || toDate(tx.createdAt);
    if (d) {
      const key = monthKey(d);
      if (!months.has(key)) months.set(key, { month: key, ...emptyBuckets() });
      addTo(months.get(key), cat, amount);
      dated.push({ t: d.getTime(), amount });
      if (!firstSpendDate || d < firstSpendDate) firstSpendDate = d;
      if (d.getTime() >= recentCutoff && d.getTime() <= now.getTime()) recentSpend += amount;
    }

    const supplier = (tx.supplier || "").trim();
    if (supplier) {
      const s = suppliers.get(supplier) || { name: supplier, amount: 0, count: 0 };
      s.amount += amount;
      s.count += 1;
      suppliers.set(supplier, s);
    }
  }

  // ── Budget (BAC) ──────────────────────────────────────────────────────────
  const b = project.budget || {};
  const projectCat = {
    material: num(b.material) || num(project.budgetMaterial),
    labour: num(b.labour) || num(project.budgetLabour),
    equipment:
      (num(b.equipment) || num(project.budgetEquipment)) +
      (num(b.misc) || num(project.budgetMisc)),
  };
  const projectTotal =
    num(b.total) ||
    num(project.totalBudget) ||
    projectCat.material + projectCat.labour + projectCat.equipment;
  const phasePlanned = emptyBuckets();
  phases.forEach((p) => CATS.forEach((c) => addTo(phasePlanned, c, p.planned[c])));

  const usePhasePlan = projectTotal <= 0 && phasePlanned.total > 0;
  const bac = usePhasePlan ? phasePlanned.total : projectTotal;
  const plannedByCat = {};
  const catSource = projectCat.material + projectCat.labour + projectCat.equipment > 0
    ? projectCat
    : phasePlanned;
  CATS.forEach((c) => {
    plannedByCat[c] = catSource[c];
  });

  // ── Progress & earned value ───────────────────────────────────────────────
  const activitiesTotal = phases.reduce((s, p) => s + p.activitiesTotal, 0);
  const activitiesDone = phases.reduce((s, p) => s + p.activitiesDone, 0);
  // Earned value uses the standard EVM 50/50 rule: an activity earns half its
  // plan once work (spend) starts and the rest when it is marked complete.
  // Activities have no partial-progress field, so this avoids counting spend on
  // half-built work as pure overrun.
  const earnedShare = (a) => (a.completed ? 1 : a.actual.total > 0 ? 0.5 : 0);
  for (const p of phases) {
    p.earned = p.activities.reduce((t, a) => t + a.planned.total * earnedShare(a), 0);
    p.earnedByCat = Object.fromEntries(
      CATS.map((c) => [c, p.activities.reduce((t, a) => t + a.planned[c] * earnedShare(a), 0)])
    );
  }
  let workDoneFraction;
  if (phasePlanned.total > 0) {
    workDoneFraction = phases.reduce((s, p) => s + p.earned, 0) / phasePlanned.total;
  } else if (activitiesTotal > 0) {
    workDoneFraction = activitiesDone / activitiesTotal;
  } else {
    // project.progress is saved as a 0–1 fraction by PUT /projects/:id, but older
    // records hold a 0–100 percentage.
    const raw = num(project.progress);
    workDoneFraction = Math.min(Math.max(raw > 1 ? raw / 100 : raw, 0), 1);
  }
  const ev = bac * workDoneFraction;
  const ac = actualByCat.total;

  // ── Schedule ──────────────────────────────────────────────────────────────
  const start =
    toDate(project.dates?.startDate) ||
    toDate(project.startDate) ||
    firstSpendDate ||
    toDate(project.createdAt);
  const end = toDate(project.dates?.expectedEndDate) || toDate(project.expectedEndDate);
  let schedule = { startDate: start, endDate: end, totalDays: null, elapsedDays: null, daysLeft: null, timeElapsedPct: null };
  let pv = null;
  if (start && end && end > start) {
    const totalDays = Math.round((end - start) / DAY_MS);
    const elapsedDays = Math.max(0, Math.round((now - start) / DAY_MS));
    const t = (now - start) / (end - start);
    schedule = {
      startDate: start,
      endDate: end,
      totalDays,
      elapsedDays: Math.min(elapsedDays, totalDays),
      daysLeft: Math.round((end - now) / DAY_MS),
      timeElapsedPct: round(Math.min(Math.max(t, 0), 1) * 100, 1),
    };
    pv = bac * sCurve(t);
  }

  const cpi = ac > 0 && ev > 0 ? ev / ac : null;
  const spi = pv && pv > 0 ? ev / pv : null;
  const eac = cpi ? ac + (bac - ev) / cpi : null;
  const vac = eac != null ? bac - eac : null;

  // ── Phase finishing touches ───────────────────────────────────────────────
  for (const p of phases) {
    const spentPct = p.planned.total > 0 ? p.actual.total / p.planned.total : null;
    const workPct = p.activitiesTotal > 0 ? p.activitiesDone / p.activitiesTotal : 0;
    const earnedPct = p.planned.total > 0 ? p.earned / p.planned.total : workPct;
    p.workDonePct = round(workPct * 100, 1);
    p.earnedPct = round(earnedPct * 100, 1);
    // Where this phase lands if it keeps its current cost efficiency.
    p.forecast =
      p.earned > 0 && p.actual.total > 0
        ? round(p.actual.total + (p.planned.total - p.earned) * (p.actual.total / p.earned))
        : null;
    p.earned = round(p.earned);
    // Same projection per category; untouched categories land on plan.
    p.forecastByCat = Object.fromEntries(
      CATS.map((c) => {
        const e = p.earnedByCat[c];
        const a = p.actual[c];
        if (a === 0) return [c, round(p.planned[c])];
        if (e <= 0) return [c, null];
        return [c, round(a + (p.planned[c] - e) * (a / e))];
      })
    );
    p.earnedByCat = Object.fromEntries(CATS.map((c) => [c, round(p.earnedByCat[c])]));
    p.spentPct = spentPct == null ? null : round(spentPct * 100, 1);
    p.variance = round(p.actual.total - p.planned.total);
    p.variancePct = p.planned.total > 0 ? round((p.variance / p.planned.total) * 100, 1) : null;
    const overCats = CATS.filter((c) => p.planned[c] > 0 && p.actual[c] > p.planned[c]);
    const trendingOver = p.forecast != null && p.planned.total > 0 && p.forecast > p.planned.total * 1.1;
    if (spentPct != null && spentPct > 1) p.status = "over";
    else if (overCats.length || trendingOver || (spentPct != null && spentPct - earnedPct > 0.15)) p.status = "watch";
    else if (p.actual.total === 0 && p.activitiesDone === 0) p.status = "not_started";
    else p.status = "ok";
    p.overCategories = overCats;
  }

  // ── Budget bridge (waterfall): budget → reserve → per-phase deltas → untagged → forecast.
  // A bottom-up forecast that adds up exactly, so every rupee is traceable to a phase.
  const bridgeSteps = phases
    .map((p) => ({
      phaseId: p.id,
      name: p.name,
      delta: round(p.forecast != null ? p.forecast - p.planned.total : Math.max(0, p.actual.total - p.planned.total)),
    }))
    .filter((st) => st.delta !== 0);
  const reserve = usePhasePlan ? 0 : round(phasePlanned.total - bac);
  const bridge = {
    budget: round(bac),
    reserve,
    steps: bridgeSteps,
    untagged: round(unallocated.total),
    forecast: round(bac + reserve + bridgeSteps.reduce((t, st) => t + st.delta, 0) + unallocated.total),
  };

  // ── Timeline: monthly burn + cumulative planned/actual/forecast ──────────
  const monthly = [...months.values()].sort((a, b2) => a.month.localeCompare(b2.month));
  dated.sort((a, b2) => a.t - b2.t);
  const cumulative = [];
  const forecast = [];
  if (start) {
    const horizonEnd = end && end > now ? end : now;
    const spanDays = Math.max(1, (horizonEnd - start) / DAY_MS);
    const stepDays = spanDays > 540 ? 30 : spanDays > 120 ? 14 : 7;
    let i = 0;
    let running = 0;
    // include any spend logged before the nominal start date
    for (let t = start.getTime(); ; t += stepDays * DAY_MS) {
      const last = t >= horizonEnd.getTime();
      const at = last ? horizonEnd.getTime() : t;
      while (i < dated.length && dated[i].t <= at) running += dated[i++].amount;
      const planned = end && end > start ? bac * sCurve((at - start) / (end - start)) : null;
      cumulative.push({
        date: new Date(at),
        planned: planned == null ? null : round(planned),
        actual: at <= now.getTime() ? round(running) : null,
      });
      if (last) break;
    }
    if (end && end > now && eac != null) {
      forecast.push({ date: now, value: round(ac) });
      forecast.push({ date: end, value: round(eac) });
    }
  }

  // ── Health score ──────────────────────────────────────────────────────────
  let score = 100;
  const drivers = [];
  if (bac > 0 && ac > bac) {
    score -= 35;
    drivers.push("Spend has passed the total budget");
  }
  if (cpi != null && cpi < 1) {
    const hit = Math.min(30, (1 - cpi) * 100);
    score -= hit;
    if (hit >= 5) drivers.push(`Every ₹1 spent is delivering ₹${round(cpi, 2)} of planned work`);
  }
  if (spi != null && spi < 1) {
    const hit = Math.min(20, (1 - spi) * 50);
    score -= hit;
    if (hit >= 5) drivers.push("Work is behind the planned schedule");
  }
  const overPhases = phases.filter((p) => p.status === "over");
  if (eac != null && bac > 0 && eac > bac * 1.05) {
    score -= Math.min(15, ((eac - bac) / bac) * 100);
    drivers.push("Forecast to finish over budget");
  }
  const heading = phases.filter(
    (p) => p.status !== "over" && p.forecast != null && p.planned.total > 0 && p.forecast > p.planned.total * 1.1
  );
  if (heading.length) {
    score -= Math.min(12, heading.length * 4);
    drivers.push(`${heading.length} phase${heading.length > 1 ? "s" : ""} trending over budget`);
  }
  if (overPhases.length) {
    score -= Math.min(20, overPhases.length * 6);
    drivers.push(`${overPhases.length} phase${overPhases.length > 1 ? "s" : ""} over budget`);
  }
  if (end && now > end && workDoneFraction < 1) {
    score -= 15;
    drivers.push("Past the expected end date");
  }
  score = Math.round(Math.min(100, Math.max(0, score)));
  const healthStatus = score >= 80 ? "on_track" : score >= 55 ? "at_risk" : "critical";

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alerts = [];
  const catLabel = { material: "material", labour: "labour", equipment: "equipment" };
  const overruns = [];
  for (const p of phases) {
    for (const c of CATS) {
      if (p.planned[c] > 0 && p.actual[c] > p.planned[c]) {
        overruns.push({ p, c, over: p.actual[c] - p.planned[c], pct: (p.actual[c] / p.planned[c] - 1) * 100 });
      }
    }
  }
  overruns.filter((o) => o.pct >= 5).sort((a, b2) => b2.over - a.over).slice(0, 3).forEach(({ p, c, over, pct }) => {
    alerts.push({
      severity: pct >= 25 ? "critical" : "warning",
      kind: "phase_overrun",
      phaseId: p.id,
      title: `${p.name}: ${catLabel[c]} ${Math.round(pct)}% over plan`,
      amount: round(over),
    });
  });
  phases
    .filter((p) => p.forecast != null && p.planned.total > 0 && p.forecast > p.planned.total * 1.1 && p.earnedPct < 100)
    .sort((a, b2) => b2.forecast - b2.planned.total - (a.forecast - a.planned.total))
    .slice(0, 2)
    .forEach((p) => {
      const pct = (p.forecast / p.planned.total - 1) * 100;
      alerts.push({
        severity: pct >= 25 ? "critical" : "warning",
        kind: "phase_forecast",
        phaseId: p.id,
        title: `${p.name} heading ${Math.round(pct)}% over budget`,
        amount: round(p.forecast - p.planned.total),
      });
    });
  const dailyBurn = recentSpend / 60;
  if (dailyBurn > 0 && bac > ac) {
    const runway = (bac - ac) / dailyBurn;
    const exhaust = new Date(now.getTime() + runway * DAY_MS);
    if (end && exhaust < end && workDoneFraction < 1) {
      alerts.push({
        severity: "warning",
        kind: "runway",
        title: "Budget runs out before the finish date",
        date: exhaust,
      });
    }
  }
  if (eac != null && bac > 0 && eac > bac * 1.05) {
    alerts.push({
      severity: eac > bac * 1.15 ? "critical" : "warning",
      kind: "forecast",
      title: "Forecast to finish over budget",
      amount: round(eac - bac),
    });
  }
  if (pendingCount > 0) {
    alerts.push({ severity: "info", kind: "pending", title: `${pendingCount} entr${pendingCount > 1 ? "ies" : "y"} awaiting approval`, amount: round(pendingAmount) });
  }
  if (ac > 0 && unallocated.total / ac > 0.05) {
    alerts.push({ severity: "info", kind: "unallocated", title: "Spend not tagged to a phase", amount: round(unallocated.total) });
  }

  const strip = (p) => ({
    ...p,
    planned: roundBuckets(p.planned),
    actual: roundBuckets(p.actual),
    activities: p.activities.map((a) => ({ ...a, planned: roundBuckets(a.planned), actual: roundBuckets(a.actual) })),
  });

  return {
    generatedAt: now,
    project: {
      id: String(project._id || ""),
      name: project.projectName || "",
      code: project.projectCode || "",
      clientName: project.clientName || "",
      location: project.location || "",
      status: project.status || "Active",
      photo: project.photo || null,
    },
    schedule,
    progress: {
      activitiesDone,
      activitiesTotal,
      workDonePct: round(workDoneFraction * 100, 1),
    },
    budget: {
      total: round(bac),
      source: usePhasePlan ? "phases" : "project",
      phasePlanned: round(phasePlanned.total),
      byCategory: Object.fromEntries(
        CATS.map((c) => [c, { planned: round(plannedByCat[c]), actual: round(actualByCat[c]) }])
      ),
    },
    spend: {
      actual: round(ac),
      spentPct: bac > 0 ? round((ac / bac) * 100, 1) : null,
      remaining: round(bac - ac),
      pendingApproval: round(pendingAmount),
      pendingCount,
      paid: round(paid),
      outstanding: round(outstanding),
      income: round(income),
      dailyBurn: round(dailyBurn),
    },
    performance: {
      earnedValue: round(ev),
      plannedValue: pv == null ? null : round(pv),
      cpi: cpi == null ? null : round(cpi, 3),
      spi: spi == null ? null : round(spi, 3),
      eac: eac == null ? null : round(eac),
      vac: vac == null ? null : round(vac),
    },
    health: { score, status: healthStatus, drivers },
    phases: phases.map(strip),
    bridge,
    unallocated: roundBuckets(unallocated),
    timeline: { monthly: monthly.map(roundBuckets), cumulative, forecast },
    suppliers: [...suppliers.values()]
      .sort((a, b2) => b2.amount - a.amount)
      .slice(0, 5)
      .map((s) => ({ ...s, amount: round(s.amount) })),
    alerts: alerts.sort((a, b2) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b2.severity]),
  };
}

function roundBuckets(bk) {
  const out = { ...bk };
  for (const k of ["material", "labour", "equipment", "total"]) out[k] = round(num(bk[k]));
  return out;
}

module.exports = { buildProjectInsights, sCurve };
