import { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  onListChange,
  dismissNotification,
  dismissAll,
  initNotifications,
} from '../utils/notificationStore';

const TYPE_CONFIG = {
  SALE_COMPLETED: { icon: '💰', color: '#22c55e', route: '/sales' },
  MEDICINES_CHANGED: { icon: '💊', color: '#6366f1', route: '/medicines' },
  IMPORT_COMPLETED: { icon: '📥', color: '#f59e0b', route: '/medicines' },
  LOW_STOCK: { icon: '⚠️', color: '#ef4444', route: '/medicines' },
  OUT_OF_STOCK: { icon: '🚫', color: '#ef4444', route: '/medicines' },
  MEDICINE_ADDED: { icon: '💊', color: '#22c55e', route: '/medicines' },
  MEDICINE_UPDATED: { icon: '✏️', color: '#6366f1', route: '/medicines' },
  MEDICINE_DELETED: { icon: '🗑️', color: '#ef4444', route: '/medicines' },
  RECEIPT_GENERATED: { icon: '🧾', color: '#06b6d4', route: '/receipts' },
  EXCEL_IMPORT: { icon: '📥', color: '#f59e0b', route: '/medicines' },
};

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const NotificationCard = memo(function NotificationCard({ notification, onDismiss, onNavigate }) {
  const config = TYPE_CONFIG[notification.type] || { icon: '🔔', color: '#8ca0bb', route: '/notifications' };
  const [removing, setRemoving] = useState(false);

  const handleClick = useCallback(() => {
    setRemoving(true);
    onDismiss(notification.id);
    onNavigate(config.route);
  }, [notification.id, config.route, onDismiss, onNavigate]);

  const handleDismiss = useCallback((e) => {
    e.stopPropagation();
    setRemoving(true);
    onDismiss(notification.id);
  }, [notification.id, onDismiss]);

  return (
    <div
      className={`notif-card ${removing ? 'notif-removing' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
      style={{ borderLeftColor: config.color }}
    >
      <div className="notif-card-icon">{config.icon}</div>
      <div className="notif-card-body">
        <div className="notif-card-top">
          <strong>{notification.title}</strong>
          <small className="notif-time">{timeAgo(notification.createdAt)}</small>
        </div>
        <p className="notif-message">{notification.message}</p>
        <div className="notif-card-footer">
          <span className="notif-type-badge" style={{ background: `${config.color}20`, color: config.color }}>
            {notification.type.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
      <button
        className="notif-close-btn"
        type="button"
        onClick={handleDismiss}
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
});

function NotificationsForecasting() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    initNotifications();
    const unsubList = onListChange((list) => {
      setNotifications(list);
      setLoading(false);
    });
    return unsubList;
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleDismiss = useCallback((id) => {
    dismissNotification(id);
  }, []);

  const handleDismissAll = useCallback(() => {
    dismissAll();
  }, []);

  const handleNavigate = useCallback((route) => {
    navigate(route);
  }, [navigate]);

  return (
    <div className="medicine-page">
      {toast && <div className="status-banner error-banner">{toast}</div>}

      <div className="page-header">
        <div>
          <p className="eyebrow">Smart Operations</p>
          <h2>Notifications &amp; Alerts</h2>
        </div>
        {notifications.length > 0 && (
          <button className="ghost-btn" type="button" onClick={handleDismissAll}>
            Clear All ({notifications.length})
          </button>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Alerts</h3>
          {notifications.length > 0 && <span className="badge badge-active">{notifications.length} unread</span>}
        </div>

        {loading ? (
          <div className="notif-loading">
            <div className="spinner" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">
            <div className="notif-empty-icon">🔔</div>
            <p>No new notifications.</p>
            <span>You&apos;re all caught up!</span>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onDismiss={handleDismiss}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(NotificationsForecasting);
