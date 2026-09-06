const fmtINR = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Number(n).toLocaleString("en-IN")}`;
};

export function MetricCard({ icon, label, value, budget, color = "#F97316", trend }) {
  const pct = budget > 0 ? Math.round((value / budget) * 100) : 0;
  const isOver = value > budget && budget > 0;
  const remaining = budget - value;

  return (
    <div className="glass-card" style={{
      padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}15`, display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>
          {icon}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>
        {fmtINR(value)}
      </div>
      {budget > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#aaa" }}>Budget: {fmtINR(budget)}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: isOver ? "#dc2626" : "#16a34a" }}>
              {isOver ? `+${pct - 100}% over` : `${100 - pct}% remaining`}
            </span>
          </div>
          <div style={{ height: 6, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(pct, 100)}%`, height: "100%",
              background: isOver ? "#dc2626" : color,
              borderRadius: 4, transition: "width 0.4s ease",
            }} />
          </div>
          {isOver && (
            <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4, fontWeight: 600 }}>
              Exceeded by {fmtINR(Math.abs(remaining))}
            </div>
          )}
          {!isOver && remaining > 0 && (
            <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>
              Remaining: {fmtINR(remaining)}
            </div>
          )}
        </div>
      )}
      {trend && (
        <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
          {trend}
        </div>
      )}
    </div>
  );
}

export function CategoryBudgetBar({ name, spent, budget, color }) {
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const isOver = spent > budget && budget > 0;
  const barColor = pct > 100 ? "#dc2626" : pct > 75 ? "#f59e0b" : color;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>{name}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: isOver ? "#dc2626" : "#555" }}>
          {fmtINR(spent)} {budget > 0 ? `/ ${fmtINR(budget)}` : ""}
        </span>
      </div>
      <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`, height: "100%",
          background: barColor, borderRadius: 4, transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "#aaa" }}>{pct}% utilized</span>
        {isOver ? (
          <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Exceeded by {fmtINR(spent - budget)}</span>
        ) : budget > 0 ? (
          <span style={{ fontSize: 11, color: "#16a34a" }}>Remaining {fmtINR(budget - spent)}</span>
        ) : null}
      </div>
    </div>
  );
}
