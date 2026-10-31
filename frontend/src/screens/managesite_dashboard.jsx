import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectAPI, transactionAPI } from '../api';
import perfLogger from '../utils/performanceLogger';
import { resolveImageUrl } from '../utils/imageUrl';
import {
  calcProgress,
  getPhaseProgress,
  toggleActivity,
  isActivityCompleted,
} from '../utils/constructionPhases';
import {
  BtHero,
  BtGlassTile,
  BtSheet,
  BtButton,
  BtCard,
  BtGroup,
  BtRow,
  BtBadge,
  BtChip,
  BtBricks,
  BtProgress,
  BtCountUp,
  formatInr,
  BtEmpty,
  BtTypeTile,
  BtSectionHeader,
  BtPageLoader,
  btToast,
} from '../components/ui';
import CsvImportExportCard from '../components/CsvImportExportCard';
import useTransactionStore from '../stores/transactionStore';
import { Toast, ConfirmDialog } from '../components/Toast';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  FileDown,
  FileUp,
  Pencil,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  User,
  Hash,
  Phone,
  Code,
  Wrench,
  Layers,
  Bed,
  Settings,
  Zap,
  Flame,
  ChefHat,
  Sun,
  Clock,
  IndianRupee,
  CreditCard,
  PiggyBank,
  Target,
  ClipboardCheck,
  Camera,
  FileText,
  Mic,
  TrendingUp,
  Sparkles,
  HardHat,
  Info,
} from 'lucide-react';

const _kAddlConfig = [
  'Balcony', 'Car Parking', 'Lift', 'Terrace Access', 'Interior Work',
  'Compound Wall', 'Parapet Wall', 'Waterproofing', 'Putty', 'False Ceiling',
  'Modular Kitchen', 'Wardrobes', 'Sump', 'Septic Tank', 'Rainwater',
  'Borewell', 'Solar', 'Generator', 'CCTV', 'Intercom',
  'Landscaping', 'Paving', 'Water Tanks', 'Stairs', 'Security Room',
  'Cladding', 'Elevation', 'Gates', 'Grills', 'Aluminium', 'Glass',
];
const _kUtility = ['Main Electricity', 'Temporary Connection', 'Generator Backup', 'Water Connection', 'Borewell Motor', 'Sump Motor'];
const _kGas = ['Piped Gas', 'Cylinder Bank', 'Gas Pipeline Routing'];
const _kKitchen = ['Granite Counter', 'Quartz Counter', 'Stainless Steel Sink', 'Chimney Provision', 'Exhaust Fan Provision'];
const _kElectrical = ['Concealed Wiring', 'Open Wiring', '3-Phase Connection', 'AC Points', 'Geyser Points'];
const _kTerrace = ['Weathering Course', 'Cool Roof Paint', 'Overhead Tank', 'Solar Panels'];

const _getStr = (item) => (typeof item === 'object' ? item?.name || item?.label || item?.title || item?.value || '' : String(item || ''));
const _grp = (all, opts) => all.filter((f) => opts.includes(_getStr(f)));
const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const _fmtDate = (d) => (d ? `${d.getDate()} ${_months[d.getMonth()]} ${d.getFullYear()}` : '—');
const fmtINR = (n) => (n !== undefined && n !== null ? `₹${Number(n).toLocaleString('en-IN')}` : '—');

function CollapsibleCard({ title, icon, defaultOpen = true, count, subtitle, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <BtCard padding="0" style={{ overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          userSelect: 'none',
          background: 'var(--card)',
        }}
      >
        {icon && (
          <span
            style={{
              fontSize: 16,
              flexShrink: 0,
              color: 'var(--accent)',
              display: 'flex',
            }}
          >
            {icon}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--ink)',
            }}
          >
            {title}
          </span>
          {(count !== undefined || subtitle) && (
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '12px',
                color: 'var(--ink-3)',
                marginLeft: 8,
              }}
            >
              {count !== undefined ? `(${count})` : subtitle}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          color="var(--ink-3)"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        />
      </div>
      {open && (
        <div
          style={{
            padding: '0 20px 18px',
            borderTop: '1px solid var(--line)',
            background: 'var(--card)',
          }}
        >
          {children}
        </div>
      )}
    </BtCard>
  );
}

