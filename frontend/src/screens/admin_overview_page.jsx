import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, projectAPI, transactionAPI } from '../api';
import {
  Users,
  ClipboardList,
  Building2,
  HelpCircle,
  Plus,
  ArrowRight,
  ShieldCheck,
  Activity,
  FolderOpen,
  Receipt,
} from 'lucide-react';
import ModuleTour from '../components/ModuleTour';
import BtHero, { BtGlassTile } from '../components/ui/BtHero';
import BtPageHeader from '../components/ui/BtPageHeader';
import BtSheet from '../components/ui/BtSheet';
import BtCard from '../components/ui/BtCard';
import BtBadge from '../components/ui/BtBadge';
import BtButton from '../components/ui/BtButton';
import BtIconButton from '../components/ui/BtIconButton';
import BtSegmented from '../components/ui/BtSegmented';
import BtChip from '../components/ui/BtChip';
import BtEmpty, { BtErrorCard } from '../components/ui/BtEmpty';
import BtSkeleton from '../components/ui/BtSkeleton';
import { formatInr } from '../components/ui/BtCountUp';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const TYPE_META = {
  material: { tone: 'material', label: 'Material' },
  materials: { tone: 'material', label: 'Material' },
  labour: { tone: 'labour', label: 'Labour' },
  wages: { tone: 'labour', label: 'Labour' },
  equipment: { tone: 'equipment', label: 'Equipment' },
  expense: { tone: 'equipment', label: 'Equipment' },
  income: { tone: 'income', label: 'Income' },
};

function typeMeta(type) {
  const key = String(type || '').toLowerCase();
  return TYPE_META[key] || { tone: 'neutral', label: type ? String(type).charAt(0).toUpperCase() + String(type).slice(1) : 'Entry' };
}

function roleTone(roleName = '') {
  const r = roleName.toLowerCase();
  if (r === 'admin') return 'brand';
  if (r === 'supervisor') return 'material';
  if (r === 'mason') return 'labour';
  return 'neutral';
}

function paymentTone(status = '') {
  const s = String(status).toLowerCase();
  if (s === 'paid') return 'success';
  if (s === 'partial' || s === 'partially paid') return 'warning';
  return 'neutral';
}

