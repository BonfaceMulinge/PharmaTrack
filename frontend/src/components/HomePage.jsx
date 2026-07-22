import { useEffect, useState, memo, useCallback } from 'react';
import { authFetch, API_URL } from '../api';
import { Events, subscribe } from '../store';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const timeAgo = (dateString) => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const ActivityItem = memo(function ActivityItem({ item }) {
  return (
    <li key={item.id}>
      <strong>{item.title}</strong>
      <span>{item.detail}</span>
      <small>{formatCurrency(item.amount)} &middot; {timeAgo(item.time)}</small>
    </li>
  );
});

const NotificationItem = memo(function NotificationItem({ n }) {
  return (
    <li key={n.id}>
      <strong>{n.title}</strong>
      <span>{n.message}</span>
      <small>{timeAgo(n.createdAt)}</small>
    </li>
  );
});

function HomePage({ onNavigate }) {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayTransactions: 0,
    todayProfit: 0,
    totalMedicines: 0,
    totalUnitsInStock: 0,
    lowStock: 0,
    outOfStock: 0,
    inventoryValue: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [analyticsRes, notifRes] = await Promise.all([
        authFetch(`${API_URL}/reports/analytics`),
        authFetch(`${API_URL}/notifications`),
      ]);
      if (analyticsRes.ok) {
        const a = await analyticsRes.json();
        setStats({
          todayRevenue: a.todayRevenue ?? 0,
          todayTransactions: a.todayTransactions ?? 0,
          todayProfit: a.todayProfit ?? 0,
          totalMedicines: a.medicines ?? 0,
          totalUnitsInStock: a.totalUnitsInStock ?? 0,
          lowStock: a.lowStock ?? 0,
          outOfStock: a.outOfStock ?? 0,
          inventoryValue: a.inventoryValue ?? 0,
        });
        setRecentActivity(a.recentActivity ?? []);
      }
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data.filter((n) => !n.isRead).slice(0, 5));
      }
    };
    loadData();

    const unsubSale = subscribe(Events.SALE_COMPLETED, loadData);
    const unsubMed = subscribe(Events.MEDICINES_CHANGED, loadData);
    return () => { unsubSale(); unsubMed(); };
  }, []);

  const handleNewSale = useCallback(() => onNavigate('sales'), [onNavigate]);
  const handleManageMedicines = useCallback(() => onNavigate('medicines'), [onNavigate]);
  const handleViewSales = useCallback(() => onNavigate('sales'), [onNavigate]);
  const handleViewNotifications = useCallback(() => onNavigate('notifications'), [onNavigate]);

  if (loading) {
    return (
      <div className="home-loading">
        <div className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-card">
          <div className="hero-content">
            <p className="eyebrow">Pharmacy Management System</p>
            <h2>Welcome to PharmaTrack</h2>
            <p className="hero-desc">Manage your inventory, process sales, and track your pharmacy operations from one platform.</p>
            <div className="hero-actions">
              <button className="primary-btn" type="button" onClick={handleNewSale}>
                New Sale
              </button>
              <button className="ghost-btn" type="button" onClick={handleManageMedicines}>
                Manage Medicines
              </button>
            </div>
          </div>
          <div className="hero-metrics">
            <div className="hero-metric-card">
              <strong>{formatCurrency(stats.todayRevenue)}</strong>
              <span>Today&apos;s Revenue</span>
            </div>
            <div className="hero-metric-card">
              <strong>{stats.todayTransactions}</strong>
              <span>Today&apos;s Transactions</span>
            </div>
            <div className="hero-metric-card">
              <strong>{stats.totalMedicines}</strong>
              <span>Total Medicines</span>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-icon stat-icon-green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <p>Today&apos;s Revenue</p>
          <h3>{formatCurrency(stats.todayRevenue)}</h3>
        </article>
        <article className="stat-card">
          <div className="stat-icon stat-icon-blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <p>Transactions</p>
          <h3>{stats.todayTransactions}</h3>
        </article>
        <article className="stat-card">
          <div className="stat-icon stat-icon-purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <p>Today&apos;s Profit</p>
          <h3>{formatCurrency(stats.todayProfit)}</h3>
        </article>
        <article className="stat-card">
          <div className="stat-icon stat-icon-amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
          </div>
          <p>Inventory Value</p>
          <h3>{formatCurrency(stats.inventoryValue)}</h3>
        </article>
      </section>

      <div className="home-grid">
        <article className="panel">
          <div className="panel-header">
            <h3>Quick Overview</h3>
          </div>
          <div className="overview-grid">
            <div className="overview-item">
              <span className="overview-label">Total Medicines</span>
              <span className="overview-value">{stats.totalMedicines}</span>
            </div>
            <div className="overview-item">
              <span className="overview-label">Total Stock Units</span>
              <span className="overview-value">{stats.totalUnitsInStock}</span>
            </div>
            <div className="overview-item">
              <span className="overview-label">Low Stock</span>
              <span className="overview-value overview-warning">{stats.lowStock}</span>
            </div>
            <div className="overview-item">
              <span className="overview-label">Out of Stock</span>
              <span className="overview-value overview-danger">{stats.outOfStock}</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h3>Recent Activity</h3>
            <button className="ghost-btn small-btn" type="button" onClick={handleViewSales}>
              View Sales
            </button>
          </div>
          <ul className="activity-list">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))
            ) : (
              <li className="empty-state">
                <span>No sales recorded today yet.</span>
              </li>
            )}
          </ul>
        </article>
      </div>

      {notifications.length > 0 && (
        <article className="panel">
          <div className="panel-header">
            <h3>Recent Notifications</h3>
            <button className="ghost-btn small-btn" type="button" onClick={handleViewNotifications}>
              View All
            </button>
          </div>
          <ul className="activity-list">
            {notifications.map((n) => (
              <NotificationItem key={n.id} n={n} />
            ))}
          </ul>
        </article>
      )}
    </div>
  );
}

export default memo(HomePage);
