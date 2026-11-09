import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// ── Shared chart theme (all colours are design tokens) ───────────────────────
const fmtINR = (n) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 10000000) return `${sign}₹${(a / 10000000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (a >= 100000) return `${sign}₹${(a / 100000).toFixed(2).replace(/\.?0+$/, "")} L`;
  if (a >= 1000) return `${sign}₹${(a / 1000).toFixed(1).replace(/\.0$/, "")} k`;
  return `${sign}₹${Math.round(a)}`;
};

const SERIES = {
  budget: "var(--slate)",
  actual: "var(--steel)",
  income: "var(--type-income)",
  expenses: "var(--status-danger)",
};

const GRID = "var(--line)";
const TICK = { fontSize: 13, fill: "var(--ink-3)", fontFamily: "var(--font-ui)" };
const FALLBACK = ["var(--type-material)", "var(--type-labour)", "var(--type-equipment)", "var(--steel)", "var(--slate)"];

function ChartEmpty({ children }) {
  return (
    <div
      style={{
        padding: "40px 16px",
        textAlign: "center",
        color: "var(--ink-3)",
        fontSize: 14,
        fontFamily: "var(--font-ui)",
      }}
    >
      {children}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px 16px",
        fontSize: 13,
        color: "var(--ink-2)",
        fontFamily: "var(--font-ui)",
        marginBottom: 12,
      }}
    >
      {items.map((it) => (
        <span key={it.label} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <i
            aria-hidden
            style={{
              width: it.line ? 18 : 10,
              height: it.line ? 3 : 10,
              borderRadius: it.line ? 2 : 3,
              background: it.color,
              display: "inline-block",
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Tooltip styled like the rest of the app: dark card, one row per series. */
function makeTip(rename) {
  return function Tip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: "var(--noir-2)",
          color: "var(--on-noir)",
          border: "1px solid var(--noir-line)",
          borderRadius: "var(--r-tile)",
          boxShadow: "var(--shadow-raised)",
          padding: "10px 14px",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          minWidth: 150,
        }}
      >
        {label != null && label !== "" && <b style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>{label}</b>}
        {payload.map((p) => (
          <div
            key={p.dataKey ?? p.name}
            style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--on-noir-2)", marginTop: 3 }}
          >
            <i
              aria-hidden
              style={{ width: 10, height: 10, borderRadius: 3, background: p.color || p.fill || p.stroke, display: "inline-block" }}
            />
            {rename ? rename(p) : p.name}
            <span style={{ marginLeft: "auto", paddingLeft: 12, color: "var(--on-noir)", fontWeight: 600 }}>
              {fmtINR(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };
}

const SpendTip = makeTip((p) => (p.dataKey === "actual" ? "Actual paid" : "Budget"));
const TrendTip = makeTip((p) => (p.dataKey === "income" ? "Income" : "Expenses"));
const PieTip = makeTip((p) => p.name);

// ── Spend vs budget: grouped bars per category ───────────────────────────────
// data: [{ category, budget, actual }]
export function SpendVsBudgetChart({ data }) {
  if (!data || data.length === 0) {
    return <ChartEmpty>No data available for chart</ChartEmpty>;
  }

  return (
    <div>
      <Legend
        items={[
          { label: "Budget", color: SERIES.budget },
          { label: "Actual paid", color: SERIES.actual },
        ]}
      />
      <div
        style={{ width: "100%", height: 280 }}
        role="img"
        aria-label="Budget compared with actual spend for each category"
      >
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="category" tick={TICK} axisLine={false} tickLine={false} interval={0} />
            <YAxis tickFormatter={fmtINR} tick={TICK} axisLine={false} tickLine={false} width={64} />
            <Tooltip cursor={{ fill: "var(--fill)", fillOpacity: 0.6 }} content={<SpendTip />} />
            <Bar dataKey="budget" name="Budget" fill={SERIES.budget} radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" name="Actual Spent" fill={SERIES.actual} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Monthly trend: income vs expenses ────────────────────────────────────────
// data: [{ month, income, expenses }]
export function MonthlyTrendChart({ data }) {
  if (!data || data.length === 0) {
    return <ChartEmpty>No trend data available</ChartEmpty>;
  }

  return (
    <div>
      <Legend
        items={[
          { label: "Income", color: SERIES.income, line: true },
          { label: "Expenses", color: SERIES.expenses, line: true },
        ]}
      />
      <div style={{ width: "100%", height: 250 }} role="img" aria-label="Income and expenses by month">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="month" tick={TICK} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtINR} tick={TICK} axisLine={false} tickLine={false} width={64} />
            <Tooltip cursor={{ stroke: "var(--input-border)" }} content={<TrendTip />} />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke={SERIES.income}
              strokeWidth={2.5}
              dot={{ r: 4, fill: SERIES.income, stroke: "var(--card)", strokeWidth: 1.5 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke={SERIES.expenses}
              strokeWidth={2.5}
              strokeDasharray="6 4"
              dot={{ r: 4, fill: SERIES.expenses, stroke: "var(--card)", strokeWidth: 1.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Category share: donut + legend ───────────────────────────────────────────
// data: [{ name, value, color }]
export function CategoryPieChart({ data }) {
  if (!data || data.length === 0) {
    return <ChartEmpty>No category data</ChartEmpty>;
  }

  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const colorOf = (d, i) => d.color || FALLBACK[i % FALLBACK.length];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "10px 0", flexWrap: "wrap" }}>
      <div
        style={{ flex: "1 1 180px", height: 190, minWidth: 160 }}
        role="img"
        aria-label="Share of spend by category"
      >
        <ResponsiveContainer>
          <PieChart>
            <Tooltip content={<PieTip />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {data.map((d, i) => (
                <Cell key={d.name ?? i} fill={colorOf(d, i)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 160px", minWidth: 160 }}>
        {data.map((d, i) => (
          <div key={d.name ?? i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <i
              aria-hidden
              style={{ width: 10, height: 10, borderRadius: 3, background: colorOf(d, i), flexShrink: 0, display: "inline-block" }}
            />
            <div style={{ fontSize: 14, color: "var(--ink-2)", flex: 1, fontFamily: "var(--font-ui)" }}>{d.name}</div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {total > 0 ? Math.round(((Number(d.value) || 0) / total) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