function ListSkeleton({ height = 80 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <BtSkeleton key={i} height={`${height}px`} borderRadius="var(--r-card)" />
      ))}
    </div>
  );
}

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('team'); // 'team' | 'entries' | 'projects'
  const [users, setUsers] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState(null);
  const [runTour, setRunTour] = useState(false);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 560);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 560);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const tourSteps = [
    { target: '.tour-header', content: 'Overview of your team, projects, and entries.', disableBeacon: true },
    { target: '.tour-stats', content: 'Quick summary of key operational metrics.' },
    { target: '.tour-tabs', content: 'Switch between team members, recent entries, and projects.' },
  ];

  const fetchAll = useCallback(async () => {
    setError(null);
    setLoadingUsers(true);
    setLoadingProjects(true);
    setLoadingEntries(true);
    try {
      const [userRes, projRes, txRes] = await Promise.allSettled([
        authAPI.getUsers(),
        projectAPI.getAll(),
        transactionAPI.getAll({ limit: 50 }),
      ]);

      if (userRes.status === 'fulfilled') {
        const data = userRes.value.data?.users || userRes.value.data || [];
        setUsers(Array.isArray(data) ? data : []);
      }
      setLoadingUsers(false);

      if (projRes.status === 'fulfilled') {
        const data = projRes.value.data?.projects || projRes.value.data || [];
        setProjects(Array.isArray(data) ? data : []);
      }
      setLoadingProjects(false);

      if (txRes.status === 'fulfilled') {
        const data = txRes.value.data?.transactions || txRes.value.data || [];
        setAllEntries(Array.isArray(data) ? data : []);
      }
      setLoadingEntries(false);

      if (userRes.status === 'rejected' && projRes.status === 'rejected') {
        setError('Failed to load administrative overview. Please check network connection.');
      }
    } catch (err) {
      setError(err.friendlyMessage || 'An unexpected error occurred');
      setLoadingUsers(false);
      setLoadingProjects(false);
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const stats = {
    totalUsers: users.length,
    activeProjects: projects.filter((p) => (p.status || '').toLowerCase() === 'active').length,
    totalEntries: allEntries.length,
    lastWeek: allEntries.filter((e) => {
      const t = new Date(e.date || e.createdAt).getTime();
      return Number.isFinite(t) && t >= weekAgo;
    }).length,
  };

  const segmentedTabs = [
    { label: `Team (${users.length})`, value: 'team', icon: Users },
    { label: `Recent Entries (${allEntries.length})`, value: 'entries', icon: Receipt },
    { label: `Projects (${projects.length})`, value: 'projects', icon: Building2 },
  ];

  const tileProps = (target) => ({
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTab(target); } },
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AdminDashboard" />

      {/* ── HERO ── */}
      <BtHero>
        <div className="tour-header">
          <BtPageHeader
            eyebrow="Control center"
            title="Admin Overview"
            subtitle="Your team, active projects and the latest entries at a glance."
            actions={
              <>
                <BtIconButton onDark icon={HelpCircle} label="Page tour" onClick={() => setRunTour(true)} />
                <BtButton variant="onDark" size="small" icon={ShieldCheck} onClick={() => navigate('/assign-role')}>
                  Assign Roles
                </BtButton>
                <BtButton variant="accent" size="small" icon={Plus} onClick={() => navigate('/newproject')}>
                  New Project
                </BtButton>
              </>
            }
          >
            <div className="tour-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <BtGlassTile label="Team members" value={stats.totalUsers} icon={Users} onClick={() => setTab('team')} {...tileProps('team')} />
              <BtGlassTile label="Active projects" value={stats.activeProjects} icon={Building2} onClick={() => setTab('projects')} {...tileProps('projects')} />
              <BtGlassTile label="Recent entries" value={stats.totalEntries} icon={ClipboardList} onClick={() => setTab('entries')} {...tileProps('entries')} />
              <BtGlassTile label="Last 7 days" value={stats.lastWeek} icon={Activity} onClick={() => setTab('entries')} {...tileProps('entries')} />
            </div>
          </BtPageHeader>
        </div>
      </BtHero>

      {/* ── SHEET ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        <div className="tour-tabs" style={{ marginBottom: 24 }}>
          {narrow ? (
            <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {segmentedTabs.map((t) => (
                <BtChip
                  key={t.value}
                  label={t.label}
                  selected={tab === t.value}
                  role="tab"
                  aria-selected={tab === t.value}
                  onClick={() => setTab(t.value)}
                  style={{ height: 40 }}
                />
              ))}
            </div>
          ) : (
            <BtSegmented options={segmentedTabs} value={tab} onChange={(val) => setTab(val)} />
          )}
        </div>

        {error && (
          <BtErrorCard title="Couldn't load the overview" message={error} onRetry={fetchAll} style={{ marginBottom: 20 }} />
        )}

        {/* Tab 1: TEAM */}
        {tab === 'team' && (
          <div>
            {loadingUsers ? (
              <ListSkeleton />
            ) : users.length === 0 ? (
              <BtCard padding={0}>
                <BtEmpty
                  icon={Users}
                  title="No team members yet"
                  message="Add team members and assign roles to give them access to projects."
                  actionLabel="Assign Role"
                  onAction={() => navigate('/assign-role')}
                />
              </BtCard>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {users.map((member) => {
                  const roleName = member.role || 'Member';
                  return (
                    <BtCard
                      key={member._id || member.id}
                      padding="16px 20px"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: '1 1 260px' }}>
                        <div
                          aria-hidden="true"
                          style={{
                            width: 44, height: 44, borderRadius: '50%', background: 'var(--fill)', border: '1px solid var(--line)',
                            display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700,
                            color: 'var(--ink)', flexShrink: 0,
                          }}
                        >
                          {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                              {member.name || 'Unnamed User'}
                            </span>
                            <BtBadge tone={roleTone(roleName)} label={roleName} showDot={false} />
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3, overflowWrap: 'anywhere' }}>
                            {member.email || 'No email'} · Joined {formatDate(member.createdAt)}
                          </div>
                        </div>
                      </div>

                      <BtButton
                        variant="secondary"
                        size="small"
                        trailingIcon={ArrowRight}
                        onClick={() => navigate('/assign-role', { state: { user: member } })}
                      >
                        Edit Role
                      </BtButton>
                    </BtCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: RECENT ENTRIES */}
        {tab === 'entries' && (
          <div>
            {loadingEntries ? (
              <ListSkeleton height={64} />
            ) : allEntries.length === 0 ? (
              <BtCard padding={0}>
                <BtEmpty
                  icon={Receipt}
                  title="No entries recorded yet"
                  message="Material, labour and equipment entries will show up here as your team logs them."
                />
              </BtCard>
            ) : (
              <BtCard padding={0} style={{ overflowX: 'auto' }}>
                <table className="bt-table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Entry</th>
                      <th>Payment</th>
                      <th className="num" style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allEntries.map((entry) => {
                      const id = entry._id || entry.id;
                      const meta = typeMeta(entry.type);
                      const pay = entry.paymentStatus || 'Pending';
                      return (
                        <tr key={id}>
                          <td style={{ whiteSpace: 'nowrap', color: 'var(--ink-2)' }}>{formatDate(entry.date || entry.createdAt)}</td>
                          <td><BtBadge tone={meta.tone} label={meta.label} showDot={false} /></td>
                          <td style={{ fontWeight: 600, maxWidth: 320, overflowWrap: 'anywhere' }}>
                            {entry.title || entry.description || 'Expense Entry'}
                          </td>
                          <td><BtBadge tone={paymentTone(pay)} label={pay} /></td>
                          <td className="num tnum" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatInr(entry.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </BtCard>
            )}
          </div>
        )}

        {/* Tab 3: PROJECTS */}
        {tab === 'projects' && (
          <div>
            {loadingProjects ? (
              <ListSkeleton height={120} />
            ) : projects.length === 0 ? (
              <BtCard padding={0}>
                <BtEmpty
                  icon={FolderOpen}
                  title="No projects yet"
                  message="Start by creating your first construction project."
                  actionLabel="Create Project"
                  onAction={() => navigate('/newproject')}
                />
              </BtCard>
            ) : (
              <div className="bt-grid-3">
                {projects.map((proj) => {
                  const id = proj._id || proj.id;
                  const status = proj.status || 'Active';
                  const isAct = status.toLowerCase() === 'active';
                  const open = () => navigate('/managesite', { state: { project: proj } });

                  return (
                    <BtCard
                      key={id}
                      padding="20px"
                      className="bt-hover-card"
                      onClick={open}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                      aria-label={`Open ${proj.projectName || proj.name}`}
                      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', overflowWrap: 'anywhere' }}>
                            {proj.projectName || proj.name}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3, overflowWrap: 'anywhere' }}>
                            {[proj.code, proj.location, proj.clientName].filter(Boolean).join(' · ') || 'No details added'}
                          </div>
                        </div>
                        <BtBadge tone={isAct ? 'success' : 'neutral'} label={status} />
                      </div>

                      <div
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                          borderTop: '1px solid var(--line)', paddingTop: 12,
                        }}
                      >
                        <span className="bt-eyebrow" style={{ color: 'var(--ink-3)' }}>Budget</span>
                        <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                          {formatInr(proj.budget?.total || proj.totalBudget || 0, { compact: true })}
                        </span>
                      </div>
                    </BtCard>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </BtSheet>
    </div>
  );
}
