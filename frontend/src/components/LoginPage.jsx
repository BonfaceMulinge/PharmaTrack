import { useState } from 'react';
import { API_URL, setTokens, setUser } from '../api';

function LoginPage({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
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

            <div className="auth-row">
              <label className="auth-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember Me</span>
              </label>
              <button type="button" className="auth-link-btn" onClick={() => setError('Please contact your administrator to reset your password.')}>
                Forgot Password?
              </button>
            </div>

            <button className="auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don&apos;t have an account?{' '}
            <button type="button" className="auth-link-btn" onClick={onSwitchToRegister}>
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
