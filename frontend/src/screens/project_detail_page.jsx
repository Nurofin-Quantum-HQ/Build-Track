import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectAPI, transactionAPI, inventoryAPI } from "../api";
import { calcProgress } from "../utils/constructionPhases";
import { Toast, ConfirmDialog } from "../components/Toast";
import { Card, Badge, Button } from "../components/ui";
import ProjectMemberModal from "../components/ProjectMemberModal";
import DocumentGallery from "../components/DocumentGallery";
import CsvImportExportCard from "../components/CsvImportExportCard";
import ModuleTour from "../components/ModuleTour";
import {
  ChevronDown, ArrowLeft, Building2, MapPin, Calendar, User, Phone,
  DollarSign, Target, ClipboardCheck, Package, TrendingUp, PieChart,
  Check, X, Plus, Settings, BarChart3, CreditCard, Hash, Layers, Users, FileText, HelpCircle
} from "lucide-react";

const TABS = ["Overview", "Financial", "Construction Progress", "Project Members", "Documents", "Inventory"];

const TYPE_STYLE = {
  Materials: { bg: "#FFF5F0", color: "#F97316" },
  Wages: { bg: "#F0FDF4", color: "#22C55E" },
  Equipment: { bg: "#FFF7F0", color: "#EA580C" },
  Income: { bg: "#ECFDF5", color: "#10B981" },
  Expense: { bg: "#FFFBEB", color: "#F59E0B" },
};

const fmtINR = (n) => n ? `\u20B9${Number(n).toLocaleString("en-IN")}` : "\u2014";

