import {
  retryWithBackoff,
  retryWithStrategy,
  isRetryableError,
  isClientError,
  RetryError,
  CircuitBreaker,
} from '@/lib/retry-utils';

describe('retry-utils', () => {
  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      expect(isRetryableError({ message: 'fetch failed' })).toBe(true);
      expect(isRetryableError({ message: 'network error' })).toBe(true);
      expect(isRetryableError({ message: 'NetworkError' })).toBe(true);
    });

    it('should identify rate limit errors as retryable', () => {
      expect(isRetryableError({ status: 429 })).toBe(true);
    });

    it('should identify server errors as retryable', () => {
      expect(isRetryableError({ status: 500 })).toBe(true);
      expect(isRetryableError({ status: 503 })).toBe(true);
    });

    it('should identify timeout errors as retryable', () => {
      expect(isRetryableError({ message: 'timeout' })).toBe(true);
      expect(isRetryableError({ message: 'ETIMEDOUT' })).toBe(true);
    });

    it('should identify connection errors as retryable', () => {
      expect(isRetryableError({ message: 'ECONNREFUSED' })).toBe(true);
      expect(isRetryableError({ message: 'ECONNRESET' })).toBe(true);
    });

    it('should not retry client errors (except 429)', () => {
      expect(isRetryableError({ status: 400 })).toBe(false);
      expect(isRetryableError({ status: 404 })).toBe(false);
    });

    it('should not retry abort errors', () => {
      expect(isRetryableError({ name: 'AbortError' })).toBe(false);
    });
  });

  describe('isClientError', () => {
    it('should identify 4xx errors as client errors', () => {
      expect(isClientError({ status: 400 })).toBe(true);
      expect(isClientError({ status: 404 })).toBe(true);
      expect(isClientError({ status: 422 })).toBe(true);
    });

    it('should not identify 429 as client error', () => {
      expect(isClientError({ status: 429 })).toBe(false);
    });

    it('should not identify 5xx errors as client errors', () => {
      expect(isClientError({ status: 500 })).toBe(false);
      expect(isClientError({ status: 503 })).toBe(false);
    });
  });

  describe('retryWithBackoff', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(fn, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelay: 100,
      });

      // Fast-forward timers
      await jest.advanceTimersByTimeAsync(300);

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw RetryError after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('network error'));

      const promise = retryWithBackoff(fn, {
        maxRetries: 2,
        initialDelay: 100,
      });

      await jest.advanceTimersByTimeAsync(500);

      await expect(promise).rejects.toThrow(RetryError);
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue({ status: 400 });

      const promise = retryWithBackoff(fn, { maxRetries: 3 });

      await expect(promise).rejects.toEqual({ status: 400 });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelay: 100,
        onRetry,
      });

      await jest.advanceTimersByTimeAsync(200);

      await promise;

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should respect timeout', async () => {
      const fn = jest.fn(
        () =>
          new Promise((resolve) => setTimeout(() => resolve('success'), 2000))
      );

      const promise = retryWithBackoff(fn, {
        maxRetries: 1,
        timeout: 1000,
      });

      await jest.advanceTimersByTimeAsync(2000);

      await expect(promise).rejects.toThrow('Request timeout');
    });
  });

  describe('retryWithStrategy', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should use exponential backoff for exponential strategy', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValueOnce('success');

      const promise = retryWithStrategy(fn, 'exponential', {
        maxRetries: 1,
        initialDelay: 100,
      });

      await jest.advanceTimersByTimeAsync(300);

      await promise;

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use linear backoff for linear strategy', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValueOnce('success');

      const promise = retryWithStrategy(fn, 'linear', {
        maxRetries: 1,
        initialDelay: 100,
      });

      await jest.advanceTimersByTimeAsync(300);

      await promise;

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use fixed delay for fixed strategy', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValueOnce('success');

      const promise = retryWithStrategy(fn, 'fixed', {
        maxRetries: 1,
        initialDelay: 100,
      });

      await jest.advanceTimersByTimeAsync(300);

      await promise;

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('CircuitBreaker', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should execute function successfully when circuit is closed', async () => {
      const breaker = new CircuitBreaker();
      const fn = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(breaker.getState()).toBe('closed');
    });

    it('should open circuit after threshold failures', async () => {
      const breaker = new CircuitBreaker({ threshold: 2 });
      const fn = jest.fn().mockRejectedValue(new Error('error'));

      // First failure
      await expect(breaker.execute(fn)).rejects.toThrow();
      expect(breaker.getState()).toBe('closed');

      // Second failure - should open circuit
      await expect(breaker.execute(fn)).rejects.toThrow();
      expect(breaker.getState()).toBe('open');

      // Third attempt - should fail immediately
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is open');
    });

    it('should transition to half-open after reset timeout', async () => {
      const breaker = new CircuitBreaker({
        threshold: 1,
        resetTimeout: 1000,
      });
      const fn = jest.fn().mockRejectedValue(new Error('error'));

      // Cause circuit to open
      await expect(breaker.execute(fn)).rejects.toThrow();
      expect(breaker.getState()).toBe('open');

      // Advance time past reset timeout
      jest.advanceTimersByTime(2000);

      // Next call should transition to half-open
      const successFn = jest.fn().mockResolvedValue('success');
      const result = await breaker.execute(successFn);

      expect(result).toBe('success');
      expect(breaker.getState()).toBe('closed');
    });

    it('should reset circuit breaker', () => {
      const breaker = new CircuitBreaker({ threshold: 1 });
      const fn = jest.fn().mockRejectedValue(new Error('error'));

      // Cause failure
      breaker.execute(fn).catch(() => {});

      breaker.reset();

      expect(breaker.getState()).toBe('closed');
    });
  });
});






