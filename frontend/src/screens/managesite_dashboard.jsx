import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectAPI, transactionAPI } from '../api';
import perfLogger from '../utils/performanceLogger';
import { resolveImageUrl } from '../utils/imageUrl';
import {
  calcProgress,
  toggleActivity,
  isActivityCompleted,
} from '../utils/constructionPhases';
import {
  BtHero,
  BtGlassTile,
  BtSheet,
  BtPageHeader,
  BtButton,
  BtIconButton,
  BtField,
  BtCard,
  BtGroup,
  BtRow,
  BtBadge,
  BtChip,
  BtBricks,
  BtProgress,
  formatInr,
  BtEmpty,
  BtTypeTile,
  BtSectionHeader,
  BtSkeleton,
  btToast,
} from '../components/ui';
import CsvImportExportCard from '../components/CsvImportExportCard';
import useTransactionStore from '../stores/transactionStore';
import { Toast, ConfirmDialog } from '../components/Toast';
import {
  ChevronDown,
  Plus,
  FileDown,
  FileUp,
  Pencil,
  X,
  Check,
  Eye,
  Building2,
  MapPin,
  Calendar,
  User,
  Layers,
  Settings,
  Zap,
  Flame,
  ChefHat,
  Sun,
  Clock,
  IndianRupee,
  CreditCard,
  Target,
  ClipboardCheck,
  FileText,
  Mic,
  TrendingUp,
  Sparkles,
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
const _fmtDate = (d) => (d && !isNaN(d.getTime()) ? `${d.getDate()} ${_months[d.getMonth()]} ${d.getFullYear()}` : '—');
const money = (n) => formatInr(n);

// btToast is a function (message, { error }) — it has no .success/.error helpers.
const notify = (message, error = false) => btToast(message, { error });

// Same words as the Projects list filter tabs.
function projectStatus(raw) {
  const s = (raw || '').toLowerCase().replace(/[\s_]+/g, '');
  if (s === 'planning') return { label: 'Planning', tone: 'neutral' };
  if (s === 'onhold') return { label: 'On Hold', tone: 'warning' };
  if (s === 'completed') return { label: 'Completed', tone: 'success' };
  if (s === 'cancelled' || s === 'reviewneeded') return { label: 'Review Needed', tone: 'danger' };
  return { label: 'Active', tone: 'brand' };
}

const TYPE_LABEL = { Materials: 'Material', Wages: 'Labour', Expense: 'Equipment' };
const TYPE_TONE = { Materials: 'material', Wages: 'labour', Labour: 'labour', Expense: 'equipment', Equipment: 'equipment', Income: 'income' };

const eyebrow = { color: 'var(--ink-3)' };

/** Small label + value pair used across the overview / specs tabs. */
function Fact({ label, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="bt-eyebrow" style={{ ...eyebrow, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', overflowWrap: 'anywhere' }}>
        {children}
      </div>
    </div>
  );
}

function FactTile({ label, children }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: 'var(--r-input)', background: 'var(--fill)', minWidth: 0 }}>
      <Fact label={label}>{children}</Fact>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--r-chip)',
        background: 'var(--fill)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ink)',
      }}
    >
      {children}
    </span>
  );
}

