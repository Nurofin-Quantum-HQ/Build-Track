import React from "react";

const fmtINR = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
};

export function MetricCard({ icon, label, value, budget, color = "var(--ink, #111317)", trend }) {
  const pct = budget > 0 ? Math.round((value / budget) * 100) : 0;
  const isOver = value > budget && budget > 0;
  const remaining = budget - value;

  return (
    <div
      style={{
        background: "var(--card-bg, #FFFFFF)",
        borderRadius: 16,
        border: "1px solid var(--border, #E2E8F0)",
        padding: "18px 20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${color}15`,
              color: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            {icon}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {label}
          </div>
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--ink, #111317)",
            marginBottom: 8,
            fontFamily: "JetBrains Mono, monospace",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtINR(value)}
        </div>
      </div>

      {budget > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11 }}>
            <span style={{ color: "#64748B", fontVariantNumeric: "tabular-nums" }}>Budget: {fmtINR(budget)}</span>
            <span style={{ fontWeight: 700, color: isOver ? "#DC2626" : "#16A34A", fontVariantNumeric: "tabular-nums" }}>
              {isOver ? `+${pct - 100}% over` : `${100 - pct}% rem`}
            </span>
          </div>
          <div style={{ height: 5, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(pct, 100)}%`,
                height: "100%",
                background: isOver ? "#DC2626" : color,
                borderRadius: 4,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          {isOver && (
            <div style={{ fontSize: 11, color: "#DC2626", marginTop: 4, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              Exceeded by {fmtINR(Math.abs(remaining))}
            </div>
          )}
          {!isOver && remaining > 0 && (
            <div style={{ fontSize: 11, color: "#16A34A", marginTop: 4, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              Remaining: {fmtINR(remaining)}
            </div>
          )}
        </div>
      )}
      {trend && (
        <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>
          {trend}
        </div>
      )}
    </div>
  );
}

export function CategoryBudgetBar({ name, spent, budget, color = "var(--ink, #111317)" }) {
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const isOver = spent > budget && budget > 0;
  const barColor = pct > 100 ? "#DC2626" : pct > 75 ? "#E0A93B" : color;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #111317)" }}>{name}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: isOver ? "#DC2626" : "#64748B", fontVariantNumeric: "tabular-nums" }}>
          {fmtINR(spent)} {budget > 0 ? `/ ${fmtINR(budget)}` : ""}
        </span>
      </div>
      <div style={{ height: 6, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: "100%",
            background: barColor,
            borderRadius: 4,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: "#64748B" }}>{pct}% utilized</span>
        {isOver ? (
          <span style={{ color: "#DC2626", fontWeight: 700 }}>Exceeded by {fmtINR(spent - budget)}</span>
        ) : budget > 0 ? (
          <span style={{ color: "#16A34A", fontWeight: 600 }}>Remaining {fmtINR(budget - spent)}</span>
        ) : null}
      </div>
    </div>
  );
}
