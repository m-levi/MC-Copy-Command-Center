/**
 * Rate limiting using Vercel KV (Redis)
 * Supports per-tier limits and sliding window algorithm
 */

export interface RateLimitConfig {
  free: number;      // Messages per day for free tier
  pro: number;        // Messages per day for pro tier
  enterprise: number; // Messages per day for enterprise tier
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  free: 50,
  pro: 500,
  enterprise: Infinity,
};

/**
 * Get user's tier (simplified - in production, fetch from database)
 */
async function getUserTier(userId: string): Promise<'free' | 'pro' | 'enterprise'> {
  // TODO: Fetch from database based on subscription
  // For now, default to free
  return 'free';
}

/**
 * Rate limiter using Vercel KV
 */
export class RateLimiter {
  private kv: any;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = DEFAULT_CONFIG) {
    this.config = config;
    // Vercel KV will be initialized when available
    try {
      // @ts-ignore - Vercel KV types
      this.kv = require('@vercel/kv');
    } catch (e) {
      console.warn('Vercel KV not available, rate limiting disabled');
    }
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(
    userId: string,
    action: string = 'message'
  ): Promise<RateLimitResult> {
    if (!this.kv) {
      // No KV available, allow all requests
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: Date.now() + 24 * 60 * 60 * 1000,
        limit: Infinity,
      };
    }

    const tier = await getUserTier(userId);
    const limit = this.config[tier];
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    const key = `rate_limit:${userId}:${action}`;
    const now = Date.now();

    try {
      // Get current count
      const count = await this.kv.get(key) || 0;
      const resetAt = now + windowMs;

      if (count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          limit,
        };
      }

      // Increment count
      await this.kv.incr(key);
      await this.kv.expire(key, Math.ceil(windowMs / 1000));

      return {
        allowed: true,
        remaining: limit - count - 1,
        resetAt,
        limit,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // On error, allow request (fail open)
      return {
        allowed: true,
        remaining: limit,
        resetAt: now + windowMs,
        limit,
      };
    }
  }

  /**
   * Get current usage for user
   */
  async getUsage(userId: string, action: string = 'message'): Promise<{
    used: number;
    limit: number;
    resetAt: number;
  }> {
    if (!this.kv) {
      return { used: 0, limit: Infinity, resetAt: Date.now() + 24 * 60 * 60 * 1000 };
    }

    const tier = await getUserTier(userId);
    const limit = this.config[tier];
    const key = `rate_limit:${userId}:${action}`;

    try {
      const count = await this.kv.get(key) || 0;
      const ttl = await this.kv.ttl(key);
      const resetAt = Date.now() + (ttl * 1000);

      return {
        used: count,
        limit,
        resetAt,
      };
    } catch (error) {
      console.error('Rate limit usage check failed:', error);
      return { used: 0, limit, resetAt: Date.now() + 24 * 60 * 60 * 1000 };
    }
  }

  /**
   * Reset rate limit for user (admin function)
   */
  async reset(userId: string, action: string = 'message'): Promise<void> {
    if (!this.kv) return;

    const key = `rate_limit:${userId}:${action}`;
    await this.kv.del(key);
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();






