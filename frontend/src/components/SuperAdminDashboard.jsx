import { useState, useEffect } from 'react';
import { API_URL } from '../api';
import SuperAdminPharmacyManagement from './SuperAdminPharmacyManagement';

const SUPER_ADMIN_NAV = [
  { label: 'Dashboard', id: 'sa-dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Pharmacies', id: 'sa-pharmacies', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
]

function SuperAdminDashboard({ onLogout }) {
  const [activeNav, setActiveNav] = useState('sa-dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleNav = (id) => {
    setActiveNav(id);
  };

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

        <nav className="nav-links">
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
            </div>
            {loading ? (
              <div className="home-loading"><div className="spinner" /><span>Loading...</span></div>
            ) : stats ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                    </div>
                    <p>Total Pharmacies</p>
                    <h3>{stats.stats.totalPharmacies}</h3>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon stat-icon-blue">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <p>Active</p>
                    <h3>{stats.stats.activePharmacies}</h3>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon stat-icon-amber">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <p>Suspended</p>
                    <h3>{stats.stats.suspendedPharmacies}</h3>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon stat-icon-purple">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>
                    </div>
                    <p>Total Users</p>
                    <h3>{stats.stats.totalUsers}</h3>
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
                          <th>Name</th>
                          <th>Owner</th>
                          <th>Subscription</th>
                          <th>Expiry</th>
                          <th>Users</th>
                          <th>Medicines</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentPharmacies.length === 0 ? (
                          <tr><td className="empty-table" colSpan="6">No pharmacies yet</td></tr>
                        ) : stats.recentPharmacies.map((p) => (
                          <tr key={p.id}>
                            <td><strong>{p.name}</strong></td>
                            <td>{p.ownerName || '-'}</td>
                            <td>
                              <span className={`badge ${p.subscriptionStatus === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                                {p.subscriptionStatus}
                              </span>
                            </td>
                            <td>{p.subscriptionExpiryDate ? new Date(p.subscriptionExpiryDate).toLocaleDateString() : '-'}</td>
                            <td>{p._count.users}</td>
                            <td>{p._count.medicines}</td>
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

export default SuperAdminDashboard;
