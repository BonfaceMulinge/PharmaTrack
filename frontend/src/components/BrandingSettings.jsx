import { useState, useCallback, useRef, memo } from 'react';
import { authFetch, API_URL, STATIC_URL, setUser, getUser } from '../api';
import { usePinGuard } from '../utils/pinSession';
import PinModal from './PinModal';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_SIZE = 2 * 1024 * 1024;
const MAX_DIMENSION = 300;

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_DIMENSION);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_DIMENSION);
          height = MAX_DIMENSION;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to resize image'));
      }, 'image/png', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Invalid image')); };
    img.src = url;
  });
}

function BrandingSettings({ user, onUserUpdate }) {
  const [preview, setPreview] = useState(null);
  const [currentLogo, setCurrentLogo] = useState(user?.pharmacyLogo || null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const fileBlobRef = useRef(null);

  const pinGuard = usePinGuard();

  const currentLogoUrl = currentLogo ? `${STATIC_URL}${currentLogo}` : null;
  const displaySrc = preview || currentLogoUrl;

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setMessage('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only PNG, JPG and JPEG images are allowed.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Image must be smaller than 2 MB.');
      return;
    }

    try {
      const resized = await resizeImage(file);
      fileBlobRef.current = resized;
      setPreview(URL.createObjectURL(resized));
    } catch {
      setError('Failed to process the image.');
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!fileBlobRef.current) {
      setError('Select an image first.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('logo', fileBlobRef.current, 'logo.png');

      const res = await authFetch(`${API_URL}/receipts/pharmacy-logo`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      setCurrentLogo(data.logo);
      setPreview(null);
      fileBlobRef.current = null;
      if (fileRef.current) fileRef.current.value = '';
      setMessage('Logo uploaded successfully.');

      const stored = getUser();
      if (stored) {
        stored.pharmacyLogo = data.logo;
        setUser(stored);
        if (onUserUpdate) onUserUpdate({ pharmacyLogo: data.logo });
      }
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setSaving(false);
    }
  }, [onUserUpdate]);

  const handleRemove = useCallback(async () => {
    setRemoving(true);
    setError('');
    setMessage('');

    try {
      const res = await authFetch(`${API_URL}/receipts/pharmacy-logo`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Remove failed');

      setCurrentLogo(null);
      setPreview(null);
      fileBlobRef.current = null;
      if (fileRef.current) fileRef.current.value = '';
      setMessage('Logo removed.');

      const stored = getUser();
      if (stored) {
        stored.pharmacyLogo = null;
        setUser(stored);
        if (onUserUpdate) onUserUpdate({ pharmacyLogo: null });
      }
    } catch (err) {
      setError(err.message || 'Remove failed.');
    } finally {
      setRemoving(false);
    }
  }, [onUserUpdate]);

  return (
    <div className="settings-section">
      <h3>Branding</h3>
      <p className="settings-section-desc">Upload your pharmacy logo. It will appear on receipts and the sidebar.</p>

      {error && <div className="status-banner error-banner">{error}</div>}
      {message && <div className="status-banner success-banner">{message}</div>}

      <div className="branding-preview-area">
        {displaySrc ? (
          <img src={displaySrc} alt="Pharmacy Logo" className="branding-logo-preview" />
        ) : (
          <div className="branding-logo-placeholder">
            <span>No logo uploaded</span>
          </div>
        )}
      </div>

      <div className="branding-actions">
        <label className="primary-btn branding-upload-btn">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          Choose Image
        </label>

        {preview && (
          <button className="primary-btn" type="button" onClick={() => pinGuard.guard(handleSave)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Logo'}
          </button>
        )}

        {currentLogo && !preview && (
          <button className="ghost-btn danger-btn" type="button" onClick={() => pinGuard.guard(handleRemove)} disabled={removing}>
            {removing ? 'Removing...' : 'Remove Logo'}
          </button>
        )}
      </div>

      <p className="settings-hint">Accepted formats: PNG, JPG, JPEG. Maximum size: 2 MB.</p>

      {pinGuard.showModal && (
        <PinModal onVerify={pinGuard.handleVerify} onCancel={pinGuard.handleCancel} />
      )}
    </div>
  );
}

export default memo(BrandingSettings);
