/**
 * Enhanced retry utility with exponential backoff and advanced strategies
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
  jitter?: boolean; // Add random jitter to prevent thundering herd
}

export interface CircuitBreakerOptions {
  threshold?: number;
  timeout?: number;
  resetTimeout?: number;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  return new Error('Unknown error');
}

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number'
  ) {
    return (error as { status: number }).status;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return '';
}

function getErrorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof (error as { name?: unknown }).name === 'string'
  ) {
    return (error as { name: string }).name;
  }
  return '';
}

async function runWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
  if (!Number.isFinite(timeout) || timeout <= 0) {
    return fn();
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Request timeout')), timeout);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function delayFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    timeout = 30000,
    onRetry,
    shouldRetry = isRetryableError,
    jitter = true,
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await runWithTimeout(fn, timeout);
    } catch (error) {
      lastError = toError(error);

      // Check if we should retry this error
      if (!shouldRetry(lastError)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Call retry callback
      onRetry?.(attempt + 1, lastError);

      // Calculate delay with optional jitter
      let currentDelay = delay;
      if (jitter) {
        // Add random jitter (±25%)
        const jitterAmount = currentDelay * 0.25;
        currentDelay += (Math.random() * jitterAmount * 2) - jitterAmount;
      }

      // Wait with exponential backoff
      await delayFor(currentDelay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw new RetryError(
    `Failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
    maxRetries + 1,
    lastError!
  );
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const status = getErrorStatus(error);
  const name = getErrorName(error);

  // Network errors
  if (message.includes('fetch failed')) return true;
  if (message.toLowerCase().includes('network')) return true;
  if (message.includes('NetworkError')) return true;
  if (message.includes('ERR_NETWORK')) return true;
  
  // Rate limiting
  if (status === 429) return true;
  
  // Server errors (but not client errors)
  if (status !== undefined && status >= 500 && status < 600) return true;
  
  // Timeout errors
  if (message.toLowerCase().includes('timeout')) return true;
  if (message.includes('ETIMEDOUT')) return true;
  
  // Connection errors
  if (message.includes('ECONNREFUSED')) return true;
  if (message.includes('ECONNRESET')) return true;
  
  // Abort errors (might be retryable)
  if (name === 'AbortError') return false; // User-initiated, don't retry
  
  return false;
}

/**
 * Check if error is a client error (not retryable)
 */
export function isClientError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status !== undefined && status >= 400 && status < 500) {
    // Except 429 (rate limit)
    return status !== 429;
  }
  return false;
}

/**
 * Retry with different strategies
 */
export type RetryStrategy = 'exponential' | 'linear' | 'fixed';

export async function retryWithStrategy<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy,
  options: RetryOptions = {}
): Promise<T> {
  if (strategy === 'exponential') {
    return retryWithBackoff(fn, options);
  }

  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    timeout = 30000,
    onRetry,
    shouldRetry = isRetryableError,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await runWithTimeout(fn, timeout);
    } catch (error) {
      lastError = toError(error);

      if (!shouldRetry(lastError)) {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

      onRetry?.(attempt + 1, lastError);

      // Calculate delay based on strategy
      let delay: number;
      if (strategy === 'linear') {
        delay = initialDelay * (attempt + 1);
      } else {
        // fixed
        delay = initialDelay;
      }

      delay = Math.min(delay, maxDelay);
      await delayFor(delay);
    }
  }

  throw new RetryError(
    `Failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
    maxRetries + 1,
    lastError!
  );
}

/**
 * Circuit breaker for preventing repeated failures
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly threshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;

  constructor(
    optionsOrThreshold: CircuitBreakerOptions | number = {},
    timeout: number = 60000, // 1 minute
    resetTimeout: number = 30000 // 30 seconds
  ) {
    if (typeof optionsOrThreshold === 'number') {
      this.threshold = optionsOrThreshold;
      this.timeout = timeout;
      this.resetTimeout = resetTimeout;
      return;
    }

    this.threshold = optionsOrThreshold.threshold ?? 5;
    this.timeout = optionsOrThreshold.timeout ?? timeout;
    this.resetTimeout = optionsOrThreshold.resetTimeout ?? resetTimeout;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if we should try half-open
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await runWithTimeout(fn, this.timeout);
      
      // Success - reset circuit breaker
      this.state = 'closed';
      this.failures = 0;
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      // Open circuit if threshold exceeded
      if (this.failures >= this.threshold) {
        this.state = 'open';
      }

      throw error;
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'closed';
  }
}
