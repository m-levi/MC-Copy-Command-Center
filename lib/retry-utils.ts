/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
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

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw new RetryError(
    `Failed after ${maxRetries + 1} attempts`,
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
  
  // Rate limiting
  if (error.status === 429) return true;
  
  // Server errors
  if (error.status >= 500 && error.status < 600) return true;
  
  // Timeout errors
  if (error.message?.includes('timeout')) return true;
  
  return false;
}


