import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, radius } from '../styles/designTokens';
import { Card, Badge, Button, EmptyState } from '../components/ui';
import {
  Bell, CheckCheck, Trash2, ArrowLeft, CheckCircle, IndianRupee,
  Package, Building2, User, Shield, AlertTriangle, RotateCw,
  ClipboardList, ArrowRight, Clock
} from 'lucide-react';
import useNotificationStore from '../stores/notificationStore';
import { notificationAPI } from '../api';

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Just now';
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const typeIcons = {
  approval: <CheckCircle size={18} />,
  payment: <IndianRupee size={18} />,
  inventory: <Package size={18} />,
  project: <Building2 size={18} />,
  worker: <User size={18} />,
  task: <Shield size={18} />,
  system: <Bell size={18} />,
};

const typeColors = {
  approval: { bg: '#FFF5F0', color: '#F97316' },
  payment: { bg: '#F0FDF4', color: '#22C55E' },
  inventory: { bg: '#FFF7ED', color: '#F97316' },
  project: { bg: '#FFF7F0', color: '#EA580C' },
  worker: { bg: '#FFF5F0', color: '#FB923C' },
  task: { bg: '#EEF2FF', color: '#4F46E5' },
  system: { bg: '#F1F5F9', color: '#64748B' },
};

function targetRouteFor(n) {
  switch (n.relatedModel) {
    case "Transaction": return "/transaction";
    case "Inventory": return "/inventory";
    case "Task": return "/assign-task";
    case "Project": return "/projects";
    case "Payment": return "/subscription";
    default: return null;
  }
}

