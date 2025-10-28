'use client';

import { useState, useEffect, useCallback } from 'react';

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface ConnectionMetrics {
  quality: ConnectionQuality;
  latency: number;
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
}

/**
 * Monitor connection quality and provide metrics
 */
export function useConnectionQuality() {
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    quality: 'good',
    latency: 0,
    isOnline: true,
  });

  /**
   * Determine quality from latency and connection info
   */
  const determineQuality = useCallback(
    (latency: number, connection?: any): ConnectionQuality => {
      if (!navigator.onLine) return 'offline';

      // Use Network Information API if available
      if (connection) {
        const effectiveType = connection.effectiveType;
        
        if (effectiveType === '4g' && latency < 100) return 'excellent';
        if (effectiveType === '4g' && latency < 300) return 'good';
        if (effectiveType === '3g' || latency < 500) return 'fair';
        return 'poor';
      }

      // Fallback to latency-only determination
      if (latency < 100) return 'excellent';
      if (latency < 300) return 'good';
      if (latency < 500) return 'fair';
      return 'poor';
    },
    []
  );

  /**
   * Measure network latency
   */
  const measureLatency = useCallback(async (): Promise<number> => {
    try {
      const start = performance.now();
      
      // Ping a small resource (using HEAD request to minimize data)
      await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-store',
      }).catch(() => {
        // Fallback to any route if /api/ping doesn't exist
        return fetch('/', { method: 'HEAD', cache: 'no-store' });
      });

      const latency = performance.now() - start;
      return latency;
    } catch (error) {
      return Infinity; // Connection failed
    }
  }, []);

  /**
   * Update connection metrics
   */
  const updateMetrics = useCallback(async () => {
    const latency = await measureLatency();
    
    // Get Network Information API data if available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    const quality = determineQuality(latency, connection);

    setMetrics({
      quality,
      latency,
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      saveData: connection?.saveData,
    });
  }, [determineQuality, measureLatency]);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = () => {
      updateMetrics();
    };

    const handleOffline = () => {
      setMetrics((prev) => ({
        ...prev,
        quality: 'offline',
        isOnline: false,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    updateMetrics();

    // Check periodically (every 30 seconds)
    const interval = setInterval(updateMetrics, 30000);

    // Listen to connection changes if API available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateMetrics);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      
      if (connection) {
        connection.removeEventListener('change', updateMetrics);
      }
    };
  }, [updateMetrics]);

  /**
   * Manually trigger a check
   */
  const checkNow = useCallback(() => {
    updateMetrics();
  }, [updateMetrics]);

  return {
    ...metrics,
    checkNow,
  };
}

/**
 * Get user-friendly description of connection quality
 */
export function getConnectionDescription(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return 'Excellent connection';
    case 'good':
      return 'Good connection';
    case 'fair':
      return 'Fair connection - responses may be slower';
    case 'poor':
      return 'Poor connection - you may experience delays';
    case 'offline':
      return 'You are offline';
  }
}

/**
 * Get color class for connection quality indicator
 */
export function getConnectionColor(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return 'text-green-600 dark:text-green-400';
    case 'good':
      return 'text-blue-600 dark:text-blue-400';
    case 'fair':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'poor':
      return 'text-orange-600 dark:text-orange-400';
    case 'offline':
      return 'text-red-600 dark:text-red-400';
  }
}

