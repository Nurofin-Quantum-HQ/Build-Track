import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { projectAPI, transactionAPI } from "../api";
import { SpendVsBudgetChart } from "../components/Charts";
import { MetricCard, CategoryBudgetBar } from "../components/MetricCards";
import { Badge, Button, Card } from "../components/ui";
import {
  Search, Download, FileText, ChevronDown, Calendar, Filter, RefreshCw,
  BarChart3, Layers, DollarSign, Users, TrendingUp, Sparkles, HelpCircle
} from "lucide-react";
import ModuleTour from "../components/ModuleTour";

const TYPE_COLORS = {
  Materials: { bg: "#FFF5F0", color: "#F97316" },
  Wages: { bg: "#F0FDF4", color: "#22C55E" },
  Expense: { bg: "#FFF7F0", color: "#EA580C" },
  Income: { bg: "#ECFDF5", color: "#10B981" },
  Equipment: { bg: "#FFF7F0", color: "#EA580C" },
};

const PAYMENT_COLORS = {
  Paid: { bg: "#F0FDF4", color: "#166534" },
  Partial: { bg: "#FFFBEB", color: "#B45309" },
  Pending: { bg: "#FEF2F2", color: "#DC2626" },
  Advance: { bg: "#FFF5F0", color: "#F97316" },
};

const DATE_PRESETS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "30days", label: "Last 30 Days" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

const TYPES = [
  { label: "All", value: "All" },
  { label: "Materials", value: "Materials" },
  { label: "Labour", value: "Wages" },
  { label: "Equipment", value: "Expense" },
  { label: "Income", value: "Income" },
];