function CollapsibleCard({ title, icon: Icon, defaultOpen = true, count, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <BtCard padding="0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: '100%',
          minHeight: 56,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {Icon && <Icon size={18} strokeWidth={1.9} color="var(--accent-ink)" style={{ flexShrink: 0 }} />}
        <span style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
          {title}
          {count !== undefined && (
            <span className="tnum" style={{ marginLeft: 8, fontSize: 13, fontWeight: 500, color: 'var(--ink-3)' }}>
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          size={18}
          color="var(--ink-3)"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        />
      </button>
      {open && <div style={{ padding: '4px 20px 20px', borderTop: '1px solid var(--line)' }}>{children}</div>}
    </BtCard>
  );
}

/** Centered dialog with scrim, Esc to close, and a labelled close button. */
function ModalShell({ title, subtitle, onClose, maxWidth = 440, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          background: 'var(--card)',
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          borderRadius: 'var(--r-card)',
          padding: 24,
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--line)',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
                overflowWrap: 'anywhere',
              }}
            >
              {title}
            </h3>
            {subtitle && <div style={{ marginTop: 6 }}>{subtitle}</div>}
          </div>
          <BtIconButton icon={X} label="Close" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ManageSitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const project = location.state?.project || null;
  const projectId = project?._id || project?.id;
  const { isAdmin, user } = useAuth();

  const [activeTab, setActiveTab] = useState('tracker'); // tracker | money | overview | details | entries
  const [toast, setToast] = useState({ msg: '', type: 'info' });
  const [confirmDlg, setConfirmDlg] = useState(null);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingT, setLoadingT] = useState(true);
  const [viewingActivity, setViewingActivity] = useState(null);
  const [localProject, setLocalProject] = useState(project);
  const [budgetDialogActivity, setBudgetDialogActivity] = useState(null);
  const [budgetForm, setBudgetForm] = useState({ material: 0, labour: 0, equipment: 0 });
  const [savingBudget, setSavingBudget] = useState(false);
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = (e) => setIsNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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
    Promise.all([
      projectAPI.getStats(projectId).then(({ data }) => setStats(data)).catch(() => setStats(null)),
      projectAPI.getById(projectId).then(({ data }) => {
        if (data.project) setLocalProject(data.project);
      }).catch(() => {}),
    ]);
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
      <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <BtHero>
          <BtPageHeader
            back={{ label: 'Projects', onClick: () => navigate('/projects') }}
            eyebrow="Project"
            title="No project selected"
            subtitle="Open a project from the list to manage its phases and money."
          />
        </BtHero>
        <BtSheet>
          <BtCard padding="24px">
            <BtEmpty
              icon={Building2}
              title="Nothing to show yet"
              message="Please select a project from the projects list."
              actionLabel="Go to Projects"
              onAction={() => navigate('/projects')}
            />
          </BtCard>
        </BtSheet>
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
  const progFallback = Number(p.progress) || 0;
  const progress = hasNewTracker
    ? calcProgress(phases, p)
    : progFallback > 1 || progFallback === 0 || progFallback === 1
    ? progFallback
    : progFallback * 100;
  const st = projectStatus(p.status);
  const hasPhoto = Boolean(p.photo && String(p.photo).trim());
  const imgSrc = hasPhoto ? resolveImageUrl(p.photo) : '';

  const totalIncome = Number(p.totalIncome || 0);
  const totalBudget = Number(p.budget?.total || p.totalBudget || stats?.totalBudget || 0);
  const spent = Number(p.spentAmount || stats?.totalSpent || 0);
  const remaining = Math.max(totalBudget - spent, 0);
  const util = totalBudget > 0 ? Math.min(spent / totalBudget, 1) : 0;
  const overBudget = totalBudget > 0 && spent > totalBudget;

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
  const featureGroups = [
    { title: 'Additional Configurations', icon: Settings, items: addlAll },
    { title: 'Utility & Services', icon: Zap, items: utility },
    { title: 'Gas Connection', icon: Flame, items: gas },
    { title: 'Kitchen Requirements', icon: ChefHat, items: kitchen },
    { title: 'Electrical & Plumbing', icon: Zap, items: electrical },
    { title: 'Terrace & Interior', icon: Sun, items: terrace },
  ].filter((g) => g.items.length > 0);

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
      notify('Activity status updated');
    } catch {
      setLocalProject((prev) => ({
        ...prev,
        selectedPhases: phases,
        progress: calcProgress(phases, p),
      }));
      notify('Failed to update activity', true);
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
      csvContent = '﻿' + csvContent;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify('CSV exported successfully');
    } catch {
      notify('Failed to export CSV', true);
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
        notify(`Imported ${parsed.length} entries`);
      } catch {
        notify('Failed to import CSV', true);
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
    if (!budgetDialogActivity || savingBudget) return;
    const updatedPhases = phases.map((ph) => ({
      ...ph,
      activities: ph.activities.map((a) =>
        a.id === budgetDialogActivity.id
          ? {
              ...a,
              budgetMaterial: Number(budgetForm.material) || 0,
              budgetLabour: Number(budgetForm.labour) || 0,
              budgetEquipment: Number(budgetForm.equipment) || 0,
            }
          : a
      ),
    }));
    setSavingBudget(true);
    setLocalProject((prev) => ({ ...prev, selectedPhases: updatedPhases }));
    try {
      await projectAPI.update(projectId, { selectedPhases: updatedPhases });
      notify('Budget allocated successfully');
    } catch {
      setLocalProject((prev) => ({ ...prev, selectedPhases: phases }));
      notify('Failed to update budget', true);
    }
    setSavingBudget(false);
    setBudgetDialogActivity(null);
  };

  const budgetFormTotal =
    (Number(budgetForm.material) || 0) + (Number(budgetForm.labour) || 0) + (Number(budgetForm.equipment) || 0);

  const tabs = [
    { id: 'tracker', label: 'Execution Tracker', count: `${trackerDone}/${trackerTotal}` },
    { id: 'money', label: 'Financials & CSV', count: formatInr(spent, { compact: true }) },
    { id: 'overview', label: 'Site Overview', count: null },
    { id: 'details', label: 'Building Specs', count: null },
    { id: 'entries', label: 'Recent Activity', count: String(transactions.length) },
  ];

  const sectionTitle = (title, sub) => (
    <div style={{ minWidth: 0 }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
        {title}
      </h2>
      {sub && <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-2)' }}>{sub}</p>}
    </div>
  );

  const metaItem = (Icon, text) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Icon size={14} strokeWidth={1.9} />
      {text}
    </span>
  );

  const th = { whiteSpace: 'nowrap' };

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

      {/* ── HERO ─────────────────────────────────────────────── */}
      <BtHero>
        <BtPageHeader
          back={{ label: 'Projects', onClick: () => navigate('/projects') }}
          eyebrow={p.projectCode ? `Code ${p.projectCode}` : 'Project'}
          title={projectName}
          size="md"
          meta={
            <>
              <BtBadge label={st.label} tone={st.tone} />
              {metaItem(MapPin, projectLoc)}
              {p.startDate && metaItem(Calendar, `Started ${_fmtDate(new Date(p.startDate))}`)}
              {p.expectedEndDate && metaItem(Clock, `Due ${_fmtDate(new Date(p.expectedEndDate))}`)}
              {p.clientName && metaItem(User, `Client: ${p.clientName}`)}
            </>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <BtButton
              variant="accent"
              size="small"
              icon={Plus}
              onClick={() => navigate('/add-entry', { state: { project: p } })}
            >
              Add Entry
            </BtButton>
            <BtButton variant="onDark" size="small" icon={Mic} onClick={() => navigate('/voice', { state: { project: p } })}>
              Voice
            </BtButton>
            {canViewInsights && (
              <BtButton variant="onDark" size="small" icon={TrendingUp} onClick={openInsights}>
                Insights
              </BtButton>
            )}
            <BtButton
              variant="onDark"
              size="small"
              icon={FileText}
              onClick={() => navigate(`/project-report/${projectId}`, { state: { project: p } })}
            >
              Report
            </BtButton>
            <BtButton
              variant="onDark"
              size="small"
              icon={Pencil}
              onClick={() => navigate('/newproject', { state: { editProject: p } })}
            >
              Edit
            </BtButton>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <BtGlassTile label="Completion" value={`${progress.toFixed(1)}%`} icon={Target} />
            <BtGlassTile label="Total budget" value={formatInr(totalBudget, { compact: true })} icon={CreditCard} />
            <BtGlassTile
              label="Spent"
              value={formatInr(spent, { compact: true })}
              valueColor={overBudget ? 'var(--status-danger-bright)' : undefined}
              icon={IndianRupee}
            />
            <BtGlassTile label="Activities done" value={`${trackerDone}/${trackerTotal || '—'}`} icon={ClipboardCheck} />
          </div>
        </BtPageHeader>
      </BtHero>

      {/* ── SHEET ────────────────────────────────────────────── */}
      <BtSheet>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div role="tablist" aria-label="Project sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tabs.map((tab) => (
              <BtChip
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                label={
                  <>
                    {tab.label}
                    {tab.count && (
                      <span className="tnum" style={{ marginLeft: 8, opacity: 0.7, fontWeight: 600 }}>
                        {tab.count}
                      </span>
                    )}
                  </>
                }
              />
            ))}
          </div>

          {/* ── TAB 1: EXECUTION TRACKER ── */}
          {activeTab === 'tracker' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                {sectionTitle('Phase & activity tracker', 'Tick off milestones as work completes on site, with budget against spend per activity.')}
                <BtButton
                  variant="secondary"
                  size="small"
                  icon={Plus}
                  onClick={() => navigate('/add-entry', { state: { project: p } })}
                >
                  Log Entry
                </BtButton>
              </div>

              {!hasNewTracker ? (
                <BtCard padding="24px">
                  <BtEmpty
                    icon={ClipboardCheck}
                    title="No execution plan configured"
                    message="Phases and activities were not selected when creating this project."
                    actionLabel="Configure Phases"
                    onAction={() => navigate('/newproject', { state: { editProject: p } })}
                  />
                </BtCard>
              ) : isNarrow ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {phases.map((phase) => {
                    const acts = phase.activities || [];
                    const phaseBud = acts.reduce((sum, a) => sum + (a.budgetMaterial || 0) + (a.budgetLabour || 0) + (a.budgetEquipment || 0), 0);
                    const phaseSpent = acts.reduce((sum, a) => sum + _spentForActivity(a.id), 0);
                    const phaseVariance = phaseBud - phaseSpent;
                    const pDone = acts.filter((a) => isActivityCompleted(a, phase, p)).length;
                    const miniGrid = (bud, sp, vr, big) => (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                        {[
                          ['Budget', bud, 'var(--ink)'],
                          ['Spent', sp, 'var(--ink)'],
                          ['Variance', vr, vr < 0 ? 'var(--status-danger)' : vr > 0 ? 'var(--status-success)' : 'var(--ink-3)'],
                        ].map(([label, val, color]) => (
                          <div key={label} style={{ minWidth: 0 }}>
                            <div className="bt-eyebrow" style={{ color: 'var(--ink-3)', marginBottom: 2 }}>{label}</div>
                            <div className="tnum" style={{ fontFamily: big ? 'var(--font-display)' : 'var(--font-ui)', fontSize: big ? 15 : 14, fontWeight: big ? 700 : 600, color, overflowWrap: 'anywhere' }}>
                              {money(val)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                    return (
                      <section key={phase.id} aria-label={phase.phaseName}>
                        <BtCard padding="14px 16px" style={{ background: 'var(--bone)', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            {phase.isCustom ? <Sparkles size={16} color="var(--accent-ink)" style={{ flexShrink: 0 }} /> : <Layers size={16} color="var(--accent-ink)" style={{ flexShrink: 0 }} />}
                            <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', overflowWrap: 'anywhere' }}>{phase.phaseName}</span>
                            <BtBadge label={`${pDone}/${acts.length} done`} tone={pDone === acts.length && acts.length > 0 ? 'success' : 'brand'} />
                          </div>
                          {miniGrid(phaseBud, phaseSpent, phaseVariance, true)}
                        </BtCard>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {acts.map((act) => {
                            const actBud = (act.budgetMaterial || 0) + (act.budgetLabour || 0) + (act.budgetEquipment || 0);
                            const spentForAct = _spentForActivity(act.id);
                            const isC = _isC(act);
                            const dateLabel = _completedDateLabel(act);
                            return (
                              <BtCard key={act.id} padding="14px 16px" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={isC}
                                    aria-label={`${isC ? 'Mark pending' : 'Mark done'}: ${act.name}`}
                                    onClick={() => handleToggleActivity(phase.id, act.id)}
                                    style={{ width: 40, height: 40, margin: '-8px 0 -8px -8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                                  >
                                    <span style={{ width: 22, height: 22, borderRadius: 7, border: `1.5px solid ${isC ? 'var(--status-success)' : 'var(--input-border)'}`, background: isC ? 'var(--status-success)' : 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {isC && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                                    </span>
                                  </button>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 15, fontWeight: 600, color: isC ? 'var(--ink-2)' : 'var(--ink)', textDecoration: isC ? 'line-through' : 'none', overflowWrap: 'anywhere' }}>{act.name}</div>
                                    {isC && dateLabel && <div style={{ fontSize: 13, color: 'var(--status-success)', fontWeight: 600, marginTop: 2 }}>Completed {dateLabel}</div>}
                                  </div>
                                  <BtBadge label={isC ? 'Done' : 'Pending'} tone={isC ? 'success' : 'warning'} />
                                </div>
                                {miniGrid(actBud, spentForAct, actBud - spentForAct, false)}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <BtButton
                                    variant="secondary"
                                    size="compact"
                                    icon={Plus}
                                    onClick={() => navigate('/add-entry', { state: { project: p, prefill: { phase: phase.phaseName, activity: act.name } } })}
                                  >
                                    Add
                                  </BtButton>
                                  {isC && (
                                    <BtButton variant="secondary" size="compact" icon={Eye} onClick={() => setViewingActivity(act)}>
                                      View
                                    </BtButton>
                                  )}
                                  {isAdmin && (
                                    <BtButton variant="secondary" size="compact" icon={Pencil} onClick={() => openBudgetDialog(act)}>
                                      Budget
                                    </BtButton>
                                  )}
                                </div>
                              </BtCard>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <BtCard padding="0">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="bt-table" style={{ minWidth: 860 }}>
                      <thead>
                        <tr>
                          <th style={th}>Phase & activity</th>
                          <th style={th}>Status</th>
                          <th className="num" style={th}>Budget</th>
                          <th className="num" style={th}>Spent</th>
                          <th className="num" style={th}>Variance</th>
                          <th className="num" style={th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {phases.map((phase) => {
                          const phaseBud =
                            phase.activities?.reduce(
                              (sum, act) => sum + (act.budgetMaterial || 0) + (act.budgetLabour || 0) + (act.budgetEquipment || 0),
                              0
                            ) || 0;
                          const phaseSpent = phase.activities?.reduce((sum, act) => sum + _spentForActivity(act.id), 0) || 0;
                          const phaseVariance = phaseBud - phaseSpent;
                          const pTotal = phase.activities?.length || 0;
                          const pDone = phase.activities?.filter((a) => isActivityCompleted(a, phase, p)).length || 0;
                          const phaseCell = { background: 'var(--bone)', fontFamily: 'var(--font-display)', fontWeight: 700 };

                          return (
                            <React.Fragment key={phase.id}>
                              <tr>
                                <td style={phaseCell}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
                                    {phase.isCustom ? (
                                      <Sparkles size={16} color="var(--accent-ink)" style={{ flexShrink: 0 }} />
                                    ) : (
                                      <Layers size={16} color="var(--accent-ink)" style={{ flexShrink: 0 }} />
                                    )}
                                    <span>{phase.phaseName}</span>
                                  </div>
                                  <div style={{ width: 140, marginTop: 8 }}>
                                    <BtProgress value={pTotal ? pDone / pTotal : 0} height={4} />
                                  </div>
                                </td>
                                <td style={phaseCell}>
                                  <BtBadge
                                    label={`${pDone}/${pTotal} done`}
                                    tone={pDone === pTotal && pTotal > 0 ? 'success' : 'brand'}
                                  />
                                </td>
                                <td className="num" style={phaseCell}>{money(phaseBud)}</td>
                                <td className="num" style={phaseCell}>{money(phaseSpent)}</td>
                                <td
                                  className="num"
                                  style={{ ...phaseCell, color: phaseVariance < 0 ? 'var(--status-danger)' : 'var(--status-success)' }}
                                >
                                  {money(phaseVariance)}
                                </td>
                                <td style={phaseCell} />
                              </tr>

                              {phase.activities?.map((act) => {
                                const actBud = (act.budgetMaterial || 0) + (act.budgetLabour || 0) + (act.budgetEquipment || 0);
                                const spentForAct = _spentForActivity(act.id);
                                const actVariance = actBud - spentForAct;
                                const isC = _isC(act);
                                const dateLabel = _completedDateLabel(act);

                                return (
                                  <tr key={act.id}>
                                    <td style={{ paddingLeft: 24 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <button
                                          type="button"
                                          role="checkbox"
                                          aria-checked={isC}
                                          aria-label={`${isC ? 'Mark pending' : 'Mark done'}: ${act.name}`}
                                          onClick={() => handleToggleActivity(phase.id, act.id)}
                                          style={{
                                            width: 40,
                                            height: 40,
                                            margin: '-8px 0 -8px -8px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                          }}
                                        >
                                          <span
                                            style={{
                                              width: 22,
                                              height: 22,
                                              borderRadius: 7,
                                              border: `1.5px solid ${isC ? 'var(--status-success)' : 'var(--input-border)'}`,
                                              background: isC ? 'var(--status-success)' : 'var(--card)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              transition: 'all 120ms ease',
                                            }}
                                          >
                                            {isC && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                                          </span>
                                        </button>
                                        <div style={{ minWidth: 0 }}>
                                          <div
                                            style={{
                                              fontSize: 14,
                                              fontWeight: 500,
                                              color: isC ? 'var(--ink-2)' : 'var(--ink)',
                                              textDecoration: isC ? 'line-through' : 'none',
                                            }}
                                          >
                                            {act.name}
                                          </div>
                                          {isC && dateLabel && (
                                            <div style={{ fontSize: 13, color: 'var(--status-success)', fontWeight: 600, marginTop: 2 }}>
                                              Completed {dateLabel}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <BtBadge label={isC ? 'Done' : 'Pending'} tone={isC ? 'success' : 'warning'} />
                                    </td>
                                    <td className="num" style={{ color: 'var(--ink-2)' }}>{money(actBud)}</td>
                                    <td className="num" style={{ color: 'var(--ink-2)' }}>{money(spentForAct)}</td>
                                    <td
                                      className="num"
                                      style={{
                                        fontWeight: 600,
                                        color:
                                          actVariance < 0
                                            ? 'var(--status-danger)'
                                            : actVariance > 0
                                            ? 'var(--status-success)'
                                            : 'var(--ink-3)',
                                      }}
                                    >
                                      {money(actVariance)}
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                        <BtButton
                                          variant="secondary"
                                          size="compact"
                                          icon={Plus}
                                          onClick={() =>
                                            navigate('/add-entry', {
                                              state: { project: p, prefill: { phase: phase.phaseName, activity: act.name } },
                                            })
                                          }
                                        >
                                          Add
                                        </BtButton>
                                        {isC && (
                                          <BtButton variant="secondary" size="compact" icon={Eye} onClick={() => setViewingActivity(act)}>
                                            View
                                          </BtButton>
                                        )}
                                        {isAdmin && (
                                          <BtButton variant="secondary" size="compact" icon={Pencil} onClick={() => openBudgetDialog(act)}>
                                            Budget
                                          </BtButton>
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

          {/* ── TAB 2: FINANCIALS & CSV ── */}
          {activeTab === 'money' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                {sectionTitle('Financial overview', 'Budget, spend and cash inflow, with spreadsheet import and export.')}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <BtButton variant="secondary" size="small" icon={FileDown} onClick={handleExportCSV}>
                    Export entries
                  </BtButton>
                  <BtButton variant="secondary" size="small" icon={FileUp} onClick={handleImportCSV}>
                    Import entries
                  </BtButton>
                </div>
              </div>

              <div className="bt-grid-3">
                <BtCard padding="20px">
                  <div className="bt-eyebrow" style={eyebrow}>Total budget</div>
                  <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
                    {money(totalBudget)}
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <BtBricks value={util} height={8} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)', marginTop: 10 }}>
                    <span>Budget used</span>
                    <strong className="tnum" style={{ color: util >= 1 ? 'var(--status-danger)' : 'var(--ink)' }}>
                      {(util * 100).toFixed(0)}%
                    </strong>
                  </div>
                </BtCard>

                <BtCard padding="20px">
                  <div className="bt-eyebrow" style={eyebrow}>Total spent</div>
                  <div
                    className="tnum"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, marginTop: 6, color: overBudget ? 'var(--status-danger)' : 'var(--ink)' }}
                  >
                    {money(spent)}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 14 }}>
                    Remaining budget{' '}
                    <strong className="tnum" style={{ color: 'var(--status-success)' }}>{money(remaining)}</strong>
                  </div>
                </BtCard>

                <BtCard padding="20px">
                  <div className="bt-eyebrow" style={eyebrow}>Money in</div>
                  <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--status-success)', marginTop: 6 }}>
                    +{money(totalIncome)}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 14 }}>
                    Net cash flow{' '}
                    <strong className="tnum" style={{ color: totalIncome - spent < 0 ? 'var(--status-danger)' : 'var(--ink)' }}>
                      {money(totalIncome - spent)}
                    </strong>
                  </div>
                </BtCard>
              </div>

              {hasBrk && (
                <BtCard padding="20px">
                  <BtSectionHeader title="Category breakdown" caption />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Materials', value: bMat, color: 'var(--type-material)' },
                      { label: 'Labour', value: bLab, color: 'var(--type-labour)' },
                      { label: 'Equipment', value: bEq, color: 'var(--type-equipment)' },
                      { label: 'Miscellaneous', value: bMisc, color: 'var(--slate)' },
                    ]
                      .filter((c) => c.value > 0)
                      .map((c) => (
                        <div key={c.label} style={{ padding: '14px 16px', borderRadius: 'var(--r-input)', background: 'var(--fill)' }}>
                          <div className="bt-eyebrow" style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                            {c.label}
                          </div>
                          <div className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>
                            {money(c.value)}
                          </div>
                        </div>
                      ))}
                  </div>
                </BtCard>
              )}

              <CsvImportExportCard project={p} onProjectUpdated={setLocalProject} setToast={setToast} />
            </div>
          )}

          {/* ── TAB 3: SITE OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <BtCard padding="20px">
                <BtSectionHeader title="Timeline & status" caption />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <FactTile label="Start date">{p.startDate ? _fmtDate(new Date(p.startDate)) : '—'}</FactTile>
                  <FactTile label="Expected completion">
                    {p.expectedEndDate ? _fmtDate(new Date(p.expectedEndDate)) : p.endDate ? _fmtDate(new Date(p.endDate)) : '—'}
                  </FactTile>
                  <FactTile label="Current status">
                    <BtBadge label={st.label} tone={st.tone} />
                  </FactTile>
                </div>
              </BtCard>

              {hasPhoto && (
                <BtCard padding="20px">
                  <BtSectionHeader title="Site photo" caption />
                  <div style={{ borderRadius: 'var(--r-input)', overflow: 'hidden', maxHeight: 340 }}>
                    <img src={imgSrc} alt="Site preview" style={{ width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block' }} />
                  </div>
                </BtCard>
              )}

              {p.scope && (
                <BtCard padding="20px">
                  <BtSectionHeader title="Project scope" caption />
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {p.scope}
                  </div>
                </BtCard>
              )}

              {p.documents && p.documents.length > 0 && (
                <BtCard padding="20px">
                  <BtSectionHeader title={`Blueprints & documents (${p.documents.length})`} caption />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {p.documents.map((doc, idx) => {
                      const fileUrl = resolveImageUrl(doc);
                      const fileName = doc.split('/').pop() || `Document ${idx + 1}`;
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                      return (
                        <div key={idx} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-input)', overflow: 'hidden', background: 'var(--card)' }}>
                          <div style={{ height: 110, background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isImage ? (
                              <img src={fileUrl} alt={fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <FileText size={36} strokeWidth={1.6} color="var(--accent-ink)" />
                            )}
                          </div>
                          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                              {fileName}
                            </span>
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-ink)', textDecoration: 'none', padding: '8px 4px' }}
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

          {/* ── TAB 4: BUILDING SPECS ── */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <CollapsibleCard title="General project information" icon={ClipboardCheck} defaultOpen>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, paddingTop: 16 }}>
                  {p.projectCode && <Fact label="Project code">{p.projectCode}</Fact>}
                  {p.clientName && <Fact label="Client">{p.clientName}</Fact>}
                  {p.contractorName && <Fact label="Contractor">{p.contractorName}</Fact>}
                  {p.siteEngineer && <Fact label="Engineer">{p.siteEngineer}</Fact>}
                  {p.contactNumber && <Fact label="Contact">{p.contactNumber}</Fact>}
                  <Fact label="Location">{projectLoc}</Fact>
                </div>
              </CollapsibleCard>

              {(p.landArea || (p.floors && p.floors.length > 0)) && (
                <CollapsibleCard title="Land & floor configuration" icon={Layers} defaultOpen>
                  <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {p.landArea && (
                      <Fact label="Total land area">
                        {p.landArea} {p.landUnit || 'sq ft'}
                      </Fact>
                    )}
                    {p.floors && p.floors.length > 0 && (
                      <div>
                        <div className="bt-eyebrow" style={{ ...eyebrow, marginBottom: 8 }}>Floors included</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {p.floors.map((f, i) => (
                            <BtBadge key={i} label={f} tone="neutral" showDot={false} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleCard>
              )}

              {featureGroups.map((g) => (
                <CollapsibleCard key={g.title} title={g.title} icon={g.icon} count={g.items.length} defaultOpen>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 16 }}>
                    {g.items.map((item, i) => (
                      <Tag key={i}>{_getStr(item)}</Tag>
                    ))}
                  </div>
                </CollapsibleCard>
              ))}
            </div>
          )}

          {/* ── TAB 5: RECENT ACTIVITY ── */}
          {activeTab === 'entries' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <BtSectionHeader
                title={`Site activity log (${transactions.length})`}
                action="View all entries"
                onAction={() => navigate('/transaction')}
              />

              {loadingT && transactions.length === 0 ? (
                <BtCard padding="16px 20px" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <BtSkeleton width="40px" height="40px" />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <BtSkeleton width="50%" height="16px" borderRadius="6px" />
                        <BtSkeleton width="30%" height="13px" borderRadius="6px" />
                      </div>
                      <BtSkeleton width="72px" height="18px" borderRadius="6px" />
                    </div>
                  ))}
                </BtCard>
              ) : transactions.length === 0 ? (
                <BtCard padding="24px">
                  <BtEmpty
                    icon={Clock}
                    title="No logged transactions yet"
                    message="Expenses, labour logs and materials added for this project will be listed here."
                    actionLabel="Add First Entry"
                    onAction={() => navigate('/add-entry', { state: { project: p } })}
                  />
                </BtCard>
              ) : (
                <BtGroup>
                  {transactions.slice(0, 15).map((t, idx) => {
                    const amt = Number(t.amount || t.totalAmount || 0);
                    const open = () => navigate('/entry-detail', { state: { entry: t } });
                    return (
                      <BtRow
                        key={t._id || idx}
                        icon={<BtTypeTile type={t.type} size={40} />}
                        title={t.title || t.name || t.type || 'Entry'}
                        subtitle={`${t.category || t.type || ''} • ${_fmtDate(new Date(t.date || t.createdAt))}`}
                        amount={Math.abs(amt)}
                        amountColor={t.type === 'Income' ? 'var(--status-success)' : undefined}
                        tag={<BtBadge label={TYPE_LABEL[t.type] || t.type || 'Material'} tone={TYPE_TONE[t.type] || 'brand'} />}
                        onClick={open}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            open();
                          }
                        }}
                        className="bt-hover-row"
                      />
                    );
                  })}
                </BtGroup>
              )}
            </div>
          )}
        </div>
      </BtSheet>

      {/* ── BUDGET ALLOCATION DIALOG ── */}
      {budgetDialogActivity && (
        <ModalShell
          title="Allocate budget"
          subtitle={
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-2)' }}>
              Set budget for <strong style={{ color: 'var(--ink)' }}>{budgetDialogActivity.name}</strong> across categories.
            </span>
          }
          onClose={() => setBudgetDialogActivity(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveBudgetDialog();
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <BtField
              label="Materials budget"
              isCurrency
              type="number"
              min="0"
              inputMode="decimal"
              value={budgetForm.material}
              onChange={(e) => setBudgetForm((f) => ({ ...f, material: e.target.value }))}
            />
            <BtField
              label="Labour budget"
              isCurrency
              type="number"
              min="0"
              inputMode="decimal"
              value={budgetForm.labour}
              onChange={(e) => setBudgetForm((f) => ({ ...f, labour: e.target.value }))}
            />
            <BtField
              label="Equipment budget"
              isCurrency
              type="number"
              min="0"
              inputMode="decimal"
              value={budgetForm.equipment}
              onChange={(e) => setBudgetForm((f) => ({ ...f, equipment: e.target.value }))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 'var(--r-input)', background: 'var(--fill)' }}>
              <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>Activity total</span>
              <strong className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)' }}>
                {money(budgetFormTotal)}
              </strong>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <BtButton variant="secondary" onClick={() => setBudgetDialogActivity(null)} style={{ flex: '1 1 120px' }}>
                Cancel
              </BtButton>
              <BtButton type="submit" variant="primary" loading={savingBudget} style={{ flex: '2 1 180px' }}>
                Save budget
              </BtButton>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ── ACTIVITY DETAIL ── */}
      {viewingActivity && (
        <ActivityDetailSheet
          activity={viewingActivity}
          phaseName={phases.find((ph) => ph.activities?.some((a) => a.id === viewingActivity.id))?.phaseName || ''}
          onClose={() => setViewingActivity(null)}
        />
      )}
    </div>
  );
}

function ActivityDetailSheet({ activity, phaseName, onClose }) {
  const photos = activity.photos || (activity.photo ? [activity.photo] : []);
  const notes = activity.notes || '';

  const fmtDate = (d) => {
    if (!d) return 'Completed';
    const dt = new Date(d);
    if (dt.getFullYear() === 2000 && dt.getMonth() === 0 && dt.getDate() === 1) return 'Date not recorded';
    return `${dt.getDate()} ${_months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  return (
    <ModalShell
      title={activity.name}
      maxWidth={480}
      onClose={onClose}
      subtitle={phaseName ? <BtBadge label={phaseName} tone="neutral" showDot={false} /> : null}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Check size={18} color="var(--status-success)" strokeWidth={3} />
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--status-success)' }}>
          Completed on {fmtDate(activity.completedAt)}
        </span>
      </div>

      {notes && notes.trim() ? (
        <div style={{ marginBottom: 20 }}>
          <div className="bt-eyebrow" style={{ ...eyebrow, marginBottom: 8 }}>Notes & remarks</div>
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--fill)',
              borderRadius: 'var(--r-input)',
              fontSize: 14,
              color: 'var(--ink)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {notes}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 20, padding: '20px 16px', background: 'var(--fill)', borderRadius: 'var(--r-input)', textAlign: 'center' }}>
          <Info size={20} color="var(--ink-3)" style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>No additional notes recorded for this milestone.</div>
        </div>
      )}

      {photos.length > 0 && (
        <div>
          <div className="bt-eyebrow" style={{ ...eyebrow, marginBottom: 8 }}>Progress photos</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {photos.map((url, i) => (
              <div key={i} style={{ width: 80, height: 80, borderRadius: 'var(--r-input)', border: '1px solid var(--line)', overflow: 'hidden' }}>
                <img
                  src={resolveImageUrl(url)}
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
    </ModalShell>
  );
}
