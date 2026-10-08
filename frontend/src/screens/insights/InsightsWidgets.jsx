import { useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, ChevronRight, CornerDownRight, ArrowUpRight,
  ArrowDownRight, Clock, CircleDot, Circle, TrendingUp,
} from "lucide-react";
import { inr, pct, dShort, monYY, CATS, HEALTH, PHASE, SEV, varianceFill } from "./insightsFormat";

// ── Primitives ───────────────────────────────────────────────────────────────
export function Card({ title, description, action, className = "", style, children }) {
  return (
    <section className={`pi-card ${className}`} style={style}>
      {(title || action) && (
        <header className="pi-card-h">
          <div>
            {title && <h2 className="pi-card-t">{title}</h2>}
            {description && <p className="pi-card-d">{description}</p>}
          </div>
          {action && <div className="pi-card-a">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = "muted", Icon, children }) {
  return (
    <span className={`pi-badge ${tone}`}>
      {Icon && <Icon size={13} strokeWidth={2.2} aria-hidden />}
      {children}
    </span>
  );
}

function Tip({ children }) {
  return <div className="pi-tip">{children}</div>;
}

// ── Verdict ──────────────────────────────────────────────────────────────────
export function Verdict({ d }) {
  const h = HEALTH[d.health.status] || HEALTH.on_track;
  const forecast = d.bridge?.forecast ?? d.performance.eac;
  const budget = d.budget.total;
  const delta = forecast == null ? null : forecast - budget;
  const deltaPct = delta == null || budget <= 0 ? null : (delta / budget) * 100;
  const headline =
    forecast == null
      ? "Not enough approved spend yet to forecast the final cost."
      : Math.abs(delta) < budget * 0.01
        ? `Forecast to finish on budget at ${inr(forecast)}.`
        : delta > 0
          ? `Forecast to finish at ${inr(forecast)} — ${inr(delta)} over budget.`
          : `Forecast to finish at ${inr(forecast)} — ${inr(-delta)} under budget.`;
  const score = d.health.score;
  return (
    <Card className="span-4 wide-md">
      <div style={{ display: "flex", alignItems: "center" }}>
        <Badge tone={h.tone} Icon={h.Icon}>{h.label}</Badge>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--ink-3)" }}>
          Health <b style={{ color: "var(--ink)", fontSize: 15 }}>{score}</b> /100
        </span>
      </div>
      <p className="pi-verdict-h">{headline}</p>
      {deltaPct != null && Math.abs(deltaPct) >= 1 && (
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: delta > 0 ? "var(--bad)" : "var(--good)" }}>
          {deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(1)}% vs the {inr(budget)} budget
        </p>
      )}
      <div className="pi-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label="Health score">
        <div className="pi-meter-track">
          <i style={{ flex: 55, background: "#fecaca" }} />
          <i style={{ flex: 25, background: "#fde68a" }} />
          <i style={{ flex: 20, background: "#bbf7d0" }} />
        </div>
        <div className="pi-meter-dot" style={{ left: `${Math.min(98, Math.max(2, score))}%` }} />
      </div>
      <div className="pi-meter-labels">
        <span style={{ flex: 55 }}>Critical</span>
        <span style={{ flex: 25 }}>At risk</span>
        <span style={{ flex: 20, textAlign: "right" }}>On track</span>
      </div>
      {d.health.drivers.length > 0 && (
        <ul className="pi-why">
          <li className="pi-overline" style={{ padding: "0 0 6px" }}>Why</li>
          {d.health.drivers.slice(0, 3).map((t) => (
            <li key={t}>
              <CornerDownRight size={15} color={`var(--${h.tone})`} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── KPIs ─────────────────────────────────────────────────────────────────────
export function Kpis({ d }) {
  const cpi = d.performance.cpi;
  const dl = d.schedule.daysLeft;
  const items = [
    { l: "Spent", v: inr(d.spend.actual), s: `${pct(d.spend.spentPct)} of ${inr(d.budget.total)}` },
    { l: "Value of work done", v: inr(d.performance.earnedValue), s: `${pct(d.progress.workDonePct)} earned` },
    {
      l: "Cost efficiency",
      v: cpi == null ? "—" : `₹${cpi.toFixed(2)}`,
      s: cpi == null ? "Needs approved spend" : "of work per ₹1 spent",
      b: cpi == null ? null : cpi >= 1 ? ["good", "Efficient"] : cpi >= 0.9 ? ["warn", "Slight leak"] : ["bad", "Leaking"],
    },
    {
      l: "Days left",
      v: dl == null ? "—" : Math.max(0, dl),
      s: d.schedule.endDate ? (dl < 0 ? `${-dl} days overdue` : `Due ${dShort(d.schedule.endDate)}`) : "No end date set",
      b: dl != null && dl < 0 ? ["bad", "Overdue"] : null,
    },
  ];
  return (
    <div className="span-4 wide-md pi-kpis">
      {items.map((k) => (
        <section key={k.l} className="pi-card pi-kpi">
          <div className="pi-kpi-l">{k.l}</div>
          <div className="pi-kpi-v">{k.v}</div>
          <div className="pi-kpi-s">{k.s}</div>
          {k.b && <div style={{ marginTop: 8 }}><Badge tone={k.b[0]}>{k.b[1]}</Badge></div>}
        </section>
      ))}
    </div>
  );
}

// ── Attention ────────────────────────────────────────────────────────────────
export function Attention({ alerts, onPhase }) {
  const [all, setAll] = useState(false);
  const list = all ? alerts : alerts.slice(0, 4);
  return (
    <Card
      className="span-4 wide-md"
      title="Needs attention"
      description={alerts.length ? `${alerts.length} items, most urgent first` : "Nothing flagged right now"}
    >
      {alerts.length === 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--ink-2)" }}>
          <CheckCircle2 size={18} color="var(--good)" /> All phases are within plan.
        </div>
      )}
      {list.map((a, i) => {
        const s = SEV[a.severity] || SEV.info;
        const detail = a.date
          ? `Around ${dShort(a.date)} at the current spend rate`
          : a.amount != null
            ? a.kind === "pending"
              ? `${inr(a.amount)} waiting for approval`
              : a.kind === "unallocated"
                ? `${inr(a.amount)} not linked to a phase`
                : `${inr(a.amount, { sign: true })} vs plan`
            : null;
        const Tag = a.phaseId ? "button" : "div";
        return (
          <Tag key={i} className="pi-alert" onClick={a.phaseId ? () => onPhase(a.phaseId) : undefined}>
            <span className="pi-alert-i" style={{ background: `var(--${s.tone === "info" ? "primary" : s.tone}-soft)` }}>
              <s.Icon size={17} color={`var(--${s.tone === "info" ? "primary" : s.tone})`} aria-hidden />
            </span>
            <span style={{ flex: 1 }}>
              <div className="pi-alert-t">{a.title}</div>
              {detail && <div className="pi-alert-d">{detail}</div>}
            </span>
            {a.phaseId && <ChevronRight size={18} color="var(--ink-3)" aria-hidden />}
          </Tag>
        );
      })}
      {alerts.length > 4 && (
        <button className="pi-btn" style={{ marginTop: 8, alignSelf: "flex-start" }} onClick={() => setAll(!all)}>
          {all ? "Show less" : `Show all ${alerts.length}`}
        </button>
      )}
    </Card>
  );
}

// ── Budget bridge (variance waterfall) ───────────────────────────────────────
export function Bridge({ d, onPhase, className = "span-5" }) {
  const b = d.bridge;
  if (!b) return null;
  const rows = [];
  let run = 0;
  const add = (label, delta, extra = {}) => {
    rows.push({ label, from: run, to: run + delta, delta, ...extra });
    run += delta;
  };
  if (Math.abs(b.reserve) >= 1) add("Unassigned reserve", b.reserve, { hint: "Budget not given to any phase" });
  [...b.steps].sort((x, y) => y.delta - x.delta).forEach((s) => add(s.name, s.delta, { phaseId: s.phaseId }));
  if (Math.abs(b.untagged) >= 1) add("Untagged spend", b.untagged, { hint: "Entries without a phase" });
  const lo = Math.min(0, ...rows.map((r) => Math.min(r.from, r.to)));
  const hi = Math.max(0, ...rows.map((r) => Math.max(r.from, r.to)));
  const span = hi - lo || 1;
  const x = (v) => ((v - lo) / span) * 100;
  const net = b.forecast - b.budget;
  return (
    <Card className={className} title="Budget bridge" description="How each phase moves the final cost away from the budget">
      <div className="pi-total-row" style={{ borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 13.5, color: "var(--ink-3)" }}>Budget</span>
        <b style={{ fontSize: 16 }}>{inr(b.budget)}</b>
      </div>
      <div style={{ padding: "6px 0" }}>
        {rows.map((r) => {
          const Tag = r.phaseId ? "button" : "div";
          const up = r.delta > 0;
          return (
            <Tag key={r.label} className="pi-bridge-row" onClick={r.phaseId ? () => onPhase(r.phaseId) : undefined}>
              <span style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{r.label}</div>
                {r.hint && <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{r.hint}</div>}
              </span>
              <span className="pi-bridge-bar" title={`${r.label}: ${inr(r.delta, { sign: true })}`}>
                <span className="zero" style={{ left: `${x(0)}%` }} />
                <span
                  className="seg"
                  style={{
                    left: `${x(Math.min(r.from, r.to))}%`,
                    width: `max(2px, ${x(Math.max(r.from, r.to)) - x(Math.min(r.from, r.to))}%)`,
                    background: up ? "var(--bad)" : "var(--under)",
                  }}
                />
              </span>
              <span style={{ textAlign: "right", fontSize: 13.5, fontWeight: 600, color: up ? "var(--bad)" : "var(--under)" }}>
                {inr(r.delta, { sign: true })}
              </span>
            </Tag>
          );
        })}
      </div>
      <div className="pi-total-row" style={{ borderTop: "1px solid var(--border)" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Forecast final cost</span>
        <b style={{ fontSize: 19 }}>{inr(b.forecast)}</b>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: net > 0 ? "var(--bad)" : "var(--good)" }}>
        {net > 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
        {inr(Math.abs(net))} {net > 0 ? "over" : "under"} budget
      </div>
      <div className="pi-legend" style={{ marginTop: 12 }}>
        <span><i className="pi-sw" style={{ background: "var(--bad)" }} />Adds cost</span>
        <span><i className="pi-sw" style={{ background: "var(--under)" }} />Saves cost</span>
      </div>
    </Card>
  );
}

// ── Phase matrix ─────────────────────────────────────────────────────────────
const vPct = (planned, forecast) => (forecast == null || planned <= 0 ? null : ((forecast - planned) / planned) * 100);

function MatrixCell({ planned, actual, forecast, bold }) {
  if (planned <= 0 && actual <= 0) return <td className="cell" style={{ color: "var(--ink-3)" }}>—</td>;
  const used = planned > 0 ? (actual / planned) * 100 : null;
  const vp = vPct(planned, forecast);
  const over = used != null && used > 100;
  return (
    <td
      className="cell"
      style={{ background: varianceFill(vp) }}
      title={`Spent ${inr(actual)} of ${inr(planned)}${forecast != null ? ` · heading to ${inr(forecast)}` : ""}`}
    >
      <div className="pi-cell-v" style={{ fontWeight: bold || over ? 700 : 500, color: over ? "#991b1b" : "var(--ink)" }}>
        {used == null ? inr(actual) : `${Math.round(used)}%`}
      </div>
      {vp != null && Math.abs(vp) >= 5 && actual > 0 && (
        <div className="pi-cell-f" style={{ color: vp > 0 ? "#991b1b" : "#1e40af" }}>
          {vp > 0 ? "▲" : "▼"}{Math.round(Math.abs(vp))}% at finish
        </div>
      )}
    </td>
  );
}

export function PhaseMatrix({ phases, onOpen, className = "span-7" }) {
  return (
    <Card
      className={className}
      title="Phase budgets"
      description="Number = % of each budget already spent. Colour = where it is heading at completion. Click a phase for detail."
    >
      <div style={{ overflowX: "auto" }}>
        <table className="pi-matrix">
          <thead>
            <tr>
              <th>Phase</th>
              {CATS.map((c) => (
                <th key={c.key}><i className="pi-sw" style={{ background: c.color, marginRight: 5 }} />{c.label}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((p) => {
              const s = PHASE[p.status] || PHASE.ok;
              return (
                <tr key={p.id} className="row" tabIndex={0} onClick={() => onOpen(p)} onKeyDown={(e) => e.key === "Enter" && onOpen(p)}>
                  <td className="name">
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: s.tone === "muted" ? "var(--ink-3)" : `var(--${s.tone})`, fontWeight: 500 }}>
                      <s.Icon size={12} aria-hidden /> {s.label} · {p.activitiesDone}/{p.activitiesTotal} done
                    </div>
                  </td>
                  {CATS.map((c) => (
                    <MatrixCell key={c.key} planned={p.planned[c.key]} actual={p.actual[c.key]} forecast={p.forecastByCat?.[c.key]} />
                  ))}
                  <MatrixCell planned={p.planned.total} actual={p.actual.total} forecast={p.forecast ?? (p.actual.total === 0 ? p.planned.total : null)} bold />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pi-legend" style={{ marginTop: 14 }}>
        {[[-20, "Heading under"], [0, "On plan (±5%)"], [10, "5–15% over"], [20, "15%+ over"]].map(([v, l]) => (
          <span key={l}><i className="pi-sw" style={{ background: varianceFill(v), width: 14, height: 14, border: "1px solid var(--border)" }} />{l}</span>
        ))}
      </div>
    </Card>
  );
}

// ── Spend vs work dumbbell ───────────────────────────────────────────────────
export function SpendVsWork({ phases, onOpen, className = "span-6" }) {
  const rows = phases.filter((p) => p.status !== "not_started" && p.spentPct != null);
  const MAX = 125;
  const x = (v) => `calc(${(Math.min(Math.max(v, 0), MAX) / MAX) * 100}% )`;
  return (
    <Card className={className} title="Spend vs work, by phase" description="A red link means money is running ahead of the work delivered">
      <div className="pi-legend" style={{ marginBottom: 10 }}>
        <span><i className="pi-sw" style={{ borderRadius: "50%", border: "2.5px solid var(--good)", background: "#fff" }} />Work done</span>
        <span><i className="pi-sw" style={{ borderRadius: "50%", background: "var(--primary)" }} />Budget spent</span>
      </div>
      {rows.map((p) => {
        const g = p.spentPct - p.earnedPct;
        const ahead = g > 5;
        return (
          <button key={p.id} className="pi-bridge-row" style={{ gridTemplateColumns: "minmax(120px, 0.8fr) 1.4fr 130px" }} onClick={() => onOpen(p)}>
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{p.name}</span>
            <span className="pi-dumb">
              {[0, 50, 100].map((t) => <span key={t} className="tick" style={{ left: x(t), background: t === 100 ? "var(--border-strong)" : undefined }} />)}
              <span className="link" style={{ left: x(Math.min(p.earnedPct, p.spentPct)), width: `calc(${(Math.abs(g) / MAX) * 100}%)`, background: ahead ? "var(--bad)" : "var(--border-strong)" }} />
              <span className="dot" style={{ left: x(p.earnedPct), background: "#fff", border: "2.5px solid var(--good)" }} title={`Work done ${pct(p.earnedPct)}`} />
              <span className="dot" style={{ left: x(p.spentPct), background: "var(--primary)", border: "2px solid #fff" }} title={`Budget spent ${pct(p.spentPct)}`} />
            </span>
            <span style={{ textAlign: "right", fontSize: 12.5, fontWeight: 600, color: ahead ? "var(--bad)" : "var(--ink-3)" }}>
              {Math.abs(g) < 3 ? "In step" : g > 0 ? `Spend ${Math.round(g)} pts ahead` : `Spend ${Math.round(-g)} pts behind`}
            </span>
          </button>
        );
      })}
      <div className="pi-bridge-row" style={{ gridTemplateColumns: "minmax(120px, 0.8fr) 1.4fr 130px", minHeight: 20 }}>
        <span />
        <span style={{ position: "relative", height: 14, fontSize: 11, color: "var(--ink-3)" }}>
          {[0, 50, 100, 125].map((t) => (
            <span key={t} style={{ position: "absolute", left: x(t), transform: "translateX(-50%)" }}>{t}%</span>
          ))}
        </span>
        <span />
      </div>
    </Card>
  );
}

// ── Progress line ────────────────────────────────────────────────────────────
export function ProgressLine({ d, className = "span-4" }) {
  const spent = d.spend.spentPct ?? 0;
  const work = d.progress.workDonePct;
  const time = d.schedule.timeElapsedPct;
  const gap = spent - work;
  const items = [
    ["Work done", work, "var(--good)"],
    ["Money spent", spent, "var(--primary)"],
    ...(time != null ? [["Time used", time, "var(--ink-3)"]] : []),
  ];
  return (
    <Card className={className} title="Are we getting what we pay for?" description="Each marker is a % of the whole project">
      {items.map(([l, v, c]) => (
        <div key={l} style={{ display: "grid", gridTemplateColumns: "100px 1fr 48px", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{l}</span>
          <span style={{ position: "relative", height: 14 }}>
            <span style={{ position: "absolute", top: 5, left: 0, right: 0, height: 4, background: "var(--muted)", borderRadius: 2 }} />
            <span style={{ position: "absolute", top: 5, left: 0, width: `${Math.min(v, 100)}%`, height: 4, background: c, opacity: 0.35, borderRadius: 2 }} />
            <span style={{ position: "absolute", top: 1, left: `calc(${Math.min(v, 100)}% - 6px)`, width: 12, height: 12, borderRadius: "50%", background: c, border: "2px solid #fff", boxShadow: "0 0 0 1px var(--border)" }} />
          </span>
          <b style={{ textAlign: "right", fontSize: 14 }}>{pct(v)}</b>
        </div>
      ))}
      <div style={{ marginTop: "auto", display: "flex", gap: 8, padding: 12, borderRadius: 8, background: gap > 3 ? "var(--warn-soft)" : "var(--muted)", fontSize: 13.5, color: "var(--ink-2)" }}>
        {gap > 3 ? <AlertTriangle size={17} color="var(--warn)" style={{ flexShrink: 0 }} /> : <TrendingUp size={17} color="var(--ink-3)" style={{ flexShrink: 0 }} />}
        {gap > 3
          ? `Money is ${gap.toFixed(0)} pts ahead of work — paying for work not yet delivered.`
          : gap < -3
            ? `Work is ${(-gap).toFixed(0)} pts ahead of money — good cost control.`
            : "Money and work are moving together."}
      </div>
    </Card>
  );
}

// ── Spend curve ──────────────────────────────────────────────────────────────
export function SpendCurve({ d, className = "span-8" }) {
  const pts = d.timeline.cumulative;
  if (!pts || pts.length < 2) {
    return <Card className={className} title="Spend curve" description="Add a start and end date to the project to see planned vs actual spend." />;
  }
  const lastActual = [...pts].reverse().find((p) => p.actual != null);
  const fcEnd = d.bridge?.forecast ?? d.performance.eac;
  const end = d.schedule.endDate;
  const data = pts.map((p) => ({ t: new Date(p.date).getTime(), planned: p.planned, actual: p.actual }));
  if (lastActual && fcEnd != null && end && new Date(end) > new Date(lastActual.date)) {
    const i = data.findIndex((r) => r.t === new Date(lastActual.date).getTime());
    if (i >= 0) data[i].forecast = lastActual.actual;
    const endT = new Date(end).getTime();
    const j = data.findIndex((r) => r.t === endT);
    if (j >= 0) data[j].forecast = fcEnd;
    else data.push({ t: endT, forecast: fcEnd });
  }
  // One tick per 2 months, on the 1st, so labels never repeat.
  const t0 = data[0].t;
  const t1 = Math.max(...data.map((r) => r.t));
  const ticks = [];
  for (let m = new Date(new Date(t0).getFullYear(), new Date(t0).getMonth() + 1, 1); m.getTime() <= t1; m.setMonth(m.getMonth() + 2)) {
    ticks.push(m.getTime());
  }
  const pvToday = lastActual ? data.filter((r) => r.t <= new Date(lastActual.date).getTime() && r.planned != null).pop()?.planned : null;
  const diff = lastActual && pvToday != null ? lastActual.actual - pvToday : null;
  return (
    <Card
      className={className}
      title="Spend curve"
      description={diff == null ? "Cumulative spend vs the planned S-curve" : `Spend is ${inr(Math.abs(diff))} ${diff >= 0 ? "ahead of" : "behind"} the plan to date`}
      action={
        <div className="pi-legend">
          <span><i className="pi-sw line" style={{ borderColor: "var(--primary)" }} />Actual</span>
          <span><i className="pi-sw dash" style={{ borderColor: "var(--ink-3)" }} />Planned</span>
          <span><i className="pi-sw dash" style={{ borderColor: "var(--bad)" }} />Forecast</span>
          <span><i className="pi-sw dash" style={{ borderColor: "#d97706" }} />Budget</span>
        </div>
      }
    >
      <div style={{ height: 300 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="piArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} ticks={ticks} tickFormatter={monYY} tick={{ fontSize: 11.5, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => inr(v)} tick={{ fontSize: 11.5, fill: "#64748b" }} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <Tip>
                    <b>{dShort(label)}</b>
                    {payload.filter((p) => p.value != null).map((p) => (
                      <div className="row" key={p.dataKey}>
                        <i className="pi-sw" style={{ background: p.stroke }} />{p.name} {inr(p.value)}
                      </div>
                    ))}
                  </Tip>
                ) : null
              }
            />
            <ReferenceLine y={d.budget.total} stroke="#d97706" strokeDasharray="4 4" label={{ value: "Budget", position: "insideTopLeft", fill: "#b45309", fontSize: 11.5, fontWeight: 600 }} />
            {lastActual && <ReferenceLine x={new Date(lastActual.date).getTime()} stroke="#cbd5e1" strokeDasharray="3 3" label={{ value: "Today", position: "insideTopRight", fill: "#64748b", fontSize: 11.5 }} />}
            <Line name="Planned" dataKey="planned" stroke="#64748b" strokeWidth={2} strokeDasharray="5 4" dot={false} type="monotone" connectNulls />
            <Area name="Actual" dataKey="actual" stroke="#4f46e5" strokeWidth={2.5} fill="url(#piArea)" type="monotone" dot={false} connectNulls={false} />
            <Line name="Forecast" dataKey="forecast" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: "#dc2626" }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ── Monthly spend ────────────────────────────────────────────────────────────
export function Monthly({ d, className = "span-6" }) {
  const months = d.timeline.monthly.map((m) => ({ ...m, label: new Date(`${m.month}-01`).toLocaleDateString("en-IN", { month: "short" }) }));
  const last3 = months.slice(-3);
  const avg = last3.length === 3 ? last3.reduce((s, m) => s + m.total, 0) / 3 : null;
  return (
    <Card
      className={className}
      title="Monthly spend"
      description={avg == null ? "Approved spend by month" : `Last 3 months average ${inr(avg)} / month`}
      action={<div className="pi-legend">{CATS.map((c) => <span key={c.key}><i className="pi-sw" style={{ background: c.color }} />{c.label}</span>)}</div>}
    >
      <div style={{ height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={months} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => inr(v)} tick={{ fontSize: 11.5, fill: "#64748b" }} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <Tip>
                    <b>{monYY(`${payload[0].payload.month}-01`)} · {inr(payload[0].payload.total)}</b>
                    {CATS.map((c) => (
                      <div className="row" key={c.key}><i className="pi-sw" style={{ background: c.hex }} />{c.label} {inr(payload[0].payload[c.key])}</div>
                    ))}
                  </Tip>
                ) : null
              }
            />
            {CATS.map((c, i) => (
              <Bar key={c.key} dataKey={c.key} stackId="m" fill={c.hex} stroke="#fff" strokeWidth={1.5} radius={i === CATS.length - 1 ? [4, 4, 0, 0] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ── Cost mix ─────────────────────────────────────────────────────────────────
export function Mix({ d, className = "span-4" }) {
  const bc = d.budget.byCategory;
  const tot = (k) => CATS.reduce((s, c) => s + (bc[c.key]?.[k] || 0), 0);
  const bar = (k) => {
    const t = tot(k);
    return (
      <div className="pi-stack" aria-label={`${k} mix`}>
        {t <= 0 ? <div style={{ flex: 1, background: "var(--muted)" }} /> : CATS.map((c) => {
          const v = bc[c.key]?.[k] || 0;
          if (v <= 0) return null;
          const share = v / t;
          return <div key={c.key} style={{ flex: share, background: c.color }} title={`${c.label} ${Math.round(share * 100)}%`}>{share >= 0.12 ? `${Math.round(share * 100)}%` : ""}</div>;
        })}
      </div>
    );
  };
  return (
    <Card className={className} title="Cost mix" description="Is money going where the plan said it would?">
      <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: "10px 8px", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>Plan</span>{bar("planned")}
        <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>Actual</span>{bar("actual")}
      </div>
      <table className="pi-table">
        <thead><tr><th>Category</th><th>Spent</th><th>Budget</th><th>Used</th></tr></thead>
        <tbody>
          {CATS.map((c) => {
            const v = bc[c.key] || { planned: 0, actual: 0 };
            return (
              <tr key={c.key}>
                <td><i className="pi-sw" style={{ background: c.color, marginRight: 8 }} />{c.label}</td>
                <td style={{ fontWeight: 500 }}>{inr(v.actual)}</td>
                <td style={{ color: "var(--ink-3)" }}>{inr(v.planned)}</td>
                <td style={{ fontWeight: 600 }}>{v.planned > 0 ? pct((v.actual / v.planned) * 100) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

// ── Cash ─────────────────────────────────────────────────────────────────────
export function Cash({ d, className = "span-4" }) {
  const s = d.spend;
  const owed = s.paid + s.outstanding;
  const net = s.income - s.paid;
  const rows = [
    ["Paid out", inr(s.paid), "var(--good)", CheckCircle2],
    ["Still owed to vendors", inr(s.outstanding), "var(--warn)", Clock],
    ["Awaiting approval", inr(s.pendingApproval), "var(--ink-3)", CircleDot, `${s.pendingCount} entries`],
    ["Received from client", inr(s.income), "var(--ink-3)", ArrowDownRight],
    [net >= 0 ? "Cash in hand" : "Funding gap", inr(Math.abs(net)), net >= 0 ? "var(--good)" : "var(--bad)", Circle, "Received minus paid out"],
  ];
  return (
    <Card className={className} title="Cash position" description="Approved entries only">
      {owed > 0 && (
        <>
          <div className="pi-stack" style={{ height: 10 }}>
            <div style={{ flex: s.paid / owed, background: "var(--good)" }} />
            <div style={{ flex: s.outstanding / owed, background: "#f59e0b" }} />
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "6px 0 8px" }}>{Math.round((s.paid / owed) * 100)}% of approved bills paid</div>
        </>
      )}
      {rows.map((row) => {
        const [l, v, c, RowIcon, sub] = row;
        return (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid var(--border)", minHeight: 50 }}>
          <RowIcon size={17} color={c} aria-hidden />
          <span style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{l}</div>
            {sub && <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{sub}</div>}
          </span>
          <b style={{ fontSize: 15.5, color: c === "var(--ink-3)" ? "var(--ink)" : c }}>{v}</b>
        </div>
        );
      })}
    </Card>
  );
}

// ── Suppliers ────────────────────────────────────────────────────────────────
export function Suppliers({ list, className = "span-4" }) {
  const top = list[0]?.amount || 1;
  return (
    <Card className={className} title="Top suppliers" description="By approved spend">
      {list.length === 0 && <p style={{ fontSize: 14, color: "var(--ink-3)", margin: 0 }}>Add supplier names to entries to see this.</p>}
      {list.map((s, i) => (
        <div key={s.name} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 8, borderTop: "1px solid var(--border)", padding: "10px 0" }}>
          <span className="pi-mono" style={{ fontSize: 13, color: "var(--ink-3)" }}>{i + 1}</span>
          <span>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
              <span style={{ fontWeight: 500 }}>{s.name}</span><b>{inr(s.amount)}</b>
            </div>
            <div className="pi-progress" style={{ margin: "6px 0 3px" }}><div style={{ width: `${(s.amount / top) * 100}%` }} /></div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{s.count} entries</div>
          </span>
        </div>
      ))}
    </Card>
  );
}

// ── Phase sheet ──────────────────────────────────────────────────────────────
export function PhaseSheet({ phase, onClose }) {
  if (!phase) return null;
  const s = PHASE[phase.status] || PHASE.ok;
  const fv = phase.forecast == null ? null : phase.forecast - phase.planned.total;
  const chart = CATS.map((c) => ({
    name: c.label,
    hex: c.hex,
    Budget: phase.planned[c.key],
    Spent: phase.actual[c.key],
    Forecast: phase.forecastByCat?.[c.key] ?? 0,
  }));
  return (
    <>
      <div className="pi-overlay" onClick={onClose} />
      <aside className="pi-sheet" role="dialog" aria-modal="true" aria-label={`${phase.name} detail`}>
        <div className="pi-sheet-h">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{phase.name}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
              <Badge tone={s.tone} Icon={s.Icon}>{s.label}</Badge>
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{phase.activitiesDone} of {phase.activitiesTotal} activities done</span>
            </div>
          </div>
          <button className="pi-btn icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="pi-sheet-b">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              ["Budget", inr(phase.planned.total)],
              ["Spent", inr(phase.actual.total), pct(phase.spentPct)],
              ["Forecast", inr(phase.forecast), fv == null ? null : inr(fv, { sign: true }), fv > 0 ? "var(--bad)" : "var(--good)"],
            ].map(([l, v, sub, c]) => (
              <section key={l} className="pi-card" style={{ padding: 14 }}>
                <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{v}</div>
                {sub && <div style={{ fontSize: 12.5, fontWeight: 600, color: c || "var(--ink-3)" }}>{sub}</div>}
              </section>
            ))}
          </div>
          <Card title="Budget vs spent vs forecast" description="Per cost category. Outlined bar = forecast at completion.">
            <div style={{ height: 230 }}>
              <ResponsiveContainer>
                <BarChart data={chart} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barGap={4}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12.5, fill: "#334155" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => inr(v)} tick={{ fontSize: 11.5, fill: "#64748b" }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.12)" }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <Tip><b>{label}</b>{payload.map((p) => <div className="row" key={p.dataKey}>{p.dataKey} {inr(p.value)}</div>)}</Tip>
                      ) : null
                    }
                  />
                  <Bar dataKey="Budget" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Spent" radius={[4, 4, 0, 0]}>
                    {chart.map((r) => <Cell key={r.name} fill={r.hex} />)}
                  </Bar>
                  <Bar dataKey="Forecast" radius={[4, 4, 0, 0]}>
                    {chart.map((r) => <Cell key={r.name} fill={`${r.hex}22`} stroke={r.hex} strokeWidth={1.5} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Activities" description="Spent against each activity budget">
            {phase.activities.map((a) => {
              const used = a.planned.total > 0 ? (a.actual.total / a.planned.total) * 100 : null;
              const over = used != null && used > 100;
              const started = a.actual.total > 0;
              const [Icon, col, lbl] = a.completed ? [CheckCircle2, "var(--good)", "Done"] : started ? [CircleDot, "var(--primary)", "In progress"] : [Circle, "var(--ink-3)", "Not started"];
              const scale = Math.max(a.planned.total, a.actual.total) || 1;
              return (
                <div key={a.id} style={{ borderTop: "1px solid var(--border)", padding: "12px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon size={17} color={col} aria-hidden />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{a.name}</span>
                    {used != null && <Badge tone={over ? "bad" : "muted"}>{Math.round(used)}%</Badge>}
                  </div>
                  <div style={{ paddingLeft: 25, fontSize: 12.5, color: "var(--ink-3)", margin: "4px 0 6px" }}>
                    {inr(a.actual.total)} of {inr(a.planned.total)} · {lbl}
                  </div>
                  <div style={{ marginLeft: 25, position: "relative", height: 8 }}>
                    <div style={{ position: "absolute", inset: 0, width: `${(a.planned.total / scale) * 100}%`, background: "var(--muted)", borderRadius: 3 }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", gap: 2 }}>
                      {CATS.map((c) => a.actual[c.key] > 0 && <div key={c.key} style={{ width: `${(a.actual[c.key] / scale) * 100}%`, background: c.color, borderRadius: 3 }} />)}
                    </div>
                    <div style={{ position: "absolute", top: -2, bottom: -2, left: `calc(${(a.planned.total / scale) * 100}% - 1px)`, width: 2, background: "var(--ink)" }} />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </aside>
    </>
  );
}
