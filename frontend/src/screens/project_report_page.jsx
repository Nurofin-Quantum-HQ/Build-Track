import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectAPI, transactionAPI } from "../api";
import { SpendVsBudgetChart } from "../components/Charts";
import { CategoryBudgetBar } from "../components/MetricCards";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const TYPE_DOT = {
  Materials: "#F97316",
  Wages: "#EA580C",
  Expense: "#ea580c",
  Income: "#16a34a",
  Equipment: "#ea580c",
};

const TYPE_BADGE = {
  Materials: { bg: "#FFF5F0", color: "#F97316" },
  Wages: { bg: "#f0fdf4", color: "#166534" },
  Expense: { bg: "#FFF5F0", color: "#EA580C" },
  Income: { bg: "#ecfdf5", color: "#047857" },
  Equipment: { bg: "#FFF5F0", color: "#EA580C" },
};

export default function ProjectReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
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
    };
    load();
  }, [id]);

  const fmtINR = (n) => n ? `₹${Number(n).toLocaleString("en-IN")}` : "₹0";
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#aaa", fontSize: 14, background: "#f7f7f8" }}>
        Loading report…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f7f7f8" }}>
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", color: "#991b1b", fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>
        <button onClick={() => navigate("/reports")} style={{ padding: "10px 20px", background: "#ea580c", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>Back to Reports</button>
      </div>
    );
  }

  if (!project) return null;

  const stats = {
    material: transactions.filter(t => t.type === "Materials").reduce((s, t) => s + (t.amount || 0), 0),
    labour: transactions.filter(t => t.type === "Wages").reduce((s, t) => s + (t.amount || 0), 0),
    equipment: transactions.filter(t => t.type === "Expense" || t.type === "Equipment").reduce((s, t) => s + (t.amount || 0), 0),
    total: transactions.filter(t => t.type !== "Income").reduce((s, t) => s + (t.amount || 0), 0),
  };
  const budget = Number(project.budget || project.totalBudget) || 0;
  const remaining = budget - stats.total;

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
      t.date ? new Date(t.date).toISOString().split("T")[0] : "",
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

  const cardStyle = { background: "#fff", borderRadius: 16, border: "1px solid #ebebeb", padding: 20, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "#f7f7f8" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #ebebeb", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/reports")} style={{ padding: "8px 14px", background: "#f3f4f6", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#555", cursor: "pointer" }}>← Back</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{project.projectName}</h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>Project Report</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportPdf} style={{ padding: "8px 14px", background: "#F97316", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer" }}>📄 Export PDF</button>
          <button onClick={exportCsv} style={{ padding: "8px 14px", background: "#f3f4f6", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#555", cursor: "pointer" }}>📥 Export CSV</button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "20px 24px" }}>
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{project.projectName}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: statusStyle.bg, color: statusStyle.color }}>{(project.status || "Active").toUpperCase()}</span>
                {project.location && <span style={{ fontSize: 12, color: "#888" }}>📍 {project.location}</span>}
                {project.startDate && <span style={{ fontSize: 12, color: "#888" }}>📅 Started {fmtDate(project.startDate)}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>Progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ea580c" }}>{project.progress || 0}%</span>
          </div>
          <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${project.progress || 0}%`, height: "100%", background: "#ea580c", borderRadius: 4, transition: "width 0.4s ease" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ ...cardStyle, textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: "0.06em", marginBottom: 8 }}>BUDGET</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>{fmtINR(budget)}</div>
          </div>
          <div style={{ ...cardStyle, textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: "0.06em", marginBottom: 8 }}>SPENT</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: stats.total > budget ? "#dc2626" : "#1a1a1a" }}>{fmtINR(stats.total)}</div>
          </div>
          <div style={{ ...cardStyle, textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", letterSpacing: "0.06em", marginBottom: 8 }}>REMAINING</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: remaining >= 0 ? "#16a34a" : "#dc2626" }}>{fmtINR(remaining)}</div>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>Spend vs Budget</div>
          <SpendVsBudgetChart data={chartData} />
        </div>

        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>Category Breakdown</div>
          <CategoryBudgetBar name="Material" spent={stats.material} budget={project.budgetMaterial || project.budget?.material || 0} color="#F97316" />
          <CategoryBudgetBar name="Labour" spent={stats.labour} budget={project.budgetLabour || project.budget?.labour || 0} color="#EA580C" />
          <CategoryBudgetBar name="Equipment" spent={stats.equipment} budget={project.budgetEquipment || project.budget?.equipment || 0} color="#0891b2" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
          {[
            { title: "Top Material Entries", entries: matEntries },
            { title: "Top Labour Entries", entries: labEntries },
            { title: "Top Equipment Entries", entries: eqpEntries },
          ].map(section => (
            <div key={section.title} style={cardStyle}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 12 }}>{section.title}</div>
              {section.entries.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#aaa", fontSize: 13 }}>No entries</div>
              ) : section.entries.map(t => (
                <div key={t._id} style={{ padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 2 }}>{t.title || "Untitled"}</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#888" }}>{fmtDate(t.date)}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>{fmtINR(t.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>Activity Timeline</div>
          <div style={{ position: "relative", paddingLeft: 24 }}>
            <div style={{ position: "absolute", left: 5, top: 0, bottom: 0, width: 2, background: "#e5e5e5" }} />
            {recentTx.map((t, i) => (
              <div key={t._id} style={{ position: "relative", marginBottom: i < recentTx.length - 1 ? 20 : 0 }}>
                <div style={{ position: "absolute", left: -24, top: 4, width: 12, height: 12, borderRadius: "50%", background: TYPE_DOT[t.type] || "#888", border: "2px solid #fff", zIndex: 1 }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{t.title || "Untitled"}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                      {fmtDate(t.date)}
                      <span style={{ marginLeft: 8, padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: TYPE_BADGE[t.type]?.bg || "#f3f4f6", color: TYPE_BADGE[t.type]?.color || "#888" }}>{t.type === "Wages" ? "Labour" : t.type === "Expense" ? "Equipment" : t.type}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.type === "Income" ? "#16a34a" : "#dc2626" }}>
                    {t.type === "Income" ? "+" : "-"}{fmtINR(t.amount)}
                  </span>
                </div>
              </div>
            ))}
            {recentTx.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: "#aaa", fontSize: 13 }}>No recent entries</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