const statLabel = { fontSize: 10, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", textTransform: "uppercase" };
const statVal = { fontSize: 14, fontWeight: 700, color: "#111827" };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [toast, setToast] = useState({ msg: "", type: "info" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const clearToast = useCallback(() => setToast({ msg: "", type: "info" }), []);

  const [runTour, setRunTour] = useState(false);


  const tourSteps = [
    { target: '.tour-project-header', content: 'View the current project status and name.', disableBeacon: true },
    { target: '.tour-full-dashboard-btn', content: 'Navigate to the full site dashboard for this project.' },
    { target: '.tour-tabs-nav', content: 'Switch between different project views like Overview, Financials, Progress, and Members.' }
  ];

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, txRes, invRes] = await Promise.all([
        projectAPI.getById(id),
        transactionAPI.getAll({ project: id }),
        inventoryAPI.getAll({ project: id }),
      ]);
      setProject(projRes.data.project || projRes.data);
      setTransactions((txRes.data.transactions || []).slice(0, 20));
      setInventory(invRes.data.inventory || []);
    } catch {
      setToast({ msg: "Failed to load project.", type: "error" });
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const handleUpdateMembers = async (updatedMembers) => {
    try {
      const fd = new FormData();
      fd.append("members", JSON.stringify(updatedMembers));
      await projectAPI.update(id, fd);
      setProject(prev => ({ ...prev, members: updatedMembers }));
      setToast({ msg: "Project members updated successfully.", type: "success" });
    } catch {
      setToast({ msg: "Failed to update members.", type: "error" });
    }
  };

  const handleDeleteDocument = async (docPath) => {
    try {
      const updatedDocs = (project.documents || []).filter(d => d !== docPath);
      const fd = new FormData();
      fd.append("documents", JSON.stringify(updatedDocs));
      await projectAPI.update(id, fd);
      setProject(prev => ({ ...prev, documents: updatedDocs }));
      setToast({ msg: "Document deleted.", type: "success" });
    } catch {
      setToast({ msg: "Failed to delete document.", type: "error" });
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F8FAFC", fontFamily: "Inter, 'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #F1F5F9", borderTopColor: "#F97316", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13, color: "#64748B" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 12, background: "#F8FAFC", fontFamily: "Inter, 'Segoe UI', sans-serif", padding: 24 }}>
        <Building2 size={48} color="#CBD5E1" />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>Project not found</h2>
        <Button variant="secondary" size="md" onClick={() => navigate("/projects")}>Back to Projects</Button>
      </div>
    );
  }

  const p = project;
  const phases = p.selectedPhases || [];
  const progress = calcProgress(phases) || (p.progress > 1 ? p.progress : (p.progress || 0) * 100);
  const status = p.status || "Active";
  const income = transactions.filter(t => t.type === "Income").reduce((s, t) => s + (t.amount || 0), 0);
  const spent = Number(p.spentAmount || 0);
  const budget = Number(p.budget?.total || p.totalBudget || 0);
  const bMat = Number(p.budget?.material ?? p.budgetMaterial ?? 0);
  const bLab = Number(p.budget?.labour ?? p.budgetLabour ?? 0);
  const bEq = Number(p.budget?.equipment ?? p.budgetEquipment ?? 0);
  const landArea = Number(p.landArea || 0);
  const sqftCost = landArea > 0 ? (spent / landArea).toFixed(2) : 0;

  const renderTab = (btnLabel) => (
    <button key={btnLabel} onClick={() => setActiveTab(TABS.indexOf(btnLabel))}
      style={{ padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: TABS[activeTab] === btnLabel ? "#F97316" : "#F1F5F9", color: TABS[activeTab] === btnLabel ? "#fff" : "#475569", transition: "all 0.15s", fontFamily: "inherit" }}>
      {btnLabel}
    </button>
  );

  const tabContent = () => {
    switch (activeTab) {
      case 0: return renderOverview();
      case 1: return renderFinancial();
      case 2: return renderProgress();
      case 3: return renderMembers();
      case 4: return renderDocuments();
      case 5: return renderInventory();
      default: return null;
    }
  };

  function renderOverview() {
    const infoRows = [
      { icon: <Building2 size={14} />, label: "Type", val: p.projectType || p.mainType || "\u2014" },
      { icon: <MapPin size={14} />, label: "Location", val: p.location || "\u2014" },
      { icon: <Calendar size={14} />, label: "Start Date", val: p.startDate ? new Date(p.startDate).toLocaleDateString("en-IN") : "\u2014" },
      { icon: <Calendar size={14} />, label: "Expected End", val: p.expectedEndDate ? new Date(p.expectedEndDate).toLocaleDateString("en-IN") : "\u2014" },
      { icon: <User size={14} />, label: "Client", val: p.clientName || "\u2014" },
      { icon: <User size={14} />, label: "Engineer", val: p.siteEngineer || "\u2014" },
      { icon: <Phone size={14} />, label: "Contact", val: p.contactNumber || "\u2014" },
      { icon: <Hash size={14} />, label: "Project Code", val: p.projectCode || "\u2014" },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card padding="20px">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>Project Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {infoRows.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                <span style={{ color: "#94A3B8", display: "flex", flexShrink: 0 }}>{r.icon}</span>
                <div>
                  <div style={statLabel}>{r.label}</div>
                  <div style={{ ...statVal, fontSize: 13 }}>{r.val}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="20px">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Cost Efficiency</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "12px 14px" }}>
              <div style={statLabel}>Land Area</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{landArea} {p.landUnit || "Sq ft"}</div>
            </div>
            <div style={{ background: "#FFF5F0", borderRadius: 8, padding: "12px 14px" }}>
              <div style={statLabel}>Cost per {p.landUnit || "Sq ft"}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#F97316" }}>₹{sqftCost}</div>
            </div>
          </div>
        </Card>

        <Card padding="20px">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>Features & Configuration</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(p.selectedFeatures || []).map((f, i) => (
              <span key={i} style={{ padding: "4px 10px", borderRadius: 6, background: "#F8FAFC", border: "1px solid #E5E7EB", fontSize: 11, fontWeight: 500, color: "#475569" }}>{f}</span>
            ))}
            {(!p.selectedFeatures || p.selectedFeatures.length === 0) && <span style={{ fontSize: 12, color: "#94A3B8" }}>No features configured</span>}
          </div>
        </Card>

        {p.floors && p.floors.length > 0 && (
          <Card padding="20px">
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>Floors Breakdown</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {p.floors.map((f, i) => <Badge key={i} variant="info" size="sm">{f}</Badge>)}
            </div>
          </Card>
        )}
      </div>
    );
  }

  function renderMembers() {
    const members = p.members || [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card padding="20px">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Site Team Members</h3>
              <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>Engineers, Supervisors, and Contractors assigned to this project</p>
            </div>
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setIsMemberModalOpen(true)}>
              Manage Members
            </Button>
          </div>

          {members.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#94A3B8" }}>
              <Users size={36} color="#CBD5E1" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>No team members assigned yet. Click "Manage Members" to assign staff.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {members.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "#F8FAFC", border: "1px solid #E5E7EB" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#F97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                    {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{m.role || "Member"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  function renderDocuments() {
    return (
      <DocumentGallery documents={p.documents || []} onDeleteDocument={handleDeleteDocument} canManage={true} />
    );
  }

  function renderFinancial() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card padding="20px">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 14px" }}>Financial Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: <DollarSign size={14} />, label: "Total Budget", val: fmtINR(budget), color: "#F97316" },
              { icon: <TrendingUp size={14} />, label: "Spent", val: fmtINR(spent), color: spent > budget ? "#EF4444" : "#111827" },
              { icon: <DollarSign size={14} />, label: "Income", val: fmtINR(income), color: "#22C55E" },
              { icon: <Target size={14} />, label: "Remaining", val: fmtINR(Math.max(budget - spent, 0)), color: budget - spent >= 0 ? "#22C55E" : "#EF4444" },
            ].map((item, i) => (
              <div key={i} style={{ background: "#F8FAFC", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${item.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: item.color }}>{item.icon}</div>
                <div>
                  <div style={statLabel}>{item.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{item.val}</div>
                </div>
              </div>
            ))}
          </div>
          {budget > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={statLabel}>Budget Usage</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: (spent / budget) >= 1 ? "#EF4444" : (spent / budget) >= 0.8 ? "#F59E0B" : "#F97316" }}>{Math.round((spent / budget) * 100)}%</span>
              </div>
              <div style={{ height: 6, background: "#F1F5F9", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ width: `${Math.min((spent / budget) * 100, 100)}%`, height: "100%", borderRadius: 8, background: (spent / budget) >= 1 ? "#EF4444" : (spent / budget) >= 0.8 ? "#F59E0B" : "#F97316", transition: "width 0.4s" }} />
              </div>
            </div>
          )}
        </Card>

        <Card padding="20px">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>Budget Breakdown</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {bMat > 0 && <CatRow label="Materials" amount={bMat} color="#F97316" />}
            {bLab > 0 && <CatRow label="Labour" amount={bLab} color="#22C55E" />}
            {bEq > 0 && <CatRow label="Equipment" amount={bEq} color="#F59E0B" />}
            {!bMat && !bLab && !bEq && <span style={{ fontSize: 12, color: "#94A3B8" }}>No budget data</span>}
          </div>
        </Card>

        <Card padding="20px">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Recent Transactions</h3>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/transaction-log`)}>View All</Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {transactions.slice(0, 8).map((t, i) => {
              const ts = t.type === "Income" ? { bg: "#F0FDF4", color: "#22C55E" } : TYPE_STYLE[t.type] || { bg: "#F1F5F9", color: "#64748B" };
              return (
                <div key={t._id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F8FAFC" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: ts.bg, display: "flex", alignItems: "center", justifyContent: "center", color: ts.color, flexShrink: 0 }}>
                    <DollarSign size={12} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{t.title || t.type}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{t.date ? new Date(t.date).toLocaleDateString("en-IN") : ""}</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.type === "Income" ? "#22C55E" : "#111827" }}>
                    {t.type === "Income" ? "+" : "-"}\u20B9{(t.amount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              );
            })}
            {transactions.length === 0 && <span style={{ fontSize: 12, color: "#94A3B8", padding: "12px 0", textAlign: "center" }}>No transactions yet</span>}
          </div>
        </Card>
      </div>
    );
  }

  function renderProgress() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <CsvImportExportCard project={project} onProjectUpdated={setProject} setToast={setToast} />
        <Card padding="20px">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Execution Tracker</h3>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#F97316" }}>{progress.toFixed(1)}%</span>
        </div>
        <div style={{ height: 6, background: "#F1F5F9", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ width: `${Math.min(progress, 100)}%`, height: "100%", borderRadius: 8, background: progress >= 100 ? "#22C55E" : "#F97316", transition: "width 0.4s" }} />
        </div>
        {phases.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#94A3B8" }}>
            <ClipboardCheck size={32} color="#CBD5E1" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13 }}>No execution plan configured</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {phases.map((phase) => {
              const pDone = phase.activities?.filter(a => a.completed || a.isCompleted).length || 0;
              const pTotal = phase.activities?.length || 0;
              const pPct = pTotal > 0 ? pDone / pTotal : 0;
              const isExpanded = expandedPhase === phase.id;
              return (
                <div key={phase.id} style={{ background: "#fff", borderRadius: 8, border: "1px solid #E5E7EB", overflow: "hidden" }}>
                  <div onClick={() => setExpandedPhase(isExpanded ? null : phase.id)} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: "#FFF5F0", display: "flex", alignItems: "center", justifyContent: "center", color: "#F97316" }}><Settings size={14} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{phase.phaseName}</div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>{pDone}/{pTotal} done</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: pPct >= 1 ? "#22C55E" : "#F97316" }}>{Math.round(pPct * 100)}%</div>
                      <ChevronDown size={12} color="#94A3B8" style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.18s", marginLeft: "auto" }} />
                    </div>
                  </div>
                  {isExpanded && phase.activities?.map((act) => {
                    const done = act.completed || act.isCompleted;
                    return (
                      <div key={act.id} style={{ padding: "6px 14px 6px 18px", borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${done ? "#22C55E" : "#CBD5E1"}`, background: done ? "#22C55E" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {done && <Check size={10} color="#fff" strokeWidth={3} />}
                        </div>
                        <span style={{ flex: 1, fontSize: 12, color: done ? "#94A3B8" : "#111827", textDecoration: done ? "line-through" : "none" }}>{act.name}</span>
                        <Badge variant={done ? "success" : "warning"} size="sm">{done ? "Done" : "Pending"}</Badge>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      </div>
    );
  }

  function renderInventory() {
    return (
      <Card padding="20px">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Site Inventory</h3>
          <Button variant="secondary" size="sm" onClick={() => navigate("/inventory")}>Manage</Button>
        </div>
        {inventory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#94A3B8" }}>
            <Package size={32} color="#CBD5E1" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13 }}>No inventory items</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {inventory.map((item, i) => {
              const bal = Number(item.quantity || item.stock || 0);
              const thresh = Number(item.threshold || 5);
              const st = bal <= 0 ? { label: "Out", color: "#EF4444", bg: "#FEF2F2" } : bal <= thresh ? { label: "Low", color: "#F59E0B", bg: "#FFFBEB" } : { label: "In Stock", color: "#22C55E", bg: "#F0FDF4" };
              return (
                <div key={item._id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 6, background: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                  <Package size={14} color="#64748B" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.materialName || "Item"}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>Qty: {bal} {item.unit || ""}</div>
                  </div>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: "100vh", background: "#F8FAFC", fontFamily: "Inter, 'Segoe UI', sans-serif" }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="ProjectDetailPage" />
      <Toast message={toast.msg} type={toast.type} onClose={clearToast} />
      {deleteConfirm && <ConfirmDialog message={deleteConfirm.message} danger={deleteConfirm.danger} confirmLabel={deleteConfirm.confirmLabel} onConfirm={deleteConfirm.onConfirm} onCancel={() => setDeleteConfirm(null)} />}
      <ProjectMemberModal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} project={project} onUpdateMembers={handleUpdateMembers} />

      <div className="tour-project-header" style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ border: "none", background: "#F1F5F9", cursor: "pointer", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827", letterSpacing: "-0.03em" }}>{p.projectName || "Project"}</h1>
            <Badge variant={status === "Completed" ? "success" : status === "On Hold" ? "warning" : "info"} size="sm">{status}</Badge>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}>
            <HelpCircle size={14} color="#475569" />
          </button>
          <div className="tour-full-dashboard-btn">
            <Button variant="secondary" size="sm" onClick={() => navigate("/managesite", { state: { project: p } })}>
              <BarChart3 size={14} /> Full Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "14px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Overall Progress</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#F97316" }}>{progress.toFixed(1)}%</span>
        </div>
        <div style={{ height: 6, background: "#F1F5F9", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(progress, 100)}%`, height: "100%", borderRadius: 8, background: progress >= 100 ? "#22C55E" : "#F97316", transition: "width 0.4s" }} />
        </div>
      </div>

      <div className="tour-tabs-nav" style={{ display: "flex", gap: 6, padding: "14px 24px", borderBottom: "1px solid #F1F5F9", background: "#fff", flexWrap: "wrap" }}>
        {TABS.map(renderTab)}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
        {tabContent()}
      </div>
    </div>
  );
}

function CatRow({ label, amount, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <DollarSign size={12} color={color} />
      <span style={{ flex: 1, fontSize: 13, color: "#475569" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{fmtINR(amount)}</span>
    </div>
  );
}
