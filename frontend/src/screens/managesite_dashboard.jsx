import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { projectAPI, transactionAPI } from "../api";
import perfLogger from "../utils/performanceLogger";
import { resolveImageUrl } from "../utils/imageUrl";
import { calcProgress, getPhaseProgress, toggleActivity } from "../utils/constructionPhases";
import { Toast, ConfirmDialog } from "../components/Toast";
import { Card, Badge, Button } from "../components/ui";
import CsvImportExportCard from "../components/CsvImportExportCard";
import useTransactionStore from "../stores/transactionStore";
import {
  ChevronDown, ChevronRight, Plus, FileDown, FileUp, Pencil, X, Check, ArrowRight,
  Building2, MapPin, Calendar, User, Hash, Phone, Code, Wrench,
  Home, Layers, Bed, Bath, Settings, Zap, Flame, ChefHat, Sun,
  Clock, DollarSign, CreditCard, PiggyBank, Target, ClipboardCheck,
  List, Camera, FileText, Send, Trash2, Info, AlertCircle, Sparkles,
} from "lucide-react";

const SECTIONS = {
  projectInfo: "Project Information",
  buildingType: "Building Type",
  landFloors: "Land & Floor Configuration",
  roomsBaths: "Rooms & Bathrooms",
  addlConfig: "Additional Configuration",
  utility: "Utility & Services",
  gas: "Gas Connection",
  kitchen: "Kitchen Requirements",
  electrical: "Electrical & Plumbing",
  terrace: "Terrace & Interior",
  timeline: "Timeline & Status",
  financial: "Financial Overview",
  tracker: "Execution Tracker",
  entries: "Recent Activity",
  actions: "Actions",
};

const _kAddlConfig = [
  "Balcony", "Car Parking", "Lift", "Terrace Access", "Interior Work",
  "Compound Wall", "Parapet Wall", "Waterproofing", "Putty", "False Ceiling",
  "Modular Kitchen", "Wardrobes", "Sump", "Septic Tank", "Rainwater",
  "Borewell", "Solar", "Generator", "CCTV", "Intercom",
  "Landscaping", "Paving", "Water Tanks", "Stairs", "Security Room",
  "Cladding", "Elevation", "Gates", "Grills", "Aluminium", "Glass",
];
const _kUtility = ["Main Electricity", "Temporary Connection", "Generator Backup", "Water Connection", "Borewell Motor", "Sump Motor"];
const _kGas = ["Piped Gas", "Cylinder Bank", "Gas Pipeline Routing"];
const _kKitchen = ["Granite Counter", "Quartz Counter", "Stainless Steel Sink", "Chimney Provision", "Exhaust Fan Provision"];
const _kElectrical = ["Concealed Wiring", "Open Wiring", "3-Phase Connection", "AC Points", "Geyser Points"];
const _kTerrace = ["Weathering Course", "Cool Roof Paint", "Overhead Tank", "Solar Panels"];

const _getStr = (item) => typeof item === "object" ? (item?.name || item?.label || item?.title || item?.value || "") : String(item || "");
const _grp = (all, opts) => all.filter(f => opts.includes(_getStr(f)));
const _months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const _fmtDate = (d) => d ? `${d.getDate()} ${_months[d.getMonth()]} ${d.getFullYear()}` : "\u2014";
const fmtINR = (n) => n ? `\u20B9${Number(n).toLocaleString("en-IN")}` : "\u2014";

