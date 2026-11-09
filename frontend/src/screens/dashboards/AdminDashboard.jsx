import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  BtButton,
  BtIconButton,
  BtCard,
  BtGroup,
  BtRow,
  BtBadge,
  BtHero,
  BtPageHeader,
  BtGlassTile,
  BtSheet,
  BtBricks,
  BtRing,
  BtCountUp,
  formatInr,
  BtEmpty,
  BtErrorCard,
  BtTypeTile,
  BtSectionHeader,
  BtPageLoader,
} from '../../components/ui';
import { dashboardAPI, workerAPI, approvalAPI } from '../../api';
import perfLogger from '../../utils/performanceLogger';
import {
  Clock,
  PlusCircle,
  Mic,
  FileText,
  Building2,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Layers,
  Check,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  IndianRupee,
} from 'lucide-react';
import useProjectStore from '../../stores/projectStore';
import useTransactionStore from '../../stores/transactionStore';
import AddRevenueModal from '../../components/AddRevenueModal';
import ModuleTour from '../../components/ModuleTour';
import { ConfirmDialog } from '../../components/Toast';

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const clip = (text, max) => (text && text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** One clickable tile in the Quick actions row (a real button: keyboard + focus ring). */
function ActionTile({ icon: Icon, title, desc, onClick, ink = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bt-hover-card ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        minHeight: 84,
        padding: '16px 18px',
        textAlign: 'left',
        cursor: 'pointer',
        boxSizing: 'border-box',
        borderRadius: 'var(--r-card)',
        border: ink ? '1px solid var(--noir-line)' : '1px solid var(--line)',
        background: ink ? 'var(--ink)' : 'var(--card)',
        boxShadow: 'var(--shadow-card)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--r-tile)',
          background: ink ? 'var(--accent)' : 'var(--fill)',
          color: ink ? 'var(--on-accent)' : 'var(--ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={21} strokeWidth={ink ? 2.1 : 1.85} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 15,
            fontWeight: 600,
            color: ink ? 'var(--on-noir)' : 'var(--ink)',
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 13,
            color: ink ? 'var(--on-noir-2)' : 'var(--ink-3)',
            marginTop: 2,
          }}
        >
          {desc}
        </span>
      </span>
      <ChevronRight size={16} color={ink ? 'var(--on-noir-3)' : 'var(--ink-3)'} style={{ flexShrink: 0 }} />
    </button>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { projects, fetchProjects, error: projectsError } = useProjectStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [dropdownAlign, setDropdownAlign] = useState('right');
  const projectDropdownRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [addRevenueModalOpen, setAddRevenueModalOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [showTourPopup, setShowTourPopup] = useState(false);

  // Close the scope menu on outside click or Escape.
  useEffect(() => {
    if (!projectDropdownOpen) return undefined;
    const handleClickOutside = (e) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target)) {
        setProjectDropdownOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setProjectDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [projectDropdownOpen]);

  const toggleDropdown = () => {
    if (!projectDropdownOpen && projectDropdownRef.current) {
      const rect = projectDropdownRef.current.getBoundingClientRect();
      // Open towards whichever side has room so the menu never leaves the screen.
      setDropdownAlign(rect.left + 320 > window.innerWidth - 16 ? 'right' : 'left');
    }
    setProjectDropdownOpen((prev) => !prev);
  };

  const tourSteps = [
    ...(projects.length === 0
      ? [{ target: '.tour-new-project', content: 'You have no projects yet. Click here to create one.' }]
      : []),
    { target: '.tour-voice-update', content: 'Use the AI Foreman to quickly log updates using your voice.' },
    { target: '.tour-project-selector', content: 'Switch between your active projects here.' },
    { target: '.tour-quick-actions', content: 'Quickly access main features like Reports, Team, and Settings.' },
    { target: '.tour-recent-activity', content: 'See all recent expenses and payments logged by your team.' },
    { target: '.tour-approvals-history', content: 'Keep track of approvals or rejections of expenses.' },
  ];

  useEffect(() => {
    perfLogger.endRoute('/');
    perfLogger.logMount('AdminDashboard');
  }, []);

  const loadAll = useCallback(() => {
    setLoading(true);
    return Promise.all([
      fetchProjects(),
      dashboardAPI.getSummary().catch(() => ({ data: null })),
      workerAPI.getAll().catch(() => ({ data: { workers: [] } })),
      approvalAPI.getPending().catch(() => ({ data: [] })),
      approvalAPI.getHistory().catch(() => ({ data: [] })),
    ])
      .then(([projList, , , pendRes]) => {
        if (projList && projList.length === 0) {
          if (!localStorage.getItem('appTourPrompted')) {
            setShowTourPopup(true);
          }
        }

        const extractArray = (res) => {
          if (!res || !res.data) return [];
          if (Array.isArray(res.data)) return res.data;
          if (Array.isArray(res.data.data)) return res.data.data;
          if (Array.isArray(res.data.transactions)) return res.data.transactions;
          if (res.data.data && Array.isArray(res.data.data.transactions)) return res.data.data.transactions;
          return [];
        };

        const pendingCount = extractArray(pendRes).filter(
          (a) => (a.approvalStatus || '').toLowerCase() === 'pending'
        ).length;
        setPendingApprovals(pendingCount);
      })
      .finally(() => setLoading(false));
  }, [fetchProjects]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedProjectId) return;
    if (selectedProjectId === 'all') {
      fetchTransactions({});
    } else {
      fetchTransactions({ project: selectedProjectId });
    }
  }, [selectedProjectId, fetchTransactions]);

  const isGlobalView = selectedProjectId === 'all' || !selectedProjectId;
  const selectedProject = projects.find((p) => (p._id || p.id) === selectedProjectId);
  const selectedName = selectedProject?.projectName || selectedProject?.name || 'Select project';

  const projectTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (isGlobalView) return true;
        const pid = t.project?._id || t.project?.id || t.project;
        return pid === selectedProjectId;
      })
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }, [transactions, selectedProjectId, isGlobalView]);

  const filteredApprovalHistory = useMemo(() => {
    return projectTransactions.filter((t) => {
      const st = (t.approvalStatus || '').toLowerCase();
      const isActioned = st === 'approved' || st === 'rejected';
      if (!isActioned) return false;
      if (t.type === 'Income' || t.type === 'Revenue') return false;
      return true;
    });
  }, [projectTransactions]);

  const recentEntries = projectTransactions.slice(0, 5);
  const incomeTransactions = projectTransactions.filter((t) => t.type === 'Income').slice(0, 3);

  const progressRaw = selectedProject
    ? Number(selectedProject?.progress || 0)
    : projects.length
    ? projects.reduce((sum, p) => sum + Number(p.progress || 0), 0) / projects.length
    : 0;
  const progress = progressRaw > 1 ? progressRaw / 100 : progressRaw;

  const totalCost = selectedProject
    ? Number(selectedProject?.spentAmount || 0)
    : projects.reduce((sum, p) => sum + Number(p.spentAmount || 0), 0);

  const totalRevenue = selectedProject
    ? Number(selectedProject?.totalIncome || 0)
    : projects.reduce((sum, p) => sum + Number(p.totalIncome || 0), 0);

  const netCashflow = totalRevenue - totalCost;
  const budget = selectedProject
    ? Number(selectedProject?.totalBudget || selectedProject?.budget?.total || 0)
    : projects.reduce((sum, p) => sum + Number(p.totalBudget || p.budget?.total || 0), 0);

  const usedPct = budget > 0 ? totalCost / budget : 0;
  const over = budget > 0 && totalCost > budget * 0.9;
  const hasData = isGlobalView || Boolean(selectedProject);

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const firstName = (user?.name || 'Admin').split(' ')[0];

  const refreshTransactions = () => {
    if (selectedProjectId === 'all') fetchTransactions({});
    else fetchTransactions({ project: selectedProjectId });
  };

  if (loading) {
    return <BtPageLoader label="Loading dashboard…" />;
  }

  const scopeOptionStyle = (selected) => ({
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    cursor: 'pointer',
    border: 'none',
    textAlign: 'left',
    fontFamily: 'var(--font-ui)',
    background: selected ? 'rgba(255, 255, 255, 0.10)' : 'transparent',
    color: selected ? 'var(--on-noir)' : 'var(--on-noir-2)',
    transition: 'background 120ms ease',
  });

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="admin_dashboard" />

      {showTourPopup && (
        <ConfirmDialog
          message="Welcome to BuildTrack! Do you want an app tour to help you get started?"
          confirmLabel="Yes"
          cancelLabel="No"
          onConfirm={() => {
            localStorage.setItem('appTourPrompted', 'true');
            localStorage.setItem('globalTourActive', 'true');
            setShowTourPopup(false);
            setRunTour(true);
          }}
          onCancel={() => {
            localStorage.setItem('appTourPrompted', 'true');
            setShowTourPopup(false);
          }}
        />
      )}

      {/* HERO: who, which scope, and the one number that matters (cost so far) */}
      <BtHero padding="24px clamp(16px, 4vw, 28px) 56px">
        <BtPageHeader
          eyebrow={`${todayLabel} · ${getGreeting()}`}
          title={`${getGreeting()}, ${firstName}`}
          subtitle={
            isGlobalView
              ? `Here is where ${projects.length === 1 ? 'your project stands' : 'all your projects stand'} today.`
              : `Showing ${selectedName} only.`
          }
          actions={
            <>
              <div ref={projectDropdownRef} className="tour-project-selector" style={{ position: 'relative' }}>
                <BtButton
                  variant="onDark"
                  size="small"
                  icon={isGlobalView ? Layers : Building2}
                  trailingIcon={ChevronDown}
                  aria-haspopup="listbox"
                  aria-expanded={projectDropdownOpen}
                  onClick={toggleDropdown}
                  style={{
                    background: projectDropdownOpen ? 'rgba(255, 255, 255, 0.14)' : undefined,
                    borderColor: projectDropdownOpen ? 'var(--accent)' : undefined,
                  }}
                >
                  {isGlobalView ? 'All projects' : clip(selectedName, 22)}
                </BtButton>

                {projectDropdownOpen && (
                  <div
                    role="listbox"
                    aria-label="Dashboard scope"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      [dropdownAlign]: 0,
                      width: 'min(320px, calc(100vw - 56px))',
                      background: 'var(--noir-2)',
                      border: '1px solid var(--noir-line)',
                      borderRadius: 'var(--r-input)',
                      boxShadow: 'var(--shadow-raised)',
                      zIndex: 100,
                      padding: 8,
                      animation: 'fadeIn 120ms ease',
                    }}
                  >
                    <div
                      className="bt-eyebrow"
                      style={{
                        padding: '6px 12px 8px',
                        color: 'var(--on-noir-3)',
                        borderBottom: '1px solid var(--noir-line)',
                        marginBottom: 4,
                      }}
                    >
                      Show numbers for
                    </div>

                    <button
                      type="button"
                      role="option"
                      aria-selected={isGlobalView}
                      onClick={() => {
                        setSelectedProjectId('all');
                        setProjectDropdownOpen(false);
                      }}
                      style={scopeOptionStyle(isGlobalView)}
                      className="bt-icon-btn on-dark"
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Layers size={16} color="var(--accent)" />
                        <span>
                          <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>All projects</span>
                          <span style={{ display: 'block', fontSize: 13, color: 'var(--on-noir-3)' }}>
                            Combined overview
                          </span>
                        </span>
                      </span>
                      {isGlobalView && <Check size={16} color="var(--accent)" />}
                    </button>

                    {projects.length > 0 && (
                      <div
                        style={{
                          marginTop: 6,
                          borderTop: '1px solid var(--noir-line)',
                          paddingTop: 6,
                          maxHeight: 240,
                          overflowY: 'auto',
                        }}
                      >
                        {projects.map((p) => {
                          const pid = p._id || p.id;
                          const isSel = selectedProjectId === pid;
                          return (
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSel}
                              key={pid}
                              onClick={() => {
                                setSelectedProjectId(pid);
                                setProjectDropdownOpen(false);
                              }}
                              style={scopeOptionStyle(isSel)}
                              className="bt-icon-btn on-dark"
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <Building2 size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                                <span style={{ minWidth: 0 }}>
                                  <span
                                    style={{
                                      display: 'block',
                                      fontSize: 14,
                                      fontWeight: 600,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {p.projectName || p.name}
                                  </span>
                                  {(p.location || p.projectCode) && (
                                    <span style={{ display: 'block', fontSize: 13, color: 'var(--on-noir-3)' }}>
                                      {p.location || p.projectCode}
                                    </span>
                                  )}
                                </span>
                              </span>
                              {isSel && <Check size={16} color="var(--accent)" style={{ flexShrink: 0 }} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {projects.length === 0 && (
                <BtButton
                  variant="accent"
                  size="small"
                  className="tour-new-project"
                  icon={Plus}
                  onClick={() => navigate('/newproject')}
                >
                  New project
                </BtButton>
              )}

              <BtIconButton icon={HelpCircle} label="Page tour" onDark onClick={() => setRunTour(true)} />
            </>
          }
        >
          {/* The one answer: money spent against budget */}
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: 'var(--on-noir-2)' }}>
              Total cost so far
            </div>
            <div
              className="tnum"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(40px, 5.4vw, 60px)',
                fontWeight: 700,
                letterSpacing: '-0.035em',
                lineHeight: 1.05,
                color: 'var(--on-noir)',
                margin: '6px 0 8px',
              }}
            >
              {hasData ? (
                <BtCountUp value={totalCost} format={(v) => formatInr(v, { compact: true })} />
              ) : (
                '—'
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--on-noir-2)' }}>
              {budget > 0 ? (
                <>
                  of{' '}
                  <span className="tnum" style={{ fontWeight: 600, color: 'var(--on-noir)' }}>
                    {formatInr(budget, { compact: true })}
                  </span>{' '}
                  budget
                  <span aria-hidden="true"> · </span>
                  <span
                    className="tnum"
                    style={{
                      fontWeight: 700,
                      color: over ? 'var(--status-danger-bright)' : 'var(--accent)',
                    }}
                  >
                    {(usedPct * 100).toFixed(0)}% used
                  </span>
                </>
              ) : (
                <span>No budget set</span>
              )}
            </div>
          </div>

          <BtBricks
            value={Math.min(Math.max(usedPct, 0), 1)}
            onDark
            color={over ? 'var(--status-danger-bright)' : undefined}
          />

          <div className="bt-grid-3 tour-kpis" style={{ gap: 12 }}>
            <BtGlassTile
              label="Budget left"
              value={budget > 0 ? formatInr(budget - totalCost, { compact: true }) : '—'}
              valueColor={budget > 0 && totalCost > budget ? 'var(--status-danger-bright)' : undefined}
              icon={Wallet}
            />
            <BtGlassTile
              label="Total revenue"
              value={formatInr(totalRevenue, { compact: true })}
              valueColor="var(--status-success-bright)"
              icon={ArrowUpRight}
            />
            <BtGlassTile
              label={netCashflow >= 0 ? 'Net profit' : 'Net loss'}
              value={`${netCashflow >= 0 ? '+' : '-'}${formatInr(Math.abs(netCashflow), { compact: true })}`}
              valueColor={netCashflow >= 0 ? 'var(--status-success-bright)' : 'var(--status-danger-bright)'}
              icon={netCashflow >= 0 ? TrendingUp : TrendingDown}
            />
          </div>
        </BtPageHeader>
      </BtHero>

      {/* SHEET */}
      <BtSheet overlap={26} padding="28px clamp(16px, 4vw, 28px) 64px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {projectsError && projects.length === 0 && (
            <BtErrorCard
              title="Couldn't load your projects"
              message="The numbers above may be incomplete. Check your connection and try again."
              onRetry={loadAll}
            />
          )}

          {pendingApprovals > 0 && (
            <div
              style={{
                background: 'var(--status-warning-soft)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-card)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 'var(--r-tile)',
                    background: 'var(--status-warning)',
                    color: 'var(--card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={21} strokeWidth={2} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>
                    {pendingApprovals} {pendingApprovals === 1 ? 'approval is' : 'approvals are'} waiting for you
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-2)', marginTop: 2 }}>
                    Entries and updates from your team need a decision.
                  </div>
                </div>
              </div>
              <BtButton variant="primary" size="small" onClick={() => navigate('/approvals')}>
                Review now
              </BtButton>
            </div>
          )}

          {/* Quick actions (Speak Update is the voice entry) */}
          <section className="tour-quick-actions">
            <BtSectionHeader title="Quick actions" />
            <div className="bt-grid-4">
              <ActionTile
                ink
                className="tour-voice-update"
                icon={Mic}
                title="Speak update"
                desc="Say it, we log it"
                onClick={() => navigate('/voice')}
              />
              <ActionTile
                icon={PlusCircle}
                title="Add entry"
                desc="Log expense or labour"
                onClick={() => navigate('/add-entry')}
              />
              <ActionTile
                icon={FileText}
                title="Manual entry"
                desc="Fill in the full form"
                onClick={() => navigate('/manualentry')}
              />
              <ActionTile
                icon={Building2}
                title="View projects"
                desc="All sites and phases"
                onClick={() => navigate('/projects')}
              />
            </div>
          </section>

          {/* Work + client money */}
          <div className="bt-grid-2" style={{ alignItems: 'stretch' }}>
            <BtCard padding="22px 24px" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 32 }}>
                <span className="bt-eyebrow" style={{ color: 'var(--ink-3)' }}>
                  Work progress
                </span>
                {selectedProject && (
                  <BtBadge
                    label={selectedProject.status || 'Active'}
                    tone={selectedProject.status === 'Active' || !selectedProject.status ? 'success' : 'warning'}
                  />
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 22, flex: 1, paddingTop: 12 }}>
                <BtRing value={Math.min(Math.max(progress, 0), 1)} size={88} stroke={8} color="var(--accent)">
                  <span
                    className="tnum"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}
                  >
                    {(progress * 100).toFixed(0)}%
                  </span>
                </BtRing>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                    Work done
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: 14,
                      color: 'var(--ink-2)',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isGlobalView ? 'Average across all projects' : selectedName}
                  </div>
                  {selectedProject?.location && (
                    <div
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontSize: 13,
                        color: 'var(--ink-3)',
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Building2 size={13} />
                      {selectedProject.location}
                    </div>
                  )}
                </div>
              </div>
            </BtCard>

            <BtCard padding="22px 24px" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 32 }}>
                <span className="bt-eyebrow" style={{ color: 'var(--ink-3)' }}>
                  Client money
                </span>
                <BtButton
                  variant="secondary"
                  size="compact"
                  icon={Plus}
                  onClick={() => setAddRevenueModalOpen(true)}
                >
                  Record revenue
                </BtButton>
              </div>

              {incomeTransactions.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, paddingTop: 12 }}>
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--r-tile)',
                      background: 'var(--fill)',
                      color: 'var(--ink-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IndianRupee size={20} strokeWidth={1.85} />
                  </span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                      No payments recorded yet
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-3)', marginTop: 2 }}>
                      Money you receive from the client shows here.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
                  {incomeTransactions.map((t, idx) => (
                    <div
                      key={t._id || t.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 0',
                        borderTop: idx === 0 ? 'none' : '1px solid var(--line)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-ui)',
                            fontSize: 15,
                            fontWeight: 600,
                            color: 'var(--ink)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.title || 'Revenue'}
                        </div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-3)' }}>
                          {relativeTime(t.date || t.createdAt)}
                        </div>
                      </div>
                      <div
                        className="tnum"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'var(--status-success)',
                          flexShrink: 0,
                        }}
                      >
                        +{formatInr(Math.abs(Number(t.amount || t.totalAmount || 0)))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </BtCard>
          </div>

          {/* Recent activity + approval history */}
          <div className="bt-grid-2" style={{ alignItems: 'start', gap: 24 }}>
            <section className="tour-recent-activity">
              <BtSectionHeader title="Recent activity" action="View all" onAction={() => navigate('/transaction')} />
              {recentEntries.length === 0 ? (
                <BtCard>
                  <BtEmpty
                    icon={Clock}
                    title="No recent entries"
                    message="Transactions added manually or spoken will appear here."
                  />
                </BtCard>
              ) : (
                <BtGroup>
                  {recentEntries.map((entry, idx) => {
                    const amt = Number(entry.amount || entry.totalAmount || 0);
                    const pName =
                      typeof entry.project === 'object'
                        ? entry.project?.projectName || entry.project?.name || ''
                        : entry.projectName || entry.project || '';

                    return (
                      <BtRow
                        key={entry._id || entry.id || idx}
                        className="bt-hover-row"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate('/entry-detail', { state: { entry } });
                          }
                        }}
                        icon={<BtTypeTile type={entry.type} size={38} />}
                        title={entry.title || entry.name || entry.type || 'Entry'}
                        subtitle={`${pName ? `${pName} · ` : ''}${relativeTime(entry.date || entry.createdAt)}`}
                        tag={<BtBadge label={entry.type || 'Material'} tone={entry.type || 'material'} />}
                        amount={Math.abs(amt)}
                        amountColor={entry.type === 'Income' ? 'var(--status-success)' : undefined}
                        onClick={() => navigate('/entry-detail', { state: { entry } })}
                      />
                    );
                  })}
                </BtGroup>
              )}
            </section>

            <section className="tour-approvals-history">
              <BtSectionHeader title="Team approvals" action="Approvals hub" onAction={() => navigate('/approvals')} />
              {filteredApprovalHistory.length === 0 ? (
                <BtCard>
                  <BtEmpty
                    icon={CheckCircle2}
                    title="No approval history"
                    message="Approvals and rejections will be listed here."
                  />
                </BtCard>
              ) : (
                <BtGroup>
                  {filteredApprovalHistory.slice(0, 5).map((h, idx) => {
                    const actionedBy = h.actionedBy?.name || h.reviewedBy?.name || 'Admin';
                    const submitter = h.submitter?.name || h.createdBy?.name || 'Worker';
                    const isApproved = (h.approvalStatus || h.status)?.toLowerCase() === 'approved';

                    return (
                      <BtRow
                        key={h._id || idx}
                        icon={
                          isApproved ? (
                            <CheckCircle2 size={18} color="var(--status-success)" />
                          ) : (
                            <XCircle size={18} color="var(--status-danger)" />
                          )
                        }
                        iconBg={isApproved ? 'var(--status-success-soft)' : 'var(--status-danger-soft)'}
                        title={h.title || 'Submission'}
                        subtitle={`${submitter} · ${isApproved ? 'approved' : 'rejected'} by ${actionedBy}`}
                        tag={<BtBadge label={isApproved ? 'Approved' : 'Rejected'} tone={isApproved ? 'success' : 'danger'} />}
                        amount={h.amount ? Number(h.amount) : undefined}
                      />
                    );
                  })}
                </BtGroup>
              )}
            </section>
          </div>
        </div>
      </BtSheet>

      <AddRevenueModal
        open={addRevenueModalOpen}
        projects={projects}
        onClose={() => setAddRevenueModalOpen(false)}
        onSaved={refreshTransactions}
      />
    </div>
  );
}
