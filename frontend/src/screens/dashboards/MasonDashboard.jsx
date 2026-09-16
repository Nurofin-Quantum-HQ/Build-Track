import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Badge, Button, SkeletonCard } from '../../components/ui';
import { taskAPI, transactionAPI } from '../../api';
import { Clock, PlusCircle, CheckCircle, Package, Briefcase, Edit2 } from 'lucide-react';
import { colors, gradients } from '../../styles/designTokens';

export default function MasonDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [taskRes, entryRes] = await Promise.all([
          taskAPI.getDaily().catch(() => ({ data: [] })),
          transactionAPI.getMine({ limit: 5 }).catch(() => ({ data: [] }))
        ]);
        const tData = taskRes.data?.data || taskRes.data?.tasks || taskRes.data;
        setTasks(Array.isArray(tData) ? tData : []);

        const entriesData = entryRes.data?.data || entryRes.data?.transactions || entryRes.data;
        setEntries(Array.isArray(entriesData) ? entriesData : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    } catch (e) {
      alert('Failed to update task status');
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Completed') return '#10B981'; // success
    if (status === 'In Progress') return '#3B82F6'; // info
    return '#F59E0B'; // warning
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: colors.textSecondary }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
        <div style={{ fontSize: 16, fontWeight: 600 }}>Loading Dashboard...</div>
      </div>
    );
  }

  const firstName = user?.name ? user.name.split(' ')[0] : 'Mason';

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeUp 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}>

      <div style={{
        background: gradients.primaryGradient,
        padding: 24,
        borderRadius: 16,
        color: '#fff',
        boxShadow: '0 10px 25px rgba(249,115,22,0.2)'
      }}>
        <h1 style={{ fontSize: 28, margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Good Morning, {firstName} 👋
        </h1>
        <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 15 }}>
          Ready for today's work? View your tasks and log updates below.
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Button
          variant="primary"
          size="lg"
          icon={<PlusCircle size={20} />}
          style={{ width: '100%', height: 60, fontSize: 16 }}
          onClick={() => navigate('/update-progress')}
        >
          Add Daily Update
        </Button>
        <Button
          variant="outline"
          size="lg"
          icon={<Package size={20} />}
          style={{ width: '100%', height: 60, fontSize: 16 }}
          onClick={() => navigate('/manualentry?type=material')}
        >
          Add Material Entry
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Assigned Tasks */}
        <Card padding={24}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Briefcase size={20} color={colors.primary} />
            <h3 style={{ margin: 0, fontSize: 18, color: colors.textPrimary }}>Assigned Tasks</h3>
          </div>

          {tasks.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: colors.textSecondary, background: colors.background, borderRadius: 12 }}>
              No specific tasks assigned for today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tasks.map(t => (
                <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: colors.textPrimary }}>{t.title}</div>
                    {t.description && <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>{t.description}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select
                      value={t.status || 'Pending'}
                      onChange={(e) => handleTaskStatusChange(t._id, e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: `1px solid ${getStatusColor(t.status || 'Pending')}`,
                        backgroundColor: `${getStatusColor(t.status || 'Pending')}15`,
                        color: getStatusColor(t.status || 'Pending'),
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        outline: 'none',
                        appearance: 'none',
                        textAlign: 'center'
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                    <button 
                      onClick={() => navigate('/update-progress', { state: { taskId: t._id, projectId: t.project } })}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: '50%',
                        background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer',
                        color: colors.primary
                      }}
                      title="Update Progress"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* My Recent Entries */}
        <Card padding={24}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Clock size={20} color={colors.primary} />
            <h3 style={{ margin: 0, fontSize: 18, color: colors.textPrimary }}>My Recent Entries</h3>
          </div>

          {entries.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: colors.textSecondary, background: colors.background, borderRadius: 12 }}>
              You haven't logged any entries yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {entries.map(e => {
                const status = (e.approvalStatus || 'Pending').toLowerCase();
                let badgeVariant = 'warning';
                if (status === 'approved') badgeVariant = 'success';
                if (status === 'rejected') badgeVariant = 'danger';

                return (
                  <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, border: `1px solid ${colors.border}`, borderRadius: 12, cursor: 'pointer' }} onClick={() => navigate('/entry-detail', { state: { entry: e } })}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: colors.textPrimary }}>{e.title || 'Entry'}</div>
                      <div style={{ fontSize: 13, color: colors.textSecondary }}>Amount: ₹{e.amount}</div>
                    </div>
                    <Badge variant={badgeVariant}>
                      {e.approvalStatus || 'Pending'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
          <Button variant="outline" style={{ width: '100%', marginTop: 16 }} onClick={() => navigate('/transaction')}>
            View All Logs
          </Button>
        </Card>
      </div>

    </div>
  );
}
