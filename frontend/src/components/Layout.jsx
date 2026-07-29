import { useState, useEffect, memo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { initNotifications } from '../utils/notificationStore';
import { STATIC_URL } from '../api';
import InstallButton from './InstallButton';

const navItems = [
  { label: 'Home', path: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Medicines', path: '/medicines', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { label: 'POS', path: '/sales', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { label: 'Receipts', path: '/receipts', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Notifications', path: '/notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { label: 'Settings', path: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', roles: ['ADMIN', 'PHARMACIST'] },
]

export function PageLoader() {
  return (
    <div className="home-loading">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );
}

function Layout({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    initNotifications();
  }, []);

  const logoUrl = user?.pharmacyLogo ? `${STATIC_URL}${user.pharmacyLogo}` : null;

  return (
    <div className="dashboard-shell">
      <header className="top-nav">
        <div className="brand">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="brand-logo-img" />
          ) : (
            <div className="brand-badge">PT</div>
          )}
          <div>
            <h2>PharmaTrack</h2>
            <p>{user?.pharmacyName || 'Pharmacy'}</p>
          </div>
        </div>

        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((o) => !o)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {navItems
            .filter((item) => !item.roles || item.roles.includes(user?.role))
            .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={item.icon}/></svg>
              {item.label}
            </NavLink>
          ))}
          <InstallButton />
        </nav>

        <div className="nav-user">
          <div className="nav-user-info">
            <span className="nav-user-name">{user?.fullName || 'User'}</span>
            <span className="nav-user-role">{user?.role || 'ADMIN'}</span>
          </div>
          <button className="ghost-btn small-btn" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default memo(Layout);
