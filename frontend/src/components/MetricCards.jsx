import React from "react";

// Compact rupees: ₹45 L, ₹1.81 Cr, ₹27.1 k
const fmtINR = (n) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 10000000) return `${sign}₹${(a / 10000000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (a >= 100000) return `${sign}₹${(a / 100000).toFixed(2).replace(/\.?0+$/, "")} L`;
  if (a >= 1000) return `${sign}₹${(a / 1000).toFixed(1).replace(/\.0$/, "")} k`;
  return `${sign}₹${Math.round(a).toLocaleString("en-IN")}`;
};

const eyebrow = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

// `color` may be a token (var(--type-labour)) or a legacy hex passed by a page.
const soft = (color) => `color-mix(in srgb, ${color} 14%, transparent)`;

export function MetricCard({ icon, label, value, budget, color = "var(--ink)", trend }) {
  const pct = budget > 0 ? Math.round((value / budget) * 100) : 0;
  const isOver = value > budget && budget > 0;
  const remaining = budget - value;

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: "var(--r-card)",
        border: "1px solid var(--line)",
        padding: "18px 20px",
        boxShadow: "var(--shadow-card)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        fontFamily: "var(--font-ui)",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--r-chip)",
              background: soft(color),
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div style={eyebrow}>{label}</div>
        </div>
        <div
          className="tnum"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            marginBottom: 8,
            lineHeight: 1.1,
          }}
        >
          {fmtINR(value)}
        </div>
      </div>

      {budget > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, fontSize: 13 }}>
            <span className="tnum" style={{ color: "var(--ink-2)" }}>
              Budget {fmtINR(budget)}
            </span>
            <span
              className="tnum"
              style={{ fontWeight: 600, color: isOver ? "var(--status-danger)" : "var(--status-success)" }}
            >
              {isOver ? `${pct - 100}% over` : `${100 - pct}% left`}
            </span>
          </div>
          <div style={{ height: 8, background: "var(--fill)", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(pct, 100)}%`,
                height: "100%",
                background: isOver ? "var(--status-danger)" : color,
                borderRadius: 4,
                transition: "width 0.4s var(--ease)",
              }}
            />
          </div>
          {isOver && (
            <div className="tnum" style={{ fontSize: 13, color: "var(--status-danger)", marginTop: 6, fontWeight: 600 }}>
              Over by {fmtINR(Math.abs(remaining))}
            </div>
          )}
          {!isOver && remaining > 0 && (
            <div className="tnum" style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
              {fmtINR(remaining)} remaining
            </div>
          )}
        </div>
      )}
      {trend && <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 8 }}>{trend}</div>}
    </div>
  );
}

export function CategoryBudgetBar({ name, spent, budget, color = "var(--ink)" }) {
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const isOver = spent > budget && budget > 0;
  const barColor = pct > 100 ? "var(--status-danger)" : pct > 75 ? "var(--status-warning-bright)" : color;

  return (
    <div style={{ marginBottom: 18, fontFamily: "var(--font-ui)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{name}</span>
        <span
          className="tnum"
          style={{ fontSize: 14, fontWeight: 600, color: isOver ? "var(--status-danger)" : "var(--ink-2)", whiteSpace: "nowrap" }}
        >
          {fmtINR(spent)} {budget > 0 ? `/ ${fmtINR(budget)}` : ""}
        </span>
      </div>
      <div style={{ height: 8, background: "var(--fill)", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: "100%",
            background: barColor,
            borderRadius: 4,
            transition: "width 0.4s var(--ease)",
          }}
        />
      </div>
      <div className="tnum" style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 6, fontSize: 13 }}>
        <span style={{ color: "var(--ink-2)" }}>{pct}% used</span>
        {isOver ? (
          <span style={{ color: "var(--status-danger)", fontWeight: 600 }}>Over by {fmtINR(spent - budget)}</span>
        ) : budget > 0 ? (
          <span style={{ color: "var(--ink-2)" }}>{fmtINR(budget - spent)} remaining</span>
        ) : null}
      </div>
    </div>
  );
}
