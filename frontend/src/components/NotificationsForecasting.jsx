import { useEffect, useState, useCallback, memo } from 'react';
import { authFetch, API_URL } from '../api';
import { subscribe, Events } from '../store';

const NotificationItem = memo(function NotificationItem({ notification, onDismiss }) {
  return (
    <li className="unread-notification">
      <div className="notif-header">
        <strong>{notification.title}</strong>
        <button className="ghost-btn small-btn" type="button" onClick={() => onDismiss(notification.id)}>
          Dismiss
        </button>
      </div>
      <span>{notification.message}</span>
      <small>{notification.type} &middot; {new Date(notification.createdAt).toLocaleString()}</small>
    </li>
  );
});

function NotificationsForecasting() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/notifications`);
      if (res.ok) setNotifications(await res.json());
    } catch (error) {
      console.error('[Notifications] Load error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const res = await authFetch(`${API_URL}/notifications`);
        if (!cancelled && res.ok) setNotifications(await res.json());
      } catch (error) {
        console.error('[Notifications] Load error:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    const unsubSale = subscribe(Events.SALE_COMPLETED, loadNotifications);
    const unsubMed = subscribe(Events.MEDICINES_CHANGED, loadNotifications);
    return () => { cancelled = true; unsubSale(); unsubMed(); };
  }, [loadNotifications]);

  const handleDismiss = useCallback(async (id) => {
    try {
      await authFetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleDismissAll = useCallback(async () => {
    try {
      await authFetch(`${API_URL}/notifications/read-all`, { method: 'PATCH' });
      setNotifications([]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Smart Operations</p>
          <h2>Notifications &amp; Alerts</h2>
        </div>
        {notifications.length > 0 && (
          <button className="ghost-btn" type="button" onClick={handleDismissAll}>
            Dismiss All ({notifications.length})
          </button>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Alerts</h3>
          {notifications.length > 0 && <span className="badge badge-active">{notifications.length} unread</span>}
        </div>
        <ul className="activity-list">
          {loading ? (
            <li>Loading notifications...</li>
          ) : notifications.length === 0 ? (
            <li className="empty-state">No unread notifications.</li>
          ) : (
            notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} onDismiss={handleDismiss} />
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export default memo(NotificationsForecasting);
