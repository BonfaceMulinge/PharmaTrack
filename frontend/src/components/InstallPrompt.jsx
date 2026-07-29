import { useState, useEffect, useCallback } from 'react';
import { getDeferredPrompt, setDeferredPrompt, clearDeferredPrompt } from '../utils/installState';

function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = getDeferredPrompt();
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowPrompt(false);
    }
    clearDeferredPrompt();
  }, []);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">PT</div>
        <div className="install-prompt-text">
          <strong>Install PharmaTrack</strong>
          <span>Get the app for a better experience</span>
        </div>
      </div>
      <div className="install-prompt-actions">
        <button className="ghost-btn small-btn" type="button" onClick={handleDismiss}>
          Not now
        </button>
        <button className="primary-btn small-btn" type="button" onClick={handleInstall}>
          Install
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
