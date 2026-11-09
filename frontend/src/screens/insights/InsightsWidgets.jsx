import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CornerDownRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CircleDot,
  Circle,
  TrendingUp,
  Wallet,
  Hammer,
  Gauge,
  CalendarDays,
  LineChart as LineChartIcon,
  BarChart3,
  Users,
  X,
} from "lucide-react";
import {
  inr,
  pct,
  dShort,
  monYY,
  CATS,
  HEALTH,
  PHASE,
  SEV,
  PAL,
  AXIS_TICK,
  TONE_INK,
  TONE_SOFT,
  varianceFill,
} from "./insightsFormat";
import BtCard from "../../components/ui/BtCard";
import BtBadge from "../../components/ui/BtBadge";
import BtButton from "../../components/ui/BtButton";
import BtEmpty from "../../components/ui/BtEmpty";
import BtIconButton from "../../components/ui/BtIconButton";

// ── Primitives ───────────────────────────────────────────────────────────────

export function Card({ title, description, action, className = "", style, padding = "22px", children }) {
  return (
    <BtCard
      className={`pi-card ${className}`}
      padding={padding}
      style={{ overflow: "visible", ...style }}
    >
      {(title || action) && (
        <header className="pi-card-h">
          <div style={{ minWidth: 0 }}>
            {title && <h2 className="pi-card-t">{title}</h2>}
            {description && <p className="pi-card-d">{description}</p>}
          </div>
          {action && <div className="pi-card-a">{action}</div>}
        </header>
      )}
      {children}
    </BtCard>
  );
}

export function Badge({ tone = "muted", Icon, children }) {
  return (
    <BtBadge tone={tone} showDot={!Icon}>
      {Icon && <Icon size={13} strokeWidth={2.2} aria-hidden style={{ marginLeft: -2, marginRight: 4, flexShrink: 0 }} />}
      {children}
    </BtBadge>
  );
}

function Tip({ children }) {
  return <div className="pi-tip">{children}</div>;
}

