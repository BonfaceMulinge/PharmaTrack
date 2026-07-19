import { useEffect, useState } from 'react';
import { API_URL } from '../api';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

function ReportingAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/reports/analytics`);
      if (!response.ok) throw new Error('Failed to load analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('[Reports] Load error:', error);
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/reports/analytics`);
        if (cancelled) return;
        if (!response.ok) throw new Error('Failed to load analytics');
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error('[Reports] Load error:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="medicine-page">
        <div className="page-header">
          <div>
            <p className="eyebrow">Insights</p>
            <h2>Reporting and Analytics</h2>
          </div>
        </div>
        <p style={{ color: '#c8d3e2' }}>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="medicine-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Insights</p>
          <h2>Reporting and Analytics</h2>
        </div>
        <button className="ghost-btn" onClick={fetchAnalytics}>Refresh</button>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <p>Total Sales</p>
          <h3>{analytics?.sales ?? 0}</h3>
          <span>Recorded transactions</span>
        </article>
        <article className="stat-card">
          <p>Today's Revenue</p>
          <h3>{formatCurrency(analytics?.todayRevenue)}</h3>
          <span>{analytics?.todayTransactions ?? 0} transactions</span>
        </article>
        <article className="stat-card">
          <p>Monthly Revenue</p>
          <h3>{formatCurrency(analytics?.monthlyRevenue)}</h3>
          <span>This month</span>
        </article>
        <article className="stat-card">
          <p>Low Stock</p>
          <h3>{analytics?.lowStock ?? 0}</h3>
          <span>Need replenishment</span>
        </article>
      </div>

      <div className="content-grid">
        <div className="panel">
          <h3>Inventory Value</h3>
          <p style={{ fontSize: '1.35rem', marginTop: '8px' }}>{formatCurrency(analytics?.inventoryValue)}</p>
          <span style={{ color: '#8b98ab', fontSize: '0.85rem' }}>{analytics?.totalUnitsInStock ?? 0} total units in stock</span>
        </div>
        <div className="panel">
          <h3>Out of Stock</h3>
          <p style={{ fontSize: '1.35rem', marginTop: '8px' }}>{analytics?.outOfStock ?? 0}</p>
          <span style={{ color: '#8b98ab', fontSize: '0.85rem' }}>Medicines with zero quantity</span>
        </div>
      </div>
    </div>
  );
}

export default ReportingAnalytics;
