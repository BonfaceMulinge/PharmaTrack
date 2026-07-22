import { useState, useCallback, memo } from 'react';
import { API_URL, setTokens, setUser } from '../api';

function LoginPage({ onLogin, onSwitchToSuperAdmin }) {
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

      setTokens(data.token, data.refreshToken);
      setUser(data.user);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, onLogin]);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-logo">
              <div className="brand-badge auth-badge">PT</div>
            </div>
            <h1>PharmaTrack</h1>
            <p>Pharmacy Inventory & POS System</p>
          </div>

          <h2>Sign In</h2>
          <p className="auth-subtitle">Enter your credentials to access your account</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button className="auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Need an account? Contact your pharmacy administrator or{' '}
            <a href="mailto:support@pharmatrack.com" className="auth-link-btn">
              PharmaTrack Administration
            </a>
          </p>

          <button type="button" className="super-admin-link" onClick={onSwitchToSuperAdmin}>
            System Administrator Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(LoginPage);
