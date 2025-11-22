'use client';

import { useState, useEffect } from 'react';
import { performanceMonitor } from '@/lib/performance-monitor';

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [stats, setStats] = useState({
    averageResponseTime: 0,
    p95ResponseTime: 0,
    errorRate: 0,
    cacheHitRate: 0,
    streamInterruptions: 0,
    totalRequests: 0,
  });

  // Check if debug mode is enabled
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const debugParam = urlParams.get('debug');
      const debugStorage = localStorage.getItem('debug_mode');
      
      if (debugParam === 'true' || debugStorage === 'true') {
        setIsEnabled(true);
        if (debugStorage !== 'true') {
          localStorage.setItem('debug_mode', 'true');
        }
      }
    }
  }, []);

  // Update stats periodically
  useEffect(() => {
    if (!isEnabled) return;

    const updateStats = () => {
      const currentStats = performanceMonitor.getStats();
      setStats(currentStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, [isEnabled]);

  const handleToggleDebugMode = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem('debug_mode', String(newState));
    if (!newState) {
      setIsOpen(false);
    }
  };

  const handleClearMetrics = () => {
    performanceMonitor.clear();
    setStats({
      averageResponseTime: 0,
      p95ResponseTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      streamInterruptions: 0,
      totalRequests: 0,
    });
  };

  const handleExport = () => {
    const data = performanceMonitor.export();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none">
      <div className="pointer-events-auto">
        {/* Toggle Button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-mono flex items-center gap-2"
            title="Open Debug Panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Debug
          </button>
        )}

        {/* Debug Panel */}
        {isOpen && (
          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-t-2 border-blue-500 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 dark:border-gray-300">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-mono text-sm font-semibold">Performance Monitor</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearMetrics}
                  className="px-2 py-1 text-xs bg-gray-800 dark:bg-gray-200 hover:bg-gray-700 dark:hover:bg-gray-300 rounded transition-colors"
                  title="Clear Metrics"
                >
                  Clear
                </button>
                <button
                  onClick={handleExport}
                  className="px-2 py-1 text-xs bg-gray-800 dark:bg-gray-200 hover:bg-gray-700 dark:hover:bg-gray-300 rounded transition-colors"
                  title="Export Metrics"
                >
                  Export
                </button>
                <button
                  onClick={handleToggleDebugMode}
                  className="px-2 py-1 text-xs bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 rounded transition-colors"
                  title="Disable Debug Mode"
                >
                  Disable
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-2 py-1 text-xs bg-gray-800 dark:bg-gray-200 hover:bg-gray-700 dark:hover:bg-gray-300 rounded transition-colors"
                  title="Minimize"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4">
              <div className="bg-gray-800 dark:bg-gray-200 rounded px-3 py-2">
                <div className="text-xs text-gray-400 dark:text-gray-600 mb-1">Avg Response</div>
                <div className="text-lg font-mono font-semibold">
                  {stats.averageResponseTime.toFixed(0)}ms
                </div>
              </div>

              <div className="bg-gray-800 dark:bg-gray-200 rounded px-3 py-2">
                <div className="text-xs text-gray-400 dark:text-gray-600 mb-1">P95 Response</div>
                <div className="text-lg font-mono font-semibold">
                  {stats.p95ResponseTime.toFixed(0)}ms
                </div>
              </div>

              <div className="bg-gray-800 dark:bg-gray-200 rounded px-3 py-2">
                <div className="text-xs text-gray-400 dark:text-gray-600 mb-1">Error Rate</div>
                <div className={`text-lg font-mono font-semibold ${stats.errorRate > 0.05 ? 'text-red-500' : ''}`}>
                  {(stats.errorRate * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-gray-800 dark:bg-gray-200 rounded px-3 py-2">
                <div className="text-xs text-gray-400 dark:text-gray-600 mb-1">Cache Hit Rate</div>
                <div className={`text-lg font-mono font-semibold ${stats.cacheHitRate > 0.7 ? 'text-green-500' : ''}`}>
                  {(stats.cacheHitRate * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-gray-800 dark:bg-gray-200 rounded px-3 py-2">
                <div className="text-xs text-gray-400 dark:text-gray-600 mb-1">Stream Issues</div>
                <div className={`text-lg font-mono font-semibold ${stats.streamInterruptions > 0 ? 'text-yellow-500' : ''}`}>
                  {stats.streamInterruptions}
                </div>
              </div>

              <div className="bg-gray-800 dark:bg-gray-200 rounded px-3 py-2">
                <div className="text-xs text-gray-400 dark:text-gray-600 mb-1">Total Requests</div>
                <div className="text-lg font-mono font-semibold">
                  {stats.totalRequests}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="px-4 pb-2 text-xs text-gray-400 dark:text-gray-600">
              Debug mode is enabled. Add <code className="bg-gray-800 dark:bg-gray-200 px-1 rounded">?debug=true</code> to URL or check localStorage.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

