/**
 * Auth-specific rate limiter
 * 
 * Uses in-memory storage for simplicity. In production with multiple instances,
 * consider using Redis/KV store.
 */

interface RateLimitRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

// In-memory stores for different rate limiting contexts
const ipLimitStore = new Map<string, RateLimitRecord>();
const emailLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour
  
  for (const [key, record] of ipLimitStore.entries()) {
    if (now - record.lastAttempt > maxAge) {
      ipLimitStore.delete(key);
    }
  }
  
  for (const [key, record] of emailLimitStore.entries()) {
    if (now - record.lastAttempt > maxAge) {
      emailLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Configuration for different auth actions
const authRateLimits: Record<string, RateLimitConfig> = {
  // Login attempts - stricter to prevent brute force
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
  },
  // Password reset requests - prevent email spam
  passwordReset: {
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000, // 10 minutes
    blockDurationMs: 10 * 60 * 1000,
  },
  // Magic link requests
  magicLink: {
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000,
    blockDurationMs: 10 * 60 * 1000,
  },
  // Signup attempts
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000,
  },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
  retryAfterSeconds?: number;
}

/**
 * Check if an action is rate limited by IP
 */
export function checkIpRateLimit(
  ip: string,
  action: keyof typeof authRateLimits
): RateLimitResult {
  const config = authRateLimits[action] || authRateLimits.login;
  const key = `${action}:${ip}`;
  const now = Date.now();
  
  let record = ipLimitStore.get(key);
  
  // If no record or window has passed, reset
  if (!record || now - record.firstAttempt > config.windowMs) {
    record = {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    };
    ipLimitStore.set(key, record);
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
    };
  }
  
  // Check if blocked
  if (record.count >= config.maxAttempts) {
    const blockEndTime = record.lastAttempt + config.blockDurationMs;
    const retryAfterMs = blockEndTime - now;
    
    if (retryAfterMs > 0) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      };
    }
    
    // Block period ended, reset
    record = {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    };
    ipLimitStore.set(key, record);
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
    };
  }
  
  // Increment counter
  record.count++;
  record.lastAttempt = now;
  ipLimitStore.set(key, record);
  
  return {
    allowed: true,
    remaining: Math.max(0, config.maxAttempts - record.count),
  };
}

/**
 * Check if an action is rate limited by email
 */
export function checkEmailRateLimit(
  email: string,
  action: keyof typeof authRateLimits
): RateLimitResult {
  const config = authRateLimits[action] || authRateLimits.login;
  const key = `${action}:${email.toLowerCase()}`;
  const now = Date.now();
  
  let record = emailLimitStore.get(key);
  
  // If no record or window has passed, reset
  if (!record || now - record.firstAttempt > config.windowMs) {
    record = {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    };
    emailLimitStore.set(key, record);
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
    };
  }
  
  // Check if blocked
  if (record.count >= config.maxAttempts) {
    const blockEndTime = record.lastAttempt + config.blockDurationMs;
    const retryAfterMs = blockEndTime - now;
    
    if (retryAfterMs > 0) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      };
    }
    
    // Block period ended, reset
    record = {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    };
    emailLimitStore.set(key, record);
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
    };
  }
  
  // Increment counter
  record.count++;
  record.lastAttempt = now;
  emailLimitStore.set(key, record);
  
  return {
    allowed: true,
    remaining: Math.max(0, config.maxAttempts - record.count),
  };
}

/**
 * Clear rate limit records for a specific IP/email (e.g., after successful login)
 */
export function clearRateLimitRecords(
  identifier: string,
  type: 'ip' | 'email',
  action?: keyof typeof authRateLimits
) {
  const store = type === 'ip' ? ipLimitStore : emailLimitStore;
  
  if (action) {
    store.delete(`${action}:${identifier.toLowerCase()}`);
  } else {
    // Clear all actions for this identifier
    for (const key of store.keys()) {
      if (key.endsWith(`:${identifier.toLowerCase()}`)) {
        store.delete(key);
      }
    }
  }
}

/**
 * Get the client IP from the request
 */
export function getClientIp(request: Request): string {
  // Check various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP if there are multiple
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback - not ideal but better than nothing
  return 'unknown';
}

/**
 * Format retry time for user-friendly display
 */
export function formatRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Generate a rate limit error response
 */
export function createRateLimitResponse(result: RateLimitResult) {
  return {
    error: `Too many attempts. Please try again in ${formatRetryTime(result.retryAfterSeconds || 60)}.`,
    retryAfter: result.retryAfterSeconds,
    retryAfterMs: result.retryAfterMs,
  };
}