function SkeletonRow() {
  return (
    <Card padding="16px 20px" style={{ opacity: 0.7 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F1F5F9', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '45%', height: 14, background: '#E5E7EB', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ width: '80%', height: 12, background: '#F1F5F9', borderRadius: 6 }} />
        </div>
      </div>
    </Card>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const {
    systemNotifications,
    inventoryAlerts,
    tasks,
    loading,
    fetchAll,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotificationStore();

  useEffect(() => {
    fetchAll(true);
  }, [fetchAll]);

  const unreadSystemCount = systemNotifications.filter((n) => !n.read).length;
  const totalAlertsCount = inventoryAlerts.length;
  const totalCount = systemNotifications.length + inventoryAlerts.length + tasks.length;
  const unreadTotal = unreadSystemCount + totalAlertsCount;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 760, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              border: 'none',
              background: '#F1F5F9',
              cursor: 'pointer',
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              transition: 'background 0.15s',
            }}
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.03em' }}>
                Notifications
              </h2>
              <span
                style={{
                  background: totalAlertsCount > 0 ? '#F97316' : '#22C55E',
                  color: '#FFF',
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {loading ? '...' : totalAlertsCount > 0 ? `${totalAlertsCount} ALERTS` : 'HEALTHY'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => fetchAll(true)}
            disabled={loading}
            title="Refresh"
            style={{
              border: '1px solid #E5E7EB',
              background: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: 36,
              height: 36,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              transition: 'all 0.15s',
            }}
          >
            <RotateCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          {unreadSystemCount > 0 && (
            <Button variant="secondary" size="sm" icon={<CheckCheck size={12} />} onClick={markAllAsRead}>
              Mark Read
            </Button>
          )}
          {systemNotifications.length > 0 && (
            <Button variant="secondary" size="sm" icon={<Trash2 size={12} />} onClick={clearAll} style={{ color: '#EF4444' }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { id: 'all', label: 'All', count: totalCount },
          { id: 'alerts', label: 'Low Stock Alerts', count: inventoryAlerts.length, isWarning: inventoryAlerts.length > 0 },
          { id: 'tasks', label: 'Task Updates', count: tasks.length },
          { id: 'system', label: 'System', count: systemNotifications.length },
          { id: 'unread', label: 'Unread', count: unreadTotal },
        ].map((t) => {
          const isActive = filter === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: isActive ? 'none' : '1px solid #E5E7EB',
                background: isActive ? '#F97316' : '#fff',
                color: isActive ? '#FFF' : '#64748B',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                boxShadow: isActive ? '0 4px 10px rgba(249, 115, 22, 0.25)' : 'none',
              }}
            >
              {t.label}
              <span
                style={{
                  background: isActive
                    ? 'rgba(255,255,255,0.25)'
                    : t.isWarning
                    ? '#FFF5F0'
                    : '#F1F5F9',
                  color: isActive
                    ? '#FFF'
                    : t.isWarning
                    ? '#F97316'
                    : '#64748B',
                  padding: '1px 7px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Low Stock Alerts Section (Flutter match) */}
        {(filter === 'all' || filter === 'alerts' || (filter === 'unread' && inventoryAlerts.length > 0)) && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Today</span>
                <span
                  style={{
                    background: '#F97316',
                    color: '#FFF',
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                >
                  {inventoryAlerts.length > 0 ? `${inventoryAlerts.length} ALERTS` : 'NO ALERTS'}
                </span>
              </div>
            </div>

            {inventoryAlerts.length === 0 ? (
              filter === 'alerts' ? (
                <div
                  style={{
                    padding: '24px',
                    background: '#fff',
                    borderRadius: 16,
                    border: '1px solid #E5E7EB',
                    textAlign: 'center',
                    color: '#64748B',
                    fontSize: 14,
                  }}
                >
                  All inventory levels are looking healthy! 🎉
                </div>
              ) : (
                <div
                  style={{
                    padding: '14px 18px',
                    background: '#F0FDF4',
                    borderRadius: 12,
                    border: '1px solid #BBF7D0',
                    color: '#166534',
                    fontSize: 13,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>🎉</span> All inventory levels are looking healthy!
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {inventoryAlerts.map((item, idx) => {
                  const itemId = item._id || item.id || `inv-${idx}`;
                  const name = item.materialName || item.name || 'Material';
                  const stock = item.closingStock ?? item.stock ?? 0;
                  const unit = item.unit || 'units';
                  const threshold = item.threshold ?? 10;
                  const projectName = item.project?.projectName || item.projectName || '';

                  return (
                    <div
                      key={itemId}
                      onClick={() => navigate('/inventory')}
                      style={{
                        padding: '16px 20px',
                        background: '#FFF',
                        borderRadius: 16,
                        border: '1px solid #FED7AA',
                        borderLeft: '4px solid #F97316',
                        boxShadow: '0 4px 14px rgba(249, 115, 22, 0.08)',
                        cursor: 'pointer',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 18px rgba(249, 115, 22, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(249, 115, 22, 0.08)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: '#FFF8EE',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#F97316',
                          }}
                        >
                          <AlertTriangle size={18} />
                        </div>
                        <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                          Just now
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F97316' }} />
                        <span style={{ color: '#F97316', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
                          INVENTORY WARNING
                        </span>
                        {projectName && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontSize: 11,
                              background: '#F1F5F9',
                              color: '#475569',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontWeight: 500,
                            }}
                          >
                            {projectName}
                          </span>
                        )}
                      </div>

                      <h4 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
                        Low Stock: {name}
                      </h4>

                      <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                        Only <strong style={{ color: '#DC2626' }}>{stock} {unit}</strong> remaining (Threshold: {threshold}). Re-order is recommended to avoid site delays.
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#F97316',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          Manage in Inventory <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tasks Updates Section (Flutter match) */}
        {(filter === 'all' || filter === 'tasks') && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Tasks Updates</span>
              {tasks.length > 0 && (
                <span
                  style={{
                    background: '#EFF6FF',
                    color: '#2563EB',
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontWeight: 700,
                  }}
                >
                  {tasks.length} {tasks.length === 1 ? 'TASK' : 'TASKS'}
                </span>
              )}
            </div>

            {tasks.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  background: '#fff',
                  borderRadius: 16,
                  border: '1px solid #E5E7EB',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: 14,
                }}
              >
                No task updates for today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tasks.map((task, idx) => {
                  const taskId = task._id || task.id || `task-${idx}`;
                  const isCompleted = task.status === 'Completed';
                  const accentColor = isCompleted ? '#22C55E' : '#2563EB';

                  return (
                    <div
                      key={taskId}
                      onClick={() => navigate('/assign-task')}
                      style={{
                        padding: '16px 20px',
                        background: '#FFF',
                        borderRadius: 16,
                        border: `1px solid ${isCompleted ? '#BBF7D0' : '#DBEAFE'}`,
                        borderLeft: `4px solid ${accentColor}`,
                        boxShadow: `0 4px 14px ${isCompleted ? 'rgba(34, 197, 94, 0.08)' : 'rgba(37, 99, 235, 0.08)'}`,
                        cursor: 'pointer',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: isCompleted ? '#F0FDF4' : '#EFF6FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: accentColor,
                          }}
                        >
                          {isCompleted ? <CheckCircle size={18} /> : <ClipboardList size={18} />}
                        </div>
                        <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                          {task.time || 'Today'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: accentColor }} />
                        <span style={{ color: accentColor, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
                          TASK UPDATE
                        </span>
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: 11,
                            background: isCompleted ? '#DCFCE7' : '#DBEAFE',
                            color: isCompleted ? '#15803D' : '#1E40AF',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontWeight: 600,
                          }}
                        >
                          {task.status || 'Pending'}
                        </span>
                      </div>

                      <h4 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
                        Task: {task.title}
                      </h4>

                      <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                        {task.description ? task.description : `Status: ${task.status}`}
                        {task.assignee && ` • Assigned to: ${task.assignee}`}
                        {task.floorName && ` • ${task.floorName}`}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: accentColor,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          View in Tasks <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* System & Approvals Section */}
        {(filter === 'all' || filter === 'system' || filter === 'unread') && systemNotifications.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>System & Approvals</span>
              {unreadSystemCount > 0 && (
                <span
                  style={{
                    background: '#EF4444',
                    color: '#FFF',
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontWeight: 700,
                  }}
                >
                  {unreadSystemCount} UNREAD
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(filter === 'unread' ? systemNotifications.filter((n) => !n.read) : systemNotifications).map((n) => {
                const nId = n._id || n.id;
                const tc = typeColors[n.type] || typeColors.system;

                return (
                  <div
                    key={nId}
                    onClick={() => {
                      if (!n.read) markAsRead(nId);
                      const target = targetRouteFor(n);
                      if (target) navigate(target);
                      else if (n.type === 'approval') navigate('/approvals');
                      else if (n.type === 'inventory') navigate('/inventory');
                      else if (n.type === 'payment') navigate('/transaction');
                    }}
                    style={{
                      padding: '16px 20px',
                      background: '#FFF',
                      borderRadius: 16,
                      border: '1px solid #E5E7EB',
                      borderLeft: n.read ? '3px solid #E2E8F0' : '4px solid #F97316',
                      opacity: n.read ? 0.75 : 1,
                      cursor: 'pointer',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: n.read ? '#F1F5F9' : tc.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: n.read ? '#94A3B8' : tc.color,
                          flexShrink: 0,
                        }}
                      >
                        {typeIcons[n.type] || <Bell size={18} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <h4 style={{ fontSize: 14, fontWeight: n.read ? 500 : 700, color: '#111827', margin: 0 }}>
                            {n.title}
                          </h4>
                          <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0, marginLeft: 8 }}>
                            {formatTimeAgo(n.createdAt || n.time)}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                          {n.message}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Empty State if completely nothing found */}
        {totalCount === 0 && !loading && (
          <EmptyState
            icon={<Bell size={24} />}
            title="No Notifications"
            description="You're all caught up! There are no inventory alerts, task updates, or unread messages."
          />
        )}
      </div>
    </div>
  );
}