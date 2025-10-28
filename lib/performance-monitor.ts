/**
 * Performance monitoring and metrics tracking
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  averageResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  streamInterruptions: number;
  totalRequests: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.NODE_ENV === 'development';
  }

  /**
   * Record a metric
   */
  record(name: string, value: number, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Trim old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Perf] ${name}: ${value.toFixed(2)}ms`, metadata);
    }
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string): (metadata?: Record<string, any>) => void {
    if (!this.enabled) return () => {};

    const start = performance.now();

    return (metadata?: Record<string, any>) => {
      const duration = performance.now() - start;
      this.record(name, duration, metadata);
    };
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const endTimer = this.startTimer(name);
    
    try {
      const result = await operation();
      endTimer({ ...metadata, success: true });
      return result;
    } catch (error) {
      endTimer({ ...metadata, success: false, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get metrics by name
   */
  getMetrics(name: string, limit?: number): PerformanceMetric[] {
    let filtered = this.metrics.filter((m) => m.name === name);
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  /**
   * Get average value for a metric
   */
  getAverage(name: string, limit?: number): number {
    const metrics = this.getMetrics(name, limit);
    
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Get percentile value for a metric
   */
  getPercentile(name: string, percentile: number, limit?: number): number {
    const metrics = this.getMetrics(name, limit);
    
    if (metrics.length === 0) return 0;

    const sorted = [...metrics].sort((a, b) => a.value - b.value);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[index]?.value || 0;
  }

  /**
   * Get comprehensive stats
   */
  getStats(): PerformanceStats {
    const responseTimeMetrics = this.getMetrics('api_response_time');
    const cacheChecks = this.getMetrics('cache_check');
    const streamMetrics = this.getMetrics('stream_interruption');

    const totalRequests = responseTimeMetrics.length;
    const errorCount = responseTimeMetrics.filter(
      (m) => m.metadata?.success === false
    ).length;

    const cacheHits = cacheChecks.filter((m) => m.metadata?.hit === true).length;
    const cacheTotal = cacheChecks.length;

    return {
      averageResponseTime: this.getAverage('api_response_time'),
      p95ResponseTime: this.getPercentile('api_response_time', 95),
      errorRate: totalRequests > 0 ? errorCount / totalRequests : 0,
      cacheHitRate: cacheTotal > 0 ? cacheHits / cacheTotal : 0,
      streamInterruptions: streamMetrics.length,
      totalRequests,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify({
      metrics: this.metrics,
      stats: this.getStats(),
      timestamp: Date.now(),
    }, null, 2);
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure component render time
 */
export function useRenderTime(componentName: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  const startTime = performance.now();

  // Use effect cleanup to measure total render time
  if (typeof window !== 'undefined') {
    requestAnimationFrame(() => {
      const duration = performance.now() - startTime;
      performanceMonitor.record(`render_${componentName}`, duration);
    });
  }
}

/**
 * Measure API call performance
 */
export async function measureApiCall<T>(
  endpoint: string,
  apiCall: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measure(`api_${endpoint}`, apiCall, { endpoint });
}

/**
 * Record cache hit/miss
 */
export function recordCacheCheck(hit: boolean): void {
  performanceMonitor.record('cache_check', hit ? 1 : 0, { hit });
}

/**
 * Record stream interruption
 */
export function recordStreamInterruption(reason: string): void {
  performanceMonitor.record('stream_interruption', 1, { reason });
}

/**
 * Record user interaction
 */
export function recordInteraction(action: string, metadata?: Record<string, any>): void {
  performanceMonitor.record(`interaction_${action}`, 1, metadata);
}

/**
 * Get performance summary for logging
 */
export function getPerformanceSummary(): string {
  const stats = performanceMonitor.getStats();
  
  return `
Performance Summary:
- Avg Response Time: ${stats.averageResponseTime.toFixed(0)}ms
- P95 Response Time: ${stats.p95ResponseTime.toFixed(0)}ms
- Error Rate: ${(stats.errorRate * 100).toFixed(1)}%
- Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%
- Stream Interruptions: ${stats.streamInterruptions}
- Total Requests: ${stats.totalRequests}
  `.trim();
}

