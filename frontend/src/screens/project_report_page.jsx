import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectAPI, transactionAPI } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
} from "recharts";
import { FileText, Download, MapPin, Calendar, Receipt, IndianRupee, Wallet, PiggyBank, Gauge } from "lucide-react";
import {
  BtHero, BtGlassTile, BtSheet, BtPageHeader, BtButton, BtCard, BtBadge, BtBricks, BtProgress,
  BtSectionHeader, BtEmpty, BtErrorCard, BtSkeleton, formatInr,
} from "../components/ui";

const TYPE_LABEL = { Materials: "Material", Wages: "Labour", Expense: "Equipment", Equipment: "Equipment", Income: "Income" };
const TYPE_TONE = { Materials: "material", Wages: "labour", Expense: "equipment", Equipment: "equipment", Income: "income" };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

function statusOf(raw) {
  const s = (raw || "").toLowerCase().replace(/[\s_]+/g, "");
  if (s === "planning") return { label: "Planning", tone: "neutral" };
  if (s === "onhold") return { label: "On Hold", tone: "warning" };
  if (s === "completed") return { label: "Completed", tone: "success" };
  if (s === "cancelled" || s === "reviewneeded") return { label: "Review Needed", tone: "danger" };
  return { label: "Active", tone: "brand" };
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-tile)", boxShadow: "var(--shadow-raised)", padding: "10px 14px", fontFamily: "var(--font-ui)", fontSize: 13 }}>
      <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tnum" style={{ display: "flex", justifyContent: "space-between", gap: 16, color: "var(--ink-2)" }}>
          <span>{p.name}</span>
          <strong style={{ color: "var(--ink)" }}>{formatInr(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function ProjectReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [projRes, txRes] = await Promise.all([
        projectAPI.getById(id),
        transactionAPI.getAll({ project: id }),
      ]);
      setProject(projRes.data.project);
      setTransactions(txRes.data.transactions || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const backToProject = () => (project ? navigate("/managesite", { state: { project } }) : navigate("/projects"));

  if (loading || error || !project) {
    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100%" }}>
        <BtHero>
          <BtPageHeader
            back={{ label: "Projects", onClick: () => navigate("/projects") }}
            eyebrow="Project report"
            size="md"
            title={error ? "Report unavailable" : "Loading report…"}
            subtitle="Budget, spend and recent entries for this project."
          />
        </BtHero>
        <BtSheet>
          {error ? (
            <BtErrorCard title="Couldn't load the report" message={error} onRetry={load} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <BtSkeleton height="110px" borderRadius="var(--r-card)" />
              <BtSkeleton height="320px" borderRadius="var(--r-card)" />
              <BtSkeleton height="260px" borderRadius="var(--r-card)" />
            </div>
          )}
        </BtSheet>
      </div>
    );
  }

  const isEquip = (t) => t.type === "Expense" || t.type === "Equipment";
  const stats = {
    material: transactions.filter(t => t.type === "Materials").reduce((s, t) => s + (t.amount || 0), 0),
    labour: transactions.filter(t => t.type === "Wages").reduce((s, t) => s + (t.amount || 0), 0),
    equipment: transactions.filter(isEquip).reduce((s, t) => s + (t.amount || 0), 0),
    total: transactions.filter(t => t.type !== "Income").reduce((s, t) => s + (t.amount || 0), 0),
  };
  const budget = Number(project.budget?.total || project.totalBudget || (typeof project.budget === "number" ? project.budget : 0)) || 0;
  const remaining = budget - stats.total;
  const overBudget = budget > 0 && stats.total > budget;
  const st = statusOf(project.status);
  let prog = Number(project.progress) || 0;
  if (prog > 0 && prog < 1) prog *= 100;
  prog = Math.max(0, Math.min(100, prog));

  const categories = [
    { category: "Material", budget: Number(project.budgetMaterial || project.budget?.material || 0), actual: stats.material, color: "var(--type-material)" },
    { category: "Labour", budget: Number(project.budgetLabour || project.budget?.labour || 0), actual: stats.labour, color: "var(--type-labour)" },
    { category: "Equipment", budget: Number(project.budgetEquipment || project.budget?.equipment || 0), actual: stats.equipment, color: "var(--type-equipment)" },
  ];
  const hasChartData = categories.some(c => c.budget > 0 || c.actual > 0);

  const latest = {
    Material: transactions.filter(t => t.type === "Materials").slice(0, 5),
    Labour: transactions.filter(t => t.type === "Wages").slice(0, 5),
    Equipment: transactions.filter(isEquip).slice(0, 5),
  };
  const recentTx = transactions.slice(0, 10);

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`BuildTrack — Project Report: ${project.projectName}`, 14, 20);
    doc.setFontSize(11);
    doc.text(`Status: ${project.status || "Active"} | Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, 28);
    doc.text(`Total Budget: Rs.${budget.toLocaleString("en-IN")} | Spent: Rs.${stats.total.toLocaleString("en-IN")} | Remaining: Rs.${remaining.toLocaleString("en-IN")}`, 14, 34);

    const tableRows = transactions.map(t => [
      t.date ? new Date(t.date).toLocaleDateString("en-IN") : "",
      t.title || "",
      t.type || "",
      t.category || "",
      `Rs. ${Number(t.amount || 0).toLocaleString("en-IN")}`,
      t.paymentStatus || "Completed",
    ]);

    autoTable(doc, {
      startY: 42,
      head: [["Date", "Description", "Type", "Category", "Amount", "Payment"]],
      body: tableRows,
    });

    doc.save(`BuildTrack_${project.projectName}_Report.pdf`);
  };

  const exportCsv = () => {
    const headers = ["Date", "Description", "Type", "Category", "Amount", "Payment"];
    const rows = transactions.map(t => [
      t.date && !isNaN(new Date(t.date).getTime()) ? new Date(t.date).toISOString().split("T")[0] : (t.date || ""),
      t.title || "", t.type || "", t.category || "",
      t.amount || 0, t.paymentStatus || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BuildTrack_${project.projectName}_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const meta = (
    <>
      <BtBadge label={st.label} tone={st.tone} />
      {project.location && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><MapPin size={14} />{project.location}</span>
      )}
      {project.startDate && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Calendar size={14} />Started {fmtDate(project.startDate)}</span>
      )}
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100%" }}>
      <BtHero>
        <BtPageHeader
          back={{ label: "Project", onClick: backToProject }}
          eyebrow="Project report"
          size="md"
          title={project.projectName || project.name || "Project"}
          meta={meta}
          actions={
            <>
              <BtButton variant="onDark" size="small" icon={Download} onClick={exportCsv}>Export CSV</BtButton>
              <BtButton variant="accent" size="small" icon={FileText} onClick={exportPdf}>Export PDF</BtButton>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <BtGlassTile label="Budget" value={formatInr(budget, { compact: true })} icon={Wallet} />
            <BtGlassTile label="Spent" value={formatInr(stats.total, { compact: true })} icon={IndianRupee} valueColor={overBudget ? "var(--status-danger-bright)" : undefined} />
            <BtGlassTile label="Remaining" value={formatInr(remaining, { compact: true })} icon={PiggyBank} valueColor={remaining < 0 ? "var(--status-danger-bright)" : undefined} />
            <BtGlassTile label="Progress" value={`${Math.round(prog)}%`} icon={Gauge} />
          </div>
        </BtPageHeader>
      </BtHero>

      <BtSheet>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
          <BtCard padding="20px">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <span className="bt-eyebrow" style={{ color: "var(--ink-3)" }}>Overall progress</span>
              <span className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{Math.round(prog)}%</span>
            </div>
            <BtBricks value={prog / 100} height={10} />
          </BtCard>

          <div className="bt-grid-2" style={{ alignItems: "stretch" }}>
            <BtCard padding="20px">
              <BtSectionHeader title="Budget vs spent by category" />
              {hasChartData ? (
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={6}>
                      <CartesianGrid vertical={false} stroke="var(--line)" />
                      <XAxis dataKey="category" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-2)", fontSize: 13 }} />
                      <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: "var(--ink-2)", fontSize: 12 }} tickFormatter={(v) => formatInr(v, { compact: true })} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--fill)" }} />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 13 }}
                        payload={[
                          { value: "Budget", type: "circle", color: "var(--slate)" },
                          { value: "Spent", type: "circle", color: "var(--steel)" },
                        ]}
                        formatter={(v) => <span style={{ color: "var(--ink-2)" }}>{v}</span>}
                      />
                      <Bar dataKey="budget" name="Budget" fill="var(--slate)" radius={[6, 6, 0, 0]} maxBarSize={40} minPointSize={3} />
                      <Bar dataKey="actual" name="Spent" fill="var(--steel)" radius={[6, 6, 0, 0]} maxBarSize={40} minPointSize={3}>
                        <LabelList
                          dataKey="actual"
                          content={({ x, y, width, value }) => (
                            <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} textAnchor="middle" style={{ fill: "var(--ink)", fontSize: 12, fontWeight: 600 }}>
                              {formatInr(value, { compact: true })}
                            </text>
                          )}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <BtEmpty icon={Wallet} title="No category budgets yet" message="Set category budgets on the project to compare them with spend." />
              )}
            </BtCard>

            <BtCard padding="20px">
              <BtSectionHeader title="Category breakdown" />
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {categories.map((c) => {
                  const over = c.budget > 0 && c.actual > c.budget;
                  return (
                    <div key={c.category}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color }} />
                          {c.category}
                        </span>
                        <span className="tnum" style={{ fontSize: 14, color: "var(--ink-2)" }}>
                          <strong style={{ color: over ? "var(--status-danger)" : "var(--ink)" }}>{formatInr(c.actual, { compact: true })}</strong>
                          {" of "}{c.budget > 0 ? formatInr(c.budget, { compact: true }) : "no budget"}
                        </span>
                      </div>
                      <BtProgress value={c.budget > 0 ? c.actual / c.budget : 0} color={c.color} overBudget={over} height={8} />
                    </div>
                  );
                })}
              </div>
            </BtCard>
          </div>

          <div>
            <BtSectionHeader title="Recent entries" />
            {recentTx.length === 0 ? (
              <BtCard padding="24px">
                <BtEmpty icon={Receipt} title="No entries yet" message="Entries logged for this project will appear here." actionLabel="Back to project" onAction={backToProject} />
              </BtCard>
            ) : (
              <BtCard padding="0">
                <div style={{ overflowX: "auto" }}>
                  <table className="bt-table" style={{ minWidth: 680 }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th className="num">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTx.map((t) => (
                        <tr key={t._id}>
                          <td style={{ whiteSpace: "nowrap", color: "var(--ink-2)" }}>{fmtDate(t.date)}</td>
                          <td style={{ fontWeight: 600 }}>{t.title || "Untitled"}</td>
                          <td><BtBadge label={TYPE_LABEL[t.type] || t.type || "Entry"} tone={TYPE_TONE[t.type] || "neutral"} /></td>
                          <td style={{ color: "var(--ink-2)" }}>{t.category || "—"}</td>
                          <td className="num" style={{ fontWeight: 600, color: t.type === "Income" ? "var(--status-success)" : "var(--ink)" }}>
                            {t.type === "Income" ? "+" : ""}{formatInr(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </BtCard>
            )}
          </div>

          <div className="bt-grid-3">
            {Object.entries(latest).map(([title, entries]) => (
              <BtCard key={title} padding="20px">
                <BtSectionHeader title={`Latest ${title.toLowerCase()} entries`} caption />
                {entries.length === 0 ? (
                  <div style={{ padding: "16px 0", color: "var(--ink-2)", fontSize: 14 }}>No entries</div>
                ) : entries.map((t, i) => (
                  <div key={t._id} style={{ padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 2, overflowWrap: "anywhere" }}>{t.title || "Untitled"}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{fmtDate(t.date)}</span>
                      <span className="tnum" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{formatInr(t.amount)}</span>
                    </div>
                  </div>
                ))}
              </BtCard>
            ))}
          </div>
        </div>
      </BtSheet>
    </div>
  );
}
