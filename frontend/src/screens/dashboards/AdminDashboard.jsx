import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  BtButton,
  BtCard,
  BtGroup,
  BtRow,
  BtBadge,
  BtChip,
  BtHero,
  BtGlassTile,
  BtSheet,
  BtBricks,
  BtRing,
  BtCountUp,
  formatInr,
  BtEmpty,
  BtTypeTile,
  BtSectionHeader,
  BtPageLoader,
} from '../../components/ui';
import { dashboardAPI, transactionAPI, projectAPI, workerAPI, approvalAPI } from '../../api';
import perfLogger from '../../utils/performanceLogger';
import {
  Clock,
  TrendingUp,
  IndianRupee,
  Wallet,
  PlusCircle,
  Mic,
  FileText,
  Building2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Radio,
  Layers,
  Check,
  ChevronDown,
} from 'lucide-react';
import useProjectStore from '../../stores/projectStore';
import useTransactionStore from '../../stores/transactionStore';
import AddRevenueModal from '../../components/AddRevenueModal';
import ModuleTour from '../../components/ModuleTour';
import { ConfirmDialog } from '../../components/Toast';

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { projects, fetchProjects } = useProjectStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target)) {
        setProjectDropdownOpen(false);
      }
    };
    if (projectDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [projectDropdownOpen]);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [addRevenueModalOpen, setAddRevenueModalOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [showTourPopup, setShowTourPopup] = useState(false);

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

  useEffect(() => {
    Promise.all([
      fetchProjects(),
      dashboardAPI.getSummary().catch(() => ({ data: null })),
      workerAPI.getAll().catch(() => ({ data: { workers: [] } })),
      approvalAPI.getPending().catch(() => ({ data: [] })),
      approvalAPI.getHistory().catch(() => ({ data: [] })),
    ])
      .then(([projList, dashRes, workerRes, pendRes, histRes]) => {
        if (projList && projList.length === 0) {
          if (!localStorage.getItem('appTourPrompted')) {
            setShowTourPopup(true);
          }
        }

        setDashData(dashRes?.data || null);

        const extractArray = (res) => {
          if (!res || !res.data) return [];
          if (Array.isArray(res.data)) return res.data;
          if (Array.isArray(res.data.data)) return res.data.data;
          if (Array.isArray(res.data.transactions)) return res.data.transactions;
          if (res.data.data && Array.isArray(res.data.data.transactions)) return res.data.data.transactions;
          if (Array.isArray(res.data.history)) return res.data.history;
          if (res.data.data && Array.isArray(res.data.data.history)) return res.data.data.history;
          return [];
        };

        const pendingArr = extractArray(pendRes);
        const historyArr = extractArray(histRes);

        const pendingCount = pendingArr.filter(
          (a) => (a.approvalStatus || '').toLowerCase() === 'pending'
        ).length;
        setPendingApprovals(pendingCount);
        setApprovalHistory(historyArr);
      })
      .finally(() => setLoading(false));
  }, [fetchProjects]);

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
  const incomeTransactions = projectTransactions.filter((t) => t.type === 'Income').slice(0, 5);

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

  const remaining = Math.max(budget - totalCost, 0);
  const usedPct = budget > 0 ? totalCost / budget : 0;
  const over = budget > 0 && totalCost > budget * 0.9;
  const hasData = isGlobalView || Boolean(selectedProject);

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  if (loading) {
    return <BtPageLoader message="Loading dashboard…" />;
  }

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

      {/* ══════════════════════════════════════════════════════════
          HERO (Blueprint Noir Surface)
         ══════════════════════════════════════════════════════════ */}
      <BtHero padding="28px 32px 56px">
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          {/* Top greeting + project selector bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: 'var(--on-noir-3)',
                  marginBottom: '4px',
                }}
              >
                {todayLabel} • {getGreeting()}
              </div>
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '28px',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: 'var(--bone, #F6F4EF)',
                }}
              >
                {user?.name || 'Admin'}
              </h1>
            </div>

            {/* Project Picker dropdown / chip */}
            <div
              ref={projectDropdownRef}
              className="tour-project-selector"
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <div
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => setProjectDropdownOpen((prev) => !prev)}
                  style={{
                    height: '42px',
                    padding: '0 16px 0 14px',
                    borderRadius: '21px',
                    background: projectDropdownOpen ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.08)',
                    border: `1px solid ${projectDropdownOpen ? 'var(--accent)' : 'rgba(255, 255, 255, 0.16)'}`,
                    color: 'var(--bone, #F6F4EF)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 150ms ease',
                    boxShadow: projectDropdownOpen ? '0 0 0 3px rgba(224, 169, 59, 0.2)' : 'none',
                  }}
                >
                  <Building2 size={16} color="var(--accent)" />
                  <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedProjectId === 'all'
                      ? 'Global Financial Overview (All Projects)'
                      : (selectedProject?.projectName || selectedProject?.name || 'Select Project')}
                  </span>
                  <ChevronDown
                    size={14}
                    color="var(--on-noir-2, rgba(246, 244, 239, 0.7))"
                    style={{
                      transform: projectDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 200ms ease',
                    }}
                  />
                </button>

                {projectDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '320px',
                      background: 'var(--noir-2, #14171D)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: '16px',
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
                      zIndex: 100,
                      padding: '8px',
                      backdropFilter: 'blur(16px)',
                      animation: 'fadeIn 120ms ease',
                    }}
                  >
                    <div
                      style={{
                        padding: '6px 10px 8px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--on-noir-3, rgba(246, 244, 239, 0.45))',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        marginBottom: '4px',
                      }}
                    >
                      Filter Dashboard Scope
                    </div>

                    <div
                      onClick={() => {
                        setSelectedProjectId('all');
                        setProjectDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: selectedProjectId === 'all' ? 'rgba(255, 255, 255, 0.10)' : 'transparent',
                        color: selectedProjectId === 'all' ? 'var(--bone, #F6F4EF)' : 'var(--on-noir-2, rgba(246, 244, 239, 0.7))',
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          selectedProjectId === 'all' ? 'rgba(255, 255, 255, 0.10)' : 'transparent')
                      }
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Layers size={16} color="var(--accent)" />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>Global Financial Overview</div>
                          <div style={{ fontSize: '11px', color: 'var(--on-noir-3, rgba(246, 244, 239, 0.45))' }}>All projects combined</div>
                        </div>
                      </div>
                      {selectedProjectId === 'all' && <Check size={16} color="var(--accent)" />}
                    </div>

                    {projects.length > 0 && (
                      <div
                        style={{
                          margin: '6px 0',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          paddingTop: '6px',
                          maxHeight: '220px',
                          overflowY: 'auto',
                        }}
                      >
                        {projects.map((p) => {
                          const pid = p._id || p.id;
                          const isSel = selectedProjectId === pid;
                          return (
                            <div
                              key={pid}
                              onClick={() => {
                                setSelectedProjectId(pid);
                                setProjectDropdownOpen(false);
                              }}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                background: isSel ? 'rgba(255, 255, 255, 0.10)' : 'transparent',
                                color: isSel ? 'var(--bone, #F6F4EF)' : 'var(--on-noir-2, rgba(246, 244, 239, 0.7))',
                                transition: 'background 120ms ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = isSel ? 'rgba(255, 255, 255, 0.10)' : 'transparent')
                              }
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <Building2 size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {p.projectName || p.name}
                                  </div>
                                  {(p.location || p.projectCode) && (
                                    <div style={{ fontSize: '11px', color: 'var(--on-noir-3, rgba(246, 244, 239, 0.45))' }}>
                                      {p.location || p.projectCode}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isSel && <Check size={16} color="var(--accent)" style={{ flexShrink: 0 }} />}
                            </div>
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
                  small
                  className="tour-new-project"
                  icon={Plus}
                  onPress={() => navigate('/newproject')}
                >
                  New Project
                </BtButton>
              )}

              <button
                type="button"
                onClick={() => setRunTour(true)}
                title="Help Tour"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '21px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: 'var(--on-noir-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
              >
                <HelpCircle size={18} />
              </button>
            </div>
          </div>

          {/* Hero primary KPI amount: Total Cost So Far */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--on-noir-2)',
                marginBottom: '6px',
              }}
            >
              Total cost so far
            </div>

            <div
              className="tnum"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
                color: 'var(--bone)',
                marginBottom: '8px',
              }}
            >
              {hasData ? (
                <BtCountUp value={totalCost} format={(v) => formatInr(v, { compact: false })} />
              ) : (
                '—'
              )}
            </div>

            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                color: 'var(--on-noir-2)',
              }}
            >
              {budget > 0 ? (
                <>
                  of <span className="tnum" style={{ fontWeight: 600, color: 'var(--bone)' }}>{formatInr(budget, { compact: true })}</span> budget •{' '}
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

          {/* BtBricks Budget Utilization Bar */}
          <div style={{ marginBottom: '24px' }}>
            <BtBricks
              value={Math.min(Math.max(usedPct, 0), 1)}
              onDark={true}
              color={over ? 'var(--status-danger-bright)' : undefined}
            />
          </div>

          {/* 4 Glass KPI Tiles Grid */}
          <div
            className="tour-kpis"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            <BtGlassTile
              label="Budget left"
              value={budget > 0 ? formatInr(budget - totalCost, { compact: true }) : '—'}
              valueColor={budget > 0 && totalCost > budget ? 'var(--status-danger-bright)' : undefined}
              icon={Wallet}
            />
            <BtGlassTile
              label="Upcoming · planned"
              value={budget > 0 ? formatInr(remaining, { compact: true }) : '—'}
              icon={Clock}
            />
            <BtGlassTile
              label="Total revenue"
              value={formatInr(totalRevenue, { compact: true })}
              valueColor="var(--status-success-bright)"
              icon={ArrowUpRight}
            />
            <BtGlassTile
              label={netCashflow >= 0 ? 'Net profit' : 'Net loss'}
              value={`${netCashflow >= 0 ? '+' : ''}${formatInr(netCashflow, { compact: true })}`}
              valueColor={netCashflow >= 0 ? 'var(--status-success-bright)' : 'var(--status-danger-bright)'}
              icon={ArrowDownRight}
            />
          </div>
        </div>
      </BtHero>

      {/* ══════════════════════════════════════════════════════════
          SHEET (Bone Surface Overlapping Hero)
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
          {/* Pending Approvals Alert Banner */}
          {pendingApprovals > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                border: '1px solid #FED7AA',
                borderRadius: 'var(--r-card)',
                padding: '16px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#EA580C',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '16px',
                      color: '#9A3412',
                    }}
                  >
                    {pendingApprovals} Pending Approvals
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: '13px',
                      color: '#C2410C',
                      marginTop: '2px',
                    }}
                  >
                    Review updates and expenses waiting for your sign-off.
                  </div>
                </div>
              </div>

              <BtButton
                variant="primary"
                small
                onPress={() => navigate('/approvals')}
              >
                Review Now
              </BtButton>
            </div>
          )}

          {/* AI Voice Foreman Hero Card */}
          <div
            onClick={() => navigate('/voice')}
            className="tour-voice-update"
            style={{
              background: 'var(--ink)',
              borderRadius: 'var(--r-card)',
              padding: '22px 26px',
              color: 'var(--bone)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 28px rgba(17, 19, 23, 0.16)',
              transition: 'transform 180ms ease, box-shadow 180ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 14px 34px rgba(17, 19, 23, 0.22)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 28px rgba(17, 19, 23, 0.16)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: 'var(--on-accent, #111317)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px var(--accent-glow)',
                  flexShrink: 0,
                }}
              >
                <Mic size={26} strokeWidth={2.2} />
              </div>
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10.5px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                    marginBottom: '4px',
                  }}
                >
                  <Radio size={12} className="spin-slow" />
                  AI Foreman is listening
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '22px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: 'var(--bone, #F6F4EF)',
                    margin: 0,
                  }}
                >
                  Speak Update
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    color: 'var(--on-noir-2)',
                    marginTop: '2px',
                  }}
                >
                  Say what happened — we transcribe, categorize, and log it instantly.
                </div>
              </div>
            </div>

            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bone)',
              }}
            >
              <ChevronRight size={20} />
            </div>
          </div>

          {/* 2-Column Row: Work Done + Client Money */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {/* Work Done Card */}
            <BtCard padding="24px">
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
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-3)',
                  }}
                >
                  WORK PROGRESS
                </div>
                {selectedProject && (
                  <BtBadge
                    label={selectedProject.status || 'Active'}
                    tone={selectedProject.status === 'Active' ? 'green' : 'amber'}
                  />
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
                <BtRing
                  value={Math.min(Math.max(progress, 0), 1)}
                  size={76}
                  stroke={7}
                  color="var(--accent)"
                >
                  <span
                    className="tnum"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--ink)',
                    }}
                  >
                    {(progress * 100).toFixed(0)}%
                  </span>
                </BtRing>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'var(--ink)',
                    }}
                  >
                    Work done
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: '14px',
                      color: 'var(--ink-2)',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isGlobalView
                      ? 'All projects combined'
                      : selectedProject?.projectName || selectedProject?.name || 'Project Name'}
                  </div>
                  {selectedProject?.location && (
                    <div
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontSize: '12px',
                        color: 'var(--ink-3)',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Building2 size={13} />
                      {selectedProject.location}
                    </div>
                  )}
                </div>
              </div>
            </BtCard>

            {/* Client Money Card */}
            <BtCard padding="24px">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-3)',
                  }}
                >
                  CLIENT MONEY
                </div>
                <button
                  type="button"
                  onClick={() => setAddRevenueModalOpen(true)}
                  style={{
                    background: 'var(--fill)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={13} /> Record Revenue
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: '13px',
                      color: 'var(--ink-3)',
                    }}
                  >
                    Total revenue
                  </div>
                  <div
                    className="tnum"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '22px',
                      fontWeight: 800,
                      color: 'var(--status-success-bright)',
                      marginTop: '4px',
                    }}
                  >
                    +{formatCurrency(totalRevenue)}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: '13px',
                      color: 'var(--ink-3)',
                    }}
                  >
                    Net cash flow
                  </div>
                  <div
                    className="tnum"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '22px',
                      fontWeight: 800,
                      color:
                        netCashflow >= 0
                          ? 'var(--status-success-bright)'
                          : 'var(--status-danger-bright)',
                      marginTop: '4px',
                    }}
                  >
                    {netCashflow >= 0 ? '+' : ''}
                    {formatCurrency(netCashflow)}
                  </div>
                </div>
              </div>
            </BtCard>
          </div>

          {/* Quick Actions Grid */}
          <div className="tour-quick-actions">
            <BtSectionHeader title="Quick Actions" caption />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
              }}
            >
              {[
                {
                  label: 'Add Entry',
                  desc: 'Log expense or labour',
                  icon: PlusCircle,
                  path: '/add-entry',
                  tone: 'brand',
                },
                {
                  label: 'Voice Entry',
                  desc: 'Record via AI Foreman',
                  icon: Mic,
                  path: '/voice',
                  tone: 'brand',
                },
                {
                  label: 'Manual Entry',
                  desc: 'Direct granular form',
                  icon: FileText,
                  path: '/manualentry',
                  tone: 'brand',
                },
                {
                  label: 'View Projects',
                  desc: 'All sites & phases',
                  icon: Building2,
                  path: '/projects',
                  tone: 'brand',
                },
              ].map((act) => {
                const Icon = act.icon;
                return (
                  <BtCard
                    key={act.label}
                    onClick={() => navigate(act.path)}
                    padding="18px 20px"
                    style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--r-tile)',
                        background: 'var(--fill)',
                        color: 'var(--ink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-ui)',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: 'var(--ink)',
                        }}
                      >
                        {act.label}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-ui)',
                          fontSize: '12px',
                          color: 'var(--ink-3)',
                          marginTop: '2px',
                        }}
                      >
                        {act.desc}
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--ink-3)" />
                  </BtCard>
                );
              })}
            </div>
          </div>

          {/* Recent Activity & Team Approvals Section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Recent Entries */}
            <div className="tour-recent-activity">
              <BtSectionHeader
                title="Recent activity"
                action="View all"
                onAction={() => navigate('/transaction')}
              />
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
                        icon={<BtTypeTile type={entry.type} size={38} />}
                        title={entry.title || entry.name || entry.type || 'Entry'}
                        subtitle={`${pName ? `${pName} • ` : ''}${relativeTime(entry.date || entry.createdAt)}`}
                        tag={
                          <BtBadge
                            label={entry.type || 'Material'}
                            tone={
                              entry.type === 'Wages' || entry.type === 'Labour'
                                ? 'green'
                                : entry.type === 'Expense' || entry.type === 'Equipment'
                                ? 'amber'
                                : entry.type === 'Income'
                                ? 'green'
                                : 'brand'
                            }
                          />
                        }
                        amount={Math.abs(amt)}
                        onClick={() => navigate('/entry-detail', { state: { entry } })}
                      />
                    );
                  })}
                </BtGroup>
              )}
            </div>

            {/* Team Approval History */}
            <div className="tour-approvals-history">
              <BtSectionHeader
                title="Team Approval History"
                action="Approvals hub"
                onAction={() => navigate('/approvals')}
              />
              {filteredApprovalHistory.length === 0 ? (
                <BtCard>
                  <BtEmpty
                    icon={CheckCircle2}
                    title="No approval history"
                    message="Logged approvals and rejections will be archived here."
                  />
                </BtCard>
              ) : (
                <BtGroup>
                  {filteredApprovalHistory.slice(0, 5).map((h, idx) => {
                    const actionedBy = h.actionedBy?.name || h.reviewedBy?.name || 'Admin';
                    const submitter = h.submitter?.name || h.createdBy?.name || 'Worker';
                    const isApproved =
                      (h.approvalStatus || h.status)?.toLowerCase() === 'approved';

                    return (
                      <BtRow
                        key={h._id || idx}
                        icon={
                          isApproved ? (
                            <CheckCircle2 size={18} color="var(--tone-green)" />
                          ) : (
                            <XCircle size={18} color="var(--status-danger-bright)" />
                          )
                        }
                        iconBg={
                          isApproved
                            ? 'var(--tone-green-bg)'
                            : 'rgba(239, 68, 68, 0.1)'
                        }
                        title={h.title || 'Submission'}
                        subtitle={`Submitted by ${submitter} • ${isApproved ? 'Approved' : 'Rejected'} by ${actionedBy}`}
                        tag={
                          <BtBadge
                            label={isApproved ? 'Approved' : 'Rejected'}
                            tone={isApproved ? 'green' : 'red'}
                          />
                        }
                        amount={h.amount ? Number(h.amount) : undefined}
                      />
                    );
                  })}
                </BtGroup>
              )}
            </div>
          </div>
        </div>
      </BtSheet>

      <AddRevenueModal
        open={addRevenueModalOpen}
        projects={projects}
        onClose={() => setAddRevenueModalOpen(false)}
        onSaved={() => {
          if (selectedProjectId === 'all') {
            fetchTransactions({});
          } else {
            fetchTransactions({ project: selectedProjectId });
          }
        }}
      />
    </div>
  );
}
