import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  ArrowLeft,
  CheckCircle,
  IndianRupee,
  Building2,
  User,
  Shield,
  RotateCw,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import useNotificationStore from '../stores/notificationStore';
import BtHero from '../components/ui/BtHero';
import BtSheet from '../components/ui/BtSheet';
import BtPressable from '../components/ui/BtPressable';
import BtCard from '../components/ui/BtCard';
import BtEmpty from '../components/ui/BtEmpty';

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

const TYPE_CONFIG = {
  approval: {
    icon: CheckCircle,
    color: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.1)',
    label: 'Approval',
    route: '/approvals',
  },
  payment: {
    icon: IndianRupee,
    color: '#16A34A',
    bg: 'rgba(22, 163, 74, 0.1)',
    label: 'Payment',
    route: '/transaction',
  },
  transaction: {
    icon: IndianRupee,
    color: '#16A34A',
    bg: 'rgba(22, 163, 74, 0.1)',
    label: 'Finance',
    route: '/transaction',
  },
  task: {
    icon: Shield,
    color: '#4F46E5',
    bg: 'rgba(79, 70, 229, 0.1)',
    label: 'Task',
    route: '/assign-task',
  },
  project: {
    icon: Building2,
    color: '#7C3AED',
    bg: 'rgba(124, 58, 237, 0.1)',
    label: 'Project',
    route: '/projects',
  },
  worker: {
    icon: User,
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.1)',
    label: 'Team',
    route: '/admin',
  },
  subscription: {
    icon: Sparkles,
    color: 'var(--accent, #E0A93B)',
    bg: 'rgba(224, 169, 59, 0.12)',
    label: 'Billing',
    route: '/subscription',
  },
  system: {
    icon: Bell,
    color: '#64748B',
    bg: 'rgba(100, 116, 139, 0.1)',
    label: 'System',
    route: null,
  },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'approval' | 'payment' | 'task' | 'project'

  const {
    systemNotifications,
    loading,
    fetchAll,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotificationStore();

  useEffect(() => {
    fetchAll(true);
  }, [fetchAll]);

  const notifications = useMemo(() => {
    return Array.isArray(systemNotifications) ? systemNotifications : [];
  }, [systemNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const countsByType = useMemo(() => {
    const counts = { all: notifications.length, unread: unreadCount, approval: 0, payment: 0, task: 0, project: 0 };
    notifications.forEach((n) => {
      const type = (n.type || n.relatedModel || '').toLowerCase();
      if (type.includes('approval')) counts.approval++;
      else if (type.includes('payment') || type.includes('transaction')) counts.payment++;
      else if (type.includes('task')) counts.task++;
      else if (type.includes('project')) counts.project++;
    });
    return counts;
  }, [notifications, unreadCount]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    if (filter === 'approval') {
      return notifications.filter((n) => (n.type || n.relatedModel || '').toLowerCase().includes('approval'));
    }
    if (filter === 'payment') {
      return notifications.filter((n) => {
        const t = (n.type || n.relatedModel || '').toLowerCase();
        return t.includes('payment') || t.includes('transaction');
      });
    }
    if (filter === 'task') {
      return notifications.filter((n) => (n.type || n.relatedModel || '').toLowerCase().includes('task'));
    }
    if (filter === 'project') {
      return notifications.filter((n) => (n.type || n.relatedModel || '').toLowerCase().includes('project'));
    }
    return notifications;
  }, [notifications, filter]);

  const handleOpenNotification = useCallback(
    (n) => {
      const id = n._id || n.id;
      if (id && !n.read) {
        markAsRead(id);
      }

      // Check target route
      const type = (n.type || n.relatedModel || '').toLowerCase();
      let targetRoute = null;
      if (type.includes('approval')) targetRoute = '/approvals';
      else if (type.includes('payment') || type.includes('transaction')) targetRoute = '/transaction';
      else if (type.includes('task')) targetRoute = '/assign-task';
      else if (type.includes('project')) targetRoute = '/projects';
      else if (type.includes('subscription')) targetRoute = '/subscription';

      if (targetRoute) {
        navigate(targetRoute);
      }
    },
    [markAsRead, navigate]
  );

  const tabs = [
    { id: 'all', label: 'All', count: countsByType.all },
    { id: 'unread', label: 'Unread', count: countsByType.unread, isAlert: countsByType.unread > 0 },
    { id: 'approval', label: 'Approvals', count: countsByType.approval },
    { id: 'payment', label: 'Finance', count: countsByType.payment },
    { id: 'task', label: 'Tasks', count: countsByType.task },
    { id: 'project', label: 'Projects', count: countsByType.project },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-ground, #F2F0EB)' }}>
      {/* ── TOP HERO BANNER (Blueprint Noir) ── */}
      <BtHero padding="24px 28px 48px">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            {/* Breadcrumb row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <BtPressable
                onClick={() => navigate(-1)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'rgba(255, 255, 255, 0.72)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </BtPressable>
              <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>/</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--accent, #E0A93B)',
                  fontWeight: 700,
                }}
              >
                INBOX · ACTIVITY STREAM
              </span>
            </div>

            {/* Title & Status Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 32,
                  fontWeight: 700,
                  color: 'var(--bone)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Notifications
              </h1>
              <span
                style={{
                  background: unreadCount > 0 ? 'var(--accent, #E0A93B)' : 'rgba(255, 255, 255, 0.12)',
                  color: unreadCount > 0 ? 'var(--noir, #0C0E12)' : 'var(--bone)',
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {unreadCount > 0 ? `${unreadCount} UNREAD` : 'ALL CAUGHT UP'}
              </span>
            </div>

            <p
              style={{
                color: 'rgba(255, 255, 255, 0.65)',
                margin: 0,
                fontSize: 14,
                maxWidth: 580,
                lineHeight: 1.5,
              }}
            >
              Real-time feed for site submissions, supervisor sign-offs, transaction receipts, and milestone dispatches.
            </p>
          </div>

          {/* Action buttons on dark hero */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => fetchAll(true)}
              disabled={loading}
              title="Refresh Notifications"
              style={{
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(255, 255, 255, 0.08)',
                cursor: loading ? 'not-allowed' : 'pointer',
                width: 38,
                height: 38,
                borderRadius: 'var(--r-btn, 12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bone)',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            >
              <RotateCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  padding: '0 14px',
                  height: 38,
                  borderRadius: 'var(--r-btn, 12px)',
                  background: 'var(--bone, #F6F4EF)',
                  color: 'var(--noir, #0C0E12)',
                  border: 'none',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--font-ui)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  transition: 'opacity 120ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <CheckCheck size={15} />
                <span>Mark All Read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear all notifications?')) {
                    clearAll();
                  }
                }}
                style={{
                  padding: '0 12px',
                  height: 38,
                  borderRadius: 'var(--r-btn, 12px)',
                  background: 'rgba(220, 38, 38, 0.14)',
                  color: '#F87171',
                  border: '1px solid rgba(220, 38, 38, 0.28)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--font-ui)',
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(220, 38, 38, 0.22)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(220, 38, 38, 0.14)')}
              >
                <Trash2 size={14} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      </BtHero>

      {/* ── MAIN CONTENT (Overlapping BtSheet) ── */}
      <BtSheet overlap={26} padding="24px 28px 64px">
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 20,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: 4,
            }}
          >
            {tabs.map((t) => {
              const isActive = filter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--r-btn, 12px)',
                    border: isActive ? '1px solid var(--ink, #111317)' : '1px solid var(--line, rgba(0,0,0,0.08))',
                    background: isActive ? 'var(--ink, #111317)' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : 'var(--ink-2, #475569)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    fontFamily: 'var(--font-ui)',
                    whiteSpace: 'nowrap',
                    transition: 'all 120ms ease',
                    boxShadow: isActive ? '0 2px 6px rgba(17, 19, 23, 0.16)' : 'none',
                  }}
                >
                  <span>{t.label}</span>
                  <span
                    style={{
                      background: isActive
                        ? 'rgba(255, 255, 255, 0.22)'
                        : t.isAlert
                        ? 'rgba(224, 169, 59, 0.18)'
                        : 'var(--fill, #F1F3F5)',
                      color: isActive
                        ? '#FFFFFF'
                        : t.isAlert
                        ? 'var(--accent, #E0A93B)'
                        : 'var(--ink-3, #64748B)',
                      padding: '1px 7px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Loading Skeleton */}
          {loading && notifications.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid var(--line, rgba(0,0,0,0.08))',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: 'var(--fill, #F1F3F5)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: '35%', height: 14, background: 'var(--fill, #F1F3F5)', borderRadius: 6, marginBottom: 8 }} />
                    <div style={{ width: '70%', height: 12, background: 'var(--fill, #F1F3F5)', borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            /* Empty State */
            <BtEmpty
              icon={Bell}
              title={filter === 'unread' ? 'All Caught Up!' : 'No Notifications'}
              description={
                filter === 'unread'
                  ? 'You have reviewed all incoming items. New alerts will show up here.'
                  : 'There are no notifications matching the selected filter.'
              }
              action={
                filter !== 'all' ? (
                  <button
                    onClick={() => setFilter('all')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--r-btn, 12px)',
                      background: 'var(--ink, #111317)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    View All Notifications
                  </button>
                ) : null
              }
            />
          ) : (
            /* Notification Cards List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredNotifications.map((n) => {
                const id = n._id || n.id;
                const isRead = n.read === true;
                const rawType = (n.type || n.relatedModel || '').toLowerCase();

                let config = TYPE_CONFIG.system;
                for (const k of Object.keys(TYPE_CONFIG)) {
                  if (rawType.includes(k)) {
                    config = TYPE_CONFIG[k];
                    break;
                  }
                }
                const IconComponent = config.icon;

                return (
                  <div
                    key={id}
                    onClick={() => handleOpenNotification(n)}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 14,
                      border: isRead
                        ? '1px solid var(--line, rgba(0,0,0,0.08))'
                        : '1px solid rgba(224, 169, 59, 0.45)',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      cursor: 'pointer',
                      transition: 'all 140ms ease',
                      boxShadow: isRead ? '0 1px 3px rgba(0,0,0,0.03)' : '0 3px 12px rgba(224, 169, 59, 0.10)',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = isRead
                        ? '0 1px 3px rgba(0,0,0,0.03)'
                        : '0 3px 12px rgba(224, 169, 59, 0.10)';
                    }}
                  >
                    {/* Unread Accent Indicator on Left edge */}
                    {!isRead && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 14,
                          bottom: 14,
                          width: 4,
                          borderRadius: '0 4px 4px 0',
                          background: 'var(--accent, #E0A93B)',
                        }}
                      />
                    )}

                    {/* Circular Avatar Icon */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: config.bg,
                        color: config.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IconComponent size={20} />
                    </div>

                    {/* Notification Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: isRead ? 600 : 700,
                              color: 'var(--ink, #111317)',
                              fontFamily: 'var(--font-ui)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {n.title || 'Notification'}
                          </span>
                          {!isRead && (
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: 'var(--accent, #E0A93B)',
                                flexShrink: 0,
                              }}
                              title="Unread"
                            />
                          )}
                        </div>

                        {/* Relative Time */}
                        <div
                          style={{
                            fontSize: 11.5,
                            color: 'var(--ink-3, #8C92A0)',
                            fontFamily: 'var(--font-mono)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          <Clock size={11} />
                          <span>{formatTimeAgo(n.createdAt)}</span>
                        </div>
                      </div>

                      {/* Body Message */}
                      <p
                        style={{
                          margin: '0 0 8px',
                          fontSize: 13,
                          color: isRead ? 'var(--ink-2, #475569)' : 'var(--ink, #111317)',
                          lineHeight: 1.45,
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        {n.message || n.body || ''}
                      </p>

                      {/* Meta Footer */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: config.bg,
                            color: config.color,
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {config.label}
                        </span>

                        {config.route && (
                          <span
                            style={{
                              fontSize: 11.5,
                              color: 'var(--ink-3, #8C92A0)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <span>Open</span>
                            <ChevronRight size={12} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </BtSheet>
    </div>
  );
}
