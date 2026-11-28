import { useState, useEffect, useCallback } from 'react';

const DISMISS_KEY = 'fitaval_pwa_prompt_dismissed_at';
const DISMISS_DAYS = 7;

let deferredPromptEvent = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function checkIsStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator?.standalone === true
  );
}

function checkIsIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPromptEvent = e;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPromptEvent = null;
    notifyListeners();
  });
}

export function isLoginInstallDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function dismissLoginInstallPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

export function getManualInstallHint(isIOS) {
  if (isIOS) {
    return 'Tap the Share button in Safari, then choose "Add to Home Screen".';
  }
  return 'Open your browser menu (⋮) or address bar install icon and select "Install Fitaval" or "Add to Home Screen".';
}

export function usePwaInstall() {
  const [, setTick] = useState(0);
  const [isInstalled, setIsInstalled] = useState(checkIsStandalone);

  useEffect(() => {
    const refresh = () => {
      setIsInstalled(checkIsStandalone());
      setTick((t) => t + 1);
    };
    listeners.add(refresh);

    const mq = window.matchMedia?.('(display-mode: standalone)');
    mq?.addEventListener?.('change', refresh);

    return () => {
      listeners.delete(refresh);
      mq?.removeEventListener?.('change', refresh);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPromptEvent) {
      return { outcome: 'manual' };
    }
    try {
      await deferredPromptEvent.prompt();
      const choice = await deferredPromptEvent.userChoice;
      deferredPromptEvent = null;
      notifyListeners();
      return { outcome: choice?.outcome || 'dismissed' };
    } catch {
      return { outcome: 'manual' };
    }
  }, []);

  return {
    isInstalled,
    isIOS: checkIsIOS(),
    canPromptNatively: Boolean(deferredPromptEvent),
    promptInstall,
  };
}
