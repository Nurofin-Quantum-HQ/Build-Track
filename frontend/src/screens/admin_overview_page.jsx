import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, projectAPI, transactionAPI } from '../api';
import {
  Users,
  User,
  ClipboardList,
  Building2,
  HelpCircle,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Layers,
} from 'lucide-react';
import ModuleTour from '../components/ModuleTour';
import BtHero, { BtGlassTile } from '../components/ui/BtHero';
import BtSheet from '../components/ui/BtSheet';
import BtCard from '../components/ui/BtCard';
import BtBadge from '../components/ui/BtBadge';
import BtButton from '../components/ui/BtButton';
import BtPressable from '../components/ui/BtPressable';
import BtSegmented from '../components/ui/BtSegmented';
import BtEmpty from '../components/ui/BtEmpty';

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
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

  const tourSteps = [
    { target: '.tour-header', content: 'Overview of your team, projects, and entries.', disableBeacon: true },
    { target: '.tour-stats', content: 'Quick summary of key operational metrics.' },
    { target: '.tour-tabs', content: 'Switch between team members, recent entries, and projects.' },
  ];

  const fetchAll = useCallback(async () => {
    setError(null);
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

  const stats = {
    totalUsers: users.length,
    activeProjects: projects.filter((p) => (p.status || '').toLowerCase() === 'active').length,
    totalEntries: allEntries.length,
    recentEntries: allEntries.length,
  };

  const segmentedTabs = [
    { label: `Team (${users.length})`, value: 'team' },
    { label: `Recent Entries (${allEntries.length})`, value: 'entries' },
    { label: `Projects (${projects.length})`, value: 'projects' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AdminDashboard" />

      {/* ── TOP HERO (Deep Noir with blueprint grid & glow) ── */}
      <BtHero padding="24px 32px 48px">
        <div
          className="tour-header"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 24,
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
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Control Center
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--bone)',
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              Admin Overview
            </h1>
            <p style={{ fontSize: 13, color: 'var(--on-noir-2)', margin: '4px 0 0' }}>
              Workforce distribution, active project statuses, and activity audit trail
            </p>
          </div>

          {/* Quick Actions on Dark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setRunTour(true)}
              title="Help Tour"
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--r-btn, 12px)',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--bone)',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <HelpCircle size={17} />
            </button>

            <button
              onClick={() => navigate('/assign-role')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                height: 38,
                padding: '0 14px',
                borderRadius: 'var(--r-btn, 12px)',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--bone)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ShieldCheck size={15} />
              <span>Assign Roles</span>
            </button>

            <button
              onClick={() => navigate('/newproject')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                height: 38,
                padding: '0 16px',
                borderRadius: 'var(--r-btn, 12px)',
                background: '#FFFFFF',
                border: 'none',
                color: 'var(--ink)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <Plus size={15} />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* 4 Glass KPI Tiles on Noir */}
        <div
          className="tour-stats"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <BtGlassTile
            label="Team Members"
            value={stats.totalUsers}
            icon={Users}
            onClick={() => setTab('team')}
          />
          <BtGlassTile
            label="Active Projects"
            value={stats.activeProjects}
            icon={Building2}
            onClick={() => setTab('projects')}
          />
          <BtGlassTile
            label="Total Entries"
            value={stats.totalEntries}
            icon={ClipboardList}
            onClick={() => setTab('entries')}
          />
          <BtGlassTile
            label="Recent Activity"
            value={stats.recentEntries}
            icon={Layers}
            onClick={() => setTab('entries')}
          />
        </div>
      </BtHero>

      {/* ── MAIN CONTENT (Overlapping BtSheet) ── */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        {/* Navigation Tabs */}
        <div className="tour-tabs" style={{ marginBottom: 24 }}>
          <BtSegmented
            options={segmentedTabs}
            value={tab}
            onChange={(val) => setTab(val)}
          />
        </div>

        {error && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--r-card)',
              background: '#FEE2E2',
              color: '#991B1B',
              fontSize: 14,
              marginBottom: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{error}</span>
            <button
              onClick={fetchAll}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#991B1B',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab 1: TEAM MEMBERS */}
        {tab === 'team' && (
          <div>
            {loadingUsers ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 80,
                      borderRadius: 'var(--r-card)',
                      background: 'var(--fill)',
                    }}
                  />
                ))}
              </div>
            ) : users.length === 0 ? (
              <BtEmpty
                title="No team members yet"
                message="Invite team members and assign roles to give them access to projects."
                actionLabel="Assign Role"
                onAction={() => navigate('/assign-role')}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {users.map((member) => {
                  const roleName = member.role || 'Member';
                  const roleTone =
                    roleName.toLowerCase() === 'admin'
                      ? 'accent'
                      : roleName.toLowerCase() === 'supervisor'
                        ? 'info'
                        : roleName.toLowerCase() === 'mason'
                          ? 'warn'
                          : 'muted';

                  return (
                    <BtCard
                      key={member._id || member.id}
                      padding="16px 20px"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 14,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: 'var(--fill)',
                            border: '1px solid var(--line)',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 16,
                            fontWeight: 700,
                            color: 'var(--ink)',
                          }}
                        >
                          {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                              {member.name || 'Unnamed User'}
                            </span>
                            <BtBadge tone={roleTone}>{roleName}</BtBadge>
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                            {member.email || 'No email'} · Joined {formatDate(member.createdAt)}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate('/assign-role', { state: { user: member } })}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 14px',
                          borderRadius: 'var(--r-btn, 12px)',
                          background: '#FFFFFF',
                          border: '1px solid var(--line)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: 'var(--ink)',
                          cursor: 'pointer',
                        }}
                      >
                        <span>Edit Role</span>
                        <ArrowRight size={13} />
                      </button>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 80,
                      borderRadius: 'var(--r-card)',
                      background: 'var(--fill)',
                    }}
                  />
                ))}
              </div>
            ) : allEntries.length === 0 ? (
              <BtEmpty
                title="No recent entries recorded"
                message="Transactions and daily material/labour updates will show up here."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {allEntries.map((entry) => {
                  const id = entry._id || entry.id;
                  const type = entry.type || 'material';
                  const typeTone =
                    type === 'material' ? 'info' : type === 'labour' ? 'warn' : 'good';

                  return (
                    <BtCard
                      key={id}
                      padding="16px 20px"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 14,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <BtBadge tone={typeTone}>{type.toUpperCase()}</BtBadge>
                          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                            {formatDate(entry.date || entry.createdAt)}
                          </span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                          {entry.description || 'Expense Entry'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 18,
                            fontWeight: 700,
                            color: 'var(--ink)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatCurrency(entry.amount)}
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                          {entry.paymentStatus || 'Pending'}
                        </span>
                      </div>
                    </BtCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: PROJECTS */}
        {tab === 'projects' && (
          <div>
            {loadingProjects ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 80,
                      borderRadius: 'var(--r-card)',
                      background: 'var(--fill)',
                    }}
                  />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <BtEmpty
                title="No projects configured"
                message="Start by creating your first construction project."
                actionLabel="Create Project"
                onAction={() => navigate('/newproject')}
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 16,
                }}
              >
                {projects.map((proj) => {
                  const id = proj._id || proj.id;
                  const status = proj.status || 'Active';
                  const isAct = status.toLowerCase() === 'active';

                  return (
                    <BtCard
                      key={id}
                      padding="20px"
                      onClick={() => navigate('/managesite', { state: { project: proj } })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                            {proj.projectName || proj.name}
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                            {[proj.code, proj.location, proj.clientName].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        <BtBadge tone={isAct ? 'good' : 'muted'}>{status}</BtBadge>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid var(--line)',
                          paddingTop: 12,
                          marginTop: 12,
                          fontSize: 13,
                        }}
                      >
                        <span style={{ color: 'var(--ink-soft)' }}>Budget:</span>
                        <b style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(proj.budget?.total || proj.totalBudget || 0)}
                        </b>
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
