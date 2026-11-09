import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  BtButton,
  BtIconButton,
  BtCard,
  BtBadge,
  BtHero,
  BtPageHeader,
  BtGlassTile,
  BtSheet,
  BtCountUp,
  formatInr,
  BtEmpty,
  BtErrorCard,
  BtTypeTile,
  BtSectionHeader,
  BtSelect,
  BtTextarea,
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
  Check,
  X,
  UserPlus,
} from 'lucide-react';

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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const TAB_META = {
  Pending: { icon: Clock, accent: 'var(--accent)' },
  Approved: { icon: CheckCircle2, accent: 'var(--status-success-bright)' },
  Rejected: { icon: XCircle, accent: 'var(--status-danger-bright)' },
};

/** A list row that wraps its actions under the text on narrow screens. */
function ListRow({ icon, title, subtitle, amount, children, last }) {
  return (
    <div
      className="bt-hover-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px 14px',
        padding: '14px 18px',
        borderBottom: last ? 'none' : '1px solid var(--line)',
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--ink-3)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {amount !== undefined && (
        <div
          className="tnum"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--ink)',
            flexShrink: 0,
            textAlign: 'right',
          }}
        >
          {formatInr(amount)}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function ListCard({ children }) {
  return (
    <BtCard padding={0} style={{ overflow: 'hidden' }}>
      {children}
    </BtCard>
  );
}

