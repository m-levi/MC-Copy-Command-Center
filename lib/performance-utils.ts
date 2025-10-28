/**
 * Performance utilities - Debounce, throttle, and request coalescing
 */

/**
 * Debounce function - delays execution until after wait milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastArgs: Parameters<T> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          executedFunction(...lastArgs);
          lastArgs = null;
        }
      }, wait);
    } else {
      lastArgs = args;
    }
  };
}

/**
 * Request coalescer - coalesces multiple rapid requests into one
 */
export class RequestCoalescer<T> {
  private pending: Map<string, Promise<T>>;
  private keyGenerator: (...args: any[]) => string;

  constructor(keyGenerator: (...args: any[]) => string = (...args) => JSON.stringify(args)) {
    this.pending = new Map();
    this.keyGenerator = keyGenerator;
  }

  async execute(
    requestFn: () => Promise<T>,
    ...keyArgs: any[]
  ): Promise<T> {
    const key = this.keyGenerator(...keyArgs);

    // If request is already pending, return the existing promise
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // Create new request
    const promise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pending.clear();
  }
}

/**
 * Batch executor - batches multiple calls and executes them together
 */
export class BatchExecutor<T, R> {
  private queue: Array<{ args: T; resolve: (value: R) => void; reject: (error: any) => void }>;
  private timeout: NodeJS.Timeout | null;
  private batchSize: number;
  private batchDelay: number;
  private executeFn: (batch: T[]) => Promise<R[]>;

  constructor(
    executeFn: (batch: T[]) => Promise<R[]>,
    batchSize: number = 10,
    batchDelay: number = 50
  ) {
    this.queue = [];
    this.timeout = null;
    this.batchSize = batchSize;
    this.batchDelay = batchDelay;
    this.executeFn = executeFn;
  }

  add(args: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ args, resolve, reject });

      // Execute immediately if batch is full
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else {
        // Otherwise, schedule execution
        this.scheduleFlush();
      }
    });
  }

  private scheduleFlush(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.flush();
    }, this.batchDelay);
  }

  private async flush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.batchSize);
    const args = batch.map((item) => item.args);

    try {
      const results = await this.executeFn(args);
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach((item) => {
        item.reject(error);
      });
    }
  }
}

/**
 * Rate limiter - limits function calls to a specified rate
 */
export class RateLimiter {
  private queue: Array<() => void>;
  private callsPerInterval: number;
  private interval: number;
  private calls: number;
  private timeout: NodeJS.Timeout | null;

  constructor(callsPerInterval: number, interval: number = 1000) {
    this.queue = [];
    this.callsPerInterval = callsPerInterval;
    this.interval = interval;
    this.calls = 0;
    this.timeout = null;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  private process(): void {
    if (this.calls < this.callsPerInterval && this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        fn();
        this.calls++;

        if (!this.timeout) {
          this.timeout = setTimeout(() => {
            this.calls = 0;
            this.timeout = null;
            if (this.queue.length > 0) {
              this.process();
            }
          }, this.interval);
        }
      }
    }
  }
}

/**
 * Memoize function results with expiration
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  ttl: number = 60000,
  keyFn: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args)
): T {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

  return ((...args: Parameters<T>) => {
    const key = keyFn(...args);
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }

    const result = fn(...args);
    cache.set(key, { value: result, timestamp: Date.now() });

    // Clean up expired entries periodically
    if (cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of cache.entries()) {
        if (now - v.timestamp > ttl) {
          cache.delete(k);
        }
      }
    }

    return result;
  }) as T;
}

/**
 * Animation frame scheduler - schedules updates on next animation frame
 */
export class AnimationFrameScheduler {
  private pending: Map<string, any>;
  private frameId: number | null;

  constructor() {
    this.pending = new Map();
    this.frameId = null;
  }

  schedule(key: string, callback: () => void): void {
    this.pending.set(key, callback);

    if (this.frameId === null) {
      this.frameId = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  cancel(key: string): void {
    this.pending.delete(key);
  }

  private flush(): void {
    this.frameId = null;
    const callbacks = Array.from(this.pending.values());
    this.pending.clear();

    callbacks.forEach((callback) => callback());
  }
}

/**
 * Measure function execution time
 */
export async function measureTime<T>(
  name: string,
  fn: () => Promise<T> | T
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

