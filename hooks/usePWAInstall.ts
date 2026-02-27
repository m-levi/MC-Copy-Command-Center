'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'pwa_install_prompt_dismissed_at';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  });
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return false;

    const dismissedTs = Number(dismissedAt);
    const isExpired = Number.isNaN(dismissedTs) || Date.now() - dismissedTs > DISMISS_TTL_MS;
    if (isExpired) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choiceResult.outcome === 'accepted';
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setIsDismissed(true);
  }, []);

  const canInstall = useMemo(
    () => Boolean(deferredPrompt) && !isInstalled && !isDismissed,
    [deferredPrompt, isDismissed, isInstalled]
  );

  return {
    canInstall,
    isInstalled,
    install,
    dismiss,
  };
}