const hoursStyle = { fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em", marginBottom: 2, textTransform: "uppercase" };

export default function ReportsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedType, setSelectedType] = useState("All");
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [runTour, setRunTour] = useState(false);


  const tourSteps = [
    { target: '.tour-header', content: 'View analytics and export reports for your projects.', disableBeacon: true },
    { target: '.tour-filters', content: 'Filter reports by project, date range, or transaction type.' },
    { target: '.tour-metrics', content: 'Quick summary of total costs, material, labour, and equipment.' },
    { target: '.tour-charts', content: 'Visual breakdown of spending versus budget.' },
    { target: '.tour-log', content: 'Detailed list of transactions that you can export to CSV or PDF.' }
  ];

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [projRes, txRes] = await Promise.all([projectAPI.getAll(), transactionAPI.getAll()]);
        setProjects(projRes.data.projects || []);
        setTransactions(txRes.data.transactions || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load reports");
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (datePreset === "today") return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: now };
    if (datePreset === "week") { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); return { start: s, end: now }; }
    if (datePreset === "month") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    if (datePreset === "30days") { const s = new Date(now); s.setDate(now.getDate() - 30); return { start: s, end: now }; }
    if (datePreset === "year") return { start: new Date(now.getFullYear(), 0, 1), end: now };
    if (datePreset === "custom" && startDate && endDate) return { start: new Date(startDate), end: new Date(endDate) };
    return { start: null, end: null };
  }, [datePreset, startDate, endDate]);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (selectedProject !== "all") list = list.filter(t => (t.project?._id || t.project) === selectedProject);
    if (selectedType !== "All") list = list.filter(t => t.type === selectedType);
    if (dateRange.start) list = list.filter(t => { const d = new Date(t.date); return d >= dateRange.start && d <= dateRange.end; });
    if (search) { const q = search.toLowerCase(); list = list.filter(t => (t.title || "").toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q) || (t.brand || "").toLowerCase().includes(q)); }
    return list;
  }, [transactions, selectedProject, selectedType, dateRange, search]);

  const stats = useMemo(() => ({
    total: filtered.filter(t => t.type !== "Income").reduce((s, t) => s + (t.amount || 0), 0),
    material: filtered.filter(t => t.type === "Materials").reduce((s, t) => s + (t.amount || 0), 0),
    labour: filtered.filter(t => t.type === "Wages").reduce((s, t) => s + (t.amount || 0), 0),
    equipment: filtered.filter(t => t.type === "Expense" || t.type === "Equipment").reduce((s, t) => s + (t.amount || 0), 0),
  }), [filtered]);

  const chartData = useMemo(() => {
    const proj = projects.find(p => (p._id || p.id) === selectedProject);
    return [
      { category: "Material", actual: stats.material, budget: proj?.budgetMaterial || proj?.budget?.material || 0 },
      { category: "Labour", actual: stats.labour, budget: proj?.budgetLabour || proj?.budget?.labour || 0 },
      { category: "Equipment", actual: stats.equipment, budget: proj?.budgetEquipment || proj?.budget?.equipment || 0 },
    ];
  }, [selectedProject, stats, projects]);

  const sorted = useMemo(() => {
    const s = [...filtered];
    s.sort((a, b) => {
      let cmp = 0;
      if (sortCol === "date") cmp = new Date(a.date) - new Date(b.date);
      else if (sortCol === "amount") cmp = (a.amount || 0) - (b.amount || 0);
      else if (sortCol === "type") cmp = (a.type || "").localeCompare(b.type || "");
      else if (sortCol === "title") cmp = (a.title || "").localeCompare(b.title || "");
      return sortAsc ? cmp : -cmp;
    });
    return s;
  }, [filtered, sortCol, sortAsc]);

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  useEffect(() => { setCurrentPage(1); }, [selectedProject, selectedType, datePreset, startDate, endDate, search]);

  const handleSort = (col) => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(true); } };

  const exportCsv = () => {
    const headers = ["Date", "Description", "Type", "Category", "Amount", "Status", "Payment"];
    const rows = filtered.map(t => [t.date ? new Date(t.date).toISOString().split("T")[0] : "", t.title || "", t.type || "", t.category || "", t.amount || 0, t.approvalStatus || "", t.paymentStatus || ""]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `BuildTrack_Report_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18); doc.text("BuildTrack Report", 14, 20);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 14, 28);
    const projName = selectedProject === "all" ? "All Projects" : projects.find(p => p._id === selectedProject)?.projectName || "";
    const displayType = selectedType === "Wages" ? "Labour" : selectedType === "Expense" ? "Equipment" : selectedType;
    doc.text(`Project: ${projName} | Type: ${displayType} | Period: ${DATE_PRESETS.find(p => p.value === datePreset)?.label || "All"}`, 14, 34);
    doc.setFontSize(12); doc.setTextColor(0);
    doc.text(`Total: Rs.${stats.total.toLocaleString("en-IN")}  Material: Rs.${stats.material.toLocaleString("en-IN")}  Labour: Rs.${stats.labour.toLocaleString("en-IN")}  Equipment: Rs.${stats.equipment.toLocaleString("en-IN")}`, 14, 44);
    doc.autoTable({ startY: 50, head: [["Date", "Description", "Type", "Amount", "Status"]], body: filtered.map(t => [t.date ? new Date(t.date).toLocaleDateString("en-IN") : "", t.title || "", t.type === "Wages" ? "Labour" : t.type === "Expense" ? "Equipment" : t.type || "", `Rs.${(t.amount || 0).toLocaleString("en-IN")}`, t.paymentStatus || ""]), theme: "grid", headStyles: { fillColor: [249, 115, 22] } });
    doc.save(`BuildTrack_Report_${Date.now()}.pdf`);
  };

  const baseInput = { width: "100%", padding: "10px 12px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 13, color: "#111827", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100vh", fontFamily: "Inter, 'Segoe UI', sans-serif", background: "transparent" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 14 }}>Loading reports&hellip;</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100vh", fontFamily: "Inter, 'Segoe UI', sans-serif", background: "transparent" }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="ReportDashboard" />
      <div className="tour-header" style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>Reports & Analytics</h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>{filtered.length} entries found</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
            <HelpCircle size={16} color="#64748B" />
          </button>
          <Button variant="primary" size="md" onClick={() => navigate("/ai-chat")} style={{ background: "linear-gradient(135deg, #F97316, #FB923C)", border: "none" }}>
            <Sparkles size={14} /> Ask AI
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ margin: "14px 24px 0", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: "#DC2626", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          {error}
        </div>
      )}

      <div style={{ flex: 1, padding: "20px 24px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div className="tour-filters">
          <Card padding="16px 20px" style={{ marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr 1fr", gap: 14, alignItems: "end" }}>
            <div>
              <label style={hoursStyle}>PROJECT</label>
              <div style={{ position: "relative" }}>
                <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ ...baseInput, appearance: "none", cursor: "pointer", paddingRight: 36 }}>
                  <option value="all">All Projects</option>
                  {projects.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.projectName}</option>)}
                </select>
                <ChevronDown size={14} color="#94A3B8" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>
            <div>
              <label style={hoursStyle}>DATE PERIOD</label>
              <div style={{ position: "relative" }}>
                <select value={datePreset} onChange={e => setDatePreset(e.target.value)} style={{ ...baseInput, appearance: "none", cursor: "pointer", paddingRight: 36 }}>
                  {DATE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <ChevronDown size={14} color="#94A3B8" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>
            {datePreset === "custom" && (
              <>
                <div><label style={hoursStyle}>START DATE</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={baseInput} /></div>
                <div><label style={hoursStyle}>END DATE</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={baseInput} /></div>
              </>
            )}
            <div>
              <label style={hoursStyle}>SEARCH</label>
              <div style={{ position: "relative" }}>
                <Search size={14} color="#94A3B8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...baseInput, paddingLeft: 34 }} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setSelectedType(t.value)}
                style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${selectedType === t.value ? "#F97316" : "#E5E7EB"}`, background: selectedType === t.value ? "#F97316" : "#fff", color: selectedType === t.value ? "#fff" : "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}>
                {t.label}
              </button>
            ))}
          </div>
        </Card>
        </div>

        <div className="tour-metrics" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
          <MetricCard icon={<BarChart3 size={16} />} label="Total Cost" value={stats.total} budget={projects.find(p => (p._id || p.id) === selectedProject)?.budget?.["total"] || projects.find(p => (p._id || p.id) === selectedProject)?.totalBudget || 0} color="#F97316" />
          <MetricCard icon={<Layers size={16} />} label="Material" value={stats.material} budget={projects.find(p => (p._id || p.id) === selectedProject)?.budgetMaterial || 0} color="#F97316" />
          <MetricCard icon={<Users size={16} />} label="Labour" value={stats.labour} budget={projects.find(p => (p._id || p.id) === selectedProject)?.budgetLabour || 0} color="#EA580C" />
          <MetricCard icon={<DollarSign size={16} />} label="Equipment" value={stats.equipment} budget={projects.find(p => (p._id || p.id) === selectedProject)?.budgetEquipment || 0} color="#06B6D4" />
        </div>

        <div className="tour-charts" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 14, marginBottom: 16 }}>
          <Card padding="20px">
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Spend vs Budget</div>
            <SpendVsBudgetChart data={chartData} />
          </Card>
          <Card padding="20px">
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 14 }}>Category Breakdown</div>
            <CategoryBudgetBar name="Material" spent={stats.material} budget={projects.find(p => (p._id || p.id) === selectedProject)?.budgetMaterial || 0} color="#F97316" />
            <CategoryBudgetBar name="Labour" spent={stats.labour} budget={projects.find(p => (p._id || p.id) === selectedProject)?.budgetLabour || 0} color="#EA580C" />
            <CategoryBudgetBar name="Equipment" spent={stats.equipment} budget={projects.find(p => (p._id || p.id) === selectedProject)?.budgetEquipment || 0} color="#06B6D4" />
          </Card>
        </div>

        <div className="tour-log">
          <Card>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Transaction Log ({filtered.length})</span>
            <div style={{ display: "flex", gap: 6 }}>
              <Button variant="secondary" size="sm" icon={<Download size={12} />} onClick={exportCsv}>CSV</Button>
              <Button variant="secondary" size="sm" icon={<FileText size={12} />} onClick={exportPdf}>PDF</Button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {[["date", "Date"], ["title", "Description"], ["type", "Type"], ["amount", "Amount"], ["status", "Payment"]].map(([col, label]) => (
                    <th key={col} onClick={() => handleSort(col)}
                      style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.04em", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                      {label} {sortCol === col ? (sortAsc ? "\u2191" : "\u2193") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(t => {
                  const tc = TYPE_COLORS[t.type] || TYPE_COLORS.Expense;
                  const pc = PAYMENT_COLORS[t.paymentStatus] || PAYMENT_COLORS.Pending;
                  return (
                    <tr key={t._id}
                      onClick={() => navigate('/entry-detail', { state: { entry: t } })}
                      className="hover-bg-subtle"
                      style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}>
                        {t.date ? new Date(t.date).toLocaleDateString("en-IN") : "\u2014"}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "#111827", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title || "\u2014"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Badge variant={t.type === "Wages" ? "success" : t.type === "Expense" ? "warning" : "info"} size="sm">
                          {t.type === "Wages" ? "Labour" : t.type === "Expense" ? "Equipment" : t.type}
                        </Badge>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 600, color: t.type === "Income" ? "#22C55E" : "#DC2626", textAlign: "right" }}>
                        {t.type === "Income" ? "+" : "-"}₹{(t.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Badge variant={t.paymentStatus === "Paid" ? "success" : t.paymentStatus === "Partial" ? "warning" : "info"} size="sm">
                          {t.paymentStatus || "\u2014"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 48, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No entries match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {sorted.length > rowsPerPage && (
            <div style={{ padding: "10px 20px", borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#64748B" }}>Showing {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, sorted.length)} of {sorted.length}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E7EB", background: "#fff", fontSize: 12, cursor: currentPage === 1 ? "default" : "pointer", opacity: currentPage === 1 ? 0.5 : 1, fontWeight: 600, fontFamily: "inherit" }}>Prev</button>
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #E5E7EB", background: "#fff", fontSize: 12, cursor: currentPage >= totalPages ? "default" : "pointer", opacity: currentPage >= totalPages ? 0.5 : 1, fontWeight: 600, fontFamily: "inherit" }}>Next</button>
              </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

