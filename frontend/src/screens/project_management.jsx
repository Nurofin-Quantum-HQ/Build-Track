import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useProjectStore from '../stores/projectStore';
import perfLogger from '../utils/performanceLogger';
import { resolveImageUrl } from '../utils/imageUrl';
import {
  BtHero,
  BtSheet,
  BtButton,
  BtCard,
  BtBadge,
  BtBricks,
  BtProgress,
  BtCountUp,
  formatInr,
  BtEmpty,
  BtPageLoader,
  BtSkeleton,
} from '../components/ui';
import {
  Search,
  Plus,
  Building2,
  ChevronRight,
  Edit3,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  MapPin,
  Clock,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import ModuleTour from '../components/ModuleTour';
import { Toast, ConfirmDialog } from '../components/Toast';

const TABS = ['All Projects', 'Active', 'On Hold', 'Review Needed', 'Completed'];

function getProjectStatus(raw) {
  const s = (raw || '').toLowerCase().replace(/[\s_]+/g, '');
  if (s === 'planning') return { label: 'Planning', tone: 'neutral' };
  if (s === 'onhold') return { label: 'On Hold', tone: 'amber' };
  if (s === 'completed') return { label: 'Completed', tone: 'green' };
  if (s === 'cancelled' || s === 'reviewneeded') return { label: 'Review Needed', tone: 'red' };
  return { label: 'In Progress', tone: 'brand' };
}

function ProjectPhoto({ photo, small = false }) {
  const imgSrc = photo ? resolveImageUrl(photo) : '';

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt="Project Site"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1C2029 0%, #0C0E12 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="blueprint-grid-canvas" style={{ opacity: 0.18 }} />
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'var(--accent)',
          filter: 'blur(34px)',
          opacity: 0.15,
        }}
      />
      <Building2
        size={small ? 26 : 46}
        color="var(--bone, #F6F4EF)"
        style={{ opacity: small ? 0.45 : 0.2, zIndex: 2 }}
      />
    </div>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { projects: allProjects, fetchProjects: storeFetchProjects } = useProjectStore();

  const [loading, setLoading] = useState(allProjects.length === 0);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All Projects');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ msg: '', type: 'info' });
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [runTour, setRunTour] = useState(false);

  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const canCreate = isAdmin || can('create_project') || can('manage_team');
  const canEdit = isAdmin || can('edit_project') || can('manage_team');

  const tourSteps = [
    { target: '.tour-header', content: 'Here you can view and manage all your projects.', disableBeacon: true },
    { target: '.tour-search', content: 'Use this to search for specific projects by name, location, or manager.' },
    ...(canCreate ? [{ target: '.tour-create-project', content: 'Click here to create a new project.' }] : []),
    { target: '.tour-tabs', content: 'Filter projects by their current status.' },
    { target: '.tour-project-list', content: 'This is your project list. Click any project to manage it.' },
  ];

  const clearToast = useCallback(() => setToast({ msg: '', type: 'info' }), []);

  useEffect(() => {
    perfLogger.endRoute('/projects');
    perfLogger.logMount('ProjectsPage');
  }, []);

  const fetchProjects = useCallback(
    async (force = false) => {
      try {
        if (allProjects.length === 0) setLoading(true);
        setError('');
        await storeFetchProjects({}, force);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || 'Unknown error';
        setError(`Failed to load projects: ${msg}`);
      } finally {
        setLoading(false);
      }
    },
    [allProjects.length, storeFetchProjects]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filtered = useMemo(() => {
    return allProjects.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (p.projectName || p.name || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.manager || '').toLowerCase().includes(q) ||
        (p.projectCode || '').toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (activeTab === 'All Projects') return true;

      const st = getProjectStatus(p.status).label;
      if (activeTab === 'Active') return st === 'In Progress' || st === 'Planning';
      if (activeTab === 'On Hold') return st === 'On Hold';
      if (activeTab === 'Review Needed') return st === 'Review Needed';
      if (activeTab === 'Completed') return st === 'Completed';
      return true;
    });
  }, [allProjects, search, activeTab]);

  const counts = useMemo(() => {
    return {
      'All Projects': allProjects.length,
      Active: allProjects.filter((p) => {
        const s = getProjectStatus(p.status).label;
        return s === 'In Progress' || s === 'Planning';
      }).length,
      'On Hold': allProjects.filter((p) => getProjectStatus(p.status).label === 'On Hold').length,
      'Review Needed': allProjects.filter((p) => getProjectStatus(p.status).label === 'Review Needed').length,
      Completed: allProjects.filter((p) => getProjectStatus(p.status).label === 'Completed').length,
    };
  }, [allProjects]);

  const openProject = (p) => {
    navigate('/managesite', { state: { project: p } });
  };

  const firstProject = filtered[0];
  const otherProjects = filtered.slice(1);

  if (loading && allProjects.length === 0) {
    return <BtPageLoader message="Loading projects…" />;
  }

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="ProjectManagement" />
      <Toast message={toast.msg} type={toast.type} onClose={clearToast} />
      {confirmDlg && (
        <ConfirmDialog
          message={confirmDlg.message}
          danger={confirmDlg.danger}
          confirmLabel={confirmDlg.confirmLabel}
          onConfirm={confirmDlg.onConfirm}
          onCancel={() => setConfirmDlg(null)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          HERO (Blueprint Noir Header)
         ══════════════════════════════════════════════════════════ */}
      <BtHero padding="32px 32px 56px">
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          {/* Eyebrow & Help */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--on-noir-3)',
              }}
            >
              BUILDTRACK • SITES & PHASES
            </div>

            <button
              type="button"
              onClick={() => setRunTour(true)}
              title="Help Tour"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '18px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: 'var(--on-noir-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <HelpCircle size={16} />
            </button>
          </div>

          {/* Title & Action Row */}
          <div
            className="tour-header"
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '36px',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: 'var(--bone)',
                }}
              >
                Projects
              </h1>
              <p
                style={{
                  margin: '6px 0 0',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '14px',
                  color: 'var(--on-noir-2)',
                }}
              >
                Active builds • {allProjects.length} {allProjects.length === 1 ? 'project' : 'projects'} total
              </p>
            </div>

            {canCreate && (
              <div className="tour-create-project">
                <BtButton
                  variant="accent"
                  icon={Plus}
                  onPress={() => navigate('/newproject')}
                >
                  New Project
                </BtButton>
              </div>
            )}
          </div>
        </div>
      </BtHero>

      {/* ══════════════════════════════════════════════════════════
          SHEET (Bone Surface)
         ══════════════════════════════════════════════════════════ */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Controls Bar: Search + Tabs + Refresh */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            {/* Status Filter Tabs */}
            <div
              className="tour-tabs"
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '2px',
              }}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    style={{
                      height: '38px',
                      padding: '0 14px',
                      borderRadius: '19px',
                      background: isActive ? 'var(--ink)' : 'var(--card)',
                      color: isActive ? 'var(--bone, #F6F4EF)' : 'var(--ink-2)',
                      border: `1px solid ${isActive ? 'var(--ink)' : 'var(--line)'}`,
                      boxShadow: isActive ? '0 2px 8px rgba(17, 19, 23, 0.12)' : 'none',
                      fontFamily: 'var(--font-ui)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <span>{tab}</span>
                    <span
                      className="tnum"
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        background: isActive ? 'rgba(255, 255, 255, 0.22)' : 'var(--fill)',
                        color: isActive ? 'var(--bone, #F6F4EF)' : 'var(--ink-3)',
                      }}
                    >
                      {counts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input & Refresh Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className="tour-search"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Search
                  size={15}
                  color="var(--ink-3)"
                  style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects, location, code…"
                  style={{
                    height: '38px',
                    padding: '0 14px 0 34px',
                    borderRadius: 'var(--r-input)',
                    border: '1px solid var(--line)',
                    background: 'var(--card)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    width: '240px',
                    outline: 'none',
                    transition: 'border-color 150ms ease',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
                />
              </div>

              <button
                type="button"
                onClick={() => fetchProjects(true)}
                title="Refresh projects"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--r-input)',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                background: 'var(--tone-red-bg)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--r-input)',
                padding: '12px 16px',
                color: 'var(--status-danger-bright)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{error}</span>
              <BtButton variant="secondary" small onPress={() => fetchProjects(true)}>
                Retry
              </BtButton>
            </div>
          )}

          {/* Project List / Empty State */}
          {filtered.length === 0 ? (
            <BtCard padding="48px 24px">
              <BtEmpty
                icon={Building2}
                title="No projects found"
                message={
                  allProjects.length === 0
                    ? 'No projects created yet. Click New Project to initialize your first build site.'
                    : 'No projects match your current search or filter criteria.'
                }
                action={
                  allProjects.length === 0 && canCreate ? (
                    <BtButton variant="primary" icon={Plus} onPress={() => navigate('/newproject')}>
                      New Project
                    </BtButton>
                  ) : null
                }
              />
            </BtCard>
          ) : (
            <div className="tour-project-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Feature Hero Card (First Project) */}
              {firstProject && (
                (() => {
                  const p = firstProject;
                  const st = getProjectStatus(p.status);
                  const spent = Number(p.spentAmount || 0);
                  const budget = Number(p.totalBudget || p.budget?.total || 0);
                  const progress = p.progress ?? (budget > 0 ? Math.min(spent / budget, 1) : 0);
                  const pct = Math.round((progress > 1 ? progress / 100 : progress) * 100);

                  return (
                    <BtCard
                      onClick={() => openProject(p)}
                      padding="0"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-card)',
                      }}
                    >
                      {/* Photo Banner with Overlay */}
                      <div
                        style={{
                          height: '200px',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <ProjectPhoto photo={p.photo} />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                              'linear-gradient(to top, rgba(12, 14, 18, 0.88) 0%, rgba(12, 14, 18, 0.25) 50%, rgba(12, 14, 18, 0.05) 100%)',
                          }}
                        />

                        {/* Status Badge in Glass Pill */}
                        <div style={{ position: 'absolute', top: '16px', left: '18px', zIndex: 3 }}>
                          <BtBadge label={st.label} tone={st.tone} />
                        </div>

                        {/* Title & Caption Overlaid */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '16px',
                            left: '20px',
                            right: '20px',
                            zIndex: 3,
                          }}
                        >
                          <h2
                            style={{
                              margin: 0,
                              fontFamily: 'var(--font-display)',
                              fontSize: '24px',
                              fontWeight: 800,
                              letterSpacing: '-0.02em',
                              color: 'var(--bone, #FFFFFF)',
                              textShadow: '0 2px 8px rgba(0, 0, 0, 0.7)',
                            }}
                          >
                            {p.projectName || p.name}
                          </h2>
                          <div
                            style={{
                              marginTop: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              fontFamily: 'var(--font-ui)',
                              fontSize: '13px',
                              color: 'var(--on-noir-2, rgba(246, 244, 239, 0.75))',
                            }}
                          >
                            {p.location && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={13} />
                                {p.location}
                              </span>
                            )}
                            {p.projectCode && (
                              <span>Code: {p.projectCode}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Info Bar */}
                      <div style={{ padding: '20px 24px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-ui)',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--ink-2)',
                            }}
                          >
                            Overall Progress
                          </span>
                          <span
                            className="tnum"
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: '16px',
                              fontWeight: 800,
                              color: 'var(--ink)',
                            }}
                          >
                            {pct}%
                          </span>
                        </div>

                        <BtBricks value={pct / 100} height={9} />

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '16px',
                            paddingTop: '14px',
                            borderTop: '1px solid var(--line)',
                          }}
                        >
                          <div
                            className="tnum"
                            style={{
                              fontFamily: 'var(--font-ui)',
                              fontSize: '14px',
                              color: 'var(--ink-2)',
                            }}
                          >
                            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                              {formatInr(spent, { compact: false })}
                            </span>
                            {budget > 0 ? (
                              <span> of {formatInr(budget, { compact: true })} budget</span>
                            ) : (
                              <span> spent • no budget set</span>
                            )}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontFamily: 'var(--font-ui)',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: 'var(--ink)',
                            }}
                          >
                            <span>View Site Plan</span>
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    </BtCard>
                  );
                })()
              )}

              {/* Grid of Other Projects */}
              {otherProjects.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {otherProjects.map((p) => {
                    const st = getProjectStatus(p.status);
                    const spent = Number(p.spentAmount || 0);
                    const budget = Number(p.totalBudget || p.budget?.total || 0);
                    const progress = p.progress ?? (budget > 0 ? Math.min(spent / budget, 1) : 0);
                    const pct = Math.round((progress > 1 ? progress / 100 : progress) * 100);

                    return (
                      <BtCard
                        key={p._id || p.id}
                        onClick={() => openProject(p)}
                        padding="18px 20px"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                          <div
                            style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: 'var(--r-tile)',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            <ProjectPhoto photo={p.photo} small />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                              }}
                            >
                              <h3
                                style={{
                                  margin: 0,
                                  fontFamily: 'var(--font-display)',
                                  fontSize: '16px',
                                  fontWeight: 700,
                                  color: 'var(--ink)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {p.projectName || p.name}
                              </h3>
                              <BtBadge label={st.label} tone={st.tone} />
                            </div>

                            {p.location && (
                              <div
                                style={{
                                  marginTop: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontFamily: 'var(--font-ui)',
                                  fontSize: '12px',
                                  color: 'var(--ink-3)',
                                }}
                              >
                                <MapPin size={12} />
                                {p.location}
                              </div>
                            )}

                            <div style={{ marginTop: '8px' }}>
                              <BtProgress value={pct / 100} thin />
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '10px',
                            borderTop: '1px solid var(--line)',
                            fontFamily: 'var(--font-ui)',
                            fontSize: '12px',
                          }}
                        >
                          <span className="tnum" style={{ color: 'var(--ink-2)' }}>
                            <strong style={{ color: 'var(--ink)' }}>{pct}%</strong> •{' '}
                            {formatInr(spent, { compact: true })} spent
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/newproject', { state: { project: p } });
                                }}
                                title="Edit project"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--ink-3)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                }}
                              >
                                <Edit3 size={14} />
                              </button>
                            )}
                            <ChevronRight size={14} color="var(--ink-3)" />
                          </div>
                        </div>
                      </BtCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </BtSheet>
    </div>
  );
}
