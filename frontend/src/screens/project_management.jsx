import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { projectAPI } from "../api";
import { useAuth } from "../contexts/AuthContext";
import useProjectStore from "../stores/projectStore";
import perfLogger from "../utils/performanceLogger";
import { Toast, ConfirmDialog } from "../components/Toast";
import { resolveImageUrl } from "../utils/imageUrl";
import { Card, Badge, Button, SkeletonLine } from "../components/ui";
import { Search, Plus, Building2, ArrowRight, Edit3, RefreshCw, FolderOpen, HelpCircle } from "lucide-react";
import ModuleTour from "../components/ModuleTour";

const STATUS_STYLE = {
  planning:   { bg: "#FFF8E1", text: "#F57F17", border: "#FFC107", label: "Planning" },
  inprogress: { bg: "#FFF5F0", text: "#EA580C", border: "#F97316", label: "In Progress" },
  onhold:     { bg: "#FFF3E0", text: "#E65100", border: "#FF9800", label: "On Hold" },
  completed:  { bg: "#E8F5E9", text: "#2E7D32", border: "#43A047", label: "Completed" },
  cancelled:  { bg: "#FFEBEE", text: "#C62828", border: "#E53935", label: "Review Needed" },
};

const TABS = ["All Projects", "Active", "On Hold", "Review Needed", "Completed"];

