import { useEffect, useState } from 'react';
import { API_URL } from '../api';

function NotificationsForecasting() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/notifications`);
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        setNotifications(data);
      } catch (error) {
        console.error(error);
      }
    };

    load();
  }, []);

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Smart Operations</p>
          <h2>Notifications & Forecasting</h2>
        </div>
      </div>

      <div className="content-grid">
        <div className="panel">
          <h3>Alerts</h3>
          <ul className="activity-list">
            {notifications.length === 0 ? (
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
          <h3>Demand Forecasting</h3>
          <p style={{ color: '#c8d3e2' }}>Forecasting engine ready for historical sales integration.</p>
          <div className="panel" style={{ marginTop: '12px' }}>
            <p>Suggested reorder: Paracetamol • 120 units</p>
            <p>Suggested reorder: Amoxicillin • 60 units</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationsForecasting;
