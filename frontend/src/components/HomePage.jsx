import { useEffect, useState, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch, API_URL } from '../api';
import { Events, subscribe } from '../store';
import formatCurrency from '../utils/formatCurrency';

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

const NotificationItem = memo(function NotificationItem({ n }) {
  return (
    <li key={n.id}>
      <strong>{n.title}</strong>
      <span>{n.message}</span>
      <small>{timeAgo(n.createdAt)}</small>
    </li>
  );
});

function DashboardSkeleton() {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-card">
          <div className="hero-content">
            <div className="skeleton-line skeleton-pill" style={{ width: '140px' }} />
            <div className="skeleton-line" style={{ width: '240px', height: '28px' }} />
            <div className="skeleton-line" style={{ width: '320px' }} />
            <div className="skeleton-row" style={{ gap: '12px', marginTop: '16px' }}>
              <div className="skeleton-btn" />
              <div className="skeleton-btn" />
            </div>
          </div>
          <div className="hero-metrics">
            {[1, 2, 3].map((i) => (
              <div className="hero-metric-card" key={i}>
                <div className="skeleton-line" style={{ width: '100px', height: '24px' }} />
                <div className="skeleton-line skeleton-pill" style={{ width: '80px' }} />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <article className="stat-card" key={i}>
            <div className="skeleton-line" style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
            <div className="skeleton-line skeleton-pill" style={{ width: '90px' }} />
            <div className="skeleton-line" style={{ width: '70px', height: '22px' }} />
          </article>
        ))}
      </section>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
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
  const [notifications, setNotifications] = useState([]);
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [dashRes, notifRes, receiptsRes] = await Promise.all([
        authFetch(`${API_URL}/dashboard`),
        authFetch(`${API_URL}/notifications`),
        authFetch(`${API_URL}/receipts/recent?limit=10`),
      ]);
      if (dashRes.ok) {
        const d = await dashRes.json();
        setStats({
          todayRevenue: d.todaysRevenue ?? 0,
          todayTransactions: d.todaysTransactions ?? 0,
          todayProfit: d.todayProfit ?? 0,
          totalMedicines: d.totalMedicines ?? 0,
          totalUnitsInStock: d.totalUnitsInStock ?? 0,
          lowStock: d.lowStockCount ?? 0,
          outOfStock: d.outOfStock ?? 0,
          inventoryValue: d.inventoryValue ?? 0,
        });
      }
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data.filter((n) => !n.isRead).slice(0, 5));
      }
      if (receiptsRes.ok) {
        const rData = await receiptsRes.json();
        setRecentReceipts(rData.receipts || []);
      }
    } catch (err) {
      console.error('[Dashboard] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const safeLoad = async () => {
      if (!cancelled) await loadData();
    };
    safeLoad();
    const unsubSale = subscribe(Events.SALE_COMPLETED, safeLoad);
    const unsubDash = subscribe(Events.DASHBOARD_UPDATED, safeLoad);
    return () => { cancelled = true; unsubSale(); unsubDash(); };
  }, [loadData]);

  const handleNewSale = useCallback(() => navigate('/sales'), [navigate]);
  const handleManageMedicines = useCallback(() => navigate('/medicines'), [navigate]);
  const handleViewReceipts = useCallback(() => navigate('/receipts'), [navigate]);
  const handleViewNotifications = useCallback(() => navigate('/notifications'), [navigate]);

  if (isLoading) return <DashboardSkeleton />;

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
          <h3>Recent Receipts</h3>
          <button className="ghost-btn small-btn" type="button" onClick={handleViewReceipts}>
            View All
          </button>
        </div>
        {recentReceipts.length > 0 ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Date</th>
                  <th>Cashier</th>
                  <th>Total</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {recentReceipts.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.receiptNumber}</strong></td>
                    <td>{timeAgo(r.createdAt)}</td>
                    <td>{r.user?.fullName || 'N/A'}</td>
                    <td>{formatCurrency(r.totalAmount)}</td>
                    <td><span className="pill">{(r.paymentMethod || '').replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="activity-list">
            <li className="empty-state">
              <span>No receipts yet.</span>
            </li>
          </ul>
        )}
      </article>

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
