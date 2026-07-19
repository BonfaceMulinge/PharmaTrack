import { useState, useCallback, useEffect } from 'react'
import LoginPage from './components/LoginPage'
import SuperAdminLogin from './components/SuperAdminLogin'
import SuperAdminDashboard from './components/SuperAdminDashboard'
import HomePage from './components/HomePage'
import MedicineManagement from './components/MedicineManagement'
import SalesPos from './components/SalesPos'
import NotificationsForecasting from './components/NotificationsForecasting'

import { getAccessToken, getUser, clearTokens, setUser, API_URL } from './api'
import './App.css'

const navItems = [
  { label: 'Home', id: 'home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Medicines', id: 'medicines', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { label: 'Sales', id: 'sales', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { label: 'Notifications', id: 'notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
]

function ChangePasswordModal({ onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pharmatrack_token')}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const user = getUser();
      if (user) {
        user.mustChangePassword = false;
        setUser(user);
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-logo">
              <div className="brand-badge auth-badge">PT</div>
            </div>
            <h1>PharmaTrack</h1>
          </div>
          <h2>Change Password</h2>
          <p className="auth-subtitle">You must change your temporary password before continuing</p>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="auth-field">
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" />
            </div>
            <div className="auth-field">
              <label>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [authState, setAuthState] = useState(() => {
    const token = getAccessToken();
    const user = getUser();
    if (token && user) return { authenticated: true, user };
    return { authenticated: false, user: null };
  })
  const [authView, setAuthView] = useState('login')
  const [activeSection, setActiveSection] = useState('home')
  const [view, setView] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogin = useCallback((user) => {
    setAuthState({ authenticated: true, user })
    setUser(user)
    setView('dashboard')
    setActiveSection('home')
  }, [])

  const handleLogout = useCallback(() => {
    clearTokens()
    setAuthState({ authenticated: false, user: null })
    setView('dashboard')
    setActiveSection('home')
    setAuthView('login')
  }, [])

  const handleNavigate = useCallback((sectionId) => {
    setView('dashboard')
    setActiveSection(sectionId)
    setMenuOpen(false)
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [])

  const handleSaleComplete = useCallback(() => {}, [])

  useEffect(() => {
    if (view !== 'dashboard') return

    const sections = Array.from(document.querySelectorAll('.page-section'))
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visibleEntry) setActiveSection(visibleEntry.target.id)
      },
      { threshold: [0.1], rootMargin: '-10% 0px -60% 0px' }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [view])

  if (!authState.authenticated) {
    if (authView === 'super-admin') {
      return <SuperAdminLogin onLogin={handleLogin} />
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onSwitchToSuperAdmin={() => setAuthView('super-admin')}
      />
    )
  }

  if (authState.user?.isSuperAdmin) {
    return (
      <SuperAdminDashboard
        onLogout={handleLogout}
        onBackToLogin={() => { handleLogout(); setAuthView('login'); }}
      />
    )
  }

  if (authState.user?.mustChangePassword) {
    return <ChangePasswordModal onSuccess={() => {
      const user = { ...authState.user, mustChangePassword: false };
      setAuthState({ authenticated: true, user });
      setUser(user);
    }} />
  }

  if (view === 'pos') {
    return (
      <div className="dashboard-shell">
        <header className="top-nav">
          <div className="brand">
            <div className="brand-badge">PT</div>
            <div>
              <h2>PharmaTrack</h2>
              <p>{authState.user?.pharmacyName || 'Pharmacy'}</p>
            </div>
          </div>
        </header>
        <SalesPos onSaleComplete={handleSaleComplete} onBackToDashboard={() => { setView('dashboard'); setActiveSection('home'); }} />
      </div>
    )
  }

  return (
    <div className="dashboard-shell">
      <header className="top-nav">
        <div className="brand">
          <div className="brand-badge">PT</div>
          <div>
            <h2>PharmaTrack</h2>
            <p>{authState.user?.pharmacyName || 'Pharmacy'}</p>
          </div>
        </div>

        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <a
              key={item.id}
              className={activeSection === item.id ? 'active' : ''}
              href={`#${item.id}`}
              onClick={(e) => { e.preventDefault(); handleNavigate(item.id); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={item.icon}/></svg>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav-user">
          <div className="nav-user-info">
            <span className="nav-user-name">{authState.user?.fullName || 'User'}</span>
            <span className="nav-user-role">{authState.user?.role || 'ADMIN'}</span>
          </div>
          <button className="ghost-btn small-btn" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="page-section" id="home">
          <HomePage onNavigate={handleNavigate} />
        </div>

        <div className="page-section" id="medicines">
          <MedicineManagement />
        </div>

        <div className="page-section" id="sales">
          <SalesPos onSaleComplete={handleSaleComplete} onBackToDashboard={() => { setView('dashboard'); handleNavigate('home'); }} />
        </div>

        <div className="page-section" id="notifications">
          <NotificationsForecasting />
        </div>
      </main>
    </div>
  )
}

export default App
