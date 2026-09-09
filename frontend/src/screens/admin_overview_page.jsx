import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, radius } from '../styles/designTokens';
import { Card, Badge, Button, Spinner, EmptyState, ErrorState, SkeletonCard } from '../components/ui';
import { authAPI, projectAPI, transactionAPI } from '../api';
import { Users, User, ClipboardList, Building2, HelpCircle } from 'lucide-react';
import ModuleTour from '../components/ModuleTour';

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('team');
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
    { target: '.tour-stats', content: 'Quick summary of key metrics.' },
    { target: '.tour-tabs', content: 'Switch between team members, recent entries, and projects.' }
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
        setError('Failed to load data. Please try again.');
      }
    } catch (err) {
      setError(err.friendlyMessage || 'An error occurred');
      setLoadingUsers(false);
      setLoadingProjects(false);
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const stats = {
    totalUsers: users.length,
    activeProjects: projects.filter((p) => (p.status || '').toLowerCase() === 'active').length,
    recentEntries: allEntries.length,
    totalEntries: allEntries.length,
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1000, margin: '0 auto' }}>
      <ModuleTour steps={tourSteps} run={runTour} setRun={setRunTour} moduleName="AdminDashboard" />
      <div className="tour-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary, margin: 0 }}>
          Admin Overview
        </h2>
        <button onClick={() => setRunTour(true)} title="Help" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
          <HelpCircle size={16} color={colors.textLight} />
        </button>
      </div>

      <div className="tour-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Team Members', value: stats.totalUsers, color: colors.primaryBlue, bg: '#FFF5F0' },
          { label: 'Active Projects', value: stats.activeProjects, color: colors.success, bg: '#E6F9F0' },
          { label: 'Total Entries', value: stats.totalEntries, color: '#EA580C', bg: '#FFF5F0' },
          { label: 'Recent (50)', value: stats.recentEntries, color: colors.warning, bg: '#FFF4E0' },
        ].map((stat) => (
          <Card key={stat.label} padding="20px">
            <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: stat.color }}>{stat.value}</div>
          </Card>
        ))}
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: radius.sm,
          background: '#FEE2E2', color: '#991B1B',
          fontSize: 14, marginBottom: 16, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{error}</span>
          <button onClick={fetchAll} style={{
            border: 'none', background: 'transparent',
            color: '#991B1B', fontWeight: 600, cursor: 'pointer',
            textDecoration: 'underline',
          }}>Retry</button>
        </div>
      )}

      <div className="tour-tabs" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'team', label: 'Team', count: users.length },
          { id: 'entries', label: 'Recent Entries', count: allEntries.length },
          { id: 'projects', label: 'Projects', count: projects.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 18px',
              borderRadius: radius.sm,
              border: tab === t.id ? 'none' : `1px solid ${colors.cardBorder}`,
              background: tab === t.id ? colors.primaryBlue : colors.cardBg,
              color: tab === t.id ? '#FFF' : colors.textSecondary,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t.label}
            <span style={{
              background: tab === t.id ? 'rgba(255,255,255,0.2)' : colors.iconBg,
              padding: '1px 8px',
              borderRadius: 10,
              fontSize: 12,
            }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === 'team' && (
        loadingUsers ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={<Users size={48} />} title="No Team Members" description="Invite team members to get started." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map((user) => (
              <Card key={user._id || user.id} padding="14px 18px" hoverable
                onClick={() => navigate('/assign-role', { state: { user } })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: colors.iconBg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0,
                  }}>
                    {user.profilePhoto ? (
                      <img src={user.profilePhoto} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : <User size={16} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
                      {user.name || user.email || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>{user.email}</div>
                  </div>
                  <Badge variant={user.role === 'admin' ? 'info' : user.role === 'supervisor' ? 'success' : 'neutral'}>
                    {user.role || 'user'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'entries' && (
        loadingEntries ? (
          <Spinner style={{ padding: 40 }} />
        ) : allEntries.length === 0 ? (
          <EmptyState icon={<ClipboardList size={48} />} title="No Entries" description="No entries have been created yet." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allEntries.slice(0, 20).map((entry) => (
              <Card key={entry._id || entry.id} padding="14px 18px" hoverable
                onClick={() => navigate('/entry-detail', { state: { entry } })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
                      {entry.title || entry.name || 'Entry'}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>
                      {entry.projectName || entry.project || '—'} · {entry.type || 'N/A'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: colors.textPrimary }}>
                      {formatCurrency(entry.amount || entry.totalAmount || 0)}
                    </div>
                    <Badge variant={entry.paymentStatus === 'Paid' ? 'success' : 'pending'} style={{ fontSize: 10 }}>
                      {entry.paymentStatus || 'Pending'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'projects' && (
        loadingProjects ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState icon={<Building2 size={48} />} title="No Projects" description="Create a project to get started." action={
            <Button onClick={() => navigate('/newproject')}>+ New Project</Button>
          } />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((project) => (
              <Card key={project._id || project.id} padding="14px 18px" hoverable
                onClick={() => navigate('/managesite', { state: { project } })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
                      {project.projectName || project.name}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textSecondary }}>
                      {project.location || ''} {project.manager ? `· ${project.manager}` : ''}
                    </div>
                  </div>
                  <Badge variant={
                    project.status === 'Active' ? 'success' :
                    project.status === 'Completed' ? 'info' :
                    project.status === 'On Hold' ? 'warning' : 'neutral'
                  }>
                    {project.status || 'Active'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}