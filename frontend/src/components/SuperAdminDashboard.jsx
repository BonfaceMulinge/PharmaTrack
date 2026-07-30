import { useState, useEffect, useCallback, memo } from 'react';
import { API_URL } from '../api';
import SuperAdminPharmacyManagement from './SuperAdminPharmacyManagement';

const SUPER_ADMIN_NAV = [
  { label: 'Dashboard', id: 'sa-dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Pharmacies', id: 'sa-pharmacies', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
]

const StatCard = memo(function StatCard({ iconPath, label, value, iconClass }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconClass}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={iconPath}/></svg>
      </div>
      <p>{label}</p>
      <h3>{value}</h3>
    </div>
  );
});

function SubscriptionCard({ active, trial, expired }) {
  return (
    <div className="stat-card subscription-card">
      <div className="stat-icon stat-icon-purple">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <p>Subscription Status</p>
      <div className="sub-breakdown">
        <span className="sub-row"><span className="sub-label">Active Subscriptions</span><span className="sub-value">{active}</span></span>
        <span className="sub-row"><span className="sub-label">Trial Accounts</span><span className="sub-value">{trial}</span></span>
        <span className="sub-row"><span className="sub-label">Expired Accounts</span><span className="sub-value">{expired}</span></span>
      </div>
    </div>
  );
}

function SuperAdminDashboard({ onLogout }) {
  const [activeNav, setActiveNav] = useState('sa-dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/super-admin/dashboard`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('pharmatrack_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/super-admin/dashboard`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('pharmatrack_token')}` },
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleNav = useCallback((id) => {
    setActiveNav(id);
    setMenuOpen(false);
  }, []);

  const handleToggleMenu = useCallback(() => {
    setMenuOpen((o) => !o);
  }, []);

  const handleQuickAction = useCallback(() => {
    setActiveNav('sa-pharmacies');
    setMenuOpen(false);
  }, []);

  return (
    <div className="dashboard-shell">
      <header className="top-nav">
        <div className="brand">
          <div className="brand-badge sa-badge">SA</div>
          <div>
            <h2>PharmaTrack Admin</h2>
            <p>System Management</p>
          </div>
        </div>

        <button className="menu-toggle" type="button" onClick={handleToggleMenu}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {SUPER_ADMIN_NAV.map((item) => (
            <a
              key={item.id}
              className={activeNav === item.id ? 'active' : ''}
              href={`#${item.id}`}
              onClick={(e) => { e.preventDefault(); handleNav(item.id); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={item.icon}/></svg>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav-user">
          <div className="nav-user-info">
            <span className="nav-user-name">Super Admin</span>
            <span className="nav-user-role">SUPER_ADMIN</span>
          </div>
          <button className="ghost-btn small-btn" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="main-content">
        {activeNav === 'sa-dashboard' && (
          <div className="page-section" id="sa-dashboard">
            <div className="topbar">
              <h1>Dashboard</h1>
              <button className="primary-btn" onClick={fetchStats}>Refresh</button>
            </div>
            {loading ? (
              <div className="home-loading"><div className="spinner" /><span>Loading...</span></div>
            ) : stats ? (
              <>
                <div className="stats-grid">
                  <StatCard iconPath="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" label="Total Pharmacies" value={stats.stats.totalPharmacies} iconClass="stat-icon-green" />
                  <StatCard iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" label="Active Pharmacies" value={stats.stats.activePharmacies} iconClass="stat-icon-blue" />
                  <StatCard iconPath="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" label="Inactive Pharmacies" value={stats.stats.inactivePharmacies} iconClass="stat-icon-amber" />
                  <SubscriptionCard active={stats.stats.activeSubscriptions} trial={stats.stats.trialAccounts} expired={stats.stats.expiredAccounts} />
                </div>

                <div className="quick-actions">
                  <span className="quick-actions-label">Quick Actions</span>
                  <div className="quick-actions-buttons">
                    <button className="primary-btn" type="button" onClick={() => handleQuickAction('create')}>+ Create Pharmacy</button>
                    <button className="ghost-btn" type="button" onClick={() => handleQuickAction('view')}>View Pharmacies</button>
                    <button className="ghost-btn" type="button" onClick={() => handleQuickAction('reset')}>Reset Password</button>
                    <button className="ghost-btn" type="button" onClick={() => handleQuickAction('suspend')}>Suspend Pharmacy</button>
                    <button className="ghost-btn" type="button" onClick={() => handleQuickAction('activate')}>Activate Pharmacy</button>
                  </div>
                </div>

                <div className="panel" style={{ marginTop: '16px' }}>
                  <div className="panel-header">
                    <h3>Recent Pharmacies</h3>
                  </div>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Pharmacy Name</th>
                          <th>Pharmacy Code</th>
                          <th>Owner Name</th>
                          <th>Email</th>
                          <th>Date Created</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentPharmacies.length === 0 ? (
                          <tr><td className="empty-table" colSpan="6">No pharmacies yet</td></tr>
                        ) : stats.recentPharmacies.map((p) => (
                          <tr key={p.id}>
                            <td><strong>{p.name}</strong></td>
                            <td>{p.pharmacyCode || '-'}</td>
                            <td>{p.ownerName || '-'}</td>
                            <td>{p.email || '-'}</td>
                            <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td>
                              <span className={`badge ${p.subscriptionStatus === 'ACTIVE' ? 'badge-active' : p.subscriptionStatus === 'TRIAL' ? 'badge-trial' : 'badge-inactive'}`}>
                                {p.subscriptionStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="auth-error">Failed to load dashboard data</div>
            )}
          </div>
        )}

        {activeNav === 'sa-pharmacies' && (
          <div className="page-section" id="sa-pharmacies">
            <SuperAdminPharmacyManagement />
          </div>
        )}
      </main>
    </div>
  );
}

export default memo(SuperAdminDashboard);