/** Legend: items = [{ label, color, kind: 'box'|'line'|'dash'|'dot'|'outline' }] */
function Legend({ items, style }) {
  return (
    <div className="pi-legend" style={style}>
      {items.map((it) => (
        <span key={it.label}>
          {it.kind === "line" && <i className="pi-sw line" style={{ borderColor: it.color }} aria-hidden />}
          {it.kind === "dash" && <i className="pi-sw dash" style={{ borderColor: it.color }} aria-hidden />}
          {it.kind === "dot" && <i className="pi-sw dot" style={{ background: it.color }} aria-hidden />}
          {it.kind === "ring" && (
            <i
              className="pi-sw dot"
              style={{ background: "var(--card)", border: `2.5px solid ${it.color}` }}
              aria-hidden
            />
          )}
          {it.kind === "outline" && (
            <i
              className="pi-sw"
              style={{ border: `1.5px solid ${it.color}`, background: "transparent" }}
              aria-hidden
            />
          )}
          {(!it.kind || it.kind === "box") && (
            <i className="pi-sw" style={{ background: it.color }} aria-hidden />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}

const CAT_LEGEND = CATS.map((c) => ({ label: c.label, color: c.color }));

// ── Verdict ──────────────────────────────────────────────────────────────────

export function Verdict({ d, className = "span-7" }) {
  const h = HEALTH[d.health?.status] || HEALTH.on_track;
  const forecast = d.bridge?.forecast ?? d.performance?.eac;
  const budget = d.budget?.total || 0;
  const delta = forecast == null ? null : forecast - budget;
  const deltaPct = delta == null || budget <= 0 ? null : (delta / budget) * 100;
  const headline =
    forecast == null
      ? "Not enough approved spend yet to forecast the final cost."
      : Math.abs(delta) < budget * 0.01
        ? `Forecast to finish on budget at ${inr(forecast)}.`
        : delta > 0
          ? `Forecast to finish at ${inr(forecast)}, ${inr(delta)} over budget.`
          : `Forecast to finish at ${inr(forecast)}, ${inr(-delta)} under budget.`;
  const score = d.health?.score ?? 0;

  return (
    <Card className={className}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Badge tone={h.tone} Icon={h.Icon}>
          {h.label}
        </Badge>
        <span style={{ fontSize: 14, color: "var(--ink-2)", display: "flex", alignItems: "baseline", gap: 4 }}>
          Health
          <b className="pi-num" style={{ color: "var(--ink)", fontSize: 22 }}>
            {score}
          </b>
          <span style={{ fontSize: 13, color: "var(--ink-3)" }}>/100</span>
        </span>
      </div>

      <p className="pi-verdict-h">{headline}</p>

      {deltaPct != null && Math.abs(deltaPct) >= 1 && (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: delta > 0 ? TONE_INK.bad : TONE_INK.good,
          }}
        >
          {deltaPct > 0 ? "+" : "−"}
          {Math.abs(deltaPct).toFixed(1)}% vs the {inr(budget)} budget
        </p>
      )}

      <div
        className="pi-meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label="Health score"
      >
        <div className="pi-meter-track">
          <i style={{ flex: 55, background: "color-mix(in srgb, var(--status-danger-bright) 55%, var(--card))" }} />
          <i style={{ flex: 25, background: "color-mix(in srgb, var(--status-warning-bright) 60%, var(--card))" }} />
          <i style={{ flex: 20, background: "color-mix(in srgb, var(--status-success-bright) 55%, var(--card))" }} />
        </div>
        <div className="pi-meter-dot" style={{ left: `${Math.min(97, Math.max(3, score))}%` }} />
      </div>

      <div className="pi-meter-labels">
        <span style={{ flex: 55 }}>
          Critical <span className="pi-range">0–55</span>
        </span>
        <span style={{ flex: 25 }}>
          At risk <span className="pi-range">56–80</span>
        </span>
        <span style={{ flex: 20 }}>
          On track <span className="pi-range">81+</span>
        </span>
      </div>

      {d.health?.drivers?.length > 0 && (
        <ul className="pi-why">
          <li className="pi-eyebrow">What is driving this</li>
          {d.health.drivers.slice(0, 3).map((t) => (
            <li key={t}>
              <CornerDownRight
                size={15}
                color={TONE_INK[h.tone]}
                style={{ flexShrink: 0, marginTop: 3 }}
                aria-hidden
              />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

export function Kpis({ d, className = "span-12" }) {
  const cpi = d.performance?.cpi;
  const dl = d.schedule?.daysLeft;
  const items = [
    {
      l: "Spent",
      Icon: Wallet,
      v: inr(d.spend?.actual),
      s: `${pct(d.spend?.spentPct)} of ${inr(d.budget?.total)} budget`,
    },
    {
      l: "Value of work done",
      Icon: Hammer,
      v: inr(d.performance?.earnedValue),
      s: `${pct(d.progress?.workDonePct)} of the work earned`,
    },
    {
      l: "Cost efficiency",
      Icon: Gauge,
      v: cpi == null ? "—" : `₹${cpi.toFixed(2)}`,
      s: cpi == null ? "Needs approved spend" : "of work per ₹1 spent",
      b:
        cpi == null
          ? null
          : cpi >= 1
            ? ["good", "Efficient"]
            : cpi >= 0.9
              ? ["warn", "Slight leak"]
              : ["bad", "Leaking"],
    },
    {
      l: "Days left",
      Icon: CalendarDays,
      v: dl == null ? "—" : Math.max(0, dl),
      s: d.schedule?.endDate
        ? dl < 0
          ? `${-dl} days overdue`
          : `Due ${dShort(d.schedule.endDate)}`
        : "No end date set",
      b: dl != null && dl < 0 ? ["bad", "Overdue"] : null,
    },
  ];

  return (
    <div className={`${className} pi-kpis`}>
      {items.map((k) => (
        <BtCard key={k.l} className="pi-card" padding="18px 20px" style={{ overflow: "visible" }}>
          <div className="pi-kpi-top">
            <span className="pi-eyebrow">{k.l}</span>
            <span className="pi-kpi-ico" aria-hidden>
              <k.Icon size={15} strokeWidth={1.9} />
            </span>
          </div>
          <div className="pi-kpi-v">{k.v}</div>
          <div className="pi-kpi-s">{k.s}</div>
          {k.b && (
            <div style={{ marginTop: 10 }}>
              <Badge tone={k.b[0]}>{k.b[1]}</Badge>
            </div>
          )}
        </BtCard>
      ))}
    </div>
  );
}

// ── Attention ────────────────────────────────────────────────────────────────

export function Attention({ alerts = [], onPhase, className = "span-5" }) {
  const [all, setAll] = useState(false);
  const list = all ? alerts : alerts.slice(0, 4);

  return (
    <Card
      className={className}
      title="Needs attention"
      description={
        alerts.length
          ? `${alerts.length} flagged ${alerts.length === 1 ? "item" : "items"}, most urgent first`
          : "Nothing flagged right now"
      }
    >
      {alerts.length === 0 && (
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            padding: "16px 0 8px",
            fontSize: 14,
            color: "var(--ink-2)",
            lineHeight: 1.45,
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: TONE_SOFT.good,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={19} color={TONE_INK.good} aria-hidden />
          </span>
          <span>All phases and activities are operating within planned limits.</span>
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
          <Tag
            key={i}
            type={a.phaseId ? "button" : undefined}
            className="pi-alert"
            onClick={a.phaseId ? () => onPhase(a.phaseId) : undefined}
          >
            <span className="pi-alert-i" style={{ background: TONE_SOFT[s.tone] }}>
              <s.Icon size={18} color={TONE_INK[s.tone]} aria-hidden />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <div className="pi-alert-t">{a.title}</div>
              {detail && <div className="pi-alert-d">{detail}</div>}
            </span>
            {a.phaseId && <ChevronRight size={18} color="var(--ink-3)" aria-hidden />}
          </Tag>
        );
      })}

      {alerts.length > 4 && (
        <div style={{ marginTop: 12 }}>
          <BtButton variant="secondary" size="compact" onClick={() => setAll(!all)}>
            {all ? "Show less" : `Show all ${alerts.length}`}
          </BtButton>
        </div>
      )}
    </Card>
  );
}

// ── Budget bridge (variance waterfall) ───────────────────────────────────────

export function Bridge({ d, onPhase, className = "span-7" }) {
  const b = d.bridge;
  if (!b) return null;

  const rows = [];
  let run = 0;
  const add = (label, delta, extra = {}) => {
    rows.push({ label, from: run, to: run + delta, delta, ...extra });
    run += delta;
  };

  if (Math.abs(b.reserve) >= 1) {
    add("Unassigned reserve", b.reserve, { hint: "Budget not assigned to any phase" });
  }

  [...b.steps]
    .sort((x, y) => y.delta - x.delta)
    .forEach((s) => add(s.name, s.delta, { phaseId: s.phaseId }));

  if (Math.abs(b.untagged) >= 1) {
    add("Untagged spend", b.untagged, { hint: "Entries without a phase assignment" });
  }

  const lo = Math.min(0, ...rows.map((r) => Math.min(r.from, r.to)));
  const hi = Math.max(0, ...rows.map((r) => Math.max(r.from, r.to)));
  const span = hi - lo || 1;
  const x = (v) => ((v - lo) / span) * 100;
  const net = b.forecast - b.budget;

  return (
    <Card
      className={className}
      title="Budget bridge"
      description="How each phase moves the projected final cost away from the original budget. Click a phase for detail."
    >
      <div className="pi-total-row" style={{ borderBottom: "1px solid var(--line)" }}>
        <span style={{ fontSize: 14, color: "var(--ink-2)", fontWeight: 500 }}>Original budget</span>
        <b className="pi-num tnum" style={{ fontSize: 18, color: "var(--ink)" }}>
          {inr(b.budget)}
        </b>
      </div>

      <div style={{ padding: "8px 0" }}>
        {rows.map((r) => {
          const Tag = r.phaseId ? "button" : "div";
          const up = r.delta > 0;
          return (
            <Tag
              key={r.label}
              type={r.phaseId ? "button" : undefined}
              className="pi-bridge-row"
              onClick={r.phaseId ? () => onPhase(r.phaseId) : undefined}
            >
              <span style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</div>
                {r.hint && <div className="pi-cap">{r.hint}</div>}
              </span>
              <span className="pi-bridge-bar" title={`${r.label}: ${inr(r.delta, { sign: true })}`}>
                <span className="zero" style={{ left: `${x(0)}%` }} />
                <span
                  className="seg"
                  style={{
                    left: `${x(Math.min(r.from, r.to))}%`,
                    width: `max(3px, ${x(Math.max(r.from, r.to)) - x(Math.min(r.from, r.to))}%)`,
                    background: up ? PAL.bad : PAL.good,
                  }}
                />
              </span>
              <span
                className="pi-num tnum"
                style={{
                  textAlign: "right",
                  fontSize: 14,
                  color: up ? PAL.bad : PAL.good,
                }}
              >
                {inr(r.delta, { sign: true })}
              </span>
            </Tag>
          );
        })}
      </div>

      <div className="pi-total-row" style={{ borderTop: "1px solid var(--line)" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Forecast final cost</span>
        <b className="pi-num tnum" style={{ fontSize: 22, color: "var(--ink)" }}>
          {inr(b.forecast)}
        </b>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          fontWeight: 600,
          color: net > 0 ? PAL.bad : PAL.good,
        }}
      >
        {net > 0 ? <ArrowUpRight size={16} aria-hidden /> : <ArrowDownRight size={16} aria-hidden />}
        <span>
          {inr(Math.abs(net))} {net > 0 ? "over" : "under"} budget
        </span>
      </div>

      <Legend
        style={{ marginTop: 16 }}
        items={[
          { label: "Adds cost", color: PAL.bad },
          { label: "Saves cost", color: PAL.good },
        ]}
      />
    </Card>
  );
}

// ── Phase matrix ─────────────────────────────────────────────────────────────

const vPct = (planned, forecast) =>
  forecast == null || planned <= 0 ? null : ((forecast - planned) / planned) * 100;

function MatrixCell({ planned, actual, forecast, bold }) {
  if (planned <= 0 && actual <= 0) {
    return (
      <td className="cell" style={{ color: "var(--ink-3)", background: "var(--fill)" }}>
        —
      </td>
    );
  }
  const used = planned > 0 ? (actual / planned) * 100 : null;
  const vp = vPct(planned, forecast);
  const over = used != null && used > 100;

  return (
    <td
      className="cell"
      style={{ background: varianceFill(vp) }}
      title={`Spent ${inr(actual)} of ${inr(planned)}${
        forecast != null ? ` · heading to ${inr(forecast)}` : ""
      }`}
    >
      <div
        className="pi-cell-v"
        style={{
          fontWeight: bold || over ? 700 : 600,
          color: over ? PAL.bad : "var(--ink)",
        }}
      >
        {used == null ? inr(actual) : `${Math.round(used)}%`}
      </div>
      {vp != null && Math.abs(vp) >= 5 && actual > 0 && (
        <div className="pi-cell-f" style={{ color: vp > 0 ? PAL.bad : "var(--ink-2)" }}>
          {vp > 0 ? "▲" : "▼"} {Math.round(Math.abs(vp))}% at finish
        </div>
      )}
    </td>
  );
}

export function PhaseMatrix({ phases = [], onOpen, className = "span-7" }) {
  return (
    <Card
      className={className}
      title="Phase budgets"
      description="Number = % of each budget already spent. Colour = where it is heading at completion. Click a phase for detail."
    >
      <div className="pi-scroll">
        <table className="pi-matrix">
          <thead>
            <tr>
              <th>Phase</th>
              {CATS.map((c) => (
                <th key={c.key}>
                  <i className="pi-sw" style={{ background: c.color, marginRight: 6 }} aria-hidden />
                  {c.label}
                </th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((p) => {
              const s = PHASE[p.status] || PHASE.ok;
              return (
                <tr
                  key={p.id}
                  className="row"
                  tabIndex={0}
                  onClick={() => onOpen(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen(p);
                    }
                  }}
                >
                  <td className="name">
                    <div className="pi-matrix-n" style={{ fontWeight: 600, fontSize: 15 }}>
                      {p.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 13,
                        color: TONE_INK[s.tone],
                        fontWeight: 500,
                        marginTop: 2,
                      }}
                    >
                      <s.Icon size={13} aria-hidden /> {s.label} · {p.activitiesDone}/{p.activitiesTotal} done
                    </div>
                  </td>
                  {CATS.map((c) => (
                    <MatrixCell
                      key={c.key}
                      planned={p.planned?.[c.key] || 0}
                      actual={p.actual?.[c.key] || 0}
                      forecast={p.forecastByCat?.[c.key]}
                    />
                  ))}
                  <MatrixCell
                    planned={p.planned?.total || 0}
                    actual={p.actual?.total || 0}
                    forecast={p.forecast ?? (p.actual?.total === 0 ? p.planned?.total : null)}
                    bold
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pi-legend" style={{ marginTop: 16 }}>
        {[
          [-20, "Heading under"],
          [0, "On plan (±5%)"],
          [10, "5–15% over"],
          [20, "15%+ over"],
        ].map(([v, l]) => (
          <span key={l}>
            <i
              className="pi-sw"
              style={{
                background: varianceFill(v),
                width: 16,
                height: 16,
                border: "1px solid var(--input-border)",
              }}
              aria-hidden
            />
            {l}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ── Spend vs work dumbbell ───────────────────────────────────────────────────

export function SpendVsWork({ phases = [], onOpen, className = "span-5" }) {
  const rows = phases.filter((p) => p.status !== "not_started" && p.spentPct != null);
  const MAX = 125;
  const x = (v) => `${(Math.min(Math.max(v, 0), MAX) / MAX) * 100}%`;

  return (
    <Card
      className={className}
      title="Spend vs work, by phase"
      description="A red link means money is running ahead of the work delivered."
    >
      <Legend
        style={{ marginBottom: 12 }}
        items={[
          { label: "Work done", color: PAL.work, kind: "ring" },
          { label: "Budget spent", color: PAL.money, kind: "dot" },
          { label: "Spend ahead of work", color: PAL.bad, kind: "line" },
        ]}
      />

      {rows.length === 0 && (
        <p className="pi-cap" style={{ margin: "12px 0" }}>
          No phase has started spending yet.
        </p>
      )}

      {rows.map((p) => {
        const g = (p.spentPct || 0) - (p.earnedPct || 0);
        const ahead = g > 5;
        return (
          <button key={p.id} type="button" className="pi-bridge-row dumb" onClick={() => onOpen(p)}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
            <span className="pi-dumb" aria-hidden>
              {[0, 50, 100].map((t) => (
                <span
                  key={t}
                  className="tick"
                  style={{ left: x(t), background: t === 100 ? "var(--input-border)" : undefined }}
                />
              ))}
              <span
                className="link"
                style={{
                  left: x(Math.min(p.earnedPct || 0, p.spentPct || 0)),
                  width: `${(Math.abs(g) / MAX) * 100}%`,
                  background: ahead ? PAL.bad : "var(--input-border)",
                }}
              />
              <span
                className="dot"
                style={{
                  left: x(p.earnedPct || 0),
                  background: "var(--card)",
                  border: `2.5px solid ${PAL.work}`,
                }}
                title={`Work done ${pct(p.earnedPct)}`}
              />
              <span
                className="dot"
                style={{
                  left: x(p.spentPct || 0),
                  background: PAL.money,
                  border: "2px solid var(--card)",
                }}
                title={`Budget spent ${pct(p.spentPct)}`}
              />
            </span>
            <span
              style={{
                textAlign: "right",
                fontSize: 13,
                fontWeight: 600,
                color: ahead ? PAL.bad : "var(--ink-2)",
              }}
            >
              {Math.abs(g) < 3
                ? "In step"
                : g > 0
                  ? `Spend ${Math.round(g)} pts ahead`
                  : `Spend ${Math.round(-g)} pts behind`}
            </span>
          </button>
        );
      })}

      {rows.length > 0 && (
        <div className="pi-bridge-row dumb pi-axis-row" style={{ minHeight: 24 }}>
          <span className="pi-axis-gap" />
          <span className="pi-axis" aria-hidden>
            {[0, 50, 100].map((t) => (
              <span key={t} style={{ left: x(t) }}>
                {t}%
              </span>
            ))}
          </span>
          <span className="pi-axis-spacer" />
        </div>
      )}
    </Card>
  );
}

// ── Progress line ────────────────────────────────────────────────────────────

export function ProgressLine({ d, className = "span-5" }) {
  const spent = d.spend?.spentPct ?? 0;
  const work = d.progress?.workDonePct ?? 0;
  const time = d.schedule?.timeElapsedPct;
  const gap = spent - work;

  const items = [
    ["Work done", work, PAL.work],
    ["Money spent", spent, PAL.money],
    ...(time != null ? [["Time used", time, "var(--ink-3)"]] : []),
  ];

  const note =
    gap > 3
      ? `Money is ${gap.toFixed(0)} pts ahead of work: paying for work not yet delivered.`
      : gap < -3
        ? `Work is ${(-gap).toFixed(0)} pts ahead of money: good cost control.`
        : "Money and work are advancing in unison.";

  return (
    <Card
      className={className}
      title="Are we getting what we pay for?"
      description="Each marker shows completion as a % of the whole project."
    >
      <div style={{ padding: "8px 0" }}>
        {items.map(([l, v, c]) => (
          <div
            key={l}
            style={{
              display: "grid",
              gridTemplateColumns: "104px minmax(0, 1fr) 48px",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <span style={{ fontSize: 14, color: "var(--ink-2)", fontWeight: 500 }}>{l}</span>
            <span style={{ position: "relative", height: 18 }} aria-hidden>
              <span
                style={{
                  position: "absolute",
                  top: 7,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: "var(--fill)",
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 7,
                  left: 0,
                  width: `${Math.min(v, 100)}%`,
                  height: 4,
                  background: c,
                  opacity: 0.45,
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 1,
                  left: `calc(${Math.min(v, 100)}% - 8px)`,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: c,
                  border: "2.5px solid var(--card)",
                  boxShadow: "var(--shadow-card)",
                }}
              />
            </span>
            <b className="pi-num tnum" style={{ textAlign: "right", fontSize: 15, color: "var(--ink)" }}>
              {pct(v)}
            </b>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          gap: 10,
          padding: "12px 14px",
          borderRadius: "var(--r-tile)",
          background: gap > 3 ? TONE_SOFT.warn : "var(--fill)",
          fontSize: 14,
          color: "var(--ink-2)",
          lineHeight: 1.45,
        }}
      >
        {gap > 3 ? (
          <AlertTriangle size={18} color={TONE_INK.warn} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
        ) : (
          <TrendingUp size={18} color="var(--ink-3)" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
        )}
        <span>{note}</span>
      </div>
    </Card>
  );
}

// ── Spend curve ──────────────────────────────────────────────────────────────

export function SpendCurve({ d, className = "span-8" }) {
  const pts = d.timeline?.cumulative;
  if (!pts || pts.length < 2) {
    return (
      <Card className={className} title="Spend curve">
        <BtEmpty
          icon={LineChartIcon}
          title="No spend curve yet"
          message="Add a start and end date to the project to see planned vs actual spend."
          style={{ padding: "24px 16px" }}
        />
      </Card>
    );
  }

  const lastActual = [...pts].reverse().find((p) => p.actual != null);
  const fcEnd = d.bridge?.forecast ?? d.performance?.eac;
  const end = d.schedule?.endDate;
  const data = pts.map((p) => ({
    t: new Date(p.date).getTime(),
    planned: p.planned,
    actual: p.actual,
  }));

  if (lastActual && fcEnd != null && end && new Date(end) > new Date(lastActual.date)) {
    const i = data.findIndex((r) => r.t === new Date(lastActual.date).getTime());
    if (i >= 0) data[i].forecast = lastActual.actual;
    const endT = new Date(end).getTime();
    const j = data.findIndex((r) => r.t === endT);
    if (j >= 0) data[j].forecast = fcEnd;
    else data.push({ t: endT, forecast: fcEnd });
  }

  const t0 = data[0].t;
  const t1 = Math.max(...data.map((r) => r.t));
  const monthsSpan = (t1 - t0) / (30 * 864e5);
  const step = monthsSpan > 14 ? 4 : monthsSpan > 7 ? 2 : 1;
  const ticks = [];
  for (
    let m = new Date(new Date(t0).getFullYear(), new Date(t0).getMonth() + 1, 1);
    m.getTime() <= t1;
    m.setMonth(m.getMonth() + step)
  ) {
    ticks.push(m.getTime());
  }

  const pvToday = lastActual
    ? data.filter((r) => r.t <= new Date(lastActual.date).getTime() && r.planned != null).pop()?.planned
    : null;
  const diff = lastActual && pvToday != null ? lastActual.actual - pvToday : null;

  return (
    <Card
      className={className}
      title="Spend curve"
      description={
        diff == null
          ? "Cumulative spend vs the planned S-curve"
          : `Spend is ${inr(Math.abs(diff))} ${diff >= 0 ? "ahead of" : "behind"} the plan to date`
      }
    >
      <Legend
        items={[
          { label: "Actual", color: PAL.money, kind: "line" },
          { label: "Planned", color: PAL.plan, kind: "dash" },
          { label: "Forecast", color: PAL.forecast, kind: "dash" },
          { label: "Budget", color: PAL.budget, kind: "dash" },
        ]}
      />
      <div style={{ height: 320, marginTop: 12 }} role="img" aria-label="Cumulative spend against plan, forecast and budget">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="piArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PAL.money} stopOpacity={0.28} />
                <stop offset="100%" stopColor={PAL.money} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={PAL.grid} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={ticks}
              tickFormatter={monYY}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tickFormatter={(v) => inr(v)} tick={AXIS_TICK} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              cursor={{ stroke: "var(--input-border)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <Tip>
                    <b>{dShort(label)}</b>
                    {payload
                      .filter((p) => p.value != null)
                      .map((p) => (
                        <div className="row" key={p.dataKey}>
                          <i className="pi-sw" style={{ background: p.stroke }} aria-hidden />
                          {p.name}
                          <em>{inr(p.value)}</em>
                        </div>
                      ))}
                  </Tip>
                ) : null
              }
            />
            <ReferenceLine
              y={d.budget?.total}
              stroke={PAL.budget}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{
                value: "Budget",
                position: "insideTopLeft",
                fill: PAL.budgetInk,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-ui)",
              }}
            />
            {lastActual && (
              <ReferenceLine
                x={new Date(lastActual.date).getTime()}
                stroke="var(--input-border)"
                strokeDasharray="3 3"
                label={{
                  value: "Today",
                  position: "insideTopRight",
                  fill: "var(--ink-3)",
                  fontSize: 13,
                  fontFamily: "var(--font-ui)",
                }}
              />
            )}
            <Line
              name="Planned"
              dataKey="planned"
              stroke={PAL.plan}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              type="monotone"
              connectNulls
            />
            <Area
              name="Actual"
              dataKey="actual"
              stroke={PAL.money}
              strokeWidth={2.5}
              fill="url(#piArea)"
              type="monotone"
              dot={false}
              connectNulls={false}
            />
            <Line
              name="Forecast"
              dataKey="forecast"
              stroke={PAL.forecast}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3.5, fill: PAL.forecast, stroke: "var(--card)", strokeWidth: 1 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ── Monthly spend ────────────────────────────────────────────────────────────

export function Monthly({ d, className = "span-6" }) {
  const months = (d.timeline?.monthly || []).map((m) => ({
    ...m,
    label: new Date(`${m.month}-01`).toLocaleDateString("en-IN", { month: "short" }),
  }));
  const last3 = months.slice(-3);
  const avg = last3.length === 3 ? last3.reduce((s, m) => s + m.total, 0) / 3 : null;

  return (
    <Card
      className={className}
      title="Monthly spend"
      description={avg == null ? "Approved spend by month" : `Last 3 months average ${inr(avg)} / month`}
    >
      {months.length === 0 ? (
        <BtEmpty
          icon={BarChart3}
          title="No monthly spend yet"
          message="Approved entries will show up here month by month."
          style={{ padding: "24px 16px" }}
        />
      ) : (
        <>
          <Legend items={CAT_LEGEND} />
          <div style={{ height: 280, marginTop: 12 }} role="img" aria-label="Approved spend by month, stacked by cost type">
            <ResponsiveContainer>
              <BarChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke={PAL.grid} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => inr(v)} tick={AXIS_TICK} axisLine={false} tickLine={false} width={64} />
                <Tooltip
                  cursor={{ fill: "var(--fill)", fillOpacity: 0.6 }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <Tip>
                        <b>
                          {monYY(`${payload[0].payload.month}-01`)} · {inr(payload[0].payload.total)}
                        </b>
                        {CATS.map((c) => (
                          <div className="row" key={c.key}>
                            <i className="pi-sw" style={{ background: c.color }} aria-hidden />
                            {c.label}
                            <em>{inr(payload[0].payload[c.key])}</em>
                          </div>
                        ))}
                      </Tip>
                    ) : null
                  }
                />
                {CATS.map((c, i) => (
                  <Bar
                    key={c.key}
                    dataKey={c.key}
                    name={c.label}
                    stackId="m"
                    fill={c.color}
                    stroke="var(--card)"
                    strokeWidth={1.5}
                    radius={i === CATS.length - 1 ? [4, 4, 0, 0] : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}

// ── Cost mix ─────────────────────────────────────────────────────────────────

export function Mix({ d, className = "span-4" }) {
  const bc = d.budget?.byCategory || {};
  const tot = (k) => CATS.reduce((s, c) => s + (bc[c.key]?.[k] || 0), 0);

  const bar = (k) => {
    const t = tot(k);
    return (
      <div className="pi-stack" aria-label={`${k} mix`}>
        {t <= 0 ? (
          <div style={{ flex: 1, background: "var(--fill)", color: "var(--ink-3)", fontWeight: 500 }}>None yet</div>
        ) : (
          CATS.map((c) => {
            const v = bc[c.key]?.[k] || 0;
            if (v <= 0) return null;
            const share = v / t;
            return (
              <div
                key={c.key}
                style={{ flex: share, background: c.color }}
                title={`${c.label} ${Math.round(share * 100)}%`}
              >
                {share >= 0.12 ? `${Math.round(share * 100)}%` : ""}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <Card
      className={className}
      title="Cost mix"
      description="Allocated budget plan vs actual approved spend."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "52px minmax(0, 1fr)",
          gap: "12px 10px",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <span style={{ fontSize: 14, color: "var(--ink-2)", fontWeight: 600 }}>Plan</span>
        {bar("planned")}
        <span style={{ fontSize: 14, color: "var(--ink-2)", fontWeight: 600 }}>Actual</span>
        {bar("actual")}
      </div>

      <Legend items={CAT_LEGEND} style={{ marginBottom: 14 }} />

      <div className="pi-scroll" style={{ marginTop: "auto" }}>
        <table className="pi-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Spent</th>
              <th>Budget</th>
              <th>Used</th>
            </tr>
          </thead>
          <tbody>
            {CATS.map((c) => {
              const v = bc[c.key] || { planned: 0, actual: 0 };
              const used = v.planned > 0 ? (v.actual / v.planned) * 100 : null;
              return (
                <tr key={c.key}>
                  <td>
                    <i className="pi-sw" style={{ background: c.color, marginRight: 8 }} aria-hidden />
                    {c.label}
                  </td>
                  <td className="pi-num tnum" style={{ fontSize: 14 }}>
                    {inr(v.actual)}
                  </td>
                  <td className="pi-num tnum" style={{ fontSize: 14, color: "var(--ink-2)", fontWeight: 500 }}>
                    {inr(v.planned)}
                  </td>
                  <td
                    className="pi-num tnum"
                    style={{ fontSize: 14, color: used != null && used > 100 ? PAL.bad : "var(--ink)" }}
                  >
                    {used != null ? pct(used) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Cash ─────────────────────────────────────────────────────────────────────

export function Cash({ d, className = "span-6" }) {
  const s = d.spend || {};
  const paid = s.paid || 0;
  const outstanding = s.outstanding || 0;
  const pendingApproval = s.pendingApproval || 0;
  const income = s.income || 0;
  const owed = paid + outstanding;
  const net = income - paid;

  const rows = [
    ["Paid out", inr(paid), TONE_INK.good, CheckCircle2],
    ["Still owed to vendors", inr(outstanding), TONE_INK.warn, Clock],
    ["Awaiting approval", inr(pendingApproval), "var(--ink-2)", CircleDot, `${s.pendingCount || 0} entries`],
    ["Received from client", inr(income), "var(--ink-2)", ArrowDownRight],
    [
      net >= 0 ? "Cash in hand" : "Funding gap",
      inr(Math.abs(net)),
      net >= 0 ? TONE_INK.good : TONE_INK.bad,
      Circle,
      "Client income minus paid out",
    ],
  ];

  return (
    <Card
      className={className}
      title="Cash position"
      description="Ledger of approved and incoming entries."
    >
      {owed > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="pi-stack" style={{ height: 12 }}>
            <div style={{ flex: paid / owed, background: "var(--status-success-bright)" }} />
            <div style={{ flex: outstanding / owed, background: "var(--status-warning-bright)" }} />
          </div>
          <div className="pi-cap" style={{ margin: "8px 0 0" }}>
            {Math.round((paid / owed) * 100)}% of approved bills paid
          </div>
        </div>
      )}

      {rows.map((row) => {
        const [l, v, c, RowIcon, sub] = row;
        return (
          <div key={l} className="pi-row">
            <RowIcon size={18} color={c} aria-hidden style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{l}</div>
              {sub && <div className="pi-cap">{sub}</div>}
            </span>
            <b className="pi-num tnum" style={{ fontSize: 17, color: c === "var(--ink-2)" ? "var(--ink)" : c }}>
              {v}
            </b>
          </div>
        );
      })}
    </Card>
  );
}

// ── Suppliers ────────────────────────────────────────────────────────────────

export function Suppliers({ list = [], className = "span-12" }) {
  const top = list[0]?.amount || 1;

  return (
    <Card className={className} title="Top suppliers" description="Ranked by total approved spend.">
      {list.length === 0 && (
        <BtEmpty
          icon={Users}
          title="No suppliers yet"
          message="Add supplier or vendor names to entries to see vendor concentration."
          style={{ padding: "24px 16px" }}
        />
      )}
      {list.map((s, i) => (
        <div key={s.name} className="pi-sup">
          <span className="pi-eyebrow" style={{ fontSize: 13 }}>
            {i + 1}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", minWidth: 0, overflowWrap: "anywhere" }}>
            {s.name}
          </span>
          <div className="pi-progress pi-sup-bar" aria-hidden>
            <div style={{ width: `${(s.amount / top) * 100}%` }} />
          </div>
          <b className="pi-num tnum" style={{ fontSize: 15, textAlign: "right" }}>
            {inr(s.amount)}
          </b>
          <span className="pi-cap pi-sup-count" style={{ textAlign: "right" }}>
            {s.count} {s.count === 1 ? "entry" : "entries"}
          </span>
        </div>
      ))}
    </Card>
  );
}

// ── Phase sheet ──────────────────────────────────────────────────────────────

export function PhaseSheet({ phase, onClose }) {
  const sheetRef = useRef(null);

  // Focus the dialog when it opens, give focus back when it closes, lock page scroll.
  useEffect(() => {
    if (!phase) return undefined;
    const prev = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.querySelector("button[aria-label='Close phase detail']")?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [phase?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!phase) return null;
  const s = PHASE[phase.status] || PHASE.ok;
  const fv = phase.forecast == null ? null : phase.forecast - (phase.planned?.total || 0);

  const chart = CATS.map((c) => ({
    name: c.label,
    color: c.color,
    Budget: phase.planned?.[c.key] || 0,
    Spent: phase.actual?.[c.key] || 0,
    Forecast: phase.forecastByCat?.[c.key] ?? 0,
  }));

  const stats = [
    ["Budget", inr(phase.planned?.total)],
    ["Spent", inr(phase.actual?.total), pct(phase.spentPct)],
    ["Forecast", inr(phase.forecast), fv == null ? null : inr(fv, { sign: true }), fv > 0 ? PAL.bad : PAL.good],
  ];

  // Keep Tab inside the dialog while it is open.
  const trapTab = (e) => {
    if (e.key !== "Tab") return;
    const f = sheetRef.current?.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])");
    if (!f || f.length === 0) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Rendered into <body> so it sits above the app header and sidebar, whatever the page scroll.
  return createPortal(
    <div className="pi-portal">
      <div className="pi-overlay" onClick={onClose} />
      <aside
        ref={sheetRef}
        className="pi-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${phase.name} detail`}
        onKeyDown={trapTab}
      >
        <div className="pi-sheet-h">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pi-eyebrow" style={{ marginBottom: 6 }}>
              Phase detail
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                overflowWrap: "anywhere",
              }}
            >
              {phase.name}
            </h2>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
              <Badge tone={s.tone} Icon={s.Icon}>
                {s.label}
              </Badge>
              <span style={{ fontSize: 14, color: "var(--ink-2)" }}>
                {phase.activitiesDone} of {phase.activitiesTotal} activities done
              </span>
            </div>
          </div>
          <BtIconButton icon={X} label="Close phase detail" onClick={onClose} />
        </div>

        <div className="pi-sheet-b">
          <div className="pi-sheet-stats">
            {stats.map(([l, v, sub, c]) => (
              <BtCard key={l} padding="14px 16px" className="pi-card" style={{ overflow: "visible" }}>
                <div className="pi-eyebrow">{l}</div>
                <div className="pi-num tnum pi-stat-v" style={{ marginTop: 6, color: "var(--ink)" }}>
                  {v}
                </div>
                {sub && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: c || "var(--ink-2)", marginTop: 2 }}>{sub}</div>
                )}
              </BtCard>
            ))}
          </div>

          <Card
            title="Budget vs spent vs forecast"
            description="Per cost category, coloured by type."
          >
            <Legend
              items={[
                { label: "Budget", color: "var(--slate)" },
                { label: "Spent (solid)", color: "var(--ink-2)" },
                { label: "Forecast at finish (outlined)", color: "var(--ink-2)", kind: "outline" },
              ]}
            />
            <div style={{ height: 240, marginTop: 12 }} role="img" aria-label="Budget, spent and forecast per cost category">
              <ResponsiveContainer>
                <BarChart data={chart} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid vertical={false} stroke={PAL.grid} />
                  <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => inr(v)} tick={AXIS_TICK} axisLine={false} tickLine={false} width={60} />
                  <Tooltip
                    cursor={{ fill: "var(--fill)", fillOpacity: 0.6 }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <Tip>
                          <b>{label}</b>
                          {payload.map((p) => (
                            <div className="row" key={p.dataKey}>
                              {p.dataKey}
                              <em>{inr(p.value)}</em>
                            </div>
                          ))}
                        </Tip>
                      ) : null
                    }
                  />
                  <Bar dataKey="Budget" fill="var(--slate)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Spent" radius={[4, 4, 0, 0]}>
                    {chart.map((r) => (
                      <Cell key={r.name} fill={r.color} />
                    ))}
                  </Bar>
                  <Bar dataKey="Forecast" radius={[4, 4, 0, 0]}>
                    {chart.map((r) => (
                      <Cell key={r.name} fill={r.color} fillOpacity={0.18} stroke={r.color} strokeWidth={1.5} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card
            title="Activities"
            description="Coloured bar = spent so far, by cost type. Black tick = the activity budget."
          >
            {(phase.activities || []).length === 0 && (
              <p className="pi-cap" style={{ margin: 0 }}>
                No activities in this phase yet.
              </p>
            )}
            {(phase.activities || []).map((a, idx) => {
              const used = a.planned?.total > 0 ? ((a.actual?.total || 0) / a.planned.total) * 100 : null;
              const over = used != null && used > 100;
              const started = (a.actual?.total || 0) > 0;
              const [Icon, col, lbl] = a.completed
                ? [CheckCircle2, TONE_INK.good, "Done"]
                : started
                  ? [CircleDot, "var(--accent-ink)", "In progress"]
                  : [Circle, "var(--ink-3)", "Not started"];
              const scale = Math.max(a.planned?.total || 0, a.actual?.total || 0) || 1;

              return (
                <div
                  key={a.id}
                  style={{ borderTop: idx === 0 ? "none" : "1px solid var(--line)", padding: "14px 0" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon size={18} color={col} aria-hidden style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "var(--ink)", minWidth: 0 }}>
                      {a.name}
                    </span>
                    {used != null && <Badge tone={over ? "bad" : "muted"}>{Math.round(used)}%</Badge>}
                  </div>
                  <div style={{ paddingLeft: 28, fontSize: 13, color: "var(--ink-2)", margin: "4px 0 8px" }}>
                    {inr(a.actual?.total)} of {inr(a.planned?.total)} · {lbl}
                  </div>
                  <div style={{ marginLeft: 28, position: "relative", height: 8 }} aria-hidden>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: `${((a.planned?.total || 0) / scale) * 100}%`,
                        background: "var(--fill)",
                        borderRadius: 3,
                      }}
                    />
                    <div style={{ position: "absolute", inset: 0, display: "flex", gap: 2 }}>
                      {CATS.map(
                        (c) =>
                          (a.actual?.[c.key] || 0) > 0 && (
                            <div
                              key={c.key}
                              style={{
                                width: `${((a.actual[c.key] || 0) / scale) * 100}%`,
                                background: c.color,
                                borderRadius: 3,
                              }}
                            />
                          )
                      )}
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        top: -3,
                        bottom: -3,
                        left: `calc(${((a.planned?.total || 0) / scale) * 100}% - 1px)`,
                        width: 2,
                        background: "var(--ink)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </aside>
    </div>,
    document.body
  );
}
