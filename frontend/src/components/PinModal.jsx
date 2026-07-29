import { useState, useRef, useEffect, memo } from 'react';

function PinModal({ onVerify, onCancel }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    setError('');
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const code = pin.join('');
    if (code.length !== 4) {
      setError('Enter all 4 digits');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      await onVerify(code);
    } catch (err) {
      setError(err.message || 'Invalid Admin PIN');
      setPin(['', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel pin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pin-modal-header">
          <div className="pin-modal-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <h3>Admin Authorization Required</h3>
          <p>Enter 4-digit Admin PIN</p>
        </div>

        <div className="pin-input-group">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="pin-digit-input"
              autoComplete="one-time-code"
              disabled={verifying}
            />
          ))}
        </div>

        {error && <p className="pin-error">{error}</p>}

        <div className="pin-actions">
          <button className="ghost-btn" type="button" onClick={onCancel} disabled={verifying}>
            Cancel
          </button>
          <button className="primary-btn" type="button" onClick={handleSubmit} disabled={verifying}>
            {verifying ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(PinModal);
