import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart } from "recharts";

const fmtINR = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

const COLORS = {
  material: "#F97316",
  labour: "#EA580C",
  equipment: "#0891b2",
  misc: "#6b7280",
  budget: "#dc2626",
  actual: "#FB923C",
};

export function SpendVsBudgetChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 13 }}>
        No data available for chart
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.actual} stopOpacity={0.15} />
              <stop offset="95%" stopColor={COLORS.actual} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="category" tick={{ fontSize: 12, fill: "#666" }} />
          <YAxis tickFormatter={fmtINR} tick={{ fontSize: 11, fill: "#888" }} width={60} />
          <Tooltip
            formatter={(value, name) => [fmtINR(value), name === "actual" ? "Actual Spent" : "Budget"]}
            contentStyle={{ borderRadius: 10, border: "1px solid #e5e5e5", fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
          <Area type="monotone" dataKey="budget" stroke={COLORS.budget} strokeWidth={2} strokeDasharray="6 3" fill="none" name="Budget" />
          <Area type="monotone" dataKey="actual" stroke={COLORS.actual} strokeWidth={2.5} fill="url(#gradActual)" name="Actual Spent" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 13 }}>
        No trend data available
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 250 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} />
          <YAxis tickFormatter={fmtINR} tick={{ fontSize: 11, fill: "#888" }} width={60} />
          <Tooltip
            formatter={(value, name) => [fmtINR(value), name === "income" ? "Income" : "Expenses"]}
            contentStyle={{ borderRadius: 10, border: "1px solid #e5e5e5", fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
          <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: "#16a34a" }} name="Income" />
          <Line type="monotone" dataKey="expenses" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4, fill: "#dc2626" }} name="Expenses" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryPieChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 13 }}>
        No category data
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "10px 0" }}>
      <div style={{ flex: 1, height: 180 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <Tooltip
              formatter={(value, name) => [fmtINR(value), name]}
              contentStyle={{ borderRadius: 10, border: "1px solid #e5e5e5", fontSize: 13 }}
            />
            <Area type="monotone" dataKey="value" stroke="none" fill="#F97316" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: "#555", flex: 1 }}>{d.name}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
