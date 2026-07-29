import { useState, useCallback, useRef } from 'react';
import { authFetch, API_URL } from '../api';

const SESSION_DURATION = 15 * 60 * 1000;

let sessionExpiry = null;

export function isPinSessionActive() {
  return sessionExpiry !== null && Date.now() < sessionExpiry;
}

export function clearPinSession() {
  sessionExpiry = null;
}

async function verifyPinOnServer(pin) {
  const res = await authFetch(`${API_URL}/pharmacy/verify`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Invalid Admin PIN');
  return data;
}

export function usePinGuard(onVerified) {
  const [showModal, setShowModal] = useState(false);
  const pendingAction = useRef(null);

  const guard = useCallback((action) => {
    if (isPinSessionActive()) {
      action();
      return;
    }
    pendingAction.current = action;
    setShowModal(true);
  }, []);

  const handleVerify = useCallback(async (pin) => {
    await verifyPinOnServer(pin);
    sessionExpiry = Date.now() + SESSION_DURATION;
    setShowModal(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) action();
    if (onVerified) onVerified();
  }, [onVerified]);

  const handleCancel = useCallback(() => {
    pendingAction.current = null;
    setShowModal(false);
  }, []);

  return { showModal, setShowModal, guard, handleVerify, handleCancel };
}