/** Replaces the browser prompt() for the rejection reason. */
function RejectDialog({ item, busy, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--scrim)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
        animation: 'fadeIn 160ms ease',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--card)',
          borderRadius: 'var(--r-sheet)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-raised)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animation: 'fadeUp 240ms var(--ease)',
        }}
      >
        <div>
          <h2
            id="reject-title"
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
            }}
          >
            Reject this entry?
          </h2>
          <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {item?.title || 'This entry'} will go back to the person who logged it.
          </p>
        </div>
        <BtTextarea
          label="Reason (optional)"
          rows={3}
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Tell them what to fix"
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <BtButton variant="secondary" size="small" onClick={onCancel}>
            Cancel
          </BtButton>
          <BtButton variant="destructive" size="small" icon={X} loading={busy} onClick={() => onConfirm(reason)}>
            Reject entry
          </BtButton>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const { user, can } = useAuth();

  // What this person is actually allowed to do (Assign Role switches).
  const canApprove = can(['approve_payments', 'approve_updates']);
  const canAssignTasks = can('assign_tasks');
  const canSeeProjects = can(['view_projects', 'view_assigned_project']);

  const [activeTab, setActiveTab] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [rejecting, setRejecting] = useState(null);

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

  const loadData = useCallback(
    async ({ initial = false } = {}) => {
      if (initial) setLoading(true);
      else setRefreshing(true);
      setLoadFailed(false);
      let failed = false;
      const soft = (fallback) => () => {
        failed = true;
        return fallback;
      };
      try {
        const [pendRes, histRes, taskRes] = await Promise.all([
          approvalAPI.getPending().catch(soft({ data: [] })),
          approvalAPI.getHistory().catch(soft({ data: [] })),
          taskAPI.getDaily().catch(soft({ data: [] })),
          // Only call the endpoint when this person's switches allow it (otherwise it answers 403).
          canSeeProjects ? projectAPI.getMine().catch(() => ({ data: { projects: [] } })) : Promise.resolve(null),
        ]);

        setPending(extractArray(pendRes));
        setHistory(extractArray(histRes));
        setTasks(extractArray(taskRes));
        setLoadFailed(failed);
      } catch (e) {
        console.error(e);
        setLoadFailed(true);
        btToast.error('Failed to load supervisor data');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canSeeProjects]
  );

  useEffect(() => {
    loadData({ initial: true });
  }, [loadData]);

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

  const handleReject = async (id, reason) => {
    setActionInProgress(id);
    try {
      await approvalAPI.reject(id, reason);
      btToast.success('Entry rejected');
      setRejecting(null);
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
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));
      btToast.success(`Task status updated to ${newStatus}`);
    } catch (e) {
      btToast.error('Failed to update task status');
    }
  };

  const approved = useMemo(
    () =>
      history.filter((h) => {
        const status = (h.approvalStatus || '').toLowerCase();
        return status === 'approved' || status === 'accepted';
      }),
    [history]
  );

  const rejected = useMemo(
    () => history.filter((h) => (h.approvalStatus || '').toLowerCase() === 'rejected'),
    [history]
  );

  const pendingCount = pending.length;
  const approvedCount = approved.length;
  const rejectedCount = rejected.length;

  const pendingSum = useMemo(
    () => pending.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [pending]
  );

  const openTasksCount = useMemo(() => tasks.filter((t) => t.status !== 'Completed').length, [tasks]);

  const currentList = activeTab === 'Pending' ? pending : activeTab === 'Approved' ? approved : rejected;

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const firstName = (user?.name || 'Supervisor').split(' ')[0];

  if (loading) {
    return <BtPageLoader label="Loading dashboard…" />;
  }

  const tabCounts = { Pending: pendingCount, Approved: approvedCount, Rejected: rejectedCount };
  const tabNames = Object.keys(TAB_META);

  const onTabKeyDown = (e, name) => {
    const i = tabNames.indexOf(name);
    let next = null;
    if (e.key === 'ArrowRight') next = tabNames[(i + 1) % tabNames.length];
    else if (e.key === 'ArrowLeft') next = tabNames[(i - 1 + tabNames.length) % tabNames.length];
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveTab(name);
      return;
    }
    if (next) {
      e.preventDefault();
      setActiveTab(next);
      e.currentTarget.parentElement?.querySelector(`[data-tab="${next}"]`)?.focus();
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* HERO */}
      <BtHero padding="24px clamp(16px, 4vw, 28px) 56px">
        <BtPageHeader
          eyebrow={`Supervisor · ${todayLabel}`}
          title={`${getGreeting()}, ${firstName}`}
          subtitle="Approve site entries and keep the daily work moving."
          actions={
            <>
              {canAssignTasks && (
                <BtButton variant="accent" size="small" icon={UserPlus} onClick={() => navigate('/assign-task')}>
                  Assign task
                </BtButton>
              )}
              <BtButton
                variant="onDark"
                size="small"
                icon={RefreshCw}
                loading={refreshing}
                onClick={() => loadData()}
              >
                Refresh
              </BtButton>
            </>
          }
        >
          {/* The one answer */}
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, color: 'var(--on-noir-2)' }}>
              Waiting for your sign-off
            </div>
            <div
              className="tnum"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(40px, 5.4vw, 60px)',
                fontWeight: 700,
                letterSpacing: '-0.035em',
                lineHeight: 1.05,
                color: 'var(--on-noir)',
                margin: '6px 0 8px',
              }}
            >
              <BtCountUp value={pendingSum} format={(v) => formatInr(v, { compact: true })} />
            </div>
            <div className="tnum" style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--on-noir-2)' }}>
              {pendingCount === 0
                ? 'Nothing to review right now.'
                : `Across ${pendingCount} ${pendingCount === 1 ? 'entry' : 'entries'}.`}
            </div>
          </div>

          {/* Three tiles double as the list filter */}
          <div
            role="tablist"
            aria-label="Show entries by status"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}
          >
            {tabNames.map((name) => {
              const meta = TAB_META[name];
              const selected = activeTab === name;
              return (
                <BtGlassTile
                  key={name}
                  role="tab"
                  tabIndex={selected ? 0 : -1}
                  aria-selected={selected}
                  data-tab={name}
                  label={name}
                  value={`${tabCounts[name]}`}
                  valueColor={selected ? meta.accent : undefined}
                  icon={meta.icon}
                  onClick={() => setActiveTab(name)}
                  onKeyDown={(e) => onTabKeyDown(e, name)}
                  style={{
                    borderColor: selected ? meta.accent : 'rgba(255, 255, 255, 0.09)',
                    background: selected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  }}
                />
              );
            })}
          </div>
        </BtPageHeader>
      </BtHero>

      {/* SHEET */}
      <BtSheet overlap={26} padding="28px clamp(16px, 4vw, 28px) 64px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {loadFailed && (
            <BtErrorCard
              title="Some of this page didn't load"
              message="Check your connection and try again."
              onRetry={() => loadData()}
            />
          )}

          {/* Entries for the selected status */}
          <section role="tabpanel" aria-label={`${activeTab} entries`}>
            <BtSectionHeader title={`${activeTab} entries · ${currentList.length}`} />

            {currentList.length === 0 ? (
              <BtCard>
                <BtEmpty
                  icon={TAB_META[activeTab].icon}
                  title={activeTab === 'Pending' ? 'You are all caught up' : `No ${activeTab.toLowerCase()} entries`}
                  message={
                    activeTab === 'Pending'
                      ? 'Every team submission has been reviewed.'
                      : `Entries you ${activeTab === 'Approved' ? 'approve' : 'reject'} will be listed here.`
                  }
                />
              </BtCard>
            ) : (
              <ListCard>
                {currentList.map((item, idx) => {
                  const amt = Number(item.amount || 0);
                  const submitter = item.submitter?.name || item.createdBy?.name || 'Worker';
                  const pName =
                    typeof item.project === 'object'
                      ? item.project?.projectName || item.project?.name || ''
                      : item.projectName || item.project || '';
                  const isPending = activeTab === 'Pending';
                  const isActioning = actionInProgress === item._id;

                  return (
                    <ListRow
                      key={item._id || idx}
                      last={idx === currentList.length - 1}
                      icon={<BtTypeTile type={item.type} size={40} />}
                      title={item.title || item.name || item.type || 'Entry'}
                      subtitle={`By ${submitter} · ${pName ? `${pName} · ` : ''}${relativeTime(item.date || item.createdAt)}`}
                      amount={amt}
                    >
                      {isPending ? (
                        canApprove ? (
                          <>
                            <BtButton
                              variant="primary"
                              size="small"
                              loading={isActioning}
                              icon={Check}
                              onClick={() => handleApprove(item._id)}
                            >
                              Approve
                            </BtButton>
                            <BtButton
                              variant="destructive"
                              size="small"
                              disabled={isActioning}
                              icon={X}
                              onClick={() => setRejecting(item)}
                            >
                              Reject
                            </BtButton>
                          </>
                        ) : (
                          <BtBadge label="Waiting" tone="pending" />
                        )
                      ) : (
                        <BtBadge
                          label={activeTab}
                          tone={activeTab === 'Approved' ? 'success' : 'danger'}
                        />
                      )}
                    </ListRow>
                  );
                })}
              </ListCard>
            )}
          </section>

          {/* Daily tasks */}
          <section>
            <BtSectionHeader
              title={openTasksCount > 0 ? `Daily tasks · ${openTasksCount} open` : 'Daily tasks'}
            />

            {tasks.length === 0 ? (
              <BtCard>
                <BtEmpty
                  icon={Briefcase}
                  title="No active tasks"
                  message={
                    canAssignTasks
                      ? 'Assign daily tasks to masons and workers on site.'
                      : 'Tasks assigned to you or your team will appear here.'
                  }
                  actionLabel={canAssignTasks ? 'Assign task' : undefined}
                  onAction={canAssignTasks ? () => navigate('/assign-task') : undefined}
                />
              </BtCard>
            ) : (
              <ListCard>
                {tasks.map((task, idx) => {
                  const isCompleted = task.status === 'Completed';
                  const isInProgress = task.status === 'In Progress';

                  return (
                    <ListRow
                      key={task._id || idx}
                      last={idx === tasks.length - 1}
                      icon={
                        <span
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 'var(--r-tile)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isCompleted
                              ? 'var(--status-success-soft)'
                              : isInProgress
                              ? 'var(--accent-soft)'
                              : 'var(--fill)',
                            color: isCompleted
                              ? 'var(--status-success)'
                              : isInProgress
                              ? 'var(--accent-ink)'
                              : 'var(--ink)',
                          }}
                        >
                          <Briefcase size={19} strokeWidth={1.85} />
                        </span>
                      }
                      title={task.title}
                      subtitle={
                        task.description ||
                        (task.assignedTo?.name ? `Assigned to ${task.assignedTo.name}` : 'Unassigned')
                      }
                    >
                      <BtSelect
                        size="compact"
                        aria-label={`Status of ${task.title}`}
                        value={task.status || 'Pending'}
                        onChange={(e) => handleTaskStatusChange(task._id, e.target.value)}
                        style={{ width: 160 }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </BtSelect>
                    </ListRow>
                  );
                })}
              </ListCard>
            )}
          </section>
        </div>
      </BtSheet>

      {rejecting && (
        <RejectDialog
          item={rejecting}
          busy={actionInProgress === rejecting._id}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason) => handleReject(rejecting._id, reason)}
        />
      )}
    </div>
  );
}
