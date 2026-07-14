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

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/api/reports/analytics`);
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        setAnalytics(data);
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
          <p className="eyebrow">Insights</p>
          <h2>Reporting and Analytics</h2>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <p>Total Sales</p>
          <h3>{analytics?.sales ?? 0}</h3>
          <span>Recorded transactions</span>
        </article>
        <article className="stat-card">
          <p>Total Medicines</p>
          <h3>{analytics?.medicines ?? 0}</h3>
          <span>Items in inventory</span>
        </article>
        <article className="stat-card">
          <p>Low Stock</p>
          <h3>{analytics?.lowStock ?? 0}</h3>
          <span>Need replenishment</span>
        </article>
        <article className="stat-card">
          <p>Expiring Soon</p>
          <h3>{analytics?.expired ?? 0}</h3>
          <span>Within 30 days</span>
        </article>
      </div>

      <div className="content-grid">
        <div className="panel">
          <h3>Revenue Snapshot</h3>
          <p style={{ fontSize: '1.35rem', marginTop: '8px' }}>{formatCurrency(analytics?.revenue)}</p>
        </div>
        <div className="panel">
          <h3>Inventory Value</h3>
          <p style={{ fontSize: '1.35rem', marginTop: '8px' }}>{formatCurrency(analytics?.inventoryValue)}</p>
        </div>
      </div>
    </div>
  );
}

export default ReportingAnalytics;
