import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { authFetch, API_URL } from '../api';
import { subscribe, Events } from '../store';

const NotificationItem = memo(function NotificationItem({ notification, onMarkRead }) {
  return (
    <li key={notification.id} className={notification.isRead ? '' : 'unread-notification'}>
      <div className="notif-header">
        <strong>{notification.title}</strong>
        {!notification.isRead && (
          <button className="ghost-btn small-btn" type="button" onClick={() => onMarkRead(notification.id)}>
            Mark Read
          </button>
        )}
      </div>
      <span>{notification.message}</span>
      <small>{notification.type} &middot; {new Date(notification.createdAt).toLocaleString()}</small>
    </li>
  );
});

const LowStockItem = memo(function LowStockItem({ med }) {
  return (
    <li key={med.id}>
      <strong>{med.name}</strong>
      <span>
        {med.quantity === 0
          ? 'Out of stock'
          : `${med.quantity} unit${med.quantity === 1 ? '' : 's'} remaining`}
      </span>
    </li>
  );
});

function NotificationsForecasting() {
  const [notifications, setNotifications] = useState([]);
  const [lowStockMedicines, setLowStockMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [notifRes, medRes] = await Promise.all([
          authFetch(`${API_URL}/notifications`),
          authFetch(`${API_URL}/medicines`),
        ]);
        if (notifRes.ok) setNotifications(await notifRes.json());
        if (medRes.ok) {
          const data = await medRes.json();
          setLowStockMedicines(data.filter((m) => m.quantity <= 10).sort((a, b) => a.quantity - b.quantity));
        }
      } catch (error) {
        console.error('[Notifications] Load error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const unsubSale = subscribe(Events.SALE_COMPLETED, loadData);
    const unsubMed = subscribe(Events.MEDICINES_CHANGED, loadData);
    return () => { unsubSale(); unsubMed(); };
  }, []);

  const handleMarkAsRead = useCallback(async (id) => {
    try {
      await authFetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await authFetch(`${API_URL}/notifications/read-all`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const unreadCount = useMemo(() =>
    notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Smart Operations</p>
          <h2>Notifications &amp; Stock Alerts</h2>
        </div>
        {unreadCount > 0 && (
          <button className="ghost-btn" type="button" onClick={handleMarkAllAsRead}>
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      <div className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Alerts</h3>
            {unreadCount > 0 && <span className="badge badge-active">{unreadCount} unread</span>}
          </div>
          <ul className="activity-list">
            {loading ? (
              <li>Loading notifications...</li>
            ) : notifications.length === 0 ? (
              <li className="empty-state">No notifications yet.</li>
            ) : (
              notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onMarkRead={handleMarkAsRead} />
              ))
            )}
          </ul>
        </div>

        <div className="panel">
          <h3>Low Stock Medicines</h3>
          {loading ? (
            <p className="loading-state">Loading...</p>
          ) : lowStockMedicines.length === 0 ? (
            <p className="empty-state">All medicines are adequately stocked.</p>
          ) : (
            <ul className="activity-list">
              {lowStockMedicines.map((med) => (
                <LowStockItem key={med.id} med={med} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(NotificationsForecasting);