function statusKey(raw) {
  if (!raw) return "inprogress";
  const s = raw.toLowerCase().replace(/\s+/g, "");
  if (s === "planning") return "planning";
  if (s === "inprogress" || s === "active") return "inprogress";
  if (s === "onhold") return "onhold";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "reviewneeded") return "cancelled";
  return "inprogress";
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { projects: allProjects, fetchProjects: storeFetchProjects } = useProjectStore();

  const [loading, setLoading] = useState(allProjects.length === 0);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState("All Projects");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "info" });
  const [confirmDlg, setConfirmDlg] = useState(null);

  const [runTour, setRunTour] = useState(false);


  const isAdmin = user?.role?.toLowerCase() === "admin";
  const canCreate = isAdmin || can("create_project") || can("manage_team");
  const canEdit = isAdmin || can("edit_project") || can("manage_team");

  const tourSteps = [
    { target: '.tour-header', content: 'Here you can view and manage all your projects.', disableBeacon: true },
    { target: '.tour-search', content: 'Use this to search for specific projects by name, location, or manager.' },
    ...(canCreate ? [{ target: '.tour-create-project', content: 'Click here to create a new project.' }] : []),
    { target: '.tour-tabs', content: 'Filter projects by their current status.' },
    { target: '.tour-project-list', content: 'This is your project list. Click any project to manage it.' }
  ];

  const clearToast = useCallback(() => setToast({ msg: "", type: "info" }), []);

  useEffect(() => {
    perfLogger.endRoute('/projects');
    perfLogger.logMount('ProjectsPage');
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchProjects = useCallback(async (force = false) => {
    try {
      if (allProjects.length === 0) setLoading(true);
      setError("");
      await storeFetchProjects({}, force);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || "Unknown error";
      setError(status ? `Failed to load projects (${status}): ${msg}` : `Failed to load projects: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [allProjects.length, storeFetchProjects]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filtered = allProjects.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.projectName?.toLowerCase().includes(q) || (p.location || "").toLowerCase().includes(q) || (p.manager || "").toLowerCase().includes(q);
    if (activeTab === "All Projects") return matchSearch;
    const status = (p.status || "").toLowerCase();
    if (activeTab === "Active") return matchSearch && (status === "active" || status === "inprogress" || status === "in progress");
    if (activeTab === "On Hold") return matchSearch && (status === "onhold" || status === "on hold");
    if (activeTab === "Review Needed") return matchSearch && (status === "cancelled" || status === "reviewneeded" || status === "review needed");
    if (activeTab === "Completed") return matchSearch && status === "completed";
    return matchSearch;
  });

  const counts = {
    "All Projects": allProjects.length,
    "Active": allProjects.filter(p => { const s = (p.status || "").toLowerCase(); return s === "active" || s === "inprogress" || s === "in progress"; }).length,
    "On Hold": allProjects.filter(p => { const s = (p.status || "").toLowerCase(); return s === "onhold" || s === "on hold"; }).length,
    "Review Needed": allProjects.filter(p => { const s = (p.status || "").toLowerCase(); return s === "cancelled" || s === "reviewneeded" || s === "review needed"; }).length,
    "Completed": allProjects.filter(p => (p.status || "").toLowerCase() === "completed").length,
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto', animation: 'fadeUp 300ms ease' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="ProjectManagement" />
      <Toast message={toast.msg} type={toast.type} onClose={clearToast} />
      {confirmDlg && <ConfirmDialog message={confirmDlg.message} danger={confirmDlg.danger} confirmLabel={confirmDlg.confirmLabel} onConfirm={confirmDlg.onConfirm} onCancel={() => setConfirmDlg(null)} />}

      <div className="tour-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', margin: 0, marginBottom: 4 }}>
            Projects
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
            {loading ? "Loading..." : `${allProjects.length} project${allProjects.length !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
            <HelpCircle size={16} color="#64748B" />
          </button>
          <div className="tour-search" style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 12px', height: 36, gap: 8 }}>
            <Search size={14} color="#94A3B8" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." style={{ border: 'none', outline: 'none', fontSize: 13, color: '#111827', background: 'transparent', width: isMobile ? 120 : 180, fontFamily: 'inherit' }} />
          </div>
          <button onClick={fetchProjects} title="Refresh projects" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
            <RefreshCw size={14} color="#64748B" />
          </button>
          {canCreate && (
            <div className="tour-create-project">
              <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={() => navigate("/newproject")}>
                New Project
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="tour-tabs" style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E5E7EB', marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{
              padding: '12px 4px 12px', marginRight: 20,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: activeTab === t ? 600 : 400,
              color: activeTab === t ? '#F97316' : '#64748B',
              borderBottom: activeTab === t ? '2px solid #F97316' : '2px solid transparent',
              transition: 'all 150ms', whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}>
            {t} ({counts[t]})
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={fetchProjects} style={{ background: 'transparent', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 12px', color: '#DC2626', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
              <SkeletonLine width="40%" height={20} />
              <div style={{ height: 8 }} />
              <SkeletonLine width="60%" height={14} />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>Active Builds</h2>
            <Badge variant="info">{allProjects.length} {allProjects.length === 1 ? 'Site' : 'Sites'}</Badge>
          </div>

          {filtered.length > 0 ? (
            <div className="tour-project-list" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
              {filtered.map(p => {
                const sk = statusKey(p.status);
                const st = STATUS_STYLE[sk] || STATUS_STYLE.inprogress;
                const spent = p.spentAmount || 0;
                const budget = p.totalBudget || p.budget?.total || 0;
                const progress = p.progress ?? (budget > 0 ? Math.min(spent / budget, 1) : 0);
                return (
                  <div key={p._id}
                    style={{
                      background: '#fff', borderRadius: 12,
                      border: '1px solid #E5E7EB', padding: '20px 24px',
                      cursor: 'pointer', transition: 'box-shadow 150ms ease, transform 150ms ease',
                      position: 'relative',
                    }}
                    className="hover-lift-sm"
                    onClick={() => navigate("/managesite", { state: { project: p } })}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', flex: 1 }}>{p.projectName}</h3>
                      <span style={{
                        background: st.bg, color: st.text, border: `1px solid ${st.border}`,
                        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap'
                      }}>
                        {st.label}
                      </span>
                    </div>

                    {p.location && (
                      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Building2 size={13} />
                        {p.location}
                      </div>
                    )}

                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F97316', marginBottom: 14 }}>
                      ₹{spent.toLocaleString("en-IN")} of ₹{budget.toLocaleString("en-IN")}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Overall Progress</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#F97316' }}>{Math.round(progress * 100)}%</span>
                    </div>
                    <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
                      <div style={{ width: `${Math.round(progress * 100)}%`, height: '100%', background: '#F97316', borderRadius: 3, transition: 'width 0.4s ease' }} />
                    </div>

                    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                        {canEdit && (
                          <button onClick={() => navigate("/newproject", { state: { project: p } })} title="Edit project" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#64748B', display: 'flex', alignItems: 'center' }}>
                            <Edit3 size={15} />
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#F97316' }}>
                        <span>View Details</span>
                        <ArrowRight size={14} color="#F97316" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1px border #E5E7EB', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FolderOpen size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>No projects found</div>
              <div style={{ fontSize: 13, color: '#64748B', maxWidth: 300, marginBottom: 16 }}>
                {allProjects.length === 0
                  ? 'No projects yet. Click "New Project" to create your first project.'
                  : 'No projects match your current search or filter criteria.'}
              </div>
              {allProjects.length === 0 && canCreate && (
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => navigate("/newproject")}>
                  New Project
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
