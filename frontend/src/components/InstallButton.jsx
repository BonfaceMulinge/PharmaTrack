import { useState, useEffect, useCallback } from 'react';
import { subscribe, getDeferredPrompt, clearDeferredPrompt } from '../utils/installState';

function InstallButton() {
  const [available, setAvailable] = useState(() => !!getDeferredPrompt());
  const [standalone] = useState(() => window.matchMedia('(display-mode: standalone)').matches);

  useEffect(() => {
    const unsub = subscribe((prompt) => setAvailable(!!prompt));
    return unsub;
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = getDeferredPrompt();
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    clearDeferredPrompt();
    setAvailable(false);
  }, []);

  if (standalone || !available) return null;

  return (
    <button className="install-nav-btn" type="button" onClick={handleInstall} title="Install App">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
      </svg>
      Install App
    </button>
  );
}

export default InstallButton;
