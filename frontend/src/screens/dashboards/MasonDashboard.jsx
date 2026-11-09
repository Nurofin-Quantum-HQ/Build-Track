import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  BtCard,
  BtGroup,
  BtRow,
  BtBadge,
  BtHero,
  BtPageHeader,
  BtSheet,
  BtEmpty,
  BtErrorCard,
  BtIconButton,
  BtTypeTile,
  BtSectionHeader,
  BtSelect,
  BtPageLoader,
  btToast,
} from '../../components/ui';
import { taskAPI, transactionAPI } from '../../api';
import { PlusCircle, Package, Briefcase, ChevronRight } from 'lucide-react';

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

/** Big tappable action (a real button so keyboard and focus ring work). */
function ActionTile({ icon: Icon, title, desc, onClick, ink = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bt-hover-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        minHeight: 96,
        padding: '20px 22px',
        textAlign: 'left',
        cursor: 'pointer',
        boxSizing: 'border-box',
        borderRadius: 'var(--r-card)',
        border: ink ? '1px solid var(--noir-line)' : '1px solid var(--line)',
        background: ink ? 'var(--ink)' : 'var(--card)',
        boxShadow: 'var(--shadow-card)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--r-tile)',
          background: ink ? 'var(--accent)' : 'var(--fill)',
          color: ink ? 'var(--on-accent)' : 'var(--ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={24} strokeWidth={ink ? 2.1 : 1.85} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 700,
            color: ink ? 'var(--on-noir)' : 'var(--ink)',
          }}
        >
          {title}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            color: ink ? 'var(--on-noir-2)' : 'var(--ink-3)',
            marginTop: 2,
          }}
        >
          {desc}
        </span>
      </span>
      <ChevronRight size={18} color={ink ? 'var(--on-noir-3)' : 'var(--ink-3)'} style={{ flexShrink: 0 }} />
    </button>
  );
}

const keyActivate = (fn) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

export default function MasonDashboard() {
  const navigate = useNavigate();
  const { user, can } = useAuth();

  // Same switches the routes check, so nobody sees a button that leads to "no access".
  const canUpdateProgress = can(['add_entries', 'submit_daily_update', 'edit_project', 'approve_updates']);
  const canAddMaterial = can(['add_entries', 'manage_expenses']);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    let failed = false;
    const soft = (fallback) => () => {
      failed = true;
      return fallback;
    };
    try {
      const [taskRes, entryRes] = await Promise.all([
        taskAPI.getDaily().catch(soft({ data: [] })),
        transactionAPI.getMine({ limit: 5 }).catch(soft({ data: [] })),
      ]);

      const tData = taskRes.data?.data || taskRes.data?.tasks || taskRes.data;
      setTasks(Array.isArray(tData) ? tData : []);

      const entriesData = entryRes.data?.data || entryRes.data?.transactions || entryRes.data;
      setEntries(Array.isArray(entriesData) ? entriesData : []);
      setLoadFailed(failed);
    } catch (e) {
      console.error(e);
      setLoadFailed(true);
      btToast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));
      btToast.success(`Status updated to ${newStatus}`);
    } catch (e) {
      btToast.error('Failed to update task status');
    }
  };

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== 'Completed').length, [tasks]);

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  if (loading) {
    return <BtPageLoader label="Loading dashboard…" />;
  }

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <BtHero padding="24px clamp(16px, 4vw, 28px) 56px">
        <BtPageHeader
          eyebrow={`Daily log · ${todayLabel}`}
          title="What did you do today?"
          subtitle={`Ready for today's work, ${firstName}. Log progress, photos and material deliveries.`}
        />
      </BtHero>

      <BtSheet overlap={26} padding="28px clamp(16px, 4vw, 28px) 64px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {loadFailed && (
            <BtErrorCard
              title="Some of this page didn't load"
              message="Check your connection and try again."
              onRetry={loadData}
            />
          )}

          {(canUpdateProgress || canAddMaterial) && (
            <div className="bt-grid-2">
              {canUpdateProgress && (
                <ActionTile
                  ink
                  icon={PlusCircle}
                  title="Add daily update"
                  desc="Work done, photos and site notes"
                  onClick={() => navigate('/update-progress')}
                />
              )}
              {canAddMaterial && (
                <ActionTile
                  icon={Package}
                  title="Add material entry"
                  desc="Cement bags, steel, bricks, sand…"
                  onClick={() => navigate('/manualentry?type=material')}
                />
              )}
            </div>
          )}

          {/* Tasks */}
          <section>
            <BtSectionHeader title={openTasks > 0 ? `Tasks assigned · ${openTasks} open` : 'Tasks assigned'} />

            {tasks.length === 0 ? (
              <BtCard>
                <BtEmpty
                  icon={Briefcase}
                  title="No tasks right now"
                  message="Tasks your site supervisor assigns will appear here."
                />
              </BtCard>
            ) : (
              <BtCard padding={0} style={{ overflow: 'hidden' }}>
                {tasks.map((task, idx) => {
                  const isCompleted = task.status === 'Completed';
                  const isInProgress = task.status === 'In Progress';

                  return (
                    <div
                      key={task._id || idx}
                      className="bt-hover-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px 14px',
                        padding: '14px 18px',
                        borderBottom: idx === tasks.length - 1 ? 'none' : '1px solid var(--line)',
                      }}
                    >
                      <span
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 'var(--r-tile)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
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
                          {task.title}
                        </div>
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
                          {task.description || 'Assigned task for today'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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

                        {canUpdateProgress && (
                          <BtIconButton
                            icon={ChevronRight}
                            label="Update progress"
                            onClick={() =>
                              navigate('/update-progress', {
                                state: { taskId: task._id, projectId: task.project },
                              })
                            }
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </BtCard>
            )}
          </section>

          {/* Recent entries */}
          <section>
            <BtSectionHeader title="Recent entries" action="View all" onAction={() => navigate('/transaction')} />

            {entries.length === 0 ? (
              <BtCard>
                <BtEmpty
                  icon={Package}
                  title="No entries yet"
                  message="Daily logs and material receipts you record will appear here."
                />
              </BtCard>
            ) : (
              <BtGroup>
                {entries.map((entry, idx) => {
                  const amt = Number(entry.amount || entry.totalAmount || 0);
                  const status = (entry.approvalStatus || '').toLowerCase();
                  const go = () => navigate('/transaction');

                  return (
                    <BtRow
                      key={entry._id || entry.id || idx}
                      className="bt-hover-row"
                      role="button"
                      tabIndex={0}
                      onKeyDown={keyActivate(go)}
                      icon={<BtTypeTile type={entry.type} size={38} />}
                      title={entry.title || entry.name || entry.type || 'Entry'}
                      subtitle={relativeTime(entry.date || entry.createdAt)}
                      tag={
                        <BtBadge
                          label={entry.approvalStatus || 'Recorded'}
                          tone={status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'pending'}
                        />
                      }
                      amount={amt > 0 ? amt : undefined}
                      onClick={go}
                    />
                  );
                })}
              </BtGroup>
            )}
          </section>
        </div>
      </BtSheet>
    </div>
  );
}
