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
      // Add timeout to the function call
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        ),
      ]);
      return result;
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry this error
      if (!shouldRetry(lastError)) {
        throw lastError;
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
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
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
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.message?.includes('fetch failed')) return true;
  if (error.message?.includes('network')) return true;
  if (error.message?.includes('NetworkError')) return true;
  if (error.message?.includes('ERR_NETWORK')) return true;
  
  // Rate limiting
  if (error.status === 429) return true;
  
  // Server errors (but not client errors)
  if (error.status >= 500 && error.status < 600) return true;
  
  // Timeout errors
  if (error.message?.includes('timeout')) return true;
  if (error.message?.includes('ETIMEDOUT')) return true;
  
  // Connection errors
  if (error.message?.includes('ECONNREFUSED')) return true;
  if (error.message?.includes('ECONNRESET')) return true;
  
  // Abort errors (might be retryable)
  if (error.name === 'AbortError') return false; // User-initiated, don't retry
  
  return false;
}

/**
 * Check if error is a client error (not retryable)
 */
export function isClientError(error: any): boolean {
  if (error.status >= 400 && error.status < 500) {
    // Except 429 (rate limit)
    return error.status !== 429;
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
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        ),
      ]);
      return result;
    } catch (error) {
      lastError = error as Error;

      if (!shouldRetry(lastError) || attempt === maxRetries) {
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
      await new Promise((resolve) => setTimeout(resolve, delay));
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

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

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
      const result = await fn();
      
      // Success - reset circuit breaker
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      
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


