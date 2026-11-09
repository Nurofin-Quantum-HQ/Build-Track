import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useProjectStore from '../stores/projectStore';
import perfLogger from '../utils/performanceLogger';
import { resolveImageUrl } from '../utils/imageUrl';
import {
  BtHero,
  BtSheet,
  BtPageHeader,
  BtButton,
  BtIconButton,
  BtCard,
  BtBadge,
  BtBricks,
  BtChip,
  BtField,
  formatInr,
  BtEmpty,
  BtErrorCard,
  BtSkeleton,
} from '../components/ui';
import {
  Plus,
  Building2,
  ChevronRight,
  Pencil,
  RefreshCw,
  HelpCircle,
  MapPin,
  Search,
} from 'lucide-react';
import ModuleTour from '../components/ModuleTour';
import { Toast, ConfirmDialog } from '../components/Toast';

const TABS = ['All Projects', 'Active', 'On Hold', 'Review Needed', 'Completed'];

// Labels deliberately match the filter tab names (Active, On Hold, …).
function getProjectStatus(raw) {
  const s = (raw || '').toLowerCase().replace(/[\s_]+/g, '');
  if (s === 'planning') return { label: 'Planning', tone: 'neutral' };
  if (s === 'onhold') return { label: 'On Hold', tone: 'warning' };
  if (s === 'completed') return { label: 'Completed', tone: 'success' };
  if (s === 'cancelled' || s === 'reviewneeded') return { label: 'Review Needed', tone: 'danger' };
  return { label: 'Active', tone: 'brand' };
}

// progress arrives either as a fraction (0–1) or as a percent (0–100); 1 means 1 %, not 100 %.
function progressPercent(p, spent, budget) {
  let raw = p.progress;
  if (raw === undefined || raw === null || raw === '') raw = budget > 0 ? Math.min(spent / budget, 1) * 100 : 0;
  raw = Number(raw) || 0;
  if (raw > 0 && raw < 1) raw *= 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function ProjectThumb({ photo }) {
  const src = photo ? resolveImageUrl(photo) : '';
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 'var(--r-tile)',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'var(--fill)',
        color: 'var(--ink-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <Building2 size={24} strokeWidth={1.75} />
      )}
    </div>
  );
}

