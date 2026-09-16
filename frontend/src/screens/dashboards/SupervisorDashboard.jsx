import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, SkeletonCard } from '../../components/ui';
import { approvalAPI, taskAPI, projectAPI, transactionAPI } from '../../api';
import { Users, Clock, AlertTriangle, AlertCircle, CheckCircle, RefreshCw, XCircle, Search, Calendar, FileText, Check, ChevronRight, CheckSquare, Settings, Briefcase, PlusCircle, UserCheck, Shield, Edit2 } from 'lucide-react';
import { colors, typography } from '../../styles/designTokens';

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Pending');
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  const extractArray = (res) => {
    if (!res || !res.data) return [];
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data.data)) return res.data.data;
    if (Array.isArray(res.data.transactions)) return res.data.transactions;
    if (res.data.data && Array.isArray(res.data.data.transactions)) return res.data.data.transactions;
    if (Array.isArray(res.data.history)) return res.data.history;
    if (res.data.data && Array.isArray(res.data.data.history)) return res.data.data.history;
    if (Array.isArray(res.data.tasks)) return res.data.tasks;
    if (res.data.data && Array.isArray(res.data.data.tasks)) return res.data.data.tasks;
    return [];
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendRes, histRes, taskRes, projRes] = await Promise.all([
        approvalAPI.getPending().catch(() => ({ data: [] })),
        approvalAPI.getHistory().catch(() => ({ data: [] })),
        taskAPI.getDaily().catch(() => ({ data: [] })),
        projectAPI.getMine().catch(() => ({ data: { projects: [] } }))
      ]);

      setPending(extractArray(pendRes));
      setHistory(extractArray(histRes));
      setTasks(extractArray(taskRes));
      setProjects(projRes.data?.projects || projRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approvalAPI.approve(id);
      loadData();
    } catch (e) {
      alert('Error approving');
    }
  };

  const handleReject = async (id) => {
    try {
      const reason = prompt('Reason for rejection:');
      if (reason !== null) {
        await approvalAPI.reject(id, reason);
        loadData();
      }
    } catch (e) {
      alert('Error rejecting');
    }
  };

  const approved = history.filter(h => {
    const status = (h.approvalStatus || '').toLowerCase();
    return status === 'approved' || status === 'accepted';
  });
  const rejected = history.filter(h => {
    const status = (h.approvalStatus || '').toLowerCase();
    return status === 'rejected';
  });

  const tabs = [
    { name: 'Pending', count: pending.length, icon: Clock, color: colors.warning },
    { name: 'Approved', count: approved.length, icon: CheckCircle, color: colors.success },
    { name: 'Rejected', count: rejected.length, icon: XCircle, color: colors.danger }
  ];

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

  return (
    <div style={{ padding: '40px 24px', maxWidth: 1280, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeUp 300ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: colors.textPrimary, letterSpacing: '-0.03em', margin: 0 }}>
            Supervisor Dashboard
          </h1>
          <p style={{ fontSize: 15, color: colors.textSecondary, margin: '6px 0 0' }}>
            Manage team approvals and daily tasks
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="outline" onClick={loadData} icon={<RefreshCw size={16} />}>
            Refresh
          </Button>
          <Button variant="primary" onClick={() => navigate('/assign-task')} icon={<Briefcase size={16} />}>
            Assign Task
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {[
          { name: 'Pending', count: pending.length, icon: Clock, color: colors.warning },
          { name: 'Approved', count: approved.length, icon: CheckCircle, color: colors.success },
          { name: 'Rejected', count: rejected.length, icon: XCircle, color: colors.danger }
        ].map(btn => {
          const Icon = btn.icon;
          const isActive = activeTab === btn.name;
          return (
            <button
              key={btn.name}
              onClick={() => setActiveTab(btn.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 20px', borderRadius: 999,
                background: isActive ? `${btn.color}15` : colors.card,
                border: `1px solid ${isActive ? btn.color : colors.border}`,
                color: isActive ? btn.color : colors.textSecondary,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                transition: 'all 200ms ease'
              }}
            >
              <Icon size={16} />
              {btn.name}
              <span style={{
                background: isActive ? btn.color : colors.background,
                color: isActive ? '#fff' : colors.textTertiary,
                padding: '2px 8px', borderRadius: 999, fontSize: 12
              }}>
                {btn.count}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Card padding={24} style={{ minHeight: 400 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, color: colors.textPrimary }}>
              {activeTab} Entries
            </h3>

            {activeTab === 'Pending' && (
              pending.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: colors.textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <CheckCircle size={48} color={colors.textSecondary} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 16, color: colors.textSecondary }}>No pending approvals</p>
                  <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.8 }}>You're all caught up!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {pending.map(p => (
                    <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, border: `1px solid ${colors.border}`, borderRadius: 12, background: colors.background }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: colors.textPrimary }}>{p.title || 'Untitled Entry'}</div>
                        <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                          {p.submitter?.name || p.createdBy?.name || 'Unknown'} • Amount: ₹{p.amount}
                        </div>
                        <Badge variant="warning" style={{ marginTop: 8 }}>{p.type || 'Transaction'}</Badge>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="danger" size="sm" onClick={() => handleReject(p._id)}>Reject</Button>
                        <Button variant="success" size="sm" onClick={() => handleApprove(p._id)}>Approve</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'Approved' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {approved.map(a => (
                  <div key={a._id} style={{ padding: 16, border: `1px solid ${colors.border}`, borderRadius: 12, background: colors.background }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: colors.textPrimary }}>{a.title || 'Untitled Entry'}</div>
                    <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                      {a.submitter?.name || a.createdBy?.name || 'Unknown'} • Amount: ₹{a.amount}
                    </div>
                  </div>
                ))}
                {approved.length === 0 && <p style={{ color: colors.textSecondary, textAlign: 'center' }}>No approved entries.</p>}
              </div>
            )}

            {activeTab === 'Rejected' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {rejected.map(r => (
                  <div key={r._id} style={{ padding: 16, border: `1px solid ${colors.border}`, borderRadius: 12, background: colors.background }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: colors.textPrimary }}>{r.title || 'Untitled Entry'}</div>
                    <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                      {r.submitter?.name || r.createdBy?.name || 'Unknown'} • Amount: ₹{r.amount}
                    </div>
                    {r.rejectionReason && (
                      <div style={{ marginTop: 8, padding: 8, background: colors.dangerLight, color: colors.danger, borderRadius: 6, fontSize: 12 }}>
                        Reason: {r.rejectionReason}
                      </div>
                    )}
                  </div>
                ))}
                {rejected.length === 0 && <p style={{ color: colors.textSecondary, textAlign: 'center' }}>No rejected entries.</p>}
              </div>
            )}
          </Card>

          {/* Recent History */}
          <Card padding={24}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, color: colors.textPrimary }}>
              Recent History
            </h3>

            {[...approved, ...rejected].length === 0 ? (
              <p style={{ color: colors.textSecondary, textAlign: 'center', padding: '20px 0' }}>No recent history.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[...approved, ...rejected].map(item => {
                  const isApproved = (item.approvalStatus || '').toLowerCase() === 'approved';
                  return (
                    <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, border: `1px solid ${colors.border}`, borderRadius: 12, background: colors.background }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: colors.textPrimary }}>{item.title || 'Untitled Entry'}</div>
                        <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                          {item.submitter?.name || item.createdBy?.name || 'Unknown'}
                        </div>
                        <div style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {isApproved ? <CheckCircle size={12} color={colors.success} /> : <XCircle size={12} color={colors.danger} />}
                          <span style={{ color: isApproved ? colors.success : colors.danger }}>
                            {isApproved ? 'Approved' : 'Rejected'}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: colors.textPrimary }}>
                        ₹{item.amount || 0}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Assigned Tasks */}
        <Card padding={24} style={{ alignSelf: 'start' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 18, color: colors.textPrimary }}>
            Assigned Tasks
          </h3>
          {tasks.length === 0 ? (
            <p style={{ color: colors.textSecondary, fontSize: 14 }}>No tasks assigned for today.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tasks.map(t => (
                <div key={t._id} style={{ padding: 12, border: `1px solid ${colors.border}`, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: colors.textPrimary }}>{t.title}</div>
                    <div style={{ fontSize: 13, color: colors.textSecondary }}>Assigned to: {t.assigneeModel === 'Worker' ? t.workerDetails?.name : t.assignedToDetails?.name}</div>
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
          <Button variant="outline" style={{ width: '100%', marginTop: 16 }} onClick={() => navigate('/assign-task')}>
            Manage Tasks
          </Button>
        </Card>
      </div>
    </div>
  );
}
