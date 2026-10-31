import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  BtButton,
  BtCard,
  BtGroup,
  BtRow,
  BtBadge,
  BtHero,
  BtGlassTile,
  BtSheet,
  BtCountUp,
  formatInr,
  BtEmpty,
  BtTypeTile,
  BtSectionHeader,
  BtPageLoader,
  btToast,
} from '../../components/ui';
import { approvalAPI, taskAPI, projectAPI } from '../../api';
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Briefcase,
  AlertTriangle,
  Building2,
  Calendar,
  UserCheck,
  Check,
  X,
  ChevronRight,
} from 'lucide-react';

function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
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

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [actionInProgress, setActionInProgress] = useState(null);

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
        projectAPI.getMine().catch(() => ({ data: { projects: [] } })),
      ]);

      setPending(extractArray(pendRes));
      setHistory(extractArray(histRes));
      setTasks(extractArray(taskRes));
      setProjects(projRes.data?.projects || projRes.data || []);
    } catch (e) {
      console.error(e);
      btToast.error('Failed to load supervisor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id) => {
    setActionInProgress(id);
    try {
      await approvalAPI.approve(id);
      btToast.success('Entry approved successfully');
      loadData();
    } catch (e) {
      btToast.error('Error approving entry');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    setActionInProgress(id);
    try {
      await approvalAPI.reject(id, reason);
      btToast.success('Entry rejected');
      loadData();
    } catch (e) {
      btToast.error('Error rejecting entry');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
      btToast.success(`Task status updated to ${newStatus}`);
    } catch (e) {
      btToast.error('Failed to update task status');
    }
  };

  const approved = useMemo(() => {
    return history.filter((h) => {
      const status = (h.approvalStatus || '').toLowerCase();
      return status === 'approved' || status === 'accepted';
    });
  }, [history]);

  const rejected = useMemo(() => {
    return history.filter((h) => {
      const status = (h.approvalStatus || '').toLowerCase();
      return status === 'rejected';
    });
  }, [history]);

  const pendingCount = pending.length;
  const approvedCount = approved.length;
  const rejectedCount = rejected.length;

  const pendingSum = useMemo(() => {
    return pending.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [pending]);

  const openTasksCount = useMemo(() => {
    return tasks.filter((t) => t.status !== 'Completed').length;
  }, [tasks]);

  const currentList =
    activeTab === 'Pending' ? pending : activeTab === 'Approved' ? approved : rejected;

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  if (loading) {
    return <BtPageLoader message="Loading supervisor dashboard…" />;
  }

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ══════════════════════════════════════════════════════════
          HERO (Noir Blueprint Grid)
         ══════════════════════════════════════════════════════════ */}
      <BtHero padding="32px 32px 56px">
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          {/* Header Eyebrow & Title */}
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'var(--on-noir-3)',
                marginBottom: '4px',
              }}
            >
              SUPERVISOR COMMAND • {todayLabel}
            </div>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: '28px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--bone)',
              }}
            >
              Supervisor Dashboard
            </h1>
            <p
              style={{
                margin: '4px 0 0',
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                color: 'var(--on-noir-2)',
              }}
            >
              Manage site approvals and coordinate daily construction tasks.
            </p>
          </div>

          {/* Pending Sign-off Counter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '24px',
            }}
          >
            <div
              className="tnum"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(48px, 6vw, 72px)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                color: 'var(--bone)',
              }}
            >
              <BtCountUp value={pendingCount} format={(v) => `${Math.round(v)}`} />
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--bone)',
                }}
              >
                waiting for your sign-off
              </div>
              <div
                className="tnum"
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '14px',
                  color: 'var(--on-noir-2)',
                  marginTop: '2px',
                }}
              >
                {formatInr(pendingSum, { compact: false })} across {pendingCount}{' '}
                {pendingCount === 1 ? 'entry' : 'entries'}
              </div>
            </div>
          </div>

          {/* 3 Status Glass Tiles (Tabs) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}
          >
            <BtGlassTile
              label="Pending"
              value={`${pendingCount}`}
              valueColor={activeTab === 'Pending' ? 'var(--accent)' : 'var(--bone)'}
              icon={Clock}
              onClick={() => setActiveTab('Pending')}
              style={{
                borderColor:
                  activeTab === 'Pending' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.09)',
                background:
                  activeTab === 'Pending'
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(255, 255, 255, 0.05)',
              }}
            />
            <BtGlassTile
              label="Approved"
              value={`${approvedCount}`}
              valueColor={
                activeTab === 'Approved' ? 'var(--status-success-bright)' : 'var(--bone)'
              }
              icon={CheckCircle2}
              onClick={() => setActiveTab('Approved')}
              style={{
                borderColor:
                  activeTab === 'Approved' ? 'var(--status-success-bright)' : 'rgba(255, 255, 255, 0.09)',
                background:
                  activeTab === 'Approved'
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(255, 255, 255, 0.05)',
              }}
            />
            <BtGlassTile
              label="Rejected"
              value={`${rejectedCount}`}
              valueColor={
                activeTab === 'Rejected' ? 'var(--status-danger-bright)' : 'var(--bone)'
              }
              icon={XCircle}
              onClick={() => setActiveTab('Rejected')}
              style={{
                borderColor:
                  activeTab === 'Rejected' ? 'var(--status-danger-bright)' : 'rgba(255, 255, 255, 0.09)',
                background:
                  activeTab === 'Rejected'
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(255, 255, 255, 0.05)',
              }}
            />
          </div>
        </div>
      </BtHero>

      {/* ══════════════════════════════════════════════════════════
          SHEET (Bone Surface)
         ══════════════════════════════════════════════════════════ */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
          }}
        >
          {/* Action Header Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', gap: '10px' }}>
              <BtButton
                variant="primary"
                icon={Briefcase}
                onPress={() => navigate('/assign-task')}
              >
                Assign Task
              </BtButton>
              <BtButton
                variant="secondary"
                icon={RefreshCw}
                onPress={loadData}
              >
                Refresh
              </BtButton>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
              }}
            >
              Showing {activeTab} Records
            </div>
          </div>

          {/* Active Tab Records List */}
          <div>
            <BtSectionHeader
              title={`${activeTab} Entries (${currentList.length})`}
            />

            {currentList.length === 0 ? (
              <BtCard>
                <BtEmpty
                  icon={
                    activeTab === 'Pending'
                      ? Clock
                      : activeTab === 'Approved'
                      ? CheckCircle2
                      : XCircle
                  }
                  title={`No ${activeTab.toLowerCase()} entries`}
                  message={
                    activeTab === 'Pending'
                      ? 'All team submissions have been processed.'
                      : `No transactions currently marked as ${activeTab.toLowerCase()}.`
                  }
                />
              </BtCard>
            ) : (
              <BtGroup>
                {currentList.map((item, idx) => {
                  const amt = Number(item.amount || 0);
                  const submitter =
                    item.submitter?.name || item.createdBy?.name || 'Worker';
                  const pName =
                    typeof item.project === 'object'
                      ? item.project?.projectName || item.project?.name || ''
                      : item.projectName || item.project || '';
                  const isPending = activeTab === 'Pending';
                  const isActioning = actionInProgress === item._id;

                  return (
                    <BtRow
                      key={item._id || idx}
                      icon={<BtTypeTile type={item.type} size={40} />}
                      title={item.title || item.name || item.type || 'Entry'}
                      subtitle={`By ${submitter} • ${pName ? `${pName} • ` : ''}${relativeTime(item.date || item.createdAt)}`}
                      amount={amt}
                      showChevron={false}
                      rightContent={
                        isPending ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BtButton
                              variant="primary"
                              small
                              loading={isActioning}
                              icon={Check}
                              onPress={() => handleApprove(item._id)}
                            >
                              Approve
                            </BtButton>
                            <BtButton
                              variant="destructive"
                              small
                              loading={isActioning}
                              icon={X}
                              onPress={() => handleReject(item._id)}
                            >
                              Reject
                            </BtButton>
                          </div>
                        ) : (
                          <BtBadge
                            label={item.approvalStatus || activeTab}
                            tone={activeTab === 'Approved' ? 'green' : 'red'}
                          />
                        )
                      }
                    />
                  );
                })}
              </BtGroup>
            )}
          </div>

          {/* Assigned Daily Tasks Section */}
          <div>
            <BtSectionHeader
              title="Daily Tasks Assigned"
              action={openTasksCount > 0 ? `${openTasksCount} open` : undefined}
            />

            {tasks.length === 0 ? (
              <BtCard>
                <BtEmpty
                  icon={Briefcase}
                  title="No active tasks"
                  message="Assign daily tasks to masons and workers on site."
                />
              </BtCard>
            ) : (
              <BtGroup>
                {tasks.map((task, idx) => {
                  const isCompleted = task.status === 'Completed';
                  const isInProgress = task.status === 'In Progress';

                  return (
                    <BtRow
                      key={task._id || idx}
                      icon={Briefcase}
                      iconBg={
                        isCompleted
                          ? 'var(--tone-green-bg)'
                          : isInProgress
                          ? 'var(--tone-brand-bg)'
                          : 'var(--fill)'
                      }
                      iconColor={
                        isCompleted
                          ? 'var(--tone-green)'
                          : isInProgress
                          ? 'var(--tone-brand)'
                          : 'var(--ink)'
                      }
                      title={task.title}
                      subtitle={
                        task.description ||
                        `Project task • ${task.assignedTo?.name ? `Assigned to ${task.assignedTo.name}` : 'Unassigned'}`
                      }
                      showChevron={false}
                      rightContent={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <select
                            value={task.status || 'Pending'}
                            onChange={(e) => handleTaskStatusChange(task._id, e.target.value)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '16px',
                              border: '1px solid var(--line)',
                              background: isCompleted
                                ? 'var(--tone-green-bg)'
                                : isInProgress
                                ? 'var(--tone-brand-bg)'
                                : 'var(--fill)',
                              color: isCompleted
                                ? 'var(--tone-green)'
                                : isInProgress
                                ? 'var(--tone-brand)'
                                : 'var(--ink)',
                              fontFamily: 'var(--font-ui)',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      }
                    />
                  );
                })}
              </BtGroup>
            )}
          </div>
        </div>
      </BtSheet>
    </div>
  );
}