export default function ManageSitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const project = location.state?.project || null;
  const projectId = project?._id || project?.id;
  const { isAdmin, user } = useAuth();

  const [activeTab, setActiveTab] = useState('tracker'); // tracker | overview | money | details | entries
  const [toast, setToast] = useState({ msg: '', type: 'info' });
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [loadingT, setLoadingT] = useState(true);
  const [viewingActivity, setViewingActivity] = useState(null);
  const [localProject, setLocalProject] = useState(project);
  const [budgetDialogActivity, setBudgetDialogActivity] = useState(null);
  const [budgetForm, setBudgetForm] = useState({ material: 0, labour: 0, equipment: 0 });

  const canViewInsights = isAdmin || (user?.permissions || []).includes('view_reports');
  const openInsights = () =>
    navigate(`/project-insights/${projectId}`, { state: { project: localProject || project } });
  const clearToast = useCallback(() => setToast({ msg: '', type: 'info' }), []);

  useEffect(() => {
    perfLogger.endRoute('/managesite');
    perfLogger.logMount('ManageSitePage');
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setLoadingStats(true);
    Promise.all([
      projectAPI.getStats(projectId).then(({ data }) => setStats(data)).catch(() => setStats(null)),
      projectAPI.getById(projectId).then(({ data }) => {
        if (data.project) setLocalProject(data.project);
      }).catch(() => {}),
    ]).finally(() => setLoadingStats(false));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const cachedStoreTxs = useTransactionStore.getState().transactions;
    if (cachedStoreTxs && cachedStoreTxs.length > 0) {
      const match = cachedStoreTxs.filter(
        (t) => String(t.project?._id || t.project || t.projectId) === String(projectId)
      );
      if (match.length > 0) {
        setTransactions(match);
        setLoadingT(false);
      } else {
        setLoadingT(true);
      }
    } else {
      setLoadingT(true);
    }

    transactionAPI
      .getAll({ project: projectId, limit: 100 })
      .then(({ data }) => {
        setTransactions(data.transactions || []);
      })
      .catch(() => {})
      .finally(() => setLoadingT(false));
  }, [projectId]);

  if (!project) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 16,
          padding: 24,
        }}
      >
        <Building2 size={48} color="var(--ink-3)" />
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--ink)',
          }}
        >
          No project selected
        </h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, margin: 0 }}>
          Please select a project from the projects list.
        </p>
        <BtButton variant="primary" onPress={() => navigate('/projects')}>
          Go to Projects
        </BtButton>
      </div>
    );
  }

  const p = localProject || project;
  const phases = p.selectedPhases || [];
  const hasNewTracker = phases.length > 0;
  const trackerTotal = phases.reduce((s, ph) => s + (ph.activities?.length || 0), 0);
  const trackerDone = phases.reduce(
    (s, ph) => s + (ph.activities?.filter((a) => isActivityCompleted(a, ph, p)).length || 0),
    0
  );

  const projectName = p.projectName || p.name || 'Untitled Project';
  const projectLoc = p.location || '—';
  const progFallback = p.progress || 0;
  const progress = hasNewTracker
    ? calcProgress(phases, p)
    : progFallback > 1
    ? progFallback
    : progFallback * 100;
  const status = p.status || 'Active';
  const hasPhoto = Boolean(p.photo && String(p.photo).trim());
  const imgSrc = hasPhoto ? resolveImageUrl(p.photo) : '';

  const totalIncome = Number(p.totalIncome || 0);
  const totalBudget = Number(p.budget?.total || p.totalBudget || stats?.totalBudget || 0);
  const spent = Number(p.spentAmount || stats?.totalSpent || 0);
  const remaining = Math.max(totalBudget - spent, 0);
  const util = totalBudget > 0 ? Math.min(spent / totalBudget, 1) : 0;

  const bMat = Number(p.budget?.material ?? p.budgetMaterial ?? 0);
  const bLab = Number(p.budget?.labour ?? p.budgetLabour ?? 0);
  const bEq = Number(p.budget?.equipment ?? p.budgetEquipment ?? 0);
  const bMisc = Number(p.budget?.misc ?? p.budgetMisc ?? 0);
  const hasBrk = bMat + bLab + bEq + bMisc > 0;

  const selectedFeatures = p.selectedFeatures || [];
  const addl = _grp(selectedFeatures, _kAddlConfig);
  const utility = _grp(selectedFeatures, _kUtility);
  const gas = _grp(selectedFeatures, _kGas);
  const kitchen = _grp(selectedFeatures, _kKitchen);
  const electrical = _grp(selectedFeatures, _kElectrical);
  const terrace = _grp(selectedFeatures, _kTerrace);
  const allKnown = [..._kAddlConfig, ..._kUtility, ..._kGas, ..._kKitchen, ..._kElectrical, ..._kTerrace];
  const unknown = selectedFeatures.filter((f) => !allKnown.includes(f));
  const addlAll = [...addl, ...unknown];

  const handleToggleActivity = async (phaseId, activityId) => {
    const updatedPhases = toggleActivity(phases, phaseId, activityId, p);
    const newProgress = calcProgress(updatedPhases, p);
    const completedKeys = updatedPhases.flatMap(
      (ph) => ph.activities?.filter((a) => isActivityCompleted(a, ph, p)).map((a) => a.id) || []
    );
    setLocalProject((prev) => ({
      ...prev,
      selectedPhases: updatedPhases,
      completedActivityKeys: completedKeys,
      progress: newProgress,
    }));
    try {
      await projectAPI.update(projectId, {
        selectedPhases: updatedPhases,
        completedActivityKeys: completedKeys,
        progress: newProgress,
      });
      btToast.success('Activity status updated');
    } catch {
      setLocalProject((prev) => ({
        ...prev,
        selectedPhases: phases,
        progress: calcProgress(phases, p),
      }));
      btToast.error('Failed to update activity');
    }
  };

  const handleExportCSV = async () => {
    try {
      const { data } = await projectAPI.getStats(projectId);
      const rows = [['Category', 'Amount', 'Date', 'Type']];
      (data.transactions || []).forEach((t) => {
        rows.push([t.category || '', t.amount || 0, t.date || '', t.type || '']);
      });
      let csvContent = rows.map((r) => r.join(',')).join('\n');
      csvContent = '\uFEFF' + csvContent;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      btToast.success('CSV exported successfully');
    } catch {
      btToast.error('Failed to export CSV');
    }
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const lines = text.split('\n').filter((l) => l.trim());
        const parsed = lines.slice(1).map((line) => {
          const cols = line.split(',');
          return {
            category: cols[0]?.trim(),
            amount: parseFloat(cols[1]) || 0,
            date: cols[2]?.trim(),
            type: cols[3]?.trim(),
          };
        });
        await projectAPI.update(projectId, { importedTransactions: parsed });
        btToast.success(`Imported ${parsed.length} entries`);
      } catch {
        btToast.error('Failed to import CSV');
      }
    };
    input.click();
  };

  const _isC = (act, phase = null) => isActivityCompleted(act, phase, p);
  const _completedDateLabel = (act) => {
    if (!act.completedAt) return null;
    const d = new Date(act.completedAt);
    if (d.getFullYear() === 2000 && d.getMonth() === 0 && d.getDate() === 1) return 'Date not recorded';
    return `${d.getDate()} ${_months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const _spentForActivity = (actId) => {
    const txs = transactions.filter((t) => t.activity === actId || t.activityId === actId);
    return txs.reduce((s, t) => s + Number(t.amount || 0), 0);
  };

  const openBudgetDialog = (act) => {
    setBudgetForm({
      material: act.budgetMaterial || 0,
      labour: act.budgetLabour || 0,
      equipment: act.budgetEquipment || 0,
    });
    setBudgetDialogActivity(act);
  };

  const saveBudgetDialog = async () => {
    if (!budgetDialogActivity) return;
    const updatedPhases = phases.map((ph) => ({
      ...ph,
      activities: ph.activities.map((a) =>
        a.id === budgetDialogActivity.id
          ? {
              ...a,
              budgetMaterial: Number(budgetForm.material),
              budgetLabour: Number(budgetForm.labour),
              budgetEquipment: Number(budgetForm.equipment),
            }
          : a
      ),
    }));
    setLocalProject((prev) => ({ ...prev, selectedPhases: updatedPhases }));
    try {
      await projectAPI.update(projectId, { selectedPhases: updatedPhases });
      btToast.success('Budget allocated successfully');
    } catch {
      setLocalProject((prev) => ({ ...prev, selectedPhases: phases }));
      btToast.error('Failed to update budget');
    }
    setBudgetDialogActivity(null);
  };

  const labelStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10.5px',
    fontWeight: 600,
    color: 'var(--ink-3)',
    letterSpacing: '0.06em',
    marginBottom: 2,
    textTransform: 'uppercase',
  };
  const valueStyle = {
    fontFamily: 'var(--font-ui)',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--ink)',
  };

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
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
          HERO (Blueprint Noir Header with Project Command)
         ══════════════════════════════════════════════════════════ */}
      <BtHero padding="28px 32px 56px">
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          {/* Breadcrumb & Quick Actions Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => navigate('/projects')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: 'var(--bone)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
              >
                <ArrowLeft size={14} />
                <span>Projects</span>
              </button>

              <span style={{ color: 'var(--on-noir-3)' }}>/</span>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--on-noir-2)',
                  maxWidth: '260px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {projectName}
              </span>
            </div>

            {/* Header Right Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <BtButton
                variant="primary"
                small
                icon={Plus}
                style={{ border: '1px solid rgba(255, 255, 255, 0.22)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
                onPress={() => navigate('/add-entry', { state: { project: p } })}
              >
                Add Entry
              </BtButton>

              <BtButton
                variant="onDark"
                small
                icon={Mic}
                onPress={() => navigate('/voice', { state: { project: p } })}
              >
                Voice
              </BtButton>

              {canViewInsights && (
                <BtButton
                  variant="onDark"
                  small
                  icon={TrendingUp}
                  onPress={openInsights}
                >
                  Insights
                </BtButton>
              )}

              <BtButton
                variant="onDark"
                small
                icon={FileText}
                onPress={() => navigate(`/project-report/${projectId}`, { state: { project: p } })}
              >
                Report
              </BtButton>

              <BtButton
                variant="onDark"
                small
                icon={Pencil}
                onPress={() => navigate('/newproject', { state: { editProject: p } })}
              >
                Edit
              </BtButton>
            </div>
          </div>

          {/* Project Title & Status Eyebrow */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <BtBadge
                label={status}
                tone={status === 'Completed' ? 'green' : status === 'On Hold' ? 'amber' : 'brand'}
              />
              {p.projectCode && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--on-noir-3)',
                    letterSpacing: '0.08em',
                  }}
                >
                  CODE: {p.projectCode}
                </span>
              )}
            </div>

            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--bone)',
                lineHeight: 1.1,
              }}
            >
              {projectName}
            </h1>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginTop: '8px',
                fontFamily: 'var(--font-ui)',
                fontSize: '13px',
                color: 'var(--on-noir-2)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} color="var(--accent)" />
                {projectLoc}
              </span>
              {p.startDate && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} />
                  Started {_fmtDate(new Date(p.startDate))}
                </span>
              )}
              {p.expectedEndDate && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} />
                  Due {_fmtDate(new Date(p.expectedEndDate))}
                </span>
              )}
              {p.clientName && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={14} />
                  Client: {p.clientName}
                </span>
              )}
            </div>
          </div>

          {/* 4 Metric Glass Tiles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            <BtGlassTile
              label="Overall Completion"
              value={`${progress.toFixed(1)}%`}
              valueColor="var(--bone)"
              icon={Target}
            />
            <BtGlassTile
              label="Total Budget"
              value={formatInr(totalBudget, { compact: true })}
              icon={CreditCard}
            />
            <BtGlassTile
              label="Spent Amount"
              value={formatInr(spent, { compact: true })}
              valueColor={spent > totalBudget && totalBudget > 0 ? 'var(--status-danger-bright)' : undefined}
              icon={IndianRupee}
            />
            <BtGlassTile
              label="Activities Completed"
              value={`${trackerDone}/${trackerTotal || '—'}`}
              icon={ClipboardCheck}
            />
          </div>
        </div>
      </BtHero>

      {/* ══════════════════════════════════════════════════════════
          SHEET (Bone Surface with Project Navigation Tabs)
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
          {/* Detail Tabs Bar */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              borderBottom: '1px solid var(--line)',
              paddingBottom: '12px',
            }}
          >
            {[
              { id: 'tracker', label: 'Execution Tracker', count: `${trackerDone}/${trackerTotal}` },
              { id: 'money', label: 'Financials & CSV', count: formatInr(spent, { compact: true }) },
              { id: 'overview', label: 'Site Overview', count: null },
              { id: 'details', label: 'Building Specs', count: null },
              { id: 'entries', label: 'Recent Activity', count: transactions.length },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '20px',
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
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    transition: 'all 150ms ease',
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count && (
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
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ══════════════════════════════════════════════════════════
              TAB 1: EXECUTION TRACKER (PHASES & ACTIVITIES CHECKLIST)
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'tracker' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-display)',
                      fontSize: '20px',
                      fontWeight: 800,
                      color: 'var(--ink)',
                    }}
                  >
                    Phase & Activity Execution Tracker
                  </h3>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontFamily: 'var(--font-ui)',
                      fontSize: '13px',
                      color: 'var(--ink-3)',
                    }}
                  >
                    Check off milestones as work completes on site. Real-time budget tracking per activity.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BtButton
                    variant="primary"
                    small
                    icon={Plus}
                    onPress={() => navigate('/add-entry', { state: { project: p } })}
                  >
                    Log Entry
                  </BtButton>
                </div>
              </div>

              {!hasNewTracker ? (
                <BtCard padding="48px 24px">
                  <BtEmpty
                    icon={ClipboardCheck}
                    title="No execution plan configured"
                    message="Phases and activities were not selected when creating this project. Click Edit to add them."
                    action={
                      <BtButton
                        variant="secondary"
                        onPress={() => navigate('/newproject', { state: { editProject: p } })}
                      >
                        Configure Phases
                      </BtButton>
                    }
                  />
                </BtCard>
              ) : (
                <BtCard padding="0" style={{ overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr
                          style={{
                            borderBottom: '1px solid var(--line)',
                            background: 'var(--fill)',
                            color: 'var(--ink-3)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            letterSpacing: '0.07em',
                            textTransform: 'uppercase',
                          }}
                        >
                          <th style={{ padding: '14px 18px', fontWeight: 700 }}>Phase & Activity</th>
                          <th style={{ padding: '14px 18px', fontWeight: 700 }}>Status</th>
                          <th style={{ padding: '14px 18px', fontWeight: 700 }}>Budget</th>
                          <th style={{ padding: '14px 18px', fontWeight: 700 }}>Spent</th>
                          <th style={{ padding: '14px 18px', fontWeight: 700 }}>Variance</th>
                          <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {phases.map((phase) => {
                          const phaseBud =
                            phase.activities?.reduce(
                              (sum, act) =>
                                sum +
                                (act.budgetMaterial || 0) +
                                (act.budgetLabour || 0) +
                                (act.budgetEquipment || 0),
                              0
                            ) || 0;
                          const phaseSpent =
                            phase.activities?.reduce((sum, act) => sum + _spentForActivity(act.id), 0) || 0;
                          const phaseVariance = phaseBud - phaseSpent;
                          const pTotal = phase.activities?.length || 0;
                          const pDone =
                            phase.activities?.filter((a) => isActivityCompleted(a, phase, p)).length || 0;

                          return (
                            <React.Fragment key={phase.id}>
                              {/* Phase Row */}
                              <tr
                                style={{
                                  background: 'var(--ground)',
                                  borderBottom: '1px solid var(--line)',
                                }}
                              >
                                <td
                                  style={{
                                    padding: '14px 18px',
                                    fontFamily: 'var(--font-display)',
                                    fontWeight: 800,
                                    fontSize: '15px',
                                    color: 'var(--ink)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                  }}
                                >
                                  {phase.isCustom ? (
                                    <Sparkles size={16} color="var(--accent)" />
                                  ) : (
                                    <Layers size={16} color="var(--accent)" />
                                  )}
                                  <span>{phase.phaseName}</span>
                                </td>
                                <td style={{ padding: '14px 18px' }}>
                                  <BtBadge
                                    label={`${pDone}/${pTotal} Done`}
                                    tone={pDone === pTotal && pTotal > 0 ? 'green' : 'brand'}
                                  />
                                </td>
                                <td
                                  className="tnum"
                                  style={{
                                    padding: '14px 18px',
                                    fontFamily: 'var(--font-display)',
                                    fontWeight: 700,
                                    color: 'var(--ink)',
                                  }}
                                >
                                  {fmtINR(phaseBud)}
                                </td>
                                <td
                                  className="tnum"
                                  style={{
                                    padding: '14px 18px',
                                    fontFamily: 'var(--font-display)',
                                    fontWeight: 700,
                                    color: 'var(--ink)',
                                  }}
                                >
                                  {fmtINR(phaseSpent)}
                                </td>
                                <td
                                  className="tnum"
                                  style={{
                                    padding: '14px 18px',
                                    fontFamily: 'var(--font-display)',
                                    fontWeight: 700,
                                    color: phaseVariance < 0 ? 'var(--status-danger-bright)' : 'var(--tone-green)',
                                  }}
                                >
                                  {fmtINR(phaseVariance)}
                                </td>
                                <td style={{ padding: '14px 18px' }} />
                              </tr>

                              {/* Activity Sub-rows */}
                              {phase.activities?.map((act) => {
                                const actBud =
                                  (act.budgetMaterial || 0) +
                                  (act.budgetLabour || 0) +
                                  (act.budgetEquipment || 0);
                                const spentForAct = _spentForActivity(act.id);
                                const actVariance = actBud - spentForAct;
                                const isC = _isC(act);
                                const dateLabel = _completedDateLabel(act);

                                return (
                                  <tr
                                    key={act.id}
                                    style={{
                                      borderBottom: '1px solid var(--line)',
                                      background: 'var(--card)',
                                      transition: 'background 120ms ease',
                                    }}
                                  >
                                    <td style={{ padding: '12px 18px 12px 36px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleActivity(phase.id, act.id);
                                          }}
                                          style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: '6px',
                                            border: `1.5px solid ${isC ? 'var(--tone-green)' : 'var(--line)'}`,
                                            background: isC ? 'var(--tone-green)' : 'var(--card)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            transition: 'all 120ms ease',
                                          }}
                                        >
                                          {isC && <Check size={14} color="#fff" strokeWidth={3} />}
                                        </div>

                                        <div>
                                          <div
                                            style={{
                                              fontFamily: 'var(--font-ui)',
                                              fontSize: '14px',
                                              fontWeight: isC ? 500 : 600,
                                              color: isC ? 'var(--ink-3)' : 'var(--ink)',
                                              textDecoration: isC ? 'line-through' : 'none',
                                            }}
                                          >
                                            {act.name}
                                          </div>
                                          {isC && dateLabel && (
                                            <div
                                              style={{
                                                fontSize: '11px',
                                                color: 'var(--tone-green)',
                                                fontWeight: 600,
                                                marginTop: '2px',
                                              }}
                                            >
                                              Completed {dateLabel}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    <td style={{ padding: '12px 18px' }}>
                                      <BtBadge
                                        label={isC ? 'Done' : 'Pending'}
                                        tone={isC ? 'green' : 'amber'}
                                      />
                                    </td>

                                    <td
                                      className="tnum"
                                      style={{
                                        padding: '12px 18px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: 'var(--ink-2)',
                                      }}
                                    >
                                      {fmtINR(actBud)}
                                    </td>

                                    <td
                                      className="tnum"
                                      style={{
                                        padding: '12px 18px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: 'var(--ink-2)',
                                      }}
                                    >
                                      {fmtINR(spentForAct)}
                                    </td>

                                    <td
                                      className="tnum"
                                      style={{
                                        padding: '12px 18px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color:
                                          actVariance < 0
                                            ? 'var(--status-danger-bright)'
                                            : actVariance > 0
                                            ? 'var(--tone-green)'
                                            : 'var(--ink-3)',
                                      }}
                                    >
                                      {fmtINR(actVariance)}
                                    </td>

                                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/add-entry', {
                                              state: {
                                                project: p,
                                                prefill: { phase: phase.phaseName, activity: act.name },
                                              },
                                            });
                                          }}
                                          style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            background: 'var(--fill)',
                                            border: '1px solid var(--line)',
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: 'var(--ink)',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          + ADD
                                        </button>

                                        {isC && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setViewingActivity(act);
                                            }}
                                            style={{
                                              padding: '4px 10px',
                                              borderRadius: '6px',
                                              background: 'var(--tone-green-bg)',
                                              border: '1px solid rgba(16, 185, 129, 0.2)',
                                              fontFamily: 'var(--font-mono)',
                                              fontSize: '11px',
                                              fontWeight: 700,
                                              color: 'var(--tone-green)',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            VIEW
                                          </button>
                                        )}

                                        {isAdmin && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openBudgetDialog(act);
                                            }}
                                            style={{
                                              padding: '4px 10px',
                                              borderRadius: '6px',
                                              background: 'var(--card)',
                                              border: '1px solid var(--line)',
                                              fontFamily: 'var(--font-mono)',
                                              fontSize: '11px',
                                              fontWeight: 700,
                                              color: 'var(--ink-2)',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: 4,
                                            }}
                                          >
                                            <Pencil size={11} /> BUDGET
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </BtCard>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: FINANCIALS & CSV IMPORT / EXPORT
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'money' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-display)',
                      fontSize: '20px',
                      fontWeight: 800,
                      color: 'var(--ink)',
                    }}
                  >
                    Financial Overview & Category Allocations
                  </h3>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontFamily: 'var(--font-ui)',
                      fontSize: '13px',
                      color: 'var(--ink-3)',
                    }}
                  >
                    Category breakdown, cash inflow, and automated spreadsheet import / export.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <BtButton variant="secondary" small icon={FileDown} onPress={handleExportCSV}>
                    Export CSV
                  </BtButton>
                  <BtButton variant="secondary" small icon={FileUp} onPress={handleImportCSV}>
                    Import CSV
                  </BtButton>
                </div>
              </div>

              {/* Financial KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <BtCard padding="20px">
                  <div style={labelStyle}>TOTAL BUDGET ALLOCATED</div>
                  <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: 'var(--ink)', marginTop: '4px' }}>
                    {fmtINR(totalBudget)}
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <BtBricks value={util} height={8} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ink-3)', marginTop: '8px' }}>
                    <span>Budget Utilized</span>
                    <span style={{ fontWeight: 700, color: util >= 1 ? 'var(--status-danger-bright)' : 'var(--ink)' }}>
                      {(util * 100).toFixed(0)}%
                    </span>
                  </div>
                </BtCard>

                <BtCard padding="20px">
                  <div style={labelStyle}>TOTAL FUNDS SPENT</div>
                  <div
                    className="tnum"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '24px',
                      fontWeight: 800,
                      color: spent > totalBudget && totalBudget > 0 ? 'var(--status-danger-bright)' : 'var(--ink)',
                      marginTop: '4px',
                    }}
                  >
                    {fmtINR(spent)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--ink-2)', marginTop: '10px' }}>
                    Remaining budget: <strong style={{ color: 'var(--tone-green)' }}>{fmtINR(remaining)}</strong>
                  </div>
                </BtCard>

                <BtCard padding="20px">
                  <div style={labelStyle}>TOTAL REVENUE INFLOW</div>
                  <div
                    className="tnum"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '24px',
                      fontWeight: 800,
                      color: 'var(--tone-green)',
                      marginTop: '4px',
                    }}
                  >
                    +{fmtINR(totalIncome)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--ink-2)', marginTop: '10px' }}>
                    Net cash flow: <strong>{fmtINR(totalIncome - spent)}</strong>
                  </div>
                </BtCard>
              </div>

              {/* Category Breakdown */}
              {hasBrk && (
                <BtCard padding="22px">
                  <BtSectionHeader title="Category Breakdown" caption />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '10px' }}>
                    {bMat > 0 && (
                      <div style={{ padding: '12px 14px', borderRadius: 'var(--r-input)', background: 'var(--fill)' }}>
                        <div style={labelStyle}>MATERIALS</div>
                        <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                          {fmtINR(bMat)}
                        </div>
                      </div>
                    )}
                    {bLab > 0 && (
                      <div style={{ padding: '12px 14px', borderRadius: 'var(--r-input)', background: 'var(--fill)' }}>
                        <div style={labelStyle}>LABOUR</div>
                        <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                          {fmtINR(bLab)}
                        </div>
                      </div>
                    )}
                    {bEq > 0 && (
                      <div style={{ padding: '12px 14px', borderRadius: 'var(--r-input)', background: 'var(--fill)' }}>
                        <div style={labelStyle}>EQUIPMENT</div>
                        <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                          {fmtINR(bEq)}
                        </div>
                      </div>
                    )}
                    {bMisc > 0 && (
                      <div style={{ padding: '12px 14px', borderRadius: 'var(--r-input)', background: 'var(--fill)' }}>
                        <div style={labelStyle}>MISCELLANEOUS</div>
                        <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                          {fmtINR(bMisc)}
                        </div>
                      </div>
                    )}
                  </div>
                </BtCard>
              )}

              {/* CSV Tool Card */}
              <CsvImportExportCard project={p} onProjectUpdated={setLocalProject} setToast={setToast} />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 3: SITE OVERVIEW & TIMELINE
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <BtCard padding="24px">
                <BtSectionHeader title="Project Timeline & Status" caption />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: 'var(--r-input)', background: 'var(--fill)' }}>
                    <div style={labelStyle}>START DATE</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
                      {p.startDate ? _fmtDate(new Date(p.startDate)) : '—'}
                    </div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: 'var(--r-input)', background: 'var(--fill)' }}>
                    <div style={labelStyle}>EXPECTED COMPLETION</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
                      {p.expectedEndDate ? _fmtDate(new Date(p.expectedEndDate)) : (p.endDate ? _fmtDate(new Date(p.endDate)) : '—')}
                    </div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: 'var(--r-input)', background: 'var(--fill)' }}>
                    <div style={labelStyle}>CURRENT STATUS</div>
                    <div style={{ marginTop: '4px' }}>
                      <BtBadge label={status} tone={status === 'Completed' ? 'green' : 'brand'} />
                    </div>
                  </div>
                </div>
              </BtCard>

              {/* Site Photo Preview */}
              {hasPhoto && (
                <BtCard padding="20px">
                  <BtSectionHeader title="Site Photo" caption />
                  <div style={{ marginTop: '10px', borderRadius: 'var(--r-card)', overflow: 'hidden', maxHeight: '340px' }}>
                    <img src={imgSrc} alt="Site preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </BtCard>
              )}

              {/* Project Scope */}
              {p.scope && (
                <BtCard padding="20px">
                  <BtSectionHeader title="Project Scope" caption />
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: '8px' }}>
                    {p.scope}
                  </div>
                </BtCard>
              )}

              {/* Blueprints and Documents */}
              {p.documents && p.documents.length > 0 && (
                <BtCard padding="20px">
                  <BtSectionHeader title={`Blueprints & Documents (${p.documents.length})`} caption />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '12px' }}>
                    {p.documents.map((doc, idx) => {
                      const fileUrl = resolveImageUrl(doc);
                      const fileName = doc.split('/').pop() || `Document ${idx + 1}`;
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                      return (
                        <div
                          key={idx}
                          style={{
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--r-input)',
                            overflow: 'hidden',
                            background: 'var(--card)',
                          }}
                        >
                          <div
                            style={{
                              height: '110px',
                              background: 'var(--fill)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                            }}
                          >
                            {isImage ? (
                              <img src={fileUrl} alt={fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <FileText size={36} color="var(--accent)" />
                            )}
                          </div>
                          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                              {fileName}
                            </span>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--accent)',
                                textDecoration: 'none',
                              }}
                            >
                              View
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </BtCard>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 4: BUILDING SPECIFICATIONS & DETAILS
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Project Info Details */}
              <CollapsibleCard title="General Project Information" icon={<ClipboardCheck size={16} />} defaultOpen>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', paddingTop: '12px' }}>
                  {p.projectCode && (
                    <div>
                      <div style={labelStyle}>PROJECT CODE</div>
                      <div style={valueStyle}>{p.projectCode}</div>
                    </div>
                  )}
                  {p.clientName && (
                    <div>
                      <div style={labelStyle}>CLIENT</div>
                      <div style={valueStyle}>{p.clientName}</div>
                    </div>
                  )}
                  {p.contractorName && (
                    <div>
                      <div style={labelStyle}>CONTRACTOR</div>
                      <div style={valueStyle}>{p.contractorName}</div>
                    </div>
                  )}
                  {p.siteEngineer && (
                    <div>
                      <div style={labelStyle}>ENGINEER</div>
                      <div style={valueStyle}>{p.siteEngineer}</div>
                    </div>
                  )}
                  {p.contactNumber && (
                    <div>
                      <div style={labelStyle}>CONTACT</div>
                      <div style={valueStyle}>{p.contactNumber}</div>
                    </div>
                  )}
                  <div>
                    <div style={labelStyle}>LOCATION</div>
                    <div style={valueStyle}>{projectLoc}</div>
                  </div>
                </div>
              </CollapsibleCard>

              {/* Land and Floors */}
              {(p.landArea || (p.floors && p.floors.length > 0)) && (
                <CollapsibleCard title="Land & Floor Configuration" icon={<Layers size={16} />} defaultOpen>
                  <div style={{ paddingTop: '12px' }}>
                    {p.landArea && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={labelStyle}>TOTAL LAND AREA</div>
                        <div style={{ ...valueStyle, fontSize: '16px' }}>
                          {p.landArea} {p.landUnit || 'sq ft'}
                        </div>
                      </div>
                    )}
                    {p.floors && p.floors.length > 0 && (
                      <div>
                        <div style={labelStyle}>FLOORS INCLUDED</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {p.floors.map((f, i) => (
                            <BtBadge key={i} label={f} tone="neutral" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleCard>
              )}

              {/* Features and Configurations */}
              {addlAll.length > 0 && (
                <CollapsibleCard title="Additional Configurations" icon={<Settings size={16} />} count={addlAll.length} defaultOpen>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '12px' }}>
                    {addlAll.map((item, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'var(--fill)',
                          border: '1px solid var(--line)',
                          fontFamily: 'var(--font-ui)',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--ink)',
                        }}
                      >
                        {_getStr(item)}
                      </span>
                    ))}
                  </div>
                </CollapsibleCard>
              )}

              {utility.length > 0 && (
                <CollapsibleCard title="Utility & Services" icon={<Zap size={16} />} count={utility.length} defaultOpen>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '12px' }}>
                    {utility.map((item, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'var(--fill)',
                          border: '1px solid var(--line)',
                          fontFamily: 'var(--font-ui)',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'var(--ink)',
                        }}
                      >
                        {_getStr(item)}
                      </span>
                    ))}
                  </div>
                </CollapsibleCard>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 5: RECENT ACTIVITY LOG
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'entries' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <BtSectionHeader
                title={`Site Activity Log (${transactions.length})`}
                action="View all entries"
                onAction={() => navigate('/transaction')}
              />

              {transactions.length === 0 ? (
                <BtCard padding="48px 24px">
                  <BtEmpty
                    icon={Clock}
                    title="No logged transactions yet"
                    message="Expenses, labour logs, and materials added for this project will be listed here."
                    action={
                      <BtButton
                        variant="primary"
                        icon={Plus}
                        onPress={() => navigate('/add-entry', { state: { project: p } })}
                      >
                        Add First Entry
                      </BtButton>
                    }
                  />
                </BtCard>
              ) : (
                <BtGroup>
                  {transactions.slice(0, 15).map((t, idx) => {
                    const amt = Number(t.amount || t.totalAmount || 0);
                    return (
                      <BtRow
                        key={t._id || idx}
                        icon={<BtTypeTile type={t.type} size={40} />}
                        title={t.title || t.name || t.type || 'Entry'}
                        subtitle={`${t.category || t.type || ''} • ${_fmtDate(new Date(t.date || t.createdAt))}`}
                        amount={Math.abs(amt)}
                        tag={
                          <BtBadge
                            label={t.type || 'Material'}
                            tone={
                              t.type === 'Wages' || t.type === 'Labour'
                                ? 'green'
                                : t.type === 'Income'
                                ? 'green'
                                : t.type === 'Expense'
                                ? 'amber'
                                : 'brand'
                            }
                          />
                        }
                        onClick={() => navigate('/entry-detail', { state: { entry: t } })}
                      />
                    );
                  })}
                </BtGroup>
              )}
            </div>
          )}
        </div>
      </BtSheet>

      {/* ══════════════════════════════════════════════════════════
          BUDGET ALLOCATION DIALOG (MODAL)
         ══════════════════════════════════════════════════════════ */}
      {budgetDialogActivity && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--scrim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
            padding: '16px',
          }}
          onClick={() => setBudgetDialogActivity(null)}
        >
          <div
            style={{
              background: 'var(--card)',
              width: '100%',
              maxWidth: 440,
              borderRadius: 'var(--r-card)',
              padding: '24px 28px',
              boxShadow: 'var(--shadow-modal)',
              border: '1px solid var(--line)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--ink)',
                }}
              >
                Allocate Budget
              </h3>
              <button
                type="button"
                onClick={() => setBudgetDialogActivity(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-3)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--ink-2)', margin: '0 0 20px' }}>
              Set budget allocations for <strong>{budgetDialogActivity.name}</strong> across categories.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>MATERIALS BUDGET (₹)</label>
                <input
                  type="number"
                  value={budgetForm.material}
                  onChange={(e) => setBudgetForm((f) => ({ ...f, material: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 14px',
                    borderRadius: 'var(--r-input)',
                    border: '1px solid var(--line)',
                    background: 'var(--fill)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '15px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={labelStyle}>LABOUR BUDGET (₹)</label>
                <input
                  type="number"
                  value={budgetForm.labour}
                  onChange={(e) => setBudgetForm((f) => ({ ...f, labour: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 14px',
                    borderRadius: 'var(--r-input)',
                    border: '1px solid var(--line)',
                    background: 'var(--fill)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '15px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={labelStyle}>EQUIPMENT BUDGET (₹)</label>
                <input
                  type="number"
                  value={budgetForm.equipment}
                  onChange={(e) => setBudgetForm((f) => ({ ...f, equipment: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '46px',
                    padding: '0 14px',
                    borderRadius: 'var(--r-input)',
                    border: '1px solid var(--line)',
                    background: 'var(--fill)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '15px',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <BtButton variant="primary" fullWidth onPress={saveBudgetDialog}>
              Save Budget Allocation
            </BtButton>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ACTIVITY DETAIL VIEW SHEET
         ══════════════════════════════════════════════════════════ */}
      {viewingActivity && (
        <ActivityDetailSheet
          activity={viewingActivity}
          phaseName={phases.find((p) => p.activities?.some((a) => a.id === viewingActivity.id))?.phaseName || ''}
          onClose={() => setViewingActivity(null)}
        />
      )}
    </div>
  );
}

function ActivityDetailSheet({ activity, phaseName, onClose }) {
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setPhotos(activity.photos || (activity.photo ? [activity.photo] : []));
    setNotes(activity.notes || '');
  }, [activity]);

  const fmtDate = (d) => {
    if (!d) return 'Completed';
    const dt = new Date(d);
    if (dt.getFullYear() === 2000 && dt.getMonth() === 0 && dt.getDate() === 1) return 'Date not recorded';
    return `${dt.getDate()} ${_months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--scrim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card)',
          width: '100%',
          maxWidth: 480,
          borderRadius: 'var(--r-card)',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--line)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--ink)',
              }}
            >
              {activity.name}
            </h3>
            <div style={{ marginTop: '4px' }}>
              <BtBadge label={phaseName} tone="neutral" />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ink-3)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Check size={18} color="var(--tone-green)" strokeWidth={3} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, color: 'var(--tone-green)' }}>
            Completed on {fmtDate(activity.completedAt)}
          </span>
        </div>

        {notes && notes.trim() ? (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--ink-3)',
                letterSpacing: '0.06em',
                marginBottom: 6,
                textTransform: 'uppercase',
              }}
            >
              Notes & Remarks
            </div>
            <div
              style={{
                padding: '12px 14px',
                background: 'var(--fill)',
                borderRadius: 'var(--r-input)',
                border: '1px solid var(--line)',
                fontSize: '13px',
                color: 'var(--ink)',
                lineHeight: 1.5,
              }}
            >
              {notes}
            </div>
          </div>
        ) : (
          <div
            style={{
              marginBottom: 20,
              padding: '20px 16px',
              background: 'var(--fill)',
              borderRadius: 'var(--r-input)',
              textAlign: 'center',
            }}
          >
            <Info size={20} color="var(--ink-3)" style={{ marginBottom: 6 }} />
            <div style={{ fontSize: '13px', color: 'var(--ink-3)', fontStyle: 'italic' }}>
              No additional notes recorded for this milestone.
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--ink-3)',
                letterSpacing: '0.06em',
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              Progress Photos
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {photos.map((url, i) => (
                <div
                  key={i}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 'var(--r-input)',
                    border: '1px solid var(--line)',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={url}
                    alt="Progress milestone"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
