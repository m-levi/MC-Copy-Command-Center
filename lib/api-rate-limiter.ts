/**
 * API Rate Limiter
 *
 * Provides rate limiting for API endpoints with configurable limits per user/IP.
 * Uses in-memory storage by default. For production with multiple instances,
 * consider using Redis/KV store.
 */

import { rateLimitError } from '@/lib/api-error';

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional: Different limits for different user tiers */
  tierLimits?: {
    free: number;
    pro: number;
    enterprise: number;
  };
}

// In-memory store for rate limit records
// Key format: `${endpoint}:${identifier}`
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, record] of rateLimitStore.entries()) {
      if (now - record.windowStart > maxAge) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// Default rate limit configurations for different endpoints
export const API_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Chat API - relatively strict to prevent abuse
  'chat': {
    limit: 30,
    windowMs: 60 * 1000, // 30 requests per minute
    tierLimits: {
      free: 20,
      pro: 50,
      enterprise: 100,
    },
  },
  // Streaming endpoint - same as chat
  'chat-stream': {
    limit: 30,
    windowMs: 60 * 1000,
    tierLimits: {
      free: 20,
      pro: 50,
      enterprise: 100,
    },
  },
  // Conversation list - less strict
  'conversations': {
    limit: 60,
    windowMs: 60 * 1000,
  },
  // Brand operations
  'brands': {
    limit: 30,
    windowMs: 60 * 1000,
  },
  // Mode operations
  'modes': {
    limit: 30,
    windowMs: 60 * 1000,
  },
  // AI model info
  'ai-models': {
    limit: 60,
    windowMs: 60 * 1000,
  },
  // Default for unspecified endpoints
  'default': {
    limit: 100,
    windowMs: 60 * 1000,
  },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

/**
 * Check rate limit for an API endpoint
 *
 * @param endpoint - The endpoint name (e.g., 'chat', 'conversations')
 * @param identifier - Unique identifier (user ID or IP)
 * @param tier - Optional user tier for tiered limits
 */
export function checkRateLimit(
  endpoint: string,
  identifier: string,
  tier?: 'free' | 'pro' | 'enterprise'
): RateLimitResult {
  const config = API_RATE_LIMITS[endpoint] || API_RATE_LIMITS['default'];
  const limit = tier && config.tierLimits ? config.tierLimits[tier] : config.limit;
  const key = `${endpoint}:${identifier}`;
  const now = Date.now();

  let record = rateLimitStore.get(key);

  // If no record or window has expired, start fresh
  if (!record || now - record.windowStart >= config.windowMs) {
    record = {
      count: 1,
      windowStart: now,
    };
    rateLimitStore.set(key, record);
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Check if over limit
  if (record.count >= limit) {
    const resetAt = record.windowStart + config.windowMs;
    const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
    };
  }

  // Increment counter
  record.count++;
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: Math.max(0, limit - record.count),
    resetAt: record.windowStart + config.windowMs,
  };
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
  limit: number
): void {
  headers.set('X-RateLimit-Limit', String(limit));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  if (!result.allowed && result.retryAfterSeconds) {
    headers.set('Retry-After', String(result.retryAfterSeconds));
  }
}

/**
 * Get rate limit from config
 */
export function getRateLimitForEndpoint(
  endpoint: string,
  tier?: 'free' | 'pro' | 'enterprise'
): number {
  const config = API_RATE_LIMITS[endpoint] || API_RATE_LIMITS['default'];
  return tier && config.tierLimits ? config.tierLimits[tier] : config.limit;
}

/**
 * Higher-order function to wrap an API handler with rate limiting
 */
export function withRateLimit(
  endpoint: string,
  handler: (request: Request, ...args: any[]) => Promise<Response>,
  options?: {
    getIdentifier?: (request: Request) => string | Promise<string>;
    getTier?: (request: Request) => Promise<'free' | 'pro' | 'enterprise' | undefined>;
  }
): (request: Request, ...args: any[]) => Promise<Response> {
  return async (request: Request, ...args: any[]) => {
    // Get identifier (user ID, IP, etc.)
    let identifier: string;
    if (options?.getIdentifier) {
      identifier = await options.getIdentifier(request);
    } else {
      // Default to IP address
      identifier = getClientIp(request);
    }

    // Get user tier if provided
    const tier = options?.getTier ? await options.getTier(request) : undefined;

    // Check rate limit
    const result = checkRateLimit(endpoint, identifier, tier);

    if (!result.allowed) {
      return rateLimitError(result.retryAfterSeconds);
    }

    // Call the actual handler
    const response = await handler(request, ...args);

    // Add rate limit headers to successful responses
    const limit = getRateLimitForEndpoint(endpoint, tier);
    const newHeaders = new Headers(response.headers);
    addRateLimitHeaders(newHeaders, result, limit);

    // Return response with rate limit headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Check various headers for the real IP (behind proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return 'unknown';
}

/**
 * Clear rate limit for a specific identifier
 * Useful for testing or admin operations
 */
export function clearRateLimit(endpoint: string, identifier: string): void {
  rateLimitStore.delete(`${endpoint}:${identifier}`);
}

/**
 * Get current rate limit status for an identifier
 * Useful for debugging or displaying to users
 */
export function getRateLimitStatus(
  endpoint: string,
  identifier: string,
  tier?: 'free' | 'pro' | 'enterprise'
): RateLimitResult & { limit: number } {
  const config = API_RATE_LIMITS[endpoint] || API_RATE_LIMITS['default'];
  const limit = tier && config.tierLimits ? config.tierLimits[tier] : config.limit;
  const key = `${endpoint}:${identifier}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now - record.windowStart >= config.windowMs) {
    return {
      allowed: true,
      remaining: limit,
      resetAt: now + config.windowMs,
      limit,
    };
  }

  const remaining = Math.max(0, limit - record.count);
  return {
    allowed: remaining > 0,
    remaining,
    resetAt: record.windowStart + config.windowMs,
    retryAfterSeconds: remaining <= 0
      ? Math.ceil((record.windowStart + config.windowMs - now) / 1000)
      : undefined,
    limit,
  };
}
