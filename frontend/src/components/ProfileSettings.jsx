import { useState, useEffect, useCallback, memo } from 'react';
import { authFetch, API_URL, setUser, getUser } from '../api';
import { usePinGuard } from '../utils/pinSession';
import PinModal from './PinModal';

function ProfileSettings({ user, onUserUpdate }) {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [cashierName, setCashierName] = useState(user?.cashierName || '');
  const [pharmacyCode, setPharmacyCode] = useState('');
  const [originalCode, setOriginalCode] = useState('');
  const [codeEditMode, setCodeEditMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const pinGuard = usePinGuard();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/receipts/pharmacy-code`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setPharmacyCode(data.pharmacyCode || '');
          setOriginalCode(data.pharmacyCode || '');
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const body = { fullName: fullName.trim(), phone: phone.trim() };
      if (newPassword) {
        if (!currentPassword) {
          setError('Current password is required to set a new password.');
          setSaving(false);
          return;
        }
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const res = await authFetch(`${API_URL}/auth/me`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      setCurrentPassword('');
      setNewPassword('');

      const stored = getUser();
      if (stored) {
        stored.fullName = data.user.fullName;
        stored.phone = data.user.phone;
        setUser(stored);
        if (onUserUpdate) onUserUpdate({ fullName: data.user.fullName, phone: data.user.phone });
      }

      if (cashierName !== (user?.cashierName || '')) {
        const profileRes = await authFetch(`${API_URL}/receipts/pharmacy-profile`, {
          method: 'PUT',
          body: JSON.stringify({ cashierName: cashierName.trim() || null }),
        });
        const profileData = await profileRes.json();
        if (!profileRes.ok) throw new Error(profileData.message || 'Failed to save cashier name');
        if (stored) {
          stored.cashierName = profileData.pharmacy.cashierName;
          setUser(stored);
          if (onUserUpdate) onUserUpdate({ cashierName: profileData.pharmacy.cashierName });
        }
      }

      setMessage('Settings saved successfully.');
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [fullName, phone, cashierName, currentPassword, newPassword, user, onUserUpdate]);

  const guardedSubmit = useCallback((e) => {
    e.preventDefault();
    pinGuard.guard(() => handleSubmit(e));
  }, [pinGuard, handleSubmit]);

  const handleCodeSave = useCallback(async (newCode) => {
    const code = newCode.toUpperCase();
    if (code.length < 2 || code.length > 6) {
      setError('Pharmacy code must be between 2 and 6 characters.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await authFetch(`${API_URL}/receipts/pharmacy-code`, {
        method: 'PUT',
        body: JSON.stringify({ pharmacyCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update pharmacy code');
      setPharmacyCode(data.pharmacyCode);
      setOriginalCode(data.pharmacyCode);
      setCodeEditMode(false);
      setMessage('Pharmacy code updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const guardedCodeSave = useCallback(() => {
    pinGuard.guard(() => handleCodeSave(pharmacyCode));
  }, [pinGuard, handleCodeSave, pharmacyCode]);

  return (
    <div className="settings-section">
      <h3>My Profile</h3>
      <p className="settings-section-desc">Update your personal information and password.</p>

      {error && <div className="status-banner error-banner">{error}</div>}
      {message && <div className="status-banner success-banner">{message}</div>}

      <form onSubmit={guardedSubmit} className="settings-form">
        <div className="settings-field">
          <label>Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="settings-field">
          <label>Phone Number (optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +254 712 345 678"
          />
        </div>

        <div className="settings-field">
          <label>Email</label>
          <input type="email" value={user?.email || ''} disabled />
          <span className="settings-hint">Email cannot be changed.</span>
        </div>

        <div className="settings-field">
          <label>Role</label>
          <input type="text" value={user?.role || ''} disabled />
          <span className="settings-hint">Only Super Admin can change roles.</span>
        </div>

        <hr className="settings-divider" />

        <div className="settings-field">
          <label>Cashier Name</label>
          <input
            type="text"
            value={cashierName}
            onChange={(e) => setCashierName(e.target.value)}
            placeholder="Default cashier name for receipts"
          />
          <span className="settings-hint">Displayed on receipts. PIN required to change.</span>
        </div>

        <hr className="settings-divider" />
        <p className="settings-section-desc">Change Password (optional)</p>

        <div className="settings-field">
          <label>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            autoComplete="current-password"
          />
        </div>

        <div className="settings-field">
          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 6 characters"
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <button className="primary-btn" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <hr className="settings-divider" />

      <div className="settings-field">
        <label>Pharmacy Code</label>
        <div className="pharmacy-code-row">
          {codeEditMode ? (
            <>
              <input
                type="text"
                value={pharmacyCode}
                onChange={(e) => setPharmacyCode(e.target.value.toUpperCase())}
                placeholder="2-6 characters"
                minLength={2}
                maxLength={6}
                style={{ textTransform: 'uppercase', width: '200px' }}
              />
              <button className="primary-btn small-btn" type="button" onClick={guardedCodeSave} disabled={saving || pharmacyCode === originalCode}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="ghost-btn small-btn" type="button" onClick={() => { setPharmacyCode(originalCode); setCodeEditMode(false); }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="pharmacy-code-display">{pharmacyCode || 'Not set'}</span>
              <button className="ghost-btn small-btn" type="button" onClick={() => setCodeEditMode(true)}>
                Change
              </button>
            </>
          )}
        </div>
        <span className="settings-hint">Used for receipt numbering. PIN required to change. Must be unique.</span>
      </div>

      {pinGuard.showModal && (
        <PinModal onVerify={pinGuard.handleVerify} onCancel={pinGuard.handleCancel} />
      )}
    </div>
  );
}

export default memo(ProfileSettings);