function ProjectCard({ project: p, canEdit, onOpen, onEdit }) {
  const st = getProjectStatus(p.status);
  const name = p.projectName || p.name || 'Untitled project';
  const spent = Number(p.spentAmount || 0);
  const budget = Number(p.totalBudget || p.budget?.total || 0);
  const pct = progressPercent(p, spent, budget);

  return (
    <BtCard
      className="bt-hover-card"
      onClick={onOpen}
      role="link"
      tabIndex={0}
      aria-label={`Open ${name}`}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen();
        }
      }}
      padding="20px"
      style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <ProjectThumb photo={p.photo} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            title={name}
            style={{
              margin: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: 16,
              fontWeight: 600,
              lineHeight: 1.3,
              color: 'var(--ink)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              overflowWrap: 'anywhere',
            }}
          >
            {name}
          </h3>
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--ink-2)',
              minWidth: 0,
            }}
          >
            <MapPin size={13} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.location || 'Location not set'}
            </span>
          </div>
        </div>
        {canEdit && (
          <BtIconButton
            icon={Pencil}
            label={`Edit ${name}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          />
        )}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <BtBadge label={st.label} tone={st.tone} />
          <span className="tnum" style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
            {pct}%
          </span>
        </div>
        <BtBricks value={pct / 100} height={9} />
      </div>

      <div
        style={{
          paddingTop: 14,
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div className="tnum" style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-2)', minWidth: 0 }}>
          <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>{formatInr(spent, { compact: true })}</strong>
          {budget > 0 ? ` of ${formatInr(budget, { compact: true })}` : ' spent · no budget set'}
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink)',
            flexShrink: 0,
          }}
        >
          Open
          <ChevronRight size={16} />
        </span>
      </div>
    </BtCard>
  );
}

function ProjectSkeletonGrid() {
  return (
    <div className="bt-grid-3">
      {[0, 1, 2].map((i) => (
        <BtCard key={i} padding="20px" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <BtSkeleton width="56px" height="56px" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <BtSkeleton width="75%" height="18px" borderRadius="6px" />
              <BtSkeleton width="45%" height="14px" borderRadius="6px" />
            </div>
          </div>
          <BtSkeleton width="100%" height="24px" borderRadius="8px" />
          <BtSkeleton width="60%" height="16px" borderRadius="6px" />
        </BtCard>
      ))}
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
  const [refreshing, setRefreshing] = useState(false);

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
        if (force) setRefreshing(true);
        setError('');
        await storeFetchProjects({}, force);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || 'Unknown error';
        setError(`Failed to load projects: ${msg}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
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
      if (activeTab === 'Active') return st === 'Active' || st === 'Planning';
      if (activeTab === 'On Hold') return st === 'On Hold';
      if (activeTab === 'Review Needed') return st === 'Review Needed';
      if (activeTab === 'Completed') return st === 'Completed';
      return true;
    });
  }, [allProjects, search, activeTab]);

  const counts = useMemo(() => {
    const labelOf = (p) => getProjectStatus(p.status).label;
    return {
      'All Projects': allProjects.length,
      Active: allProjects.filter((p) => ['Active', 'Planning'].includes(labelOf(p))).length,
      'On Hold': allProjects.filter((p) => labelOf(p) === 'On Hold').length,
      'Review Needed': allProjects.filter((p) => labelOf(p) === 'Review Needed').length,
      Completed: allProjects.filter((p) => labelOf(p) === 'Completed').length,
    };
  }, [allProjects]);

  const openProject = (p) => navigate('/managesite', { state: { project: p } });
  const editProject = (p) => navigate('/newproject', { state: { project: p } });

  const showSkeleton = loading && allProjects.length === 0;

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

      <BtHero>
        <div className="tour-header">
          <BtPageHeader
            eyebrow="Sites & phases"
            title="Projects"
            subtitle={
              showSkeleton
                ? 'Loading your sites…'
                : `${allProjects.length} ${allProjects.length === 1 ? 'project' : 'projects'} across your sites.`
            }
            actions={
              <>
                <BtIconButton icon={HelpCircle} label="Page tour" onDark onClick={() => setRunTour(true)} />
                {canCreate && (
                  <span className="tour-create-project">
                    <BtButton variant="accent" size="small" icon={Plus} onClick={() => navigate('/newproject')}>
                      New Project
                    </BtButton>
                  </span>
                )}
              </>
            }
          />
        </div>
      </BtHero>

      <BtSheet>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Filters + search + refresh */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div className="tour-tabs" role="tablist" aria-label="Filter by status" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TABS.map((tab) => (
                <BtChip
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  label={
                    <>
                      {tab}
                      <span className="tnum" style={{ marginLeft: 6, opacity: 0.7, fontWeight: 600 }}>
                        {counts[tab]}
                      </span>
                    </>
                  }
                />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px', maxWidth: 420, minWidth: 0 }}>
              <div className="tour-search" style={{ flex: 1, minWidth: 0 }}>
                <BtField
                  size="compact"
                  icon={Search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, location, code…"
                  aria-label="Search projects"
                />
              </div>
              <BtIconButton
                icon={RefreshCw}
                label="Refresh projects"
                onClick={() => fetchProjects(true)}
                disabled={refreshing}
                style={{ height: 40, width: 40 }}
              />
            </div>
          </div>

          {error && <BtErrorCard title="Couldn't load projects" message={error} onRetry={() => fetchProjects(true)} />}

          {showSkeleton ? (
            <ProjectSkeletonGrid />
          ) : filtered.length === 0 && !error ? (
            <BtCard padding="24px">
              <BtEmpty
                icon={Building2}
                title="No projects found"
                message={
                  allProjects.length === 0
                    ? 'No projects created yet. Create your first build site to start tracking costs.'
                    : 'No projects match your current search or filter.'
                }
                actionLabel={allProjects.length === 0 && canCreate ? 'New Project' : undefined}
                onAction={allProjects.length === 0 && canCreate ? () => navigate('/newproject') : undefined}
              />
            </BtCard>
          ) : (
            <div className="tour-project-list bt-grid-3" style={{ alignItems: 'stretch' }}>
              {filtered.map((p) => (
                <ProjectCard
                  key={p._id || p.id}
                  project={p}
                  canEdit={canEdit}
                  onOpen={() => openProject(p)}
                  onEdit={() => editProject(p)}
                />
              ))}
            </div>
          )}
        </div>
      </BtSheet>
    </div>
  );
}
