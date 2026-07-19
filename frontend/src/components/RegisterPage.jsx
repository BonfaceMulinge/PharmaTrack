import { useState } from 'react';
import { API_URL } from '../api';

function RegisterPage({ onSwitchToLogin }) {
  const [form, setForm] = useState({
    pharmacyName: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyName: form.pharmacyName,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccess('Account created successfully! Redirecting to sign in...');
      setTimeout(() => onSwitchToLogin(), 2000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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

          <h2>Create Account</h2>
          <p className="auth-subtitle">Set up your pharmacy and admin account</p>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="pharmacyName">Pharmacy Name</label>
              <input
                id="pharmacyName"
                name="pharmacyName"
                type="text"
                placeholder="e.g. City Pharmacy"
                value={form.pharmacyName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="fullName">Owner Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="e.g. John Doe"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">Email Address</label>
              <input
                id="reg-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+254 700 000000"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                name="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <button className="auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <button type="button" className="auth-link-btn" onClick={onSwitchToLogin}>
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
