/**
 * Simple Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by temporarily disabling calls to
 * external services that are experiencing errors.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if service has recovered
 */

import { logger } from './logger';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms before attempting recovery (default: 30000) */
  resetTimeout?: number;
  /** Number of successful requests to close circuit (default: 2) */
  successThreshold?: number;
  /** Name for logging (default: 'default') */
  name?: string;
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastError: Error | null;
}

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  successThreshold: 2,
  name: 'default',
};

// Store circuit states by name
const circuits = new Map<string, CircuitBreakerState>();

/**
 * Get or create circuit state
 */
function getCircuitState(name: string): CircuitBreakerState {
  if (!circuits.has(name)) {
    circuits.set(name, {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastError: null,
    });
  }
  return circuits.get(name)!;
}

/**
 * Execute a function with circuit breaker protection
 *
 * @param fn - The async function to execute
 * @param options - Circuit breaker configuration
 * @returns The result of the function or throws if circuit is open
 */
export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  options?: CircuitBreakerOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const circuit = getCircuitState(opts.name);

  // Check if circuit should transition from OPEN to HALF_OPEN
  if (circuit.state === 'OPEN' && circuit.lastFailureTime) {
    const timeSinceFailure = Date.now() - circuit.lastFailureTime;
    if (timeSinceFailure >= opts.resetTimeout) {
      logger.log(`[CircuitBreaker:${opts.name}] Transitioning from OPEN to HALF_OPEN`);
      circuit.state = 'HALF_OPEN';
      circuit.successes = 0;
    }
  }

  // If circuit is OPEN, reject immediately
  if (circuit.state === 'OPEN') {
    logger.warn(`[CircuitBreaker:${opts.name}] Circuit is OPEN, rejecting request`);
    throw new CircuitBreakerError(
      `Circuit breaker is open for "${opts.name}". Service temporarily unavailable.`,
      circuit.lastError
    );
  }

  try {
    const result = await fn();

    // Success handling
    if (circuit.state === 'HALF_OPEN') {
      circuit.successes++;
      if (circuit.successes >= opts.successThreshold) {
        logger.log(`[CircuitBreaker:${opts.name}] Transitioning from HALF_OPEN to CLOSED`);
        circuit.state = 'CLOSED';
        circuit.failures = 0;
        circuit.successes = 0;
        circuit.lastError = null;
      }
    } else if (circuit.state === 'CLOSED') {
      // Reset failure count on success
      circuit.failures = 0;
    }

    return result;
  } catch (error) {
    // Failure handling
    circuit.failures++;
    circuit.lastFailureTime = Date.now();
    circuit.lastError = error instanceof Error ? error : new Error(String(error));

    if (circuit.state === 'HALF_OPEN') {
      // Failed during recovery attempt, go back to OPEN
      logger.warn(`[CircuitBreaker:${opts.name}] Failed during HALF_OPEN, returning to OPEN`);
      circuit.state = 'OPEN';
    } else if (circuit.failures >= opts.failureThreshold) {
      // Threshold exceeded, open the circuit
      logger.warn(`[CircuitBreaker:${opts.name}] Failure threshold reached (${circuit.failures}), opening circuit`);
      circuit.state = 'OPEN';
    }

    throw error;
  }
}

/**
 * Execute with circuit breaker, returning null on failure instead of throwing
 * Useful for optional services like Supermemory
 */
export async function withCircuitBreakerOrNull<T>(
  fn: () => Promise<T>,
  options?: CircuitBreakerOptions
): Promise<T | null> {
  try {
    return await withCircuitBreaker(fn, options);
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      // Circuit is open, return null silently
      return null;
    }
    // Log other errors but still return null for graceful degradation
    logger.warn(`[CircuitBreaker:${options?.name || 'default'}] Operation failed:`, error);
    return null;
  }
}

/**
 * Get the current state of a circuit
 */
export function getCircuitStatus(name: string): {
  state: CircuitState;
  failures: number;
  isOpen: boolean;
  lastError: string | null;
} {
  const circuit = getCircuitState(name);
  return {
    state: circuit.state,
    failures: circuit.failures,
    isOpen: circuit.state === 'OPEN',
    lastError: circuit.lastError?.message || null,
  };
}

/**
 * Manually reset a circuit to CLOSED state
 */
export function resetCircuit(name: string): void {
  const circuit = getCircuitState(name);
  circuit.state = 'CLOSED';
  circuit.failures = 0;
  circuit.successes = 0;
  circuit.lastError = null;
  logger.log(`[CircuitBreaker:${name}] Manually reset to CLOSED`);
}

/**
 * Custom error for circuit breaker rejections
 */
export class CircuitBreakerError extends Error {
  public readonly originalError: Error | null;
  public readonly isCircuitBreakerError = true;

  constructor(message: string, originalError: Error | null = null) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.originalError = originalError;
  }
}

// Pre-configured circuit breakers for common services
export const CIRCUIT_NAMES = {
  SUPERMEMORY: 'supermemory',
  SHOPIFY_MCP: 'shopify-mcp',
  WEB_SEARCH: 'web-search',
  IMAGE_GENERATION: 'image-generation',
} as const;
