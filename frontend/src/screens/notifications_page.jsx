import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle2,
  IndianRupee,
  Building2,
  Users,
  ClipboardList,
  RotateCw,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import useNotificationStore from '../stores/notificationStore';
import {
  BtHero,
  BtPageHeader,
  BtSheet,
  BtButton,
  BtIconButton,
  BtChip,
  BtCard,
  BtEmpty,
  BtErrorCard,
  BtSkeleton,
  BtBadge,
} from '../components/ui';
import { ConfirmDialog } from '../components/Toast';

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Just now';
  try {
    const now = new Date();
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return 'Recently';
  }
}

// Every colour comes from the design tokens.
const TYPE_CONFIG = {
  approval: { icon: CheckCircle2, color: 'var(--type-material)', bg: 'var(--type-material-soft)', label: 'Approval', tone: 'material', route: '/approvals' },
  payment: { icon: IndianRupee, color: 'var(--status-success)', bg: 'var(--type-income-soft)', label: 'Payment', tone: 'income', route: '/transaction' },
  transaction: { icon: IndianRupee, color: 'var(--status-success)', bg: 'var(--type-income-soft)', label: 'Finance', tone: 'income', route: '/transaction' },
  task: { icon: ClipboardList, color: 'var(--accent-ink)', bg: 'var(--accent-soft)', label: 'Task', tone: 'brand', route: '/assign-task' },
  project: { icon: Building2, color: 'var(--ink-2)', bg: 'var(--fill)', label: 'Project', tone: 'neutral', route: '/projects' },
  worker: { icon: Users, color: 'var(--type-labour)', bg: 'var(--type-labour-soft)', label: 'Team', tone: 'labour', route: '/admin' },
  subscription: { icon: Sparkles, color: 'var(--accent-ink)', bg: 'var(--accent-soft)', label: 'Billing', tone: 'brand', route: '/subscription' },
  system: { icon: Bell, color: 'var(--ink-2)', bg: 'var(--fill)', label: 'System', tone: 'neutral', route: null },
};

