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
  BtSheet,
  BtEmpty,
  BtTypeTile,
  BtSectionHeader,
  BtPageLoader,
  btToast,
} from '../../components/ui';
import { taskAPI, transactionAPI } from '../../api';
import {
  Clock,
  PlusCircle,
  CheckCircle2,
  Package,
  Briefcase,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Calendar,
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

export default function MasonDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [taskRes, entryRes] = await Promise.all([
        taskAPI.getDaily().catch(() => ({ data: [] })),
        transactionAPI.getMine({ limit: 5 }).catch(() => ({ data: [] })),
      ]);

      const tData = taskRes.data?.data || taskRes.data?.tasks || taskRes.data;
      setTasks(Array.isArray(tData) ? tData : []);

      const entriesData =
        entryRes.data?.data || entryRes.data?.transactions || entryRes.data;
      setEntries(Array.isArray(entriesData) ? entriesData : []);
    } catch (e) {
      console.error(e);
      btToast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
      btToast.success(`Status updated to ${newStatus}`);
    } catch (e) {
      btToast.error('Failed to update task status');
    }
  };

  const openTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== 'Completed').length;
  }, [tasks]);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Mason';

  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  if (loading) {
    return <BtPageLoader message="Loading dashboard…" />;
  }

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ══════════════════════════════════════════════════════════
          HERO (Blueprint Noir Surface)
         ══════════════════════════════════════════════════════════ */}
      <BtHero padding="32px 32px 56px">
        <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'var(--on-noir-3)',
              marginBottom: '6px',
            }}
          >
            DAILY LOG • {todayLabel}
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--bone)',
            }}
          >
            What did you do today?
          </h1>

          <p
            style={{
              margin: '8px 0 0',
              fontFamily: 'var(--font-ui)',
              fontSize: '15px',
              color: 'var(--on-noir-2)',
            }}
          >
            Ready for today's work, {firstName} 👋 • Log progress, photos, and material deliveries.
          </p>
        </div>
      </BtHero>

      {/* ══════════════════════════════════════════════════════════
          SHEET (Bone Surface)
         ══════════════════════════════════════════════════════════ */}
      <BtSheet overlap={26} padding="28px 32px 64px">
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
          }}
        >
          {/* Big Action Buttons Row (Add Daily Update + Add Material Entry) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Primary Dark Ink Action Card */}
            <div
              onClick={() => navigate('/update-progress')}
              style={{
                background: 'var(--ink)',
                borderRadius: 'var(--r-card)',
                padding: '24px 22px',
                color: 'var(--bone)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: 'var(--shadow-card)',
                transition: 'transform 180ms ease, box-shadow 180ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(17, 19, 23, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-card)';
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--r-tile)',
                  background: 'var(--accent)',
                  color: 'var(--on-accent, #111317)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 0 16px var(--accent-glow)',
                }}
              >
                <PlusCircle size={24} strokeWidth={2.2} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--bone)',
                  }}
                >
                  Add Daily Update
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    color: 'var(--on-noir-2)',
                    marginTop: '2px',
                  }}
                >
                  Work done, photos, and site notes
                </div>
              </div>

              <ChevronRight size={18} color="var(--on-noir-3)" />
            </div>

            {/* Secondary White Card */}
            <BtCard
              onClick={() => navigate('/manualentry?type=material')}
              padding="24px 22px"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--r-tile)',
                  background: 'var(--fill)',
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Package size={24} strokeWidth={1.8} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--ink)',
                  }}
                >
                  Add Material Entry
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    color: 'var(--ink-3)',
                    marginTop: '2px',
                  }}
                >
                  Cement bags, steel, bricks, sand…
                </div>
              </div>

              <ChevronRight size={18} color="var(--ink-3)" />
            </BtCard>
          </div>

          {/* Assigned Daily Tasks Section */}
          <div>
            <BtSectionHeader
              title="Tasks Assigned"
              action={openTasks > 0 ? `${openTasks} open` : undefined}
            />

            {tasks.length === 0 ? (
              <BtCard>
                <BtEmpty
                  icon={Briefcase}
                  title="No tasks currently active."
                  message="Tasks assigned by your site supervisor will appear here."
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
                      subtitle={task.description || 'Assigned task for today'}
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

                          <button
                            type="button"
                            onClick={() =>
                              navigate('/update-progress', {
                                state: { taskId: task._id, projectId: task.project },
                              })
                            }
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--ink-2)',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Update progress"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      }
                    />
                  );
                })}
              </BtGroup>
            )}
          </div>

          {/* Recent Entries Section */}
          <div>
            <BtSectionHeader
              title="Recent entries"
              action="View all"
              onAction={() => navigate('/transaction')}
            />

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

                  return (
                    <BtRow
                      key={entry._id || entry.id || idx}
                      icon={<BtTypeTile type={entry.type} size={38} />}
                      title={entry.title || entry.name || entry.type || 'Entry'}
                      subtitle={relativeTime(entry.date || entry.createdAt)}
                      tag={
                        <BtBadge
                          label={entry.approvalStatus || 'Recorded'}
                          tone={
                            (entry.approvalStatus || '').toLowerCase() === 'approved'
                              ? 'green'
                              : (entry.approvalStatus || '').toLowerCase() === 'rejected'
                              ? 'red'
                              : 'amber'
                          }
                        />
                      }
                      amount={amt > 0 ? amt : undefined}
                      onClick={() => navigate('/transaction')}
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
