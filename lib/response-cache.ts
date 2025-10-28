/**
 * AI Response cache - Cache AI responses to reduce API calls
 */

import { Message } from '@/types';

interface CachedResponse {
  content: string;
  productLinks?: any[];
  timestamp: number;
  model: string;
}

const CACHE_KEY_PREFIX = 'ai_response_';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Generate cache key from messages, model, and brand
 */
export function generateCacheKey(
  messages: Message[],
  modelId: string,
  brandId: string,
  regenerateSection?: { type: string; title: string }
): string {
  // Create a hash-like key from the conversation context
  const messageKey = messages
    .map((m) => `${m.role}:${m.content.substring(0, 100)}`)
    .join('|');
  
  const sectionKey = regenerateSection 
    ? `_regen_${regenerateSection.type}_${regenerateSection.title}`
    : '';
  
  // Simple hash function
  const hash = simpleHash(messageKey + modelId + brandId + sectionKey);
  return `${CACHE_KEY_PREFIX}${hash}`;
}

/**
 * Simple hash function for cache keys
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Save response to cache
 */
export function cacheResponse(
  key: string,
  content: string,
  model: string,
  productLinks?: any[]
): void {
  try {
    const cached: CachedResponse = {
      content,
      productLinks,
      timestamp: Date.now(),
      model,
    };
    
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    // Silently fail if storage is full
    console.debug('Failed to cache response:', error);
  }
}

/**
 * Get cached response
 */
export function getCachedResponse(key: string): CachedResponse | null {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;

    const cached = JSON.parse(data) as CachedResponse;

    // Check if expired
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }

    return cached;
  } catch (error) {
    console.debug('Failed to get cached response:', error);
    return null;
  }
}

/**
 * Check if response is cached
 */
export function hasCachedResponse(key: string): boolean {
  const cached = getCachedResponse(key);
  return cached !== null;
}

/**
 * Clear a specific cached response
 */
export function clearCachedResponse(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.debug('Failed to clear cached response:', error);
  }
}

/**
 * Clear all cached responses
 */
export function clearAllCachedResponses(): void {
  try {
    const keys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        keys.push(key);
      }
    }

    keys.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.debug('Failed to clear all cached responses:', error);
  }
}

/**
 * Clear expired cached responses
 */
export function clearExpiredCachedResponses(): void {
  try {
    const now = Date.now();
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const cached = JSON.parse(data) as CachedResponse;
            if (now - cached.timestamp > CACHE_TTL) {
              keys.push(key);
            }
          } catch (e) {
            // Invalid data, mark for removal
            keys.push(key);
          }
        }
      }
    }

    keys.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.debug('Failed to clear expired responses:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  totalCached: number;
  totalSize: number;
  oldestEntry: number | null;
} {
  let totalCached = 0;
  let totalSize = 0;
  let oldestEntry: number | null = null;

  try {
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            totalCached++;
            totalSize += data.length;

            const cached = JSON.parse(data) as CachedResponse;
            const age = now - cached.timestamp;
            if (oldestEntry === null || age > oldestEntry) {
              oldestEntry = age;
            }
          } catch (e) {
            // Skip invalid entries
          }
        }
      }
    }
  } catch (error) {
    console.debug('Failed to get cache stats:', error);
  }

  return {
    totalCached,
    totalSize,
    oldestEntry,
  };
}

/**
 * Clean up cache to free space if needed
 */
export function cleanupCache(targetSize: number = 5 * 1024 * 1024): void {
  try {
    const stats = getCacheStats();
    
    if (stats.totalSize < targetSize) {
      return; // No cleanup needed
    }

    // Get all cached responses with their ages
    const entries: Array<{ key: string; timestamp: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const cached = JSON.parse(data) as CachedResponse;
            entries.push({ key, timestamp: cached.timestamp });
          } catch (e) {
            // Invalid entry, remove it
            localStorage.removeItem(key);
          }
        }
      }
    }

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries until we're under target size
    let currentSize = stats.totalSize;
    for (const entry of entries) {
      if (currentSize < targetSize) break;

      const data = localStorage.getItem(entry.key);
      if (data) {
        currentSize -= data.length;
        localStorage.removeItem(entry.key);
      }
    }
  } catch (error) {
    console.debug('Failed to cleanup cache:', error);
  }
}

