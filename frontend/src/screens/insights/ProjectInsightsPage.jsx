import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  LayoutDashboard,
  ListTree,
  IndianRupee,
  Building2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { projectAPI } from "../../api";
import {
  Verdict,
  Kpis,
  Attention,
  Bridge,
  PhaseMatrix,
  SpendVsWork,
  ProgressLine,
  SpendCurve,
  Monthly,
  Mix,
  Cash,
  Suppliers,
  PhaseSheet,
  Badge,
} from "./InsightsWidgets";
import { HEALTH } from "./insightsFormat";
import BtHero from "../../components/ui/BtHero";
import BtSheet from "../../components/ui/BtSheet";
import BtChip from "../../components/ui/BtChip";
import BtSegmented from "../../components/ui/BtSegmented";
import BtEmpty from "../../components/ui/BtEmpty";
import { BtPageLoader } from "../../components/ui/BtBrickLoader";
import "./insights.css";

/**
 * Project Insights Hub (Blueprint Noir V2 Design System)
 * High-precision analytics, budget bridge, S-curve forecast, phase matrix, and cash flow.
 * Parity with Flutter's InsightsHubScreen and ProjectInsightsScreen.
 */
export default function ProjectInsightsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromProject = location.state?.project || null;

  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(
    id || fromProject?._id || fromProject?.id || null
  );
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Load all projects for top hero chip selector
  useEffect(() => {
    let mounted = true;
    projectAPI
      .getAll()
      .then((res) => {
        if (!mounted) return;
        const list = res.data || [];
        setProjects(list);
        if (!selectedId && list.length > 0) {
          const firstId = list[0]._id || list[0].id;
          setSelectedId(firstId);
        }
      })
      .catch((err) => {
        console.error("Error fetching projects for insights selector:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Sync selectedId with route id if it changes
  useEffect(() => {
    if (id && id !== selectedId) {
      setSelectedId(id);
    }
  }, [id]);

  // Load insights for selected project
  const load = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await projectAPI.getInsights(selectedId);
      setData(res.data);
    } catch (e) {
      setError(
        e?.friendlyMessage ||
          e?.response?.data?.message ||
          "Could not load project insights."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  // Escape key handler for PhaseSheet
  useEffect(() => {
    if (!phase) return;
    const onKey = (e) => e.key === "Escape" && setPhase(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const openById = (pid) =>
    setPhase(data?.phases?.find((p) => p.id === pid) || null);

  const p = data?.project;

  const backToProject = () => {
    if (fromProject) {
      navigate("/managesite", { state: { project: fromProject } });
    } else if (p) {
      navigate("/managesite", { state: { project: p } });
    } else {
      navigate("/projects");
    }
  };

  const handleSelectProject = (projId) => {
    setSelectedId(projId);
    navigate(`/project-insights/${projId}`, { replace: true, state: location.state });
  };

  const tabOptions = [
    { label: "Overview", value: "overview", icon: LayoutDashboard },
    { label: "Phases", value: "phases", icon: ListTree },
    { label: "Money", value: "money", icon: IndianRupee },
  ];

  return (
    <div className="pi">
      {/* ── TOP HERO (Deep Noir with blueprint grid & glow) ── */}
      <BtHero padding="24px 32px 48px">
        {/* Navigation & Header Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          {/* Back button & Breadcrumbs */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <button
              onClick={backToProject}
              aria-label="Back to project"
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--r-btn, 12px)",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "var(--bone)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                transition: "background 150ms ease",
                marginTop: 2,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")
              }
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <nav
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12.5,
                  fontFamily: "var(--font-ui)",
                  color: "var(--on-noir-2)",
                  marginBottom: 6,
                }}
              >
                <button
                  type="button"
                  onClick={() => navigate("/projects")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "inherit",
                    font: "inherit",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--bone)")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--on-noir-2)")
                  }
                >
                  Projects
                </button>
                <ChevronRight size={13} />
                {p ? (
                  <button
                    type="button"
                    onClick={backToProject}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "inherit",
                      font: "inherit",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--bone)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--on-noir-2)")
                    }
                  >
                    {p.name}
                  </button>
                ) : (
                  <span>…</span>
                )}
                <ChevronRight size={13} />
                <span style={{ color: "var(--bone)", fontWeight: 600 }}>Insights</span>
              </nav>

              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "var(--on-noir-2)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Project Insights
              </div>

              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 34,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "var(--bone)",
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                {p?.name || "Project Insights"}
              </h1>

              {p && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--on-noir-2)",
                    marginTop: 6,
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  {[p.code, p.clientName, p.location].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons on top right */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {data && (
              <span
                style={{
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  color: "var(--on-noir-2)",
                }}
              >
                Updated{" "}
                {new Date(data.generatedAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}

            <button
              onClick={load}
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 38,
                padding: "0 16px",
                borderRadius: "var(--r-btn, 12px)",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "var(--bone)",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-ui)",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)";
              }}
              onMouseLeave={(e) => {
                if (!loading)
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              }}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Horizontal Project Selector Chips (matching Flutter InsightsHubScreen) */}
        {projects.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 4,
              marginTop: 18,
              scrollbarWidth: "none",
            }}
          >
            {projects.map((proj) => {
              const pid = proj._id || proj.id;
              const isSelected = pid === selectedId;
              return (
                <BtChip
                  key={pid}
                  label={proj.name}
                  onDark={true}
                  selected={isSelected}
                  icon={isSelected ? Building2 : undefined}
                  onClick={() => handleSelectProject(pid)}
                />
              );
            })}
          </div>
        )}
      </BtHero>

      {/* ── MAIN CONTENT (Overlapping BtSheet) ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        {loading && !data && <InsightsSkeleton />}

        {error && !loading && (
          <div
            style={{
              maxWidth: 520,
              margin: "64px auto",
              textAlign: "center",
              background: "var(--card)",
              borderRadius: "var(--r-card)",
              border: "1px solid var(--line)",
              padding: "40px 32px",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--danger-soft, #fee2e2)",
                color: "var(--danger, #ef4444)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <AlertCircle size={26} />
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "var(--font-ui)",
                color: "var(--ink)",
                margin: 0,
              }}
            >
              Couldn't load insights
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--ink-soft)",
                margin: "8px 0 20px",
                lineHeight: 1.5,
              }}
            >
              {error}
            </p>
            <button
              onClick={load}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 40,
                padding: "0 20px",
                background: "var(--ink)",
                color: "#FFFFFF",
                borderRadius: "var(--r-btn, 12px)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
              }}
            >
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        )}

        {data && (
          <>
            {/* Sheet Sub-Header: Segmented Tab Bar + Status Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <BtSegmented
                options={tabOptions}
                value={activeTab}
                onChange={setActiveTab}
              />

              {data.health && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-soft)",
                      fontWeight: 500,
                    }}
                  >
                    Health Status:
                  </span>
                  <Badge
                    tone={HEALTH[data.health.status]?.tone}
                    Icon={HEALTH[data.health.status]?.Icon}
                  >
                    {HEALTH[data.health.status]?.label || "On track"}
                  </Badge>
                </div>
              )}
            </div>

            {/* Tab 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="pi-grid">
                <Verdict d={data} />
                <Kpis d={data} />
                <Attention alerts={data.alerts || []} onPhase={openById} />
                <Bridge d={data} onPhase={openById} className="span-6 wide-md" />
                <ProgressLine d={data} className="span-6 wide-md" />
              </div>
            )}

            {/* Tab 2: PHASES */}
            {activeTab === "phases" && (
              <>
                {data.phases && data.phases.length > 0 ? (
                  <div className="pi-grid">
                    <PhaseMatrix
                      phases={data.phases}
                      onOpen={setPhase}
                      className="span-7 wide-md"
                    />
                    <SpendVsWork
                      phases={data.phases}
                      onOpen={setPhase}
                      className="span-5 wide-md"
                    />
                  </div>
                ) : (
                  <BtEmpty
                    title="No phases yet"
                    message="Add phases with activity budgets to this project in Manage Site to see the phase budget matrix and spend dumbbell chart."
                    actionLabel="Go to Manage Site"
                    onAction={backToProject}
                  />
                )}
              </>
            )}

            {/* Tab 3: MONEY */}
            {activeTab === "money" && (
              <div className="pi-grid">
                <SpendCurve d={data} className="span-8 wide-md" />
                <Mix d={data} className="span-4 wide-md" />
                <Monthly d={data} className="span-6 wide-md" />
                <Cash d={data} className="span-6 wide-md" />
                <Suppliers list={data.suppliers || []} className="span-12" />
              </div>
            )}
          </>
        )}
      </BtSheet>

      {/* ── Slide-in Phase Detail Sheet ── */}
      <PhaseSheet phase={phase} onClose={() => setPhase(null)} />
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="pi-grid" aria-busy="true" aria-label="Loading insights">
      {[
        ["span-4 wide-md", 330],
        ["span-4 wide-md", 330],
        ["span-4 wide-md", 330],
        ["span-6 wide-md", 420],
        ["span-6 wide-md", 420],
      ].map(([c, h], i) => (
        <div
          key={i}
          className={`pi-skel ${c}`}
          style={{ height: h, background: "var(--fill)", borderRadius: "var(--r-card)" }}
        />
      ))}
    </div>
  );
}
