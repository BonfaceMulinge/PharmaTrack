import { useState, useCallback, memo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './components/LoginPage'
import SuperAdminLogin from './components/SuperAdminLogin'
import SuperAdminDashboard from './components/SuperAdminDashboard'
import { getAccessToken, getUser, clearTokens, setUser, API_URL } from './api'
import './App.css'

import Home from './pages/Home'
import Medicines from './pages/Medicines'
import Sales from './pages/Sales'
import Receipts from './pages/Receipts'
import Notifications from './pages/Notifications'

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

  const handleLogin = useCallback((user) => {
    setAuthState({ authenticated: true, user })
    setUser(user)
  }, [])

  const handleLogout = useCallback(() => {
    clearTokens()
    setAuthState({ authenticated: false, user: null })
    setAuthView('login')
  }, [])

  const handlePasswordSuccess = useCallback(() => {
    const user = { ...getUser(), mustChangePassword: false };
    setAuthState({ authenticated: true, user });
    setUser(user);
  }, []);

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
    return <ChangePasswordModal onSuccess={handlePasswordSuccess} />
  }

  return (
    <Routes>
      <Route element={<Layout user={authState.user} onLogout={handleLogout} />}>
        <Route index element={<Home />} />
        <Route path="medicines" element={<Medicines />} />
        <Route path="sales" element={<Sales />} />
        <Route path="receipts" element={<Receipts />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default memo(App)
