import { useEffect, useState } from 'react';
import { API_URL } from '../api';

function NotificationsForecasting() {
  const [notifications, setNotifications] = useState([]);
  const [lowStockMedicines, setLowStockMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [notifRes, medRes] = await Promise.all([
          fetch(`${API_URL}/notifications`),
          fetch(`${API_URL}/medicines`),
        ])

        if (cancelled) return

        if (notifRes.ok) {
          const data = await notifRes.json()
          setNotifications(data)
        }

        if (medRes.ok) {
          const data = await medRes.json()
          setLowStockMedicines(
            data.filter((m) => m.quantity <= 10).sort((a, b) => a.quantity - b.quantity)
          )
        }
      } catch (error) {
        console.error('[Notifications] Load error:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Smart Operations</p>
          <h2>Notifications & Stock Alerts</h2>
        </div>
      </div>

      <div className="content-grid">
        <div className="panel">
          <h3>Alerts</h3>
          <ul className="activity-list">
            {loading ? (
              <li>Loading notifications...</li>
            ) : notifications.length === 0 ? (
              <li>No notifications yet.</li>
            ) : (
              notifications.map((notification) => (
                <li key={notification.id}>
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                  <small>{notification.type}</small>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="panel">
          <h3>Low Stock Medicines</h3>
          {loading ? (
            <p style={{ color: '#c8d3e2' }}>Loading...</p>
          ) : lowStockMedicines.length === 0 ? (
            <p style={{ color: '#c8d3e2' }}>All medicines are adequately stocked.</p>
          ) : (
            <ul className="activity-list">
              {lowStockMedicines.map((med) => (
                <li key={med.id}>
                  <strong>{med.name}</strong>
                  <span>
                    {med.quantity === 0
                      ? 'Out of stock'
                      : `${med.quantity} unit${med.quantity === 1 ? '' : 's'} remaining`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationsForecasting;
