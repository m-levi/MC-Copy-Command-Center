'use client';

import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function PWAInstallPrompt() {
  const { canInstall, install, dismiss } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  if (!canInstall) return null;

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const installed = await install();
      if (!installed) {
        dismiss();
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-[70]">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Install Command Center
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get faster access and an app-like experience on mobile.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleInstall}
            disabled={installing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {installing ? 'Installing...' : 'Install app'}
          </button>
          <button
            onClick={dismiss}
            className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

