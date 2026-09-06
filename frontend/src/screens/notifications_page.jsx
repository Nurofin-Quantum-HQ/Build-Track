import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, radius } from '../styles/designTokens';
import { Card, Badge, Button, EmptyState } from '../components/ui';
import { Bell, CheckCheck, Trash2, ArrowLeft, CheckCircle, DollarSign, Package, Building2, User, Shield } from 'lucide-react';
import { notificationAPI } from '../api';

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
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
  payment: <DollarSign size={18} />,
  inventory: <Package size={18} />,
  project: <Building2 size={18} />,
  worker: <User size={18} />,
  system: <Bell size={18} />,
};

const typeColors = {
  approval: { bg: '#FFF5F0', color: '#F97316' },
  payment: { bg: '#F0FDF4', color: '#22C55E' },
  inventory: { bg: '#FFF7ED', color: '#F97316' },
  project: { bg: '#FFF7F0', color: '#EA580C' },
  worker: { bg: '#FFF5F0', color: '#FB923C' },
  system: { bg: '#F1F5F9', color: '#64748B' },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    notificationAPI.getAll().then(res => {
      setNotifications(res.data || []);
    }).catch(err => console.error(err));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = filter === 'all' ? notifications : filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const markAllRead = () => {
    notificationAPI.markAllAsRead().then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  };

  const clearAll = () => {
    notificationAPI.clearAll().then(() => {
      setNotifications([]);
    });
  };

  const markAsRead = (id) => {
    notificationAPI.markAsRead(id).then(() => {
      setNotifications((prev) => prev.map((item) => (item._id || item.id) === id ? { ...item, read: true } : item));
    });
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)}
            style={{ border: 'none', background: '#F1F5F9', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            <ArrowLeft size={16} />
          </button>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.03em' }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ marginLeft: 8, background: '#EF4444', color: '#FFF', fontSize: 12, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                {unreadCount}
              </span>
            )}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" icon={<CheckCheck size={12} />} onClick={markAllRead}>
              Mark All Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="secondary" size="sm" icon={<Trash2 size={12} />} onClick={clearAll} style={{ color: '#EF4444' }}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'all', label: 'All', count: notifications.length },
          { id: 'unread', label: 'Unread', count: unreadCount },
        ].map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: filter === t.id ? 'none' : `1px solid #E5E7EB`,
              background: filter === t.id ? '#F97316' : '#fff',
              color: filter === t.id ? '#FFF' : '#64748B',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}>
            {t.label}
            <span style={{ background: filter === t.id ? 'rgba(255,255,255,0.2)' : '#F1F5F9', padding: '1px 8px', borderRadius: 10, fontSize: 12 }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Bell size={22} />} title="No Notifications" description={filter === 'unread' ? 'No unread notifications.' : "You're all caught up!"} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((n) => {
            const tc = typeColors[n.type] || typeColors.system;
            return (
              <Card key={n._id || n.id} padding="16px 20px" hoverable
                onClick={() => markAsRead(n._id || n.id)}
                style={{ opacity: n.read ? 0.7 : 1, borderLeft: n.read ? `1px solid #E5E7EB` : `3px solid #F97316` }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: n.read ? '#F1F5F9' : tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: n.read ? '#94A3B8' : tc.color, flexShrink: 0 }}>
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
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
