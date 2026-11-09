import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  RefreshCw,
  LayoutDashboard,
  ListTree,
  IndianRupee,
  Building2,
  Hash,
  UserRound,
  MapPin,
  Clock,
  ListChecks,
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
import BtPageHeader from "../../components/ui/BtPageHeader";
import BtButton from "../../components/ui/BtButton";
import BtChip from "../../components/ui/BtChip";
import BtSegmented from "../../components/ui/BtSegmented";
import BtEmpty, { BtErrorCard } from "../../components/ui/BtEmpty";
import BtSkeleton from "../../components/ui/BtSkeleton";
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
        const raw = res.data?.projects ?? res.data;
        const list = Array.isArray(raw) ? raw : [];
        setProjects(list);
        if (list.length === 0) setLoading(false);
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
      setData(null);
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
    if (projId !== selectedId) setData(null);
    setSelectedId(projId);
    navigate(`/project-insights/${projId}`, { replace: true, state: location.state });
  };

  const SpinIcon = (props) => <RefreshCw {...props} className={loading ? "spin" : ""} />;

  const updated = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const tabOptions = [
    { label: "Overview", value: "overview", icon: LayoutDashboard },
    { label: "Phases", value: "phases", icon: ListTree },
    { label: "Money", value: "money", icon: IndianRupee },
  ];

  return (
    <div className="pi">
      {/* ── Hero ── */}
      <BtHero padding="24px 32px 48px">
        <BtPageHeader
          back={{ label: "Project", onClick: backToProject }}
          eyebrow="Project insights"
          title={p?.name || "Project insights"}
          subtitle="Budget, spend, progress and cash for this site, with a forecast to the finish."
          meta={
            p && (
              <>
                {p.code && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Hash size={14} strokeWidth={1.9} aria-hidden /> {p.code}
                  </span>
                )}
                {p.clientName && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <UserRound size={14} strokeWidth={1.9} aria-hidden /> {p.clientName}
                  </span>
                )}
                {p.location && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={14} strokeWidth={1.9} aria-hidden /> {p.location}
                  </span>
                )}
                {updated && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Clock size={14} strokeWidth={1.9} aria-hidden /> Updated {updated}
                  </span>
                )}
              </>
            )
          }
          actions={
            <BtButton
              variant="onDark"
              size="small"
              icon={SpinIcon}
              onClick={() => !loading && load()}
              aria-busy={loading}
            >
              Refresh
            </BtButton>
          }
        >
          {projects.length > 0 && (
            <div className="pi-chips" role="group" aria-label="Choose a project">
              {projects.map((proj) => {
                const pid = proj._id || proj.id;
                const isSelected = pid === selectedId;
                return (
                  <BtChip
                    key={pid}
                    label={proj.projectName || proj.name}
                    onDark
                    selected={isSelected}
                    icon={isSelected ? Building2 : undefined}
                    aria-pressed={isSelected}
                    onClick={() => handleSelectProject(pid)}
                  />
                );
              })}
            </div>
          )}
        </BtPageHeader>
      </BtHero>

      {/* ── Content sheet ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        {loading && !data && <InsightsSkeleton />}

        {!loading && !error && !data && !selectedId && (
          <BtEmpty
            icon={Building2}
            title="No projects yet"
            message="Create a project and log a few entries to see its budget, spend and progress insights here."
            actionLabel="Go to Projects"
            onAction={() => navigate("/projects")}
          />
        )}

        {error && !loading && (
          <BtErrorCard
            title="Couldn't load insights"
            message={error}
            onRetry={load}
            style={{ marginBottom: data ? 20 : 0 }}
          />
        )}

        {data && (
          <>
            <div className="pi-tabs-bar">
              <BtSegmented options={tabOptions} value={activeTab} onChange={setActiveTab} className="bt-seg" />

              {data.health && (
                <div className="pi-health-pill" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, color: "var(--ink-2)", fontWeight: 500 }}>Health</span>
                  <Badge tone={HEALTH[data.health.status]?.tone} Icon={HEALTH[data.health.status]?.Icon}>
                    {HEALTH[data.health.status]?.label || "On track"}
                  </Badge>
                </div>
              )}
            </div>

            {/* Overview */}
            {activeTab === "overview" && (
              <div className="pi-grid">
                <Verdict d={data} className="span-7" />
                <Attention alerts={data.alerts || []} onPhase={openById} className="span-5" />
                <Kpis d={data} className="span-12" />
                <Bridge d={data} onPhase={openById} className="span-7" />
                <ProgressLine d={data} className="span-5" />
              </div>
            )}

            {/* Phases */}
            {activeTab === "phases" &&
              (data.phases && data.phases.length > 0 ? (
                <div className="pi-grid">
                  <PhaseMatrix phases={data.phases} onOpen={setPhase} className="span-7" />
                  <SpendVsWork phases={data.phases} onOpen={setPhase} className="span-5" />
                </div>
              ) : (
                <BtEmpty
                  icon={ListChecks}
                  title="No phases yet"
                  message="Add phases with activity budgets in Manage Site to see the phase budget matrix and the spend vs work chart."
                  actionLabel="Go to Manage Site"
                  onAction={backToProject}
                />
              ))}

            {/* Money */}
            {activeTab === "money" && (
              <div className="pi-grid">
                <SpendCurve d={data} className="span-8" />
                <Mix d={data} className="span-4" />
                <Monthly d={data} className="span-6" />
                <Cash d={data} className="span-6" />
                <Suppliers list={data.suppliers || []} className="span-12" />
              </div>
            )}
          </>
        )}
      </BtSheet>

      <PhaseSheet phase={phase} onClose={() => setPhase(null)} />
    </div>
  );
}

function InsightsSkeleton() {
  const block = (cls, h) => (
    <div className={cls}>
      <BtSkeleton height={h} borderRadius="var(--r-card)" />
    </div>
  );
  return (
    <div aria-busy="true" aria-label="Loading insights">
      <div style={{ marginBottom: 20 }}>
        <BtSkeleton width={300} height={42} borderRadius="var(--r-tile)" style={{ maxWidth: "100%" }} />
      </div>
      <div className="pi-grid">
        {block("span-7", 300)}
        {block("span-5", 300)}
        <div className="span-12 pi-kpis">
          {[0, 1, 2, 3].map((i) => (
            <BtSkeleton key={i} height={128} borderRadius="var(--r-card)" />
          ))}
        </div>
        {block("span-7", 360)}
        {block("span-5", 360)}
      </div>
    </div>
  );
}
