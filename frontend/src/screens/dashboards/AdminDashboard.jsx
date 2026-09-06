import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Badge, Button, SkeletonCard } from '../../components/ui';
import { dashboardAPI, transactionAPI, projectAPI, workerAPI, approvalAPI } from '../../api';
import perfLogger from '../../utils/performanceLogger';
import {
  Clock,
  TrendingUp,
  DollarSign,
  Wallet,
  PlusCircle,
  Mic,
  FileText,
  Building2,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Layers,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { colors, gradients, typography } from '../../styles/designTokens';

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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

const typeConfig = {
  Materials: { color: '#F97316', bg: '#FFF5F0', label: 'Materials' },
  Wages: { color: '#22C55E', bg: '#F0FDF4', label: 'Labour' },
  Expense: { color: '#F59E0B', bg: '#FFFBEB', label: 'Equipment' },
  Income: { color: '#EA580C', bg: '#FFF7F0', label: 'Income' },
};

import useProjectStore from '../../stores/projectStore';
import useTransactionStore from '../../stores/transactionStore';
import AddRevenueModal from '../../components/AddRevenueModal';
import ModuleTour from '../../components/ModuleTour';
import { ConfirmDialog } from '../../components/Toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';

  const { projects, fetchProjects } = useProjectStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(projects.length === 0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [addRevenueModalOpen, setAddRevenueModalOpen] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [showTourPopup, setShowTourPopup] = useState(false);

  const tourSteps = [
    ...(projects.length === 0 ? [{ target: '.tour-new-project', content: 'You have no projects yet. Click here to create one.' }] : []),
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
    ]).then(([projList, dashRes, workerRes]) => {
      if (projList && projList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projList[0]._id || projList[0].id);
      }
      
      if (projList && projList.length === 0) {
        if (!localStorage.getItem('appTourPrompted')) {
          setShowTourPopup(true);
        }
      }

      setDashData(dashRes?.data || null);
      setWorkers(workerRes?.data?.workers || workerRes?.data || []);

      Promise.all([
        approvalAPI.getPending().catch(() => ({ data: [] })),
        approvalAPI.getHistory().catch(() => ({ data: [] }))
      ]).then(([pendRes, histRes]) => {
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

        const pendingCount = pendingArr.filter(a => (a.approvalStatus || '').toLowerCase() === 'pending').length;
        setPendingApprovals(pendingCount);
        setApprovalHistory(historyArr);
      });

    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchTransactions({ project: selectedProjectId });
  }, [selectedProjectId]);

  const selectedProject = projects.find((p) => (p._id || p.id) === selectedProjectId);
  const projectTransactions = useMemo(() =>
    transactions.filter((t) => {
      const pid = t.project?._id || t.project?.id || t.project;
      return !selectedProjectId || pid === selectedProjectId;
    }).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)),
    [transactions, selectedProjectId]
  );

  const filteredApprovalHistory = useMemo(() => {
    return projectTransactions.filter(t => {
      const st = (t.approvalStatus || '').toLowerCase();
      const isActioned = st === 'approved' || st === 'rejected';
      if (!isActioned) return false;

      if (t.type === 'Income' || t.type === 'Revenue') return false;

      return true;
    });
  }, [projectTransactions]);

  const recentEntries = projectTransactions.slice(0, 5);
  const incomeTransactions = projectTransactions.filter(t => t.type === 'Income').slice(0, 5);

  const progressRaw = Number(selectedProject?.progress || 0);
  const progress = progressRaw > 1 ? progressRaw / 100 : progressRaw;
  const totalCost = Number(selectedProject?.spentAmount || 0);
  const totalRevenue = Number(selectedProject?.totalIncome || 0);
  const netCashflow = totalRevenue - totalCost;
  const budget = Number(selectedProject?.totalBudget || selectedProject?.budget?.total || 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: colors.textSecondary }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
        <div style={{ fontSize: 16, fontWeight: 600 }}>Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 24px', maxWidth: 1280, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeUp 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: 15, color: colors.textSecondary, margin: '6px 0 0' }}>
            Welcome back, <span style={{ fontWeight: 600, color: colors.textPrimary }}>{user?.name || 'Admin'}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 12, cursor: 'pointer' }}>
            <HelpCircle size={18} color={colors.textSecondary} />
          </button>
          <Button variant="primary" size="md" icon={<PlusCircle size={16} />} onClick={() => navigate('/add-entry')}>
            Add Entry
          </Button>
        </div>
      </div>

      {pendingApprovals > 0 && (
        <div style={{
          background: 'rgba(255, 243, 224, 0.7)', border: '1px solid rgba(255, 224, 178, 0.5)', padding: '16px 24px',
          borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#E65100' }}>
            <AlertTriangle size={24} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{pendingApprovals} Pending Approvals</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>Review pending project updates and expenses from your team.</div>
            </div>
          </div>
          <Button variant="primary" style={{ background: '#E65100', border: 'none' }} onClick={() => navigate('/approvals')}>
            Review Now
          </Button>
        </div>
      )}

      <div
        onClick={() => navigate('/voice')}
        className="tour-voice-update"
        style={{
          background: gradients.primaryGradient,
          padding: 24, borderRadius: 16, color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 10px 25px rgba(249,115,22,0.2)', transition: 'transform 200ms ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: 16, borderRadius: '50%' }}>
            <Mic size={32} color="#fff" />
          </div>
          <div>
            <Badge style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', marginBottom: 8 }}>AI FOREMAN IS LISTENING</Badge>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Speak Update</h2>
            <p style={{ margin: '4px 0 0', opacity: 0.9 }}>Log updates instantly using voice AI</p>
          </div>
        </div>
        <ChevronRight size={32} opacity={0.8} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>
        <Card padding={24} className="tour-project-selector">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Active Project
            </div>
            {projects.length === 0 && (
              <Button size="sm" variant="outline" className="tour-new-project" icon={<PlusCircle size={14} />} onClick={() => navigate('/projects/new')}>
                New Project
              </Button>
            )}
          </div>
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{
              width: '100%',
              height: 48,
              padding: '0 16px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary,
              background: colors.card,
              cursor: 'pointer',
              outline: 'none',
              fontFamily: typography.fontFamily,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
              transition: 'all 150ms ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.primary;
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.02)';
            }}
          >
            {projects.length === 0 && <option value="">No projects active</option>}
            {projects.map((p) => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.projectName || p.name}
              </option>
            ))}
          </select>
          {selectedProject && (
            <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 13, color: colors.textSecondary, alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                <Building2 size={15} color={colors.textTertiary} />
                {selectedProject.location || selectedProject.city || 'Surathkal'}
              </span>
              <Badge variant={selectedProject.status === 'Active' ? 'success' : selectedProject.status === 'On Hold' ? 'warning' : 'info'}>
                {selectedProject.status || 'Active'}
              </Badge>
            </div>
          )}
        </Card>

        <Card padding={24}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Badge variant="info" size="sm" style={{ padding: '4px 10px' }}>
              <TrendingUp size={13} style={{ marginRight: 4 }} /> Overall Progress
            </Badge>
            {selectedProject?.city && (
              <span style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 600 }}>
                {selectedProject.city}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.04em' }}>
              {(progress * 100).toFixed(1)}%
            </span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
                {selectedProject ? (selectedProject.projectName || selectedProject.name || 'Project Name') : 'No Active Project'}
              </div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Current Milestone</div>
            </div>
          </div>
          <div style={{ height: 8, background: 'rgba(0, 0, 0, 0.05)', borderRadius: 999, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              borderRadius: 999,
              background: gradients.primaryGradient,
              width: `${Math.min((progress * 100), 100)}%`,
              transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
            <span style={{ color: colors.textSecondary }}>Progress Status</span>
            <span style={{ color: colors.primary }}>
              {(progress * 100).toFixed(0)}% Completed
            </span>
          </div>
        </Card>
      </div>

      <div className="tour-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {[
          { label: 'Total Cost', value: formatCurrency(totalCost), subtitle: budget > 0 ? `${((totalCost / budget) * 100).toFixed(0)}% Used` : '—', icon: Wallet, color: '#F97316', alert: budget > 0 && totalCost > budget * 0.9 },
          { label: 'Budget', value: formatCurrency(budget), subtitle: `Remaining: ${formatCurrency(Math.max(budget - totalCost, 0))}`, icon: DollarSign, color: '#EA580C' },
          { label: lang === 'kn' ? 'Ottu Aadaaya' : lang === 'ta' ? 'Motha Varuvai' : 'Total Revenue', value: formatCurrency(totalRevenue), subtitle: lang === 'kn' ? 'Nagadu O?aharivu' : lang === 'ta' ? 'Pana Varavu' : 'Cash Inflow', icon: ArrowUpRight, color: '#22C55E' },
          { label: 'Net Cash Flow', value: formatCurrency(Math.abs(netCashflow)), subtitle: netCashflow >= 0 ? 'Net Profit' : 'Net Loss', icon: ArrowDownRight, color: netCashflow >= 0 ? '#22C55E' : '#EF4444', alert: netCashflow < 0 },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} padding={20} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: kpi.alert ? colors.dangerLight : `${kpi.color}10`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: kpi.alert ? colors.danger : kpi.color, flexShrink: 0,
              }}>
                <Icon size={20} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: kpi.alert ? colors.danger : colors.textPrimary, letterSpacing: '-0.03em' }}>
                  {kpi.value}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
                  {kpi.label}
                </div>
                <div style={{ fontSize: 12, color: kpi.alert ? colors.danger : colors.textSecondary, marginTop: 4, fontWeight: 500 }}>
                  {kpi.subtitle}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="tour-quick-actions">
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
          Quick Actions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Add Entry', desc: 'Log a transaction', icon: PlusCircle, path: '/add-entry', color: '#F97316' },
            { label: 'Voice Entry', desc: 'Record via voice AI', icon: Mic, path: '/voice', color: '#EA580C' },
            { label: 'Manual Entry', desc: 'Enter details manually', icon: FileText, path: '/manualentry', color: '#FB923C' },
            { label: 'View Projects', desc: 'Browse all projects', icon: Building2, path: '/projects', color: '#F97316' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.label}
                onClick={() => navigate(action.path)}
                hoverable
                padding={20}
                style={{
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `${action.color}10`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: action.color,
                  }}>
                    <Icon size={18} />
                  </div>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary }}>{action.label}</div>
                  <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{action.desc}</div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>

        <Card padding={0} style={{ display: 'flex', flexDirection: 'column' }} className="tour-revenue-timeline">
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Revenue Inflow Timeline
            </div>
            <button onClick={() => setAddRevenueModalOpen(true)} style={{ background: colors.primary, color: '#FFF', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <PlusCircle size={14} /> Record Revenue
            </button>
          </div>
          <div style={{ padding: 24, flex: 1 }}>
            {incomeTransactions.length === 0 ? (
               <p style={{ color: colors.textSecondary, fontSize: 14 }}>No recent revenue inflow recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {incomeTransactions.map(tx => (
                  <div key={tx._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{tx.title || 'Revenue'}</div>
                      <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{relativeTime(tx.date || tx.createdAt)}</div>
                    </div>
                    <div style={{ color: colors.success, fontWeight: 700, fontSize: 15 }}>+{formatCurrency(tx.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ background: '#F8F9FA', padding: 16, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
             <span style={{ fontWeight: 700, fontSize: 14 }}>Total Balance</span>
             <span style={{ color: colors.success, fontWeight: 800, fontSize: 16 }}>+{formatCurrency(totalRevenue)}</span>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card padding={0} className="tour-recent-activity">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Recent Activity Log
          </div>
          <button onClick={() => navigate('/transaction')} className="view-all-btn" style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: colors.primary,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            View All <ChevronRight size={14} />
          </button>
        </div>
        {recentEntries.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', color: colors.primary,
            }}>
              <Clock size={18} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, marginBottom: 4 }}>No recent entries</div>
            <div style={{ fontSize: 13, color: colors.textSecondary }}>Transactions you add will appear here.</div>
          </div>
        ) : (
          recentEntries.map((entry, i) => {
            const type = typeConfig[entry.type] || typeConfig.Materials;
            const amt = Number(entry.amount || entry.totalAmount || 0);
            return (
              <div key={entry._id || entry.id || i} className="recent-entry-row" style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 24px',
                borderBottom: i < recentEntries.length - 1 ? `1px solid ${colors.border}` : 'none',
                cursor: 'pointer',
              }}
                onClick={() => navigate('/entry-detail', { state: { entry } })}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: type.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <DollarSign size={18} color={type.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, marginBottom: 4 }}>
                    {entry.title || entry.name || 'Entry'}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: colors.textSecondary, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge variant={entry.type === 'Wages' ? 'success' : entry.type === 'Expense' ? 'warning' : 'info'} size="sm">
                      {type.label}
                    </Badge>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building2 size={13} color={colors.textTertiary} />
                      {typeof entry.project === 'object' ? (entry.project?.projectName || entry.project?.name || '') : (entry.projectName || entry.project || '')}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color={colors.textTertiary} />
                      {relativeTime(entry.date || entry.createdAt)}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary, whiteSpace: 'nowrap' }}>
                  {formatCurrency(Math.abs(amt))}
                </div>
              </div>
            );
          })
        )}
      </Card>

      <Card padding={0} className="tour-approvals-history">
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Team Approval History
          </div>
        </div>
        <div style={{ padding: 24 }}>
          {filteredApprovalHistory.length === 0 ? (
            <p style={{ color: colors.textSecondary, fontSize: 14 }}>No team approval history.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredApprovalHistory.slice(0, 5).map(h => {
                const actionedBy = h.actionedBy?.name || h.reviewedBy?.name || 'Admin';
                const submitter = h.submitter?.name || h.createdBy?.name || 'Worker';
                const isApproved = (h.approvalStatus || h.status)?.toLowerCase() === 'approved';
                return (
                  <div key={h._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{h.title || 'Submission'}</div>
                      <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                        Submitted by {submitter} • {isApproved ? 'Approved' : 'Rejected'} by {actionedBy}
                      </div>
                    </div>
                    <Badge variant={isApproved ? 'success' : 'danger'}>
                      {h.approvalStatus || h.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

        </div> {}
      </div> {}
      
      <AddRevenueModal
        open={addRevenueModalOpen}
        projects={projects}
        onClose={() => setAddRevenueModalOpen(false)}
        onSaved={() => {
          if (selectedProjectId) {
            fetchTransactions({ project: selectedProjectId });
          }
        }}
      />
    </div>
  );
}