function CollapsibleCard({ title, icon, defaultOpen = true, count, subtitle, headerAction, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
        {icon && <span style={{ fontSize: 16, flexShrink: 0, color: '#F97316', display: 'flex' }}>{icon}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{title}</span>
          {(count !== undefined || subtitle) && (
            <span style={{ fontSize: 12, color: "#64748B", marginLeft: 8 }}>
              {count !== undefined ? `(${count})` : subtitle}
            </span>
          )}
        </div>
        {headerAction && <div onClick={e => e.stopPropagation()}>{headerAction}</div>}
        <ChevronDown size={16} color="#94A3B8" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </div>
      {open && <div style={{ padding: "0 18px 14px" }}>{children}</div>}
    </div>
  );
}

export default function ManageSitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const project = location.state?.project || null;
  const projectId = project?._id || project?.id;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [toast, setToast] = useState({ msg: "", type: "info" });
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [loadingT, setLoadingT] = useState(true);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [expandedActivityBudgets, setExpandedActivityBudgets] = useState({});
  const [viewingActivity, setViewingActivity] = useState(null);
  const [localProject, setLocalProject] = useState(project);
  const clearToast = useCallback(() => setToast({ msg: "", type: "info" }), []);

  useEffect(() => {
    perfLogger.endRoute('/managesite');
    perfLogger.logMount('ManageSitePage');
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setLoadingStats(true);
    Promise.all([
      projectAPI.getStats(projectId).then(({ data }) => setStats(data)).catch(() => setStats(null)),
      projectAPI.getById(projectId).then(({ data }) => {
        if (data.project) setLocalProject(data.project);
      }).catch(() => {}),
    ]).finally(() => setLoadingStats(false));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    // Instantly populate from store cache if available
    const cachedStoreTxs = useTransactionStore.getState().transactions;
    if (cachedStoreTxs && cachedStoreTxs.length > 0) {
      const match = cachedStoreTxs.filter(
        (t) => String(t.project?._id || t.project || t.projectId) === String(projectId)
      );
      if (match.length > 0) {
        setTransactions(match);
        setLoadingT(false);
      } else {
        setLoadingT(true);
      }
    } else {
      setLoadingT(true);
    }

    // Fetch fresh transactions with limit=100 for fast response
    transactionAPI.getAll({ project: projectId, limit: 100 })
      .then(({ data }) => {
        const fresh = data.transactions || [];
        setTransactions(fresh);
      })
      .catch(() => {})
      .finally(() => setLoadingT(false));
  }, [projectId]);

  if (!project) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16, padding: 24 }}>
        <Building2 size={48} color="#CBD5E1" />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>No project selected</h2>
        <p style={{ color: "#64748B", fontSize: 14, margin: 0 }}>Please select a project from the projects list.</p>
        <Button variant="primary" size="md" onClick={() => navigate("/projects")}>
          Go to Projects
        </Button>
      </div>
    );
  }

  const p = localProject || project;
  const phases = p.selectedPhases || [];
  const hasNewTracker = phases.length > 0;
  const trackerTotal = phases.reduce((s, ph) => s + (ph.activities?.length || 0), 0);
  const trackerDone = phases.reduce((s, ph) => s + (ph.activities?.filter(a => a.completed || a.isCompleted).length || 0), 0);

  const projectName = p.projectName || "Untitled Project";
  const projectLoc = p.location || "\u2014";
  const progFallback = p.progress || 0;
  const progress = hasNewTracker ? calcProgress(phases) : (progFallback > 1 ? progFallback : progFallback * 100);
  const status = p.status || "Active";
  const hasPhoto = Boolean(p.photo && String(p.photo).trim());
  const imgSrc = hasPhoto ? resolveImageUrl(p.photo) : "";

  const totalIncome = Number(p.totalIncome || 0);
  const totalBudget = Number(p.budget?.total || p.totalBudget || stats?.totalBudget || 0);
  const spent = Number(p.spentAmount || stats?.totalSpent || 0);
  const remaining = totalBudget - spent;
  const util = totalBudget > 0 ? Math.min(spent / totalBudget, 1) : 0;

  const bMat = Number(p.budget?.material ?? p.budgetMaterial ?? 0);
  const bLab = Number(p.budget?.labour ?? p.budgetLabour ?? 0);
  const bEq = Number(p.budget?.equipment ?? p.budgetEquipment ?? 0);
  const bMisc = Number(p.budget?.misc ?? p.budgetMisc ?? 0);
  const hasBrk = bMat + bLab + bEq + bMisc > 0;

  const selectedFeatures = p.selectedFeatures || [];
  const addl = _grp(selectedFeatures, _kAddlConfig);
  const utility = _grp(selectedFeatures, _kUtility);
  const gas = _grp(selectedFeatures, _kGas);
  const kitchen = _grp(selectedFeatures, _kKitchen);
  const electrical = _grp(selectedFeatures, _kElectrical);
  const terrace = _grp(selectedFeatures, _kTerrace);
  const allKnown = [..._kAddlConfig, ..._kUtility, ..._kGas, ..._kKitchen, ..._kElectrical, ..._kTerrace];
  const unknown = selectedFeatures.filter(f => !allKnown.includes(f));
  const addlAll = [...addl, ...unknown];

  const handleToggleActivity = async (phaseId, activityId) => {
    const updatedPhases = toggleActivity(phases, phaseId, activityId);
    const newProgress = calcProgress(updatedPhases);
    setLocalProject(prev => ({ ...prev, selectedPhases: updatedPhases, progress: newProgress }));
    try {
      await projectAPI.update(projectId, { selectedPhases: updatedPhases, progress: newProgress });
    } catch {
      setLocalProject(prev => ({ ...prev, selectedPhases: phases, progress: calcProgress(phases) }));
      setToast({ msg: "Failed to update activity.", type: "error" });
    }
  };

  const handleExportCSV = async () => {
    try {
      const { data } = await projectAPI.getStats(projectId);
      const rows = [["Category", "Amount", "Date", "Type"]];
      (data.transactions || []).forEach(t => {
        rows.push([t.category || "", t.amount || 0, t.date || "", t.type || ""]);
      });
      let csvContent = rows.map(r => r.join(",")).join("\n");
      csvContent = "\uFEFF" + csvContent;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ msg: "CSV exported successfully.", type: "success" });
    } catch {
      setToast({ msg: "Failed to export CSV.", type: "error" });
    }
  };

  const handleImportCSV = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const lines = text.split("\n").filter(l => l.trim());
        const parsed = lines.slice(1).map(line => {
          const cols = line.split(",");
          return { category: cols[0]?.trim(), amount: parseFloat(cols[1]) || 0, date: cols[2]?.trim(), type: cols[3]?.trim() };
        });
        await projectAPI.update(projectId, { importedTransactions: parsed });
        setToast({ msg: `Imported ${parsed.length} entries.`, type: "success" });
      } catch {
        setToast({ msg: "Failed to import CSV.", type: "error" });
      }
    };
    input.click();
  };

  const labelStyle = { fontSize: 10, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", marginBottom: 2, textTransform: "uppercase" };
  const valueStyle = { fontSize: 14, fontWeight: 600, color: "#111827" };

  const renderProjectInfo = () => {
    const infoRows = [];
    if (p.projectCode) infoRows.push({ icon: <Code size={14} />, label: "Project Code", val: p.projectCode });
    if (p.clientName || p.client) infoRows.push({ icon: <User size={14} />, label: "Client", val: p.clientName || p.client });
    if (p.contractorName || p.contractor) infoRows.push({ icon: <Wrench size={14} />, label: "Contractor", val: p.contractorName || p.contractor });
    if (p.siteEngineer || p.engineer) infoRows.push({ icon: <HardHatIcon />, label: "Engineer", val: p.siteEngineer || p.engineer });
    if (p.contactNumber || p.contact) infoRows.push({ icon: <Phone size={14} />, label: "Contact", val: p.contactNumber || p.contact });
    if (p.mapAddress) infoRows.push({ icon: <MapPin size={14} />, label: "Map Address", val: p.mapAddress });
    infoRows.push({ icon: <Info size={14} />, label: "Status", val: status });
    infoRows.push({ icon: <MapPin size={14} />, label: "Location", val: projectLoc });
    if (infoRows.length === 0) return null;
    return (
      <CollapsibleCard title={SECTIONS.projectInfo} icon={<ClipboardCheck size={16} />} defaultOpen>
        {infoRows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < infoRows.length - 1 ? "1px solid #F1F5F9" : "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", flexShrink: 0 }}>{r.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={labelStyle}>{r.label}</div>
              <div style={{ ...valueStyle, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>{r.val}</div>
            </div>
          </div>
        ))}
      </CollapsibleCard>
    );
  };

  const renderBuildingType = (defaultOpen = false) => {
    const raw = p.projectType || "";
    if (!raw) return null;
    const parts = raw.split(" \u2192 ");
    const mainType = parts[0]?.trim() || raw;
    const subType = parts.length > 1 ? parts[1]?.trim() : null;
    return (
      <CollapsibleCard title={SECTIONS.buildingType} icon={<Building2 size={16} />} defaultOpen={defaultOpen}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", color: "#F97316", flexShrink: 0 }}>
            <Building2 size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>MAIN TYPE</div>
            <div style={{ ...valueStyle, fontWeight: 700 }}>{mainType}</div>
          </div>
          {subType && (
            <Badge variant="info" size="sm">{subType}</Badge>
          )}
        </div>
      </CollapsibleCard>
    );
  };

  const renderLandFloors = (defaultOpen = false) => {
    const hasLand = p.landArea && String(p.landArea).trim();
    const floors = p.floors || [];
    if (!hasLand && floors.length === 0) return null;
    return (
      <CollapsibleCard title={SECTIONS.landFloors} icon={<Layers size={16} />} defaultOpen={defaultOpen}>
        {hasLand && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: floors.length > 0 ? 14 : 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", color: "#F97316", flexShrink: 0 }}>
              <MapPin size={14} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>TOTAL LAND AREA</div>
              <div style={{ ...valueStyle, fontWeight: 700 }}>{p.landArea} {p.landUnit || ""}</div>
            </div>
          </div>
        )}
        {floors.length > 0 && (
          <>
            <div style={labelStyle}>FLOORS INCLUDED</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {floors.map((f, i) => (
                <Badge key={i} variant="info" size="sm">{f}</Badge>
              ))}
            </div>
          </>
        )}
      </CollapsibleCard>
    );
  };

  const renderRoomsBaths = (defaultOpen = false) => {
    const rooms = { "1 BHK": p.room1BHK, "2 BHK": p.room2BHK, "3 BHK": p.room3BHK, Custom: p.roomCustom };
    const baths = { Western: p.bathWestern, Indian: p.bathIndian, Common: p.bathCommon, Attached: p.bathAttached };
    const hasRoom = Object.values(rooms).some(v => (v || 0) > 0);
    const hasBath = Object.values(baths).some(v => (v || 0) > 0);
    if (!hasRoom && !hasBath) return null;
    return (
      <CollapsibleCard title={SECTIONS.roomsBaths} icon={<Bed size={16} />} defaultOpen={defaultOpen}>
        {hasRoom && (
          <>
            <div style={labelStyle}>ROOMS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, marginBottom: hasBath ? 14 : 0 }}>
              {Object.entries(rooms).filter(([, v]) => (v || 0) > 0).map(([k, v]) => (
                <div key={k} style={{ padding: "6px 12px", borderRadius: 8, background: "#FFF5F0", border: "1px solid #FDE8D8", fontSize: 13, fontWeight: 600, color: "#F97316", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {k} <span style={{ fontSize: 15 }}>{v || 0}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {hasBath && (
          <>
            <div style={labelStyle}>BATHROOMS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {Object.entries(baths).filter(([, v]) => (v || 0) > 0).map(([k, v]) => (
                <div key={k} style={{ padding: "6px 12px", borderRadius: 8, background: "#F0FDF4", border: "1px solid #BBF7D0", fontSize: 13, fontWeight: 600, color: "#16A34A", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {k} <span style={{ fontSize: 15 }}>{v || 0}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CollapsibleCard>
    );
  };

  const renderFeatureGroup = (title, icon, items, defaultOpen = false) => {
    if (!items || items.length === 0) return null;
    const validItems = items.map(_getStr).filter(s => Boolean(s && s.trim()));
    if (validItems.length === 0) return null;
    return (
      <CollapsibleCard title={title} icon={icon} defaultOpen={defaultOpen} count={validItems.length}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {validItems.map((str, i) => (
            <span key={i} style={{ padding: "4px 10px", borderRadius: 6, background: "#F8FAFC", border: "1px solid #E5E7EB", fontSize: 11, fontWeight: 500, color: "#475569" }}>
              {str}
            </span>
          ))}
        </div>
      </CollapsibleCard>
    );
  };

  const renderTimeline = (defaultOpen = false) => {
    const startDate = p.startDate ? new Date(p.startDate) : null;
    const expectedEnd = p.expectedEndDate ? new Date(p.expectedEndDate) : (p.endDate ? new Date(p.endDate) : null);
    const actualEnd = p.actualEndDate ? new Date(p.actualEndDate) : null;
    const statusColor = status === "Completed" ? "#22C55E" : status === "In Progress" ? "#F97316" : status === "On Hold" ? "#F59E0B" : status === "Cancelled" ? "#EF4444" : "#64748B";
    return (
      <CollapsibleCard title={SECTIONS.timeline} icon={<Calendar size={16} />} defaultOpen={defaultOpen}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `${statusColor}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Info size={14} color={statusColor} />
          </div>
          <span style={{ flex: 1, fontSize: 13, color: "#475569" }}>Project Status</span>
          <Badge variant={status === "Completed" ? "success" : status === "On Hold" ? "warning" : "info"} size="sm">{status}</Badge>
        </div>
        <div style={labelStyle}>PROJECT TIMELINE</div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <DateBox label="Start Date" val={startDate ? _fmtDate(startDate) : "\u2014"} icon={<PlayIcon />} color="#F97316" />
          {expectedEnd && <DateBox label="Expected End" val={_fmtDate(expectedEnd)} icon={<Calendar size={12} />} color="#F59E0B" />}
          {actualEnd && <DateBox label="Actual End Date" val={_fmtDate(actualEnd)} icon={<Check size={12} />} color="#22C55E" />}
        </div>
      </CollapsibleCard>
    );
  };

  const renderFinancial = () => (
    <CollapsibleCard title={SECTIONS.financial} icon={<DollarSign size={16} />} defaultOpen>
      <div style={{ background: "#F8FAFC", borderRadius: 8, border: "1px solid #E5E7EB", padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#FFF5F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CreditCard size={16} color="#F97316" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>TOTAL BUDGET</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#F97316", letterSpacing: "-0.03em" }}>{fmtINR(totalBudget)}</div>
          </div>
        </div>
      </div>
      <FinRow label="Spent Amount" value={fmtINR(Math.max(spent, 0))} color={spent > totalBudget ? "#EF4444" : "#F97316"} icon={<ArrowUpIcon />} />
      <FinRow label="Total Income" value={fmtINR(totalIncome)} color="#22C55E" icon={<PiggyBank size={14} />} />
      <FinRow label="Remaining" value={fmtINR(Math.max(remaining, 0))} color={remaining >= 0 ? "#22C55E" : "#EF4444"} icon={<Target size={14} />} />
      {hasBrk && (
        <>
          <div style={{ height: 1, background: "#F1F5F9", margin: "10px 0" }} />
          <div style={labelStyle}>BUDGET BREAKDOWN</div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {bMat > 0 && <CatRow label="Material" amount={bMat} color="#F97316" />}
            {bLab > 0 && <CatRow label="Labour" amount={bLab} color="#0EA5E9" />}
            {bEq > 0 && <CatRow label="Equipment" amount={bEq} color="#EA580C" />}
            {bMisc > 0 && <CatRow label="Miscellaneous" amount={bMisc} color="#F59E0B" />}
          </div>
        </>
      )}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ ...labelStyle, fontSize: 11 }}>Budget Used</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: util >= 1 ? "#EF4444" : util >= 0.8 ? "#F59E0B" : "#F97316" }}>{Math.round(util * 100)}%</span>
        </div>
        <div style={{ height: 6, background: "#F1F5F9", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(util * 100, 100)}%`, height: "100%", borderRadius: 8, background: util >= 1 ? "#EF4444" : util >= 0.8 ? "#F59E0B" : "#F97316", transition: "width 0.4s ease" }} />
        </div>
      </div>
    </CollapsibleCard>
  );

  const _isC = (act) => act.completed || act.isCompleted;
  const _completedDateLabel = (act) => {
    if (!act.completedAt) return null;
    const d = new Date(act.completedAt);
    if (d.getFullYear() === 2000 && d.getMonth() === 0 && d.getDate() === 1) return "Date not recorded";
    return `${d.getDate()} ${_months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const _spentForActivity = (actId) => {
    const txs = transactions.filter(t => t.activity === actId || t.activityId === actId);
    return txs.reduce((s, t) => s + Number(t.amount || 0), 0);
  };

  const [budgetDialogActivity, setBudgetDialogActivity] = useState(null);
  const [budgetForm, setBudgetForm] = useState({ material: 0, labour: 0, equipment: 0 });

  const openBudgetDialog = (act) => {
    setBudgetForm({ material: act.budgetMaterial || 0, labour: act.budgetLabour || 0, equipment: act.budgetEquipment || 0 });
    setBudgetDialogActivity(act);
  };
  const saveBudgetDialog = async () => {
    if (!budgetDialogActivity) return;
    const updatedPhases = phases.map(ph => ({
      ...ph,
      activities: ph.activities.map(a =>
        a.id === budgetDialogActivity.id
          ? { ...a, budgetMaterial: Number(budgetForm.material), budgetLabour: Number(budgetForm.labour), budgetEquipment: Number(budgetForm.equipment) }
          : a
      ),
    }));
    setLocalProject(prev => ({ ...prev, selectedPhases: updatedPhases }));
    try {
      await projectAPI.update(projectId, { selectedPhases: updatedPhases });
      setToast({ msg: "Budget updated successfully!", type: "success" });
    } catch {
      setLocalProject(prev => ({ ...prev, selectedPhases: phases }));
      setToast({ msg: "Failed to update budget.", type: "error" });
    }
    setBudgetDialogActivity(null);
  };

  const renderTracker = () => {
    if (!hasNewTracker) {
      return (
        <CollapsibleCard title={SECTIONS.tracker} icon={<ClipboardCheck size={16} />} defaultOpen>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <ClipboardCheck size={36} color="#CBD5E1" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8" }}>No execution plan configured</div>
            <div style={{ fontSize: 12, color: "#ABB5C1", marginTop: 4 }}>Select phases & activities when creating a project.</div>
          </div>
        </CollapsibleCard>
      );
    }
    return (
      <CollapsibleCard title={SECTIONS.tracker} icon={<ClipboardCheck size={16} />} subtitle={`${trackerDone}/${trackerTotal} done`} defaultOpen>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {phases.map(phase => {
            const pDone = phase.activities?.filter(a => a.completed || a.isCompleted).length || 0;
            const pTotal = phase.activities?.length || 0;
            const pPct = pTotal > 0 ? pDone / pTotal : 0;
            const isExpanded = expandedPhase === phase.id;
            return (
              <div key={phase.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <div onClick={() => setExpandedPhase(isExpanded ? null : phase.id)} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: phase.isCustom ? "#FFF7F0" : "#FFF5F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: phase.isCustom ? "#EA580C" : "#F97316" }}>
                    {phase.isCustom ? <Sparkles size={14} /> : <Settings size={14} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{phase.phaseName}</div>
                    <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>{pDone} of {pTotal} activities done</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: pPct >= 1 ? "#22C55E" : "#F97316" }}>{Math.round(pPct * 100)}%</div>
                    <ChevronDown size={14} color="#94A3B8" style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.18s", marginLeft: "auto" }} />
                  </div>
                </div>
                {pTotal > 0 && (
                  <div style={{ padding: "0 14px 6px" }}>
                    <div style={{ height: 3, background: "#F1F5F9", borderRadius: 8, overflow: "hidden" }}>
                      <div style={{ width: `${pPct * 100}%`, height: "100%", background: pPct >= 1 ? "#22C55E" : "#F97316", borderRadius: 8, transition: "width 0.3s" }} />
                    </div>
                  </div>
                )}
                {isExpanded && phase.activities?.map(act => {
                  const actBud = (act.budgetMaterial || 0) + (act.budgetLabour || 0) + (act.budgetEquipment || 0);
                  const isBudgetExpanded = expandedActivityBudgets[act.id];
                  const dateLabel = _completedDateLabel(act);
                  const spentForAct = _spentForActivity(act.id);
                  const spentMat = transactions.filter(t => (t.activity === act.id || t.activityId === act.id) && t.type === "Materials").reduce((s, t) => s + Number(t.amount || 0), 0);
                  const spentLab = transactions.filter(t => (t.activity === act.id || t.activityId === act.id) && (t.type === "Wages" || t.type === "Labour")).reduce((s, t) => s + Number(t.amount || 0), 0);
                  const spentEqu = transactions.filter(t => (t.activity === act.id || t.activityId === act.id) && (t.type === "Expense" || t.type === "Equipment")).reduce((s, t) => s + Number(t.amount || 0), 0);
                  return (
                    <div key={act.id}>
                      <div style={{ padding: "8px 14px 8px 18px", borderTop: "1px solid #F1F5F9" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div onClick={e => { e.stopPropagation(); handleToggleActivity(phase.id, act.id); }}
                            style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${_isC(act) ? "#22C55E" : "#CBD5E1"}`, background: _isC(act) ? "#22C55E" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", transition: "all 0.18s" }}>
                            {_isC(act) && <Check size={12} color="#fff" strokeWidth={3} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: _isC(act) ? 500 : 500, color: _isC(act) ? "#94A3B8" : "#111827", textDecoration: _isC(act) ? "line-through" : "none" }}>
                              {act.name}
                            </span>
                            {_isC(act) && dateLabel && (
                              <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                                <Check size={10} color="#22C55E" strokeWidth={3} />
                                <span style={{ fontSize: 10, color: "#22C55E", fontWeight: 600 }}>Completed {dateLabel}</span>
                              </div>
                            )}
                          </div>
                          <Badge variant={_isC(act) ? "success" : "warning"} size="sm">{_isC(act) ? "Done" : "Pending"}</Badge>
                          <div onClick={e => { e.stopPropagation(); navigate("/add-entry", { state: { project: p, prefill: { phase: phase.phaseName, activity: act.name } } }); }}
                            style={{ padding: "4px 8px", borderRadius: 6, background: "#FFF5F0", border: "1px solid #FDE8D8", fontSize: 10, fontWeight: 700, color: "#F97316", cursor: "pointer", fontFamily: 'inherit' }}>
                            ADD
                          </div>
                          {_isC(act) && (
                            <div onClick={e => { e.stopPropagation(); setViewingActivity(act); }}
                              style={{ padding: "4px 8px", borderRadius: 6, background: "#F0FDF4", border: "1px solid #BBF7D0", fontSize: 10, fontWeight: 700, color: "#22C55E", cursor: "pointer", fontFamily: 'inherit' }}>
                              VIEW
                            </div>
                          )}
                          <div onClick={() => setExpandedActivityBudgets(prev => ({ ...prev, [act.id]: !prev[act.id] }))} style={{ cursor: "pointer", display: "flex", color: "#94A3B8" }}>
                            <ChevronDown size={14} style={{ transform: isBudgetExpanded ? "rotate(180deg)" : "none", transition: "transform 0.18s" }} />
                          </div>
                        </div>
                        {isBudgetExpanded && (
                          <div style={{ margin: "8px 0 4px", padding: 12, background: "#F8FAFC", borderRadius: 8, border: "1px solid #E5E7EB" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>Activity Budget Allocation</span>
                              <div onClick={e => { e.stopPropagation(); openBudgetDialog(act); }} style={{ padding: "3px 8px", borderRadius: 6, background: "#FFF5F0", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                                <Pencil size={10} color="#F97316" />
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#F97316" }}>Update Budget</span>
                              </div>
                            </div>
                            <BudgetRow label="Materials" allocated={act.budgetMaterial || 0} spent={spentMat} color="#F97316" />
                            <div style={{ height: 6 }} />
                            <BudgetRow label="Labour" allocated={act.budgetLabour || 0} spent={spentLab} color="#22C55E" />
                            <div style={{ height: 6 }} />
                            <BudgetRow label="Equipment" allocated={act.budgetEquipment || 0} spent={spentEqu} color="#F59E0B" />
                            <div style={{ height: 1, background: "#F1F5F9", margin: "10px 0" }} />
                            <BudgetRow label="Total Budget" allocated={actBud} spent={spentForAct} color="#EA580C" bold />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {budgetDialogActivity && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }} onClick={() => setBudgetDialogActivity(null)}>
            <div style={{ background: "#fff", width: "100%", maxWidth: 420, borderRadius: "20px 20px 0 0", padding: "20px 24px 32px" }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 36, height: 4, background: "#E5E7EB", borderRadius: 16, margin: "0 auto 20px" }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Budget Allocation: {budgetDialogActivity.name}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>Allocate activity budgets under Materials, Labour, and Equipment categories.</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 6 }}>Materials Budget (₹)</div>
                <input value={budgetForm.material} onChange={e => setBudgetForm(f => ({ ...f, material: e.target.value }))} type="number" style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "#F8FAFC", outline: "none", fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 6 }}>Labour Budget (₹)</div>
                <input value={budgetForm.labour} onChange={e => setBudgetForm(f => ({ ...f, labour: e.target.value }))} type="number" style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "#F8FAFC", outline: "none", fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 6 }}>Equipment Budget (₹)</div>
                <input value={budgetForm.equipment} onChange={e => setBudgetForm(f => ({ ...f, equipment: e.target.value }))} type="number" style={{ width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "#F8FAFC", outline: "none", fontFamily: 'inherit' }} />
              </div>
              <Button variant="primary" size="md" fullWidth onClick={saveBudgetDialog}>
                Save Budget Allocation
              </Button>
            </div>
          </div>
        )}

        {viewingActivity && (
          <ActivityDetailSheet activity={viewingActivity} phaseName={phases.find(p => p.activities?.some(a => a.id === viewingActivity.id))?.phaseName || ""} onClose={() => setViewingActivity(null)} />
        )}
      </CollapsibleCard>
    );
  };

  const renderRecentEntries = () => {
    const typeConfig = {
      Materials: { color: '#EA580C', bg: '#FFF7F0', label: 'Materials' },
      Wages: { color: '#22C55E', bg: '#F0FDF4', label: 'Labour' },
      Labour: { color: '#22C55E', bg: '#F0FDF4', label: 'Labour' },
      Expense: { color: '#F59E0B', bg: '#FFFBEB', label: 'Equipment' },
      Equipment: { color: '#F59E0B', bg: '#FFFBEB', label: 'Equipment' },
      Income: { color: '#EA580C', bg: '#FFF5F0', label: 'Income' },
    };

    const projectName = p?.projectName || p?.name || "Site Project";

    return (
      <CollapsibleCard
        title={SECTIONS.entries}
        icon={<List size={16} />}
        defaultOpen
        headerAction={
          <button
            onClick={() => navigate('/transaction', { state: { projectId: p?._id || p?.id } })}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              color: '#F97316',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            View All <ChevronRight size={14} />
          </button>
        }
      >
        {loadingT ? (
          <div style={{ color: "#94A3B8", fontSize: 13, padding: 16, textAlign: "center" }}>Loading activity…</div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#94A3B8" }}>
            <List size={32} color="#CBD5E1" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>No entries logged yet.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {transactions.map((t, i) => {
              const tc = typeConfig[t.type] || { color: '#64748B', bg: '#F1F5F9', label: t.type || 'Entry' };
              const amt = Number(t.amount || t.totalAmount || 0);

              return (
                <div
                  key={t._id || t.id || i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "#F8FAFC",
                    border: "1px solid #F1F5F9",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onClick={() => navigate('/entry-detail', { state: { entry: t } })}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: tc.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <DollarSign size={18} color={tc.color} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                      {t.title || (t.type === "Wages" || t.type === "Labour" ? "Labour" : t.type === "Expense" || t.type === "Equipment" ? "Equipment" : t.type)}
                    </div>

                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748B", alignItems: "center", flexWrap: "wrap" }}>
                      <Badge variant={t.type === 'Wages' || t.type === 'Labour' ? 'success' : t.type === 'Expense' || t.type === 'Equipment' ? 'warning' : 'info'} size="sm">
                        {tc.label}
                      </Badge>

                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Building2 size={13} color="#94A3B8" />
                        {projectName}
                      </span>

                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={13} color="#94A3B8" />
                        {t.date ? new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", flexShrink: 0 }}>
                    ₹{amt.toLocaleString("en-IN")}
                  </div>
                </div>
              );
            })}

            {/* Team Approval History Section */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #E5E7EB" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Team Approval History
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {transactions.slice(0, 5).map((t, i) => {
                  const submitter = typeof t.worker === "string" ? t.worker : t.worker?.name || t.createdBy?.name || "Worker";
                  const actionedBy = t.approvedBy?.name || t.reviewedBy?.name || "Admin";
                  const status = (t.approvalStatus || t.status || "Approved").toLowerCase();
                  const isApproved = status === "approved";

                  return (
                    <div
                      key={`approval-${t._id || i}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>
                          {t.title || (t.type === "Wages" ? "Labour" : t.type)}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                          Submitted by {submitter} • {isApproved ? "Approved" : "Pending"} by {actionedBy}
                        </div>
                      </div>
                      <Badge variant={isApproved ? "success" : status === "pending" ? "warning" : "danger"} size="sm">
                        {isApproved ? "Approved" : status === "pending" ? "Pending" : "Rejected"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CollapsibleCard>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#F8FAFC", fontFamily: "Inter, 'Segoe UI', sans-serif" }}>
      <Toast message={toast.msg} type={toast.type} onClose={clearToast} />
      {confirmDlg && <ConfirmDialog message={confirmDlg.message} danger={confirmDlg.danger} confirmLabel={confirmDlg.confirmLabel} onConfirm={confirmDlg.onConfirm} onCancel={() => setConfirmDlg(null)} />}

      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <span onClick={() => navigate("/projects")} style={{ color: "#F97316", cursor: "pointer", fontWeight: 500, fontSize: 13 }}>Projects</span>
          <ArrowRight size={12} color="#94A3B8" />
          <span style={{ color: "#111827", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300, fontSize: 13 }}>{projectName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={handleExportCSV} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: 'inherit' }}>
            <FileDown size={14} /> Export
          </button>
          <button onClick={handleImportCSV} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: 'inherit' }}>
            <FileUp size={14} /> Import
          </button>
          <button onClick={() => navigate("/newproject", { state: { editProject: p } })} style={{ padding: "6px 12px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: 'inherit' }}>
            <Pencil size={14} /> Edit
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <div style={{ padding: 20, display: "flex", flexDirection: isMobile ? "column" : "row", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.03em" }}>{projectName}</h2>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                <Badge variant={status === "Completed" ? "success" : status === "In Progress" ? "info" : status === "On Hold" ? "warning" : "info"} size="sm">{status}</Badge>
                {phases.length > 0 && (() => {
                  const completedKeys = new Set(phases.flatMap(ph => ph.activities?.filter(a => a.completed || a.isCompleted).map(a => a.id) || []));
                  let activePhase = null;
                  for (const ph of phases) {
                    if (ph.activities?.some(a => !completedKeys.has(a.id))) {
                      activePhase = ph.phaseName;
                      break;
                    }
                  }
                  return activePhase ? (
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: "#FFF5F0", border: "1px solid #FDE8D8", fontSize: 11, fontWeight: 600, color: "#F97316", display: "flex", alignItems: "center", gap: 4 }}>
                      <ArrowRight size={10} /> {activePhase}
                    </span>
                  ) : null;
                })()}
              </div>
              <div style={{ fontSize: 12, color: "#64748B", display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {projectLoc}</span>
                {p.startDate && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> Started {_fmtDate(new Date(p.startDate))}</span>}
                {p.expectedEndDate && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> Due {_fmtDate(new Date(p.expectedEndDate))}</span>}
                {p.clientName && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User size={12} /> {p.clientName}</span>}
                {p.projectCode && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Hash size={12} /> {p.projectCode}</span>}
              </div>
              {p.floors && p.floors.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {p.floors.map((f, i) => (
                    <Badge key={i} variant="info" size="sm">{f}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, minWidth: isMobile ? "100%" : 220 }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Overall Completion</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#F97316" }}>{progress.toFixed(1)}%</span>
              </div>
              <div style={{ width: "100%", height: 8, background: "#F1F5F9", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(progress, 100)}%`, height: "100%", background: status === "Completed" ? "#22C55E" : status === "On Hold" ? "#F59E0B" : status === "Cancelled" ? "#EF4444" : "#F97316", borderRadius: 8, transition: "width 0.4s ease" }} />
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right" }}>{trackerDone}/{trackerTotal || (progress > 0 ? "\u2014" : 0)} activities</div>
            </div>
          </div>
        </div>

        {renderProjectInfo()}
        {renderBuildingType()}
        {renderLandFloors()}
        {renderRoomsBaths()}
        {renderFeatureGroup("Additional Configuration", <Settings size={16} />, addlAll)}
        {renderFeatureGroup("Utility & Services", <Zap size={16} />, utility)}
        {renderFeatureGroup("Gas Connection", <Flame size={16} />, gas)}
        {renderFeatureGroup("Kitchen Requirements", <ChefHat size={16} />, kitchen)}
        {renderFeatureGroup("Electrical & Plumbing", <Zap size={16} />, electrical)}
        {renderFeatureGroup("Terrace & Interior", <Sun size={16} />, terrace)}
        {renderTimeline()}
        {renderFinancial()}
        <CsvImportExportCard project={p} onProjectUpdated={setLocalProject} setToast={setToast} />
        {renderTracker()}
        {renderRecentEntries()}

        <CollapsibleCard title="Actions" icon={<Zap size={16} />} defaultOpen>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10 }}>
            <ActionBtn icon={<FileText size={18} />} label="Add Entry" onClick={() => navigate("/add-entry", { state: { project: p } })} borderColor="#EA580C" />
            <ActionBtn icon={<MicIcon />} label="Voice Entry" onClick={() => navigate("/voice", { state: { project: p } })} borderColor="#EA580C" />
            <ActionBtn icon={<BarChartIcon />} label="View Reports" onClick={() => navigate("/reports/:id", { state: { project: p } })} borderColor="#FB923C" />
            <ActionBtn icon={<Building2 size={18} />} label="Full Details" onClick={() => navigate("/project-detail/" + projectId, { state: { project: p } })} borderColor="#22C55E" />
          </div>
        </CollapsibleCard>

      </div>
    </div>
  );
}

function DateBox({ label, val, icon, color }) {
  return (
    <div style={{ flex: 1, minWidth: 120, padding: "8px 10px", background: `${color}10`, borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 12, color, display: 'flex' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 9, color: "#64748B", fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color }}>{val}</div>
      </div>
    </div>
  );
}

function FinRow({ label, value, color, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color }}>{icon}</div>
      <span style={{ flex: 1, fontSize: 13, color: "#475569" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function CatRow({ label, amount, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: `${color}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <DollarSign size={12} color={color} />
      </div>
      <span style={{ flex: 1, fontSize: 13, color: "#475569" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{fmtINR(amount)}</span>
    </div>
  );
}

function BudgetRow({ label, allocated, spent, color, bold }) {
  const remaining = allocated - spent;
  const pct = allocated > 0 ? Math.min(spent / allocated, 1) : 0;
  const isOver = spent > allocated && allocated > 0;
  const barColor = isOver ? "#EF4444" : color;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 11, fontWeight: bold ? 700 : 500, color: bold ? "#111827" : "#475569" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: bold ? 700 : 600, color: isOver ? "#EF4444" : bold ? "#111827" : "#374151" }}>
          {fmtINR(spent)} / {fmtINR(allocated)}
        </span>
      </div>
      {!bold && (
        <>
          <div style={{ height: 3, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct * 100}%`, height: "100%", background: barColor, borderRadius: 4 }} />
          </div>
          {isOver && <div style={{ fontSize: 10, fontWeight: 600, color: "#EF4444", marginTop: 2 }}>Exceeded by {fmtINR(spent - allocated)}</div>}
          {!isOver && allocated > 0 && spent > 0 && <div style={{ fontSize: 10, fontWeight: 500, color: "#64748B", marginTop: 2 }}>{fmtINR(remaining)} remaining</div>}
        </>
      )}
    </div>
  );
}

function ActionBtn({ icon, label, onClick, borderColor }) {
  return (
    <button onClick={onClick} style={{ padding: "14px", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "border-color 0.15s, box-shadow 0.15s", fontFamily: 'inherit' }}
      className="hover-lift-sm">
      <span style={{ color: "#475569", display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{label}</span>
    </button>
  );
}

function ActivityDetailSheet({ activity, phaseName, onClose }) {
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setPhotos(activity.photos || (activity.photo ? [activity.photo] : []));
    setNotes(activity.notes || "");
  }, [activity]);

  const fmtDate = (d) => {
    if (!d) return "Completed";
    const dt = new Date(d);
    if (dt.getFullYear() === 2000 && dt.getMonth() === 0 && dt.getDate() === 1) return "Date not recorded";
    const __months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${dt.getDate()} ${__months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 480, maxHeight: "75vh", borderRadius: "20px 20px 0 0", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ overflowY: "auto", padding: "12px 20px 24px" }}>
          <div style={{ width: 36, height: 4, background: "#E5E7EB", borderRadius: 16, margin: "0 auto 20px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 6 }}>{activity.name}</div>
              <Badge variant="info" size="sm">{phaseName}</Badge>
            </div>
            <div onClick={onClose} style={{ cursor: "pointer", color: "#94A3B8", display: 'flex', padding: 4 }}>
              <X size={18} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Check size={16} color="#22C55E" strokeWidth={3} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#22C55E" }}>Completed on {fmtDate(activity.completedAt)}</span>
          </div>
          {notes && notes.trim() ? (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#F97316", letterSpacing: 0.3, marginBottom: 8, textTransform: 'uppercase' }}>Notes & Remarks</div>
              <div style={{ width: "100%", padding: 14, background: "#F8FAFC", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, lineHeight: 1.5, color: "#111827", fontWeight: 400 }}>{notes}</div>
            </div>
          ) : (
            <div style={{ marginBottom: 20, padding: "24px 16px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E5E7EB", textAlign: "center" }}>
              <Info size={24} color="#94A3B8" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>No additional notes or photos recorded for this activity.</div>
            </div>
          )}
          {photos.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#F97316", letterSpacing: 0.3, marginBottom: 8, textTransform: 'uppercase' }}>Progress Photos</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {photos.map((url, i) => (
                  <div key={i} style={{ width: 80, height: 80, borderRadius: 8, border: "1px solid #E5E7EB", overflow: "hidden" }}>
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function HardHatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 18a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2Z" />
      <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
      <path d="M4 15v-3a6 6 0 0 1 6-6h0" />
      <path d="M14 6a6 6 0 0 1 6 6v3" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
