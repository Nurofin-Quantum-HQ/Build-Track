import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
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
  BtSkeleton,
  btToast,
} from '../../components/ui';
import { dashboardAPI, workerAPI, approvalAPI, transactionAPI } from '../../api';
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
  ArrowDownLeft,
  IndianRupee,
  X,
  Receipt,
  Share2,
  Trash2,
  ExternalLink,
  RefreshCw,
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

function formatReceiptDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-IN', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return '—';
  }
}

function formatReceiptTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    let hrs = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    return `${String(hrs).padStart(2, '0')}:${mins} ${ampm}`;
  } catch {
    return '';
  }
}

function getProofUrl(tx) {
  if (!tx) return null;
  if (Array.isArray(tx.attachments) && tx.attachments.length > 0) {
    const first = tx.attachments[0];
    if (typeof first === 'string' && first.trim()) return first;
    if (first && first.url) return first.url;
  }
  if (typeof tx.paymentReceipt === 'string' && tx.paymentReceipt.trim()) {
    return tx.paymentReceipt;
  }
  if (typeof tx.paymentScreenshot === 'string' && tx.paymentScreenshot.trim()) {
    return tx.paymentScreenshot;
  }
  if (typeof tx.receiptUrl === 'string' && tx.receiptUrl.trim()) {
    return tx.receiptUrl;
  }
  return null;
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

  // Parity with Flutter homescreen.dart: live revenue transactions & history
  const [revenueEntries, setRevenueEntries] = useState([]);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [revenueError, setRevenueError] = useState(false);
  const [showRevenueHistoryModal, setShowRevenueHistoryModal] = useState(false);
  const [selectedRevenueDetail, setSelectedRevenueDetail] = useState(null);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

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

  const loadRevenue = useCallback(async (projId) => {
    setLoadingRevenue(true);
    setRevenueError(false);
    try {
      const isAll = !projId || projId === 'all';
      const queryBase = isAll ? {} : { project: projId };

      const [incomeRes, moneyOutRes] = await Promise.all([
        transactionAPI.getAll({ ...queryBase, type: 'Income', limit: 1000 }).catch(() => ({ data: { transactions: [] } })),
        transactionAPI.getAll({ ...queryBase, type: 'Expense', category: 'Money Out', limit: 1000 }).catch(() => ({ data: { transactions: [] } })),
      ]);

      const extractTx = (res) => {
        if (!res || !res.data) return [];
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data.transactions)) return res.data.transactions;
        if (Array.isArray(res.data.data)) return res.data.data;
        if (res.data.data && Array.isArray(res.data.data.transactions)) return res.data.data.transactions;
        return [];
      };

      const incomeList = extractTx(incomeRes).map((t) => ({
        ...t,
        amount: Math.abs(Number(t.amount || t.totalAmount || 0)),
        isOutflow: false,
      }));

      const moneyOutList = extractTx(moneyOutRes)
        .filter((t) => t.type === 'Expense' && (t.category === 'Money Out' || t.ledgerCategory === 'Money Out'))
        .map((t) => ({
          ...t,
          amount: -Math.abs(Number(t.amount || t.totalAmount || 0)),
          isOutflow: true,
        }));

      const combined = [...incomeList, ...moneyOutList].sort((a, b) => {
        const da = new Date(a.date || a.createdAt || 0);
        const db = new Date(b.date || b.createdAt || 0);
        return db - da;
      });

      setRevenueEntries(combined);
    } catch (err) {
      console.error('Failed to load revenue transactions:', err);
      setRevenueError(true);
    } finally {
      setLoadingRevenue(false);
    }
  }, []);

  useEffect(() => {
    loadRevenue(selectedProjectId);
  }, [selectedProjectId, loadRevenue]);

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

  const moneyInSum = useMemo(() => {
    return revenueEntries.reduce((sum, tx) => {
      const amt = Number(tx.amount || 0);
      return amt > 0 ? sum + amt : sum;
    }, 0);
  }, [revenueEntries]);

  const moneyOutSum = useMemo(() => {
    return revenueEntries.reduce((sum, tx) => {
      const amt = Number(tx.amount || 0);
      return amt < 0 ? sum + Math.abs(amt) : sum;
    }, 0);
  }, [revenueEntries]);

  const totalRevenueSum = useMemo(() => {
    return revenueEntries.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }, [revenueEntries]);

  const progressRaw = selectedProject
    ? Number(selectedProject?.progress || 0)
    : projects.length
    ? projects.reduce((sum, p) => sum + Number(p.progress || 0), 0) / projects.length
    : 0;
  const progress = progressRaw > 1 ? progressRaw / 100 : progressRaw;

  const totalCost = selectedProject
    ? Number(selectedProject?.spentAmount || 0)
    : projects.reduce((sum, p) => sum + Number(p.spentAmount || 0), 0);

  // Parity with Flutter: totalRevenue reflects live moneyInSum
  const totalRevenue = revenueEntries.length > 0 || !loadingRevenue
    ? moneyInSum
    : (selectedProject
        ? Number(selectedProject?.totalIncome || 0)
        : projects.reduce((sum, p) => sum + Number(p.totalIncome || 0), 0));

  // Parity with Flutter homescreen.dart:
  // Global view: revenue - spent
  // Project view: revenue - moneyOut - spent
  const netCashflow = isGlobalView
    ? totalRevenue - totalCost
    : totalRevenue - moneyOutSum - totalCost;
  const isLoss = netCashflow < 0;

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

  const refreshAll = useCallback(() => {
    loadRevenue(selectedProjectId);
    fetchProjects({}, true);
    if (selectedProjectId === 'all') {
      fetchTransactions({}, true);
    } else {
      fetchTransactions({ project: selectedProjectId }, true);
    }
  }, [loadRevenue, selectedProjectId, fetchProjects, fetchTransactions]);

  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;
    setDeletingEntry(true);
    try {
      const id = entryToDelete._id || entryToDelete.id;
      await transactionAPI.delete(id);
      btToast('Revenue record deleted successfully');
      setEntryToDelete(null);
      setSelectedRevenueDetail(null);
      refreshAll();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      btToast('Failed to delete revenue record', { error: true });
    } finally {
      setDeletingEntry(false);
    }
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
            <BtCard
              padding="22px 24px"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 32 }}>
                <span className="bt-eyebrow" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                  WORK PROGRESS
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BtBadge
                    label={selectedProject ? (selectedProject.status || 'Active') : `${projects.length} Sites`}
                    tone={selectedProject?.status === 'Completed' ? 'success' : 'info'}
                  />
                  <BtButton
                    variant="secondary"
                    size="compact"
                    icon={TrendingUp}
                    onClick={() => navigate('/update-progress')}
                  >
                    Update progress
                  </BtButton>
                </div>
              </div>

              {/* Progress Headline Box matching Client Money KPI box */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  padding: '14px 16px',
                  background: 'var(--fill)',
                  borderRadius: 'var(--r-card)',
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <BtRing value={Math.min(Math.max(progress, 0), 1)} size={68} stroke={7} color="var(--accent)">
                    <span
                      className="tnum"
                      style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}
                    >
                      {(progress * 100).toFixed(0)}%
                    </span>
                  </BtRing>
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 2 }}>
                    Overall completion
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isGlobalView ? 'All Projects Combined' : selectedName}
                  </div>
                  {selectedProject?.location ? (
                    <div
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontSize: 12,
                        color: 'var(--ink-3)',
                        marginTop: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Building2 size={12} />
                      <span>{selectedProject.location}</span>
                    </div>
                  ) : (
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                      Portfolio average
                    </div>
                  )}
                </div>
              </div>

              {/* Milestones / Phase breakdown list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      Execution progress
                    </span>
                    <span className="tnum" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                      {(progress * 100).toFixed(1)}% done
                    </span>
                  </div>
                  <BtBricks value={Math.min(Math.max(progress, 0), 1)} />
                </div>

                {/* Sub-metrics rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {selectedProject ? (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: 'var(--card)',
                          borderRadius: 8,
                          border: '1px solid var(--line)',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-2)' }}>
                          Construction phases
                        </span>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                          {selectedProject.selectedPhases?.length || 0} active phases
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: 'var(--card)',
                          borderRadius: 8,
                          border: '1px solid var(--line)',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-2)' }}>
                          Budget utilization
                        </span>
                        <span
                          className="tnum"
                          style={{
                            fontFamily: 'var(--font-ui)',
                            fontSize: 13,
                            fontWeight: 600,
                            color: over ? 'var(--status-danger)' : 'var(--ink)',
                          }}
                        >
                          {(usedPct * 100).toFixed(0)}% used
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: 'var(--card)',
                          borderRadius: 8,
                          border: '1px solid var(--line)',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-2)' }}>
                          Active sites
                        </span>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                          {projects.filter((p) => (p.status || '').toLowerCase() !== 'completed').length} in progress
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: 'var(--card)',
                          borderRadius: 8,
                          border: '1px solid var(--line)',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-2)' }}>
                          Completed sites
                        </span>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--status-success)' }}>
                          {projects.filter((p) => (p.status || '').toLowerCase() === 'completed' || Number(p.progress || 0) >= 100).length} completed
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Footer link to match Client Money card */}
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: 12,
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <button
                  type="button"
                  onClick={() => navigate('/update-progress')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'var(--font-ui)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--accent)',
                  }}
                >
                  Update site progress ›
                </button>
              </div>
            </BtCard>

            <BtCard
              padding="22px 24px"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 32 }}>
                <span className="bt-eyebrow" style={{ color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
                  CLIENT MONEY
                </span>
                <BtButton
                  variant="secondary"
                  size="compact"
                  icon={Plus}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddRevenueModalOpen(true);
                  }}
                >
                  Record revenue
                </BtButton>
              </div>

              {/* Headline KPIs (Parity with Flutter CLIENT MONEY card) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 14,
                  padding: '14px 16px',
                  background: 'var(--fill)',
                  borderRadius: 'var(--r-card)',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 4 }}>
                    Total revenue
                  </div>
                  <div
                    className="tnum"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 22,
                      fontWeight: 700,
                      color: 'var(--status-success)',
                    }}
                  >
                    {loadingRevenue && revenueEntries.length === 0 ? (
                      <BtSkeleton height={24} width={90} />
                    ) : (
                      `+${formatInr(totalRevenue, { compact: true })}`
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 4 }}>
                    {isLoss ? 'Net cash flow · loss' : 'Net cash flow · profit'}
                  </div>
                  <div
                    className="tnum"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 22,
                      fontWeight: 700,
                      color: isLoss ? 'var(--status-danger)' : 'var(--status-success)',
                    }}
                  >
                    {loadingRevenue && revenueEntries.length === 0 ? (
                      <BtSkeleton height={24} width={90} />
                    ) : (
                      `${netCashflow >= 0 ? '+' : '-'}${formatInr(Math.abs(netCashflow), { compact: true })}`
                    )}
                  </div>
                </div>
              </div>

              {/* Status / Preview / Empty state */}
              {loadingRevenue && revenueEntries.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                  <BtSkeleton height={38} radius={10} />
                  <BtSkeleton height={38} radius={10} />
                </div>
              ) : revenueError ? (
                <div style={{ padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--status-danger)' }}>
                    Couldn&apos;t load revenue records
                  </span>
                  <BtButton variant="ghost" size="compact" icon={RefreshCw} onClick={() => loadRevenue(selectedProjectId)}>
                    Retry
                  </BtButton>
                </div>
              ) : revenueEntries.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0' }}>
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
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                      No payments recorded yet
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
                      Money received from or sent to the client shows here.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {revenueEntries.slice(0, 3).map((t, idx) => {
                    const isOutflow = Number(t.amount || 0) < 0;
                    const absAmt = Math.abs(Number(t.amount || 0));
                    const proof = getProofUrl(t);
                    return (
                      <div
                        key={t._id || t.id || idx}
                        onClick={() => setSelectedRevenueDetail(t)}
                        className="bt-hover-row"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 8px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'background 120ms ease',
                        }}
                      >
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--r-tile)',
                            background: isOutflow ? 'var(--fill)' : 'var(--status-success-soft)',
                            color: isOutflow ? 'var(--ink-2)' : 'var(--status-success)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isOutflow ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: 'var(--font-ui)',
                              fontSize: 14,
                              fontWeight: 600,
                              color: 'var(--ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {t.title || (isOutflow ? 'Money Out' : 'Revenue Inflow')}
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-ui)',
                              fontSize: 12,
                              color: 'var(--ink-3)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatReceiptDate(t.date || t.createdAt)} · via {t.paymentMode || 'Cash'}
                          </div>
                        </div>
                        {proof && (
                          <img
                            src={proof}
                            alt="Receipt proof"
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 6,
                              objectFit: 'cover',
                              border: '1px solid var(--line)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div
                          className="tnum"
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 15,
                            fontWeight: 700,
                            color: isOutflow ? 'var(--ink)' : 'var(--status-success)',
                            flexShrink: 0,
                          }}
                        >
                          {isOutflow ? `-${formatInr(absAmt)}` : `+${formatInr(absAmt)}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Parity with Flutter: Footer link to view full revenue history */}
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: 12,
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowRevenueHistoryModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'var(--font-ui)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--accent)',
                  }}
                >
                  {revenueEntries.length === 0
                    ? 'View revenue timeline ›'
                    : `${revenueEntries.length} payment${revenueEntries.length === 1 ? '' : 's'} · History ›`}
                </button>
              </div>
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
        initialProjectId={selectedProjectId}
        onClose={() => setAddRevenueModalOpen(false)}
        onSaved={refreshAll}
      />

      <RevenueHistoryModal
        open={showRevenueHistoryModal}
        projectName={selectedName}
        revenueEntries={revenueEntries}
        totalBalance={totalRevenueSum}
        onClose={() => setShowRevenueHistoryModal(false)}
        onRecordPayment={() => setAddRevenueModalOpen(true)}
        onSelectEntry={(entry) => setSelectedRevenueDetail(entry)}
      />

      <RevenueDetailModal
        entry={selectedRevenueDetail}
        projectName={selectedName}
        onClose={() => setSelectedRevenueDetail(null)}
        onDelete={(entry) => setEntryToDelete(entry)}
      />

      <ConfirmDialog
        message={
          entryToDelete
            ? `Are you sure you want to delete this ${
                Number(entryToDelete.amount || 0) < 0 ? 'outflow' : 'revenue inflow'
              } record? This action cannot be undone.`
            : ''
        }
        confirmLabel={deletingEntry ? 'Deleting…' : 'Delete'}
        cancelLabel="Cancel"
        danger
        onConfirm={confirmDeleteEntry}
        onCancel={() => setEntryToDelete(null)}
      />
    </div>
  );
}

function RevenueHistoryModal({
  open,
  projectName,
  revenueEntries,
  totalBalance,
  onClose,
  onRecordPayment,
  onSelectEntry,
}) {
  if (!open) return null;

  // Month groups (entries are already newest-first)
  const groups = {};
  for (const tx of revenueEntries) {
    let d = new Date();
    if (tx.date || tx.createdAt) {
      try {
        d = new Date(tx.date || tx.createdAt);
      } catch {}
    }
    const month = d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
    const year = d.getFullYear();
    const key = `${month} ${year}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }

  const balanceText =
    totalBalance === 0
      ? '₹0'
      : totalBalance < 0
      ? `-${formatInr(Math.abs(totalBalance))}`
      : `+${formatInr(totalBalance)}`;

  const balanceColor =
    totalBalance > 0
      ? 'var(--status-success-bright)'
      : totalBalance < 0
      ? 'var(--status-danger-bright)'
      : 'var(--bone)';

  return createPortal(
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--scrim)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
        animation: 'fadeIn 160ms ease',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="revenue-history-title"
        style={{
          background: 'var(--ground)',
          width: '100%',
          maxWidth: 580,
          borderRadius: 'var(--r-sheet)',
          maxHeight: 'calc(100dvh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-raised)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
          animation: 'fadeUp 240ms var(--ease)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            background: 'var(--card)',
          }}
        >
          <div>
            <h2
              id="revenue-history-title"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--ink)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Revenue History
            </h2>
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                color: 'var(--ink-3)',
                marginTop: 2,
              }}
            >
              {projectName}
            </div>
          </div>
          <BtIconButton icon={X} label="Close" onClick={onClose} />
        </div>

        {/* Content */}
        <div
          style={{
            padding: '16px 20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Ink Card: Total Balance Banner */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: 'var(--r-card)',
              background: 'var(--ink)',
              color: 'var(--on-noir)',
              border: '1px solid var(--noir-line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: 'var(--on-noir-2)',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                TOTAL BALANCE
              </div>
              <div
                className="tnum"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 26,
                  fontWeight: 700,
                  color: balanceColor,
                  letterSpacing: '-0.02em',
                }}
              >
                {balanceText}
              </div>
            </div>

            <BtButton
              variant="accent"
              size="small"
              icon={Plus}
              onClick={() => {
                onClose();
                onRecordPayment();
              }}
            >
              Record Payment
            </BtButton>
          </div>

          {/* List or Empty State */}
          {revenueEntries.length === 0 ? (
            <div style={{ padding: '24px 0' }}>
              <BtEmpty
                icon={Receipt}
                title="No payments recorded yet"
                message="Money received from or sent to the client shows here."
              />
            </div>
          ) : (
            Object.entries(groups).map(([monthKey, list]) => (
              <div key={monthKey} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    color: 'var(--ink-3)',
                    paddingLeft: 4,
                  }}
                >
                  {monthKey}
                </div>
                <BtGroup>
                  {list.map((tx, idx) => {
                    const isOutflow = Number(tx.amount || 0) < 0;
                    const absAmt = Math.abs(Number(tx.amount || 0));
                    const dateStr = formatReceiptDate(tx.date || tx.createdAt);
                    const timeStr = formatReceiptTime(tx.date || tx.createdAt);
                    const paymentMode = tx.paymentMode || 'Cash';
                    const proof = getProofUrl(tx);

                    return (
                      <div
                        key={tx._id || tx.id || idx}
                        onClick={() => onSelectEntry(tx)}
                        className="bt-hover-row"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectEntry(tx);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '12px 14px',
                          cursor: 'pointer',
                          background: 'var(--card)',
                          borderRadius: 'var(--r-tile)',
                          transition: 'background 120ms ease',
                        }}
                      >
                        <span
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 'var(--r-tile)',
                            background: isOutflow ? 'var(--fill)' : 'var(--status-success-soft)',
                            color: isOutflow ? 'var(--ink-2)' : 'var(--status-success)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isOutflow ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                        </span>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: 'var(--font-ui)',
                              fontSize: 14,
                              fontWeight: 600,
                              color: 'var(--ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {tx.title || (isOutflow ? 'Money Out' : 'Revenue Inflow')}
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-ui)',
                              fontSize: 12,
                              color: 'var(--ink-3)',
                              marginTop: 2,
                            }}
                          >
                            {dateStr} · via {paymentMode} {timeStr ? `· ${timeStr}` : ''}
                          </div>
                        </div>

                        {proof && (
                          <img
                            src={proof}
                            alt="Receipt proof"
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              objectFit: 'cover',
                              border: '1px solid var(--line)',
                              flexShrink: 0,
                            }}
                          />
                        )}

                        <div
                          className="tnum"
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 16,
                            fontWeight: 700,
                            color: isOutflow ? 'var(--ink)' : 'var(--status-success)',
                            flexShrink: 0,
                          }}
                        >
                          {isOutflow ? `-${formatInr(absAmt)}` : `+${formatInr(absAmt)}`}
                        </div>
                      </div>
                    );
                  })}
                </BtGroup>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function RevenueDetailModal({
  entry,
  projectName,
  onClose,
  onDelete,
}) {
  if (!entry) return null;

  const isOutflow = Number(entry.amount || 0) < 0;
  const absAmt = Math.abs(Number(entry.amount || 0));
  const formattedAmt = formatInr(absAmt);
  const title = entry.title || (isOutflow ? 'Money Out' : 'Revenue Inflow');
  const paymentMode = entry.paymentMode || 'Cash';
  const paymentStatus = entry.paymentStatus || 'Paid';
  const rawId = String(entry._id || entry.id || '');
  const refId = rawId ? rawId.toUpperCase() : 'N/A';
  const dateStr = formatReceiptDate(entry.date || entry.createdAt);
  const timeStr = formatReceiptTime(entry.date || entry.createdAt);
  const proofUrl = getProofUrl(entry);
  const isEsign = proofUrl && (entry.paymentReceipt || entry.eSignature);
  const notes = entry.notes ? String(entry.notes).trim() : '';

  const handleShare = () => {
    const typeLabel = isOutflow ? 'Money Out (Expense)' : 'Revenue Received (Inflow)';
    const amountPrefix = isOutflow ? '-₹' : '+₹';
    const textLines = [
      '📊 BuildTrack Transaction Receipt',
      '================================',
      `Type: ${typeLabel}`,
      `Title: ${title}`,
      `Amount: ${amountPrefix}${formattedAmt}`,
      `Project: ${projectName}`,
      `Payment Method: ${paymentMode}`,
      `Date: ${dateStr}`,
      ...(timeStr ? [`Time: ${timeStr}`] : []),
      `Reference ID: ${refId}`,
      `Status: ${paymentStatus.toUpperCase()}`,
      ...(notes ? [`Notes: ${notes}`] : []),
      '================================',
      'Generated via BuildTrack',
      ...(proofUrl && proofUrl.startsWith('http') ? [`Proof of Payment: ${proofUrl}`] : []),
    ];
    const text = textLines.join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        btToast('Receipt summary copied to clipboard!');
      }).catch(() => {
        btToast('Failed to copy receipt');
      });
    } else {
      btToast('Clipboard unavailable');
    }
  };

  return createPortal(
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--scrim)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
        animation: 'fadeIn 160ms ease',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="revenue-detail-title"
        style={{
          background: 'var(--card)',
          width: '100%',
          maxWidth: 480,
          borderRadius: 'var(--r-sheet)',
          maxHeight: 'calc(100dvh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-raised)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
          animation: 'fadeUp 240ms var(--ease)',
        }}
      >
        {/* Top Header Row with Close button */}
        <div
          style={{
            padding: '16px 20px 8px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <BtIconButton icon={X} label="Close" onClick={onClose} />
        </div>

        {/* Scrollable Receipt Body */}
        <div
          style={{
            padding: '0 24px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Centered Check Circle Icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: isOutflow ? 'var(--status-danger-soft)' : 'var(--status-success-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            {isOutflow ? (
              <XCircle size={36} color="var(--status-danger)" />
            ) : (
              <CheckCircle2 size={36} color="var(--status-success)" />
            )}
          </div>

          <div
            id="revenue-detail-title"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--ink)',
              textAlign: 'center',
            }}
          >
            {isOutflow ? 'Payment Sent' : 'Revenue Received'}
          </div>

          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              color: 'var(--ink-2)',
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            {title}
          </div>

          <div
            className="tnum"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 800,
              color: isOutflow ? 'var(--status-danger)' : 'var(--status-success)',
              margin: '14px 0 18px',
              letterSpacing: '-0.02em',
            }}
          >
            {isOutflow ? `-${formattedAmt}` : `+${formattedAmt}`}
          </div>

          {/* Dashed Separator */}
          <div
            style={{
              width: '100%',
              borderBottom: '1.5px dashed var(--line)',
              marginBottom: 16,
            }}
          />

          {/* Key-Value Rows */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                PROJECT
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                {projectName}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                PAYMENT METHOD
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                {paymentMode}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                {isOutflow ? 'DATE SENT' : 'DATE RECEIVED'}
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                {dateStr}
              </span>
            </div>

            {timeStr && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                  TIME RECEIVED
                </span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  {timeStr}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                REFERENCE ID
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>
                {refId}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                STATUS
              </span>
              <BtBadge
                label={paymentStatus.toUpperCase()}
                tone={paymentStatus.toLowerCase() === 'paid' ? 'success' : 'warning'}
              />
            </div>

            {/* Notes Section */}
            {notes && (
              <div
                style={{
                  marginTop: 6,
                  padding: '12px 14px',
                  background: 'var(--fill)',
                  borderRadius: 'var(--r-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                  NOTES / REMARKS
                </span>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>
                  {notes}
                </span>
              </div>
            )}

            {/* Proof Section */}
            {proofUrl && (
              <div
                style={{
                  marginTop: 6,
                  padding: '12px 14px',
                  background: 'var(--fill)',
                  borderRadius: 'var(--r-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                    {isEsign ? 'CLIENT E-SIGNATURE' : 'PROOF OF PAYMENT'}
                  </span>
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      textDecoration: 'none',
                    }}
                  >
                    <span>View full</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 150,
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <img
                    src={proofUrl}
                    alt="Proof"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>
            <BtButton
              variant="secondary"
              icon={Share2}
              onClick={handleShare}
              style={{ width: '100%' }}
            >
              Share Receipt Summary
            </BtButton>

            <BtButton
              variant="destructive"
              icon={Trash2}
              onClick={() => onDelete(entry)}
              style={{ width: '100%' }}
            >
              {isOutflow ? 'Delete Outflow…' : 'Delete Inflow…'}
            </BtButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
