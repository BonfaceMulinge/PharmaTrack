import { useState, useCallback, memo } from 'react';
import { API_URL, setTokens, setUser } from '../api';

function SuperAdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (!data.user.isSuperAdmin) {
        throw new Error('This login is for Super Admin only. Use the regular login page.');
      }

      setTokens(data.token, data.refreshToken);
      setUser(data.user);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, onLogin]);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card super-admin-card">
          <div className="auth-brand">
            <div className="auth-logo">
              <div className="brand-badge auth-badge sa-badge">SA</div>
            </div>
            <h1>PharmaTrack</h1>
            <p>System Administration</p>
          </div>

          <h2>Super Admin Login</h2>
          <p className="auth-subtitle">Authorized personnel only</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="sa-email">Email Address</label>
              <input
                id="sa-email"
                type="email"
                placeholder="admin@pharmatrack.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="sa-password">Password</label>
              <input
                id="sa-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button className="auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default memo(SuperAdminLogin);