const typeOf = (n) => (n.type || n.relatedModel || '').toLowerCase();

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'approval' | 'payment' | 'task' | 'project'
  const [confirmClear, setConfirmClear] = useState(false);

  const { systemNotifications, loading, error, fetchAll, markAsRead, markAllAsRead, clearAll } = useNotificationStore();

  useEffect(() => {
    fetchAll(true);
  }, [fetchAll]);

  const notifications = useMemo(
    () => (Array.isArray(systemNotifications) ? systemNotifications : []),
    [systemNotifications]
  );

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const countsByType = useMemo(() => {
    const counts = { all: notifications.length, unread: unreadCount, approval: 0, payment: 0, task: 0, project: 0 };
    notifications.forEach((n) => {
      const type = typeOf(n);
      if (type.includes('approval')) counts.approval++;
      else if (type.includes('payment') || type.includes('transaction')) counts.payment++;
      else if (type.includes('task')) counts.task++;
      else if (type.includes('project')) counts.project++;
    });
    return counts;
  }, [notifications, unreadCount]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    if (filter === 'approval') return notifications.filter((n) => typeOf(n).includes('approval'));
    if (filter === 'payment') {
      return notifications.filter((n) => {
        const t = typeOf(n);
        return t.includes('payment') || t.includes('transaction');
      });
    }
    if (filter === 'task') return notifications.filter((n) => typeOf(n).includes('task'));
    if (filter === 'project') return notifications.filter((n) => typeOf(n).includes('project'));
    return notifications;
  }, [notifications, filter]);

  const handleOpenNotification = useCallback(
    (n) => {
      const id = n._id || n.id;
      if (id && !n.read) markAsRead(id);

      const type = typeOf(n);
      let targetRoute = null;
      if (type.includes('approval')) targetRoute = '/approvals';
      else if (type.includes('payment') || type.includes('transaction')) targetRoute = '/transaction';
      else if (type.includes('task')) targetRoute = '/assign-task';
      else if (type.includes('project')) targetRoute = '/projects';
      else if (type.includes('subscription')) targetRoute = '/subscription';

      if (targetRoute) navigate(targetRoute);
    },
    [markAsRead, navigate]
  );

  const tabs = [
    { id: 'all', label: 'All', count: countsByType.all },
    { id: 'unread', label: 'Unread', count: countsByType.unread },
    { id: 'approval', label: 'Approvals', count: countsByType.approval },
    { id: 'payment', label: 'Finance', count: countsByType.payment },
    { id: 'task', label: 'Tasks', count: countsByType.task },
    { id: 'project', label: 'Projects', count: countsByType.project },
  ];
  const activeTab = tabs.find((t) => t.id === filter);

  const emptyCopy =
    filter === 'all'
      ? { title: 'No notifications yet', message: 'Updates about approvals, payments and tasks will show up here.' }
      : filter === 'unread'
      ? { title: 'You are all caught up', message: 'Nothing unread. New alerts will appear here.' }
      : { title: `No ${activeTab.label.toLowerCase()} notifications`, message: 'Nothing in this group yet.' };

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {confirmClear && (
        <ConfirmDialog
          message="Clear all notifications? This removes every item from your inbox."
          confirmLabel="Clear all"
          cancelLabel="Keep them"
          danger
          onConfirm={() => {
            setConfirmClear(false);
            clearAll();
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      <BtHero padding="24px clamp(16px, 4vw, 28px) 48px">
        <BtPageHeader
          back={{ label: 'Back', onClick: () => navigate(-1) }}
          eyebrow="Inbox"
          title="Notifications"
          subtitle={
            unreadCount > 0
              ? `${unreadCount} unread ${unreadCount === 1 ? 'update' : 'updates'} from your sites and team.`
              : 'You are all caught up.'
          }
          actions={
            <>
              <BtIconButton
                icon={RotateCw}
                label="Refresh notifications"
                onDark
                disabled={loading}
                onClick={() => fetchAll(true)}
              />
              {unreadCount > 0 && (
                <BtButton variant="accent" size="small" icon={CheckCheck} onClick={markAllAsRead}>
                  Mark all read
                </BtButton>
              )}
              {notifications.length > 0 && (
                <BtButton variant="onDark" size="small" icon={Trash2} onClick={() => setConfirmClear(true)}>
                  Clear all
                </BtButton>
              )}
            </>
          }
        />
      </BtHero>

      <BtSheet overlap={26} padding="24px clamp(16px, 4vw, 28px) 64px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Filters */}
          <div
            role="group"
            aria-label="Filter notifications"
            style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}
          >
            {tabs.map((t) => (
              <BtChip
                key={t.id}
                label={`${t.label} · ${t.count}`}
                selected={filter === t.id}
                aria-pressed={filter === t.id}
                onClick={() => setFilter(t.id)}
                style={{ height: 40, flexShrink: 0 }}
              />
            ))}
          </div>

          {error && notifications.length === 0 && !loading ? (
            <BtErrorCard
              title="Couldn't load notifications"
              message="Check your connection and try again."
              onRetry={() => fetchAll(true)}
            />
          ) : loading && notifications.length === 0 ? (
            <BtCard padding={0}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    borderBottom: i === 4 ? 'none' : '1px solid var(--line)',
                  }}
                >
                  <BtSkeleton width="42px" height="42px" borderRadius="var(--r-tile)" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <BtSkeleton width="35%" height="14px" borderRadius="6px" />
                    <BtSkeleton width="70%" height="12px" borderRadius="6px" />
                  </div>
                </div>
              ))}
            </BtCard>
          ) : filteredNotifications.length === 0 ? (
            <BtCard>
              <BtEmpty
                icon={Bell}
                title={emptyCopy.title}
                message={emptyCopy.message}
                actionLabel={filter !== 'all' ? 'Show all notifications' : undefined}
                onAction={filter !== 'all' ? () => setFilter('all') : undefined}
              />
            </BtCard>
          ) : (
            <BtCard padding={0} style={{ overflow: 'hidden' }}>
              {filteredNotifications.map((n, idx) => {
                const id = n._id || n.id;
                const isRead = n.read === true;
                const rawType = typeOf(n);

                let config = TYPE_CONFIG.system;
                for (const k of Object.keys(TYPE_CONFIG)) {
                  if (rawType.includes(k)) {
                    config = TYPE_CONFIG[k];
                    break;
                  }
                }
                const IconComponent = config.icon;
                const open = () => handleOpenNotification(n);

                return (
                  <div
                    key={id || idx}
                    role="button"
                    tabIndex={0}
                    aria-label={`${isRead ? '' : 'Unread. '}${n.title || 'Notification'}`}
                    className="bt-hover-row"
                    onClick={open}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        open();
                      }
                    }}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      padding: '16px 20px',
                      cursor: 'pointer',
                      borderBottom: idx === filteredNotifications.length - 1 ? 'none' : '1px solid var(--line)',
                    }}
                  >
                    {/* Unread marker */}
                    {!isRead && (
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 14,
                          bottom: 14,
                          width: 4,
                          borderRadius: '0 4px 4px 0',
                          background: 'var(--accent)',
                        }}
                      />
                    )}

                    <span
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 'var(--r-tile)',
                        background: config.bg,
                        color: config.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconComponent size={20} strokeWidth={1.85} />
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-ui)',
                            fontSize: 15,
                            fontWeight: isRead ? 500 : 700,
                            color: 'var(--ink)',
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {n.title || 'Notification'}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-ui)',
                            fontSize: 13,
                            color: 'var(--ink-3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          <Clock size={12} />
                          {formatTimeAgo(n.createdAt)}
                        </span>
                      </div>

                      {(n.message || n.body) && (
                        <p
                          style={{
                            margin: '3px 0 10px',
                            fontFamily: 'var(--font-ui)',
                            fontSize: 14,
                            lineHeight: 1.45,
                            color: isRead ? 'var(--ink-3)' : 'var(--ink-2)',
                          }}
                        >
                          {n.message || n.body}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: n.message || n.body ? 0 : 8 }}>
                        <BtBadge label={config.label} tone={config.tone} showDot={false} />
                        {!isRead && <BtBadge label="New" tone="brand" />}
                        {config.route && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                              fontFamily: 'var(--font-ui)',
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--ink-2)',
                            }}
                          >
                            Open
                            <ChevronRight size={14} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </BtCard>
          )}
        </div>
      </BtSheet>
    </div>
  );
}
