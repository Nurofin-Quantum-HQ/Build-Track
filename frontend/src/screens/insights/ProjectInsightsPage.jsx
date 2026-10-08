import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, ChevronRight } from "lucide-react";
import { projectAPI } from "../../api";
import {
  Verdict, Kpis, Attention, Bridge, PhaseMatrix, SpendVsWork, ProgressLine,
  SpendCurve, Monthly, Mix, Cash, Suppliers, PhaseSheet,
} from "./InsightsWidgets";
import "./insights.css";

/**
 * Project insights — analytics for one project.
 * Data: GET /api/projects/:id/insights (backend/services/projectInsights.js).
 * Opened from the Manage Site dashboard, which passes the project in route state
 * so "Back" can return there.
 */
export default function ProjectInsightsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromProject = location.state?.project || null;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectAPI.getInsights(id);
      setData(res.data);
    } catch (e) {
      setError(e?.friendlyMessage || e?.response?.data?.message || "Could not load project insights.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!phase) return;
    const onKey = (e) => e.key === "Escape" && setPhase(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const openById = (pid) => setPhase(data?.phases.find((p) => p.id === pid) || null);
  const p = data?.project;
  const backToProject = () =>
    fromProject ? navigate("/managesite", { state: { project: fromProject } }) : navigate("/projects");

  return (
    <div className="pi">
      <header className="pi-header">
        <div className="pi-header-inner">
          <button className="pi-btn icon" onClick={backToProject} aria-label="Back to project">
            <ArrowLeft size={17} />
          </button>
          <div style={{ minWidth: 0 }}>
            <nav className="pi-crumbs" aria-label="Breadcrumb">
              <button onClick={() => navigate("/projects")}>Projects</button>
              <ChevronRight size={13} />
              {p ? <button onClick={backToProject}>{p.name}</button> : <span>…</span>}
              <ChevronRight size={13} />
              <span style={{ color: "var(--ink)" }}>Insights</span>
            </nav>
            <h1 className="pi-title">
              {p?.name || "Project insights"}
            </h1>
            {p && <div className="pi-sub">{[p.code, p.clientName, p.location].filter(Boolean).join(" · ")}</div>}
          </div>
          <div className="pi-header-actions">
            {data && (
              <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                Updated {new Date(data.generatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            <button className="pi-btn" onClick={load} disabled={loading}>
              <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="pi-main">
        {loading && !data && <Skeleton />}
        {error && !loading && (
          <section className="pi-card" style={{ maxWidth: 480, margin: "64px auto", textAlign: "center", alignItems: "center" }}>
            <h2 className="pi-card-t">Couldn't load insights</h2>
            <p className="pi-card-d" style={{ margin: "6px 0 16px" }}>{error}</p>
            <button className="pi-btn" onClick={load}><RefreshCw size={15} /> Try again</button>
          </section>
        )}
        {data && (
          <div className="pi-grid">
            <Verdict d={data} />
            <Kpis d={data} />
            <Attention alerts={data.alerts} onPhase={openById} />

            {data.phases.length > 0 ? (
              <>
                <PhaseMatrix phases={data.phases} onOpen={setPhase} className="span-7 wide-md" />
                <Bridge d={data} onPhase={openById} className="span-5 wide-md" />
              </>
            ) : (
              <section className="pi-card span-12">
                <h2 className="pi-card-t">No phases yet</h2>
                <p className="pi-card-d">Add phases with activity budgets to this project to see the phase budget view and budget bridge.</p>
              </section>
            )}

            <SpendCurve d={data} className="span-8 wide-md" />
            <ProgressLine d={data} className="span-4 wide-md" />

            {data.phases.length > 0 && <SpendVsWork phases={data.phases} onOpen={setPhase} className="span-6" />}
            <Monthly d={data} className={data.phases.length > 0 ? "span-6" : "span-12"} />

            <Mix d={data} className="span-4" />
            <Cash d={data} className="span-4" />
            <Suppliers list={data.suppliers} className="span-4 wide-md" />
          </div>
        )}
      </main>

      <PhaseSheet phase={phase} onClose={() => setPhase(null)} />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="pi-grid" aria-busy="true" aria-label="Loading insights">
      {[["span-4", 330], ["span-4", 330], ["span-4", 330], ["span-7", 420], ["span-5", 420], ["span-8", 360], ["span-4", 360]].map(([c, h], i) => (
        <div key={i} className={`pi-skel ${c}`} style={{ height: h }} />
      ))}
    </div>
  );
}
