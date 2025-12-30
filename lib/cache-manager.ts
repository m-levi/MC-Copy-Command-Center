/**
 * Cache Manager - Enhanced LRU cache with cross-tab sync and optimistic updates
 *
 * Features:
 * - LRU cache for messages and conversations
 * - Cross-tab synchronization via BroadcastChannel
 * - Optimistic updates with rollback
 * - Tag-based cache invalidation
 * - Stale-while-revalidate support
 */

import { Message, Conversation } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

// =====================================================
// TYPES
// =====================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

interface GenericCacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  tags: string[];
}

type CacheEventType = 'set' | 'delete' | 'invalidate' | 'clear';

interface CacheEvent {
  type: CacheEventType;
  key?: string;
  cacheType?: 'message' | 'conversation' | 'metadata' | 'generic';
  tags?: string[];
  timestamp: number;
}

interface OptimisticUpdateOptions<T> {
  onError?: (previousData: T | null) => void;
  onSuccess?: (data: T) => void;
}

const MESSAGE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const CONVERSATION_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const CONVERSATION_METADATA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_MESSAGE_CACHE_SIZE = 50; // conversations
const MAX_CONVERSATION_CACHE_SIZE = 20; // brands
const MAX_METADATA_CACHE_SIZE = 100; // conversation metadata entries

// In-memory caches
const messageCache = new Map<string, CacheEntry<Message[]>>();
const conversationCache = new Map<string, CacheEntry<Conversation[]>>();
const conversationMetadataCache = new Map<string, CacheEntry<{ preview: string; lastMessageAt: string }>>();

/**
 * Get cached messages for a conversation
 */
export function getCachedMessages(conversationId: string): Message[] | null {
  const entry = messageCache.get(conversationId);
  
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() - entry.timestamp > entry.ttl) {
    messageCache.delete(conversationId);
    return null;
  }
  
  return entry.data;
}

/**
 * Cache messages for a conversation
 */
export function cacheMessages(conversationId: string, messages: Message[]): void {
  // LRU: If cache is full, remove oldest entry
  if (messageCache.size >= MAX_MESSAGE_CACHE_SIZE) {
    const oldestKey = messageCache.keys().next().value;
    if (oldestKey) {
      messageCache.delete(oldestKey);
    }
  }
  
  messageCache.set(conversationId, {
    data: messages,
    timestamp: Date.now(),
    ttl: MESSAGE_CACHE_TTL,
  });
}

/**
 * Add a single message to cached conversation
 */
export function addCachedMessage(conversationId: string, message: Message): void {
  const entry = messageCache.get(conversationId);
  
  if (entry) {
    // Add message to existing cache
    entry.data.push(message);
    entry.timestamp = Date.now(); // Refresh timestamp
  }
}

/**
 * Update a cached message
 */
export function updateCachedMessage(conversationId: string, updatedMessage: Message): void {
  const entry = messageCache.get(conversationId);
  
  if (entry) {
    const index = entry.data.findIndex(m => m.id === updatedMessage.id);
    if (index !== -1) {
      entry.data[index] = updatedMessage;
      entry.timestamp = Date.now(); // Refresh timestamp
    }
  }
}

/**
 * Clear message cache for a conversation
 */
export function clearMessageCache(conversationId: string): void {
  messageCache.delete(conversationId);
}

/**
 * Get cached conversations for a brand
 */
export function getCachedConversations(brandId: string): Conversation[] | null {
  const entry = conversationCache.get(brandId);
  
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() - entry.timestamp > entry.ttl) {
    conversationCache.delete(brandId);
    return null;
  }
  
  return entry.data;
}

/**
 * Cache conversations for a brand
 */
export function cacheConversations(brandId: string, conversations: Conversation[]): void {
  // LRU: If cache is full, remove oldest entry
  if (conversationCache.size >= MAX_CONVERSATION_CACHE_SIZE) {
    const oldestKey = conversationCache.keys().next().value;
    if (oldestKey) {
      conversationCache.delete(oldestKey);
    }
  }
  
  conversationCache.set(brandId, {
    data: conversations,
    timestamp: Date.now(),
    ttl: CONVERSATION_CACHE_TTL,
  });
}

/**
 * Clear conversation cache for a brand
 */
export function clearConversationCache(brandId: string): void {
  conversationCache.delete(brandId);
}

/**
 * Prefetch messages in background
 */
export async function prefetchMessages(
  conversationId: string,
  supabase: SupabaseClient
): Promise<void> {
  // Check if already cached
  if (getCachedMessages(conversationId)) {
    return; // Already cached
  }
  
  try {
    // Select only needed fields for Message type
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, role, content, thinking, created_at, metadata, edited_at, parent_message_id, user_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      cacheMessages(conversationId, data);
    }
  } catch (error) {
    // Silent fail - prefetch is optional
    console.debug('Prefetch failed:', error);
  }
}

/**
 * Get cached conversation metadata (preview and last message time)
 */
export function getCachedConversationMetadata(conversationId: string): { preview: string; lastMessageAt: string } | null {
  const entry = conversationMetadataCache.get(conversationId);
  
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() - entry.timestamp > entry.ttl) {
    conversationMetadataCache.delete(conversationId);
    return null;
  }
  
  return entry.data;
}

/**
 * Cache conversation metadata
 */
export function cacheConversationMetadata(
  conversationId: string, 
  preview: string, 
  lastMessageAt: string
): void {
  // LRU: If cache is full, remove oldest entry
  if (conversationMetadataCache.size >= MAX_METADATA_CACHE_SIZE) {
    const oldestKey = conversationMetadataCache.keys().next().value;
    if (oldestKey) {
      conversationMetadataCache.delete(oldestKey);
    }
  }
  
  conversationMetadataCache.set(conversationId, {
    data: { preview, lastMessageAt },
    timestamp: Date.now(),
    ttl: CONVERSATION_METADATA_CACHE_TTL,
  });
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  messageCache.clear();
  conversationCache.clear();
  conversationMetadataCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    messages: {
      size: messageCache.size,
      maxSize: MAX_MESSAGE_CACHE_SIZE,
      ttl: MESSAGE_CACHE_TTL,
    },
    conversations: {
      size: conversationCache.size,
      maxSize: MAX_CONVERSATION_CACHE_SIZE,
      ttl: CONVERSATION_CACHE_TTL,
    },
    metadata: {
      size: conversationMetadataCache.size,
      maxSize: MAX_METADATA_CACHE_SIZE,
      ttl: CONVERSATION_METADATA_CACHE_TTL,
    },
    generic: {
      size: genericCache.size,
      maxSize: MAX_GENERIC_CACHE_SIZE,
    },
    crossTabSync: broadcastChannel !== null,
  };
}

// =====================================================
// GENERIC CACHE (for any data type)
// =====================================================

const MAX_GENERIC_CACHE_SIZE = 200;
const DEFAULT_GENERIC_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_WHILE_REVALIDATE_WINDOW = 30 * 1000; // 30 seconds

const genericCache = new Map<string, GenericCacheEntry<unknown>>();
const cacheListeners = new Map<string, Set<(data: unknown) => void>>();
const pendingRevalidations = new Set<string>();

// =====================================================
// CROSS-TAB SYNCHRONIZATION
// =====================================================

let broadcastChannel: BroadcastChannel | null = null;

/**
 * Initialize cross-tab synchronization
 */
function initCrossTabSync(): void {
  if (typeof window === 'undefined') return;

  try {
    broadcastChannel = new BroadcastChannel('mooncommerce-cache');
    broadcastChannel.onmessage = (event: MessageEvent<CacheEvent>) => {
      handleCrossTabEvent(event.data);
    };
  } catch {
    console.warn('BroadcastChannel not supported, cross-tab sync disabled');
  }
}

/**
 * Handle cache events from other tabs
 */
function handleCrossTabEvent(event: CacheEvent): void {
  switch (event.type) {
    case 'set':
      // Another tab updated data, notify local listeners to refresh
      if (event.key) {
        notifyListeners(event.key, null);
      }
      break;

    case 'delete':
      if (event.key && event.cacheType) {
        switch (event.cacheType) {
          case 'message':
            messageCache.delete(event.key);
            break;
          case 'conversation':
            conversationCache.delete(event.key);
            break;
          case 'metadata':
            conversationMetadataCache.delete(event.key);
            break;
          case 'generic':
            genericCache.delete(event.key);
            break;
        }
        notifyListeners(event.key, null);
      }
      break;

    case 'invalidate':
      if (event.tags) {
        invalidateByTagsLocal(event.tags);
      }
      break;

    case 'clear':
      clearAllCaches();
      break;
  }
}

/**
 * Broadcast cache event to other tabs
 */
function broadcast(event: CacheEvent): void {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(event);
    } catch {
      // Channel closed or serialization error
    }
  }
}

// Initialize cross-tab sync on module load
if (typeof window !== 'undefined') {
  initCrossTabSync();
}

// =====================================================
// CACHE LISTENERS
// =====================================================

/**
 * Subscribe to cache changes for a key
 */
export function subscribeToCache<T>(
  key: string,
  listener: (data: T | null) => void
): () => void {
  if (!cacheListeners.has(key)) {
    cacheListeners.set(key, new Set());
  }
  cacheListeners.get(key)!.add(listener as (data: unknown) => void);

  // Return unsubscribe function
  return () => {
    const keyListeners = cacheListeners.get(key);
    if (keyListeners) {
      keyListeners.delete(listener as (data: unknown) => void);
      if (keyListeners.size === 0) {
        cacheListeners.delete(key);
      }
    }
  };
}

/**
 * Notify listeners of cache changes
 */
function notifyListeners(key: string, data: unknown): void {
  const keyListeners = cacheListeners.get(key);
  if (keyListeners) {
    keyListeners.forEach(listener => listener(data));
  }
}

// =====================================================
// GENERIC CACHE OPERATIONS
// =====================================================

/**
 * Get data from generic cache
 */
export function getCached<T>(key: string, options?: { allowStale?: boolean }): T | null {
  const entry = genericCache.get(key) as GenericCacheEntry<T> | undefined;

  if (!entry) {
    return null;
  }

  const now = Date.now();

  // Check if expired
  if (now > entry.expiresAt) {
    // Check if within stale-while-revalidate window
    if (options?.allowStale && now < entry.expiresAt + STALE_WHILE_REVALIDATE_WINDOW) {
      return entry.data;
    }
    genericCache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set data in generic cache
 */
export function setCached<T>(
  key: string,
  data: T,
  options?: { ttl?: number; tags?: string[] }
): void {
  const ttl = options?.ttl ?? DEFAULT_GENERIC_TTL;
  const now = Date.now();

  // LRU eviction
  if (genericCache.size >= MAX_GENERIC_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    genericCache.forEach((entry, k) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = k;
      }
    });
    if (oldestKey) {
      genericCache.delete(oldestKey);
    }
  }

  const entry: GenericCacheEntry<T> = {
    data,
    timestamp: now,
    expiresAt: now + ttl,
    tags: options?.tags ?? [],
  };

  genericCache.set(key, entry);
  notifyListeners(key, data);
  broadcast({ type: 'set', key, cacheType: 'generic', timestamp: now });
}

/**
 * Delete from generic cache
 */
export function deleteCached(key: string): void {
  genericCache.delete(key);
  notifyListeners(key, null);
  broadcast({ type: 'delete', key, cacheType: 'generic', timestamp: Date.now() });
}

// =====================================================
// TAG-BASED INVALIDATION
// =====================================================

/**
 * Invalidate cache entries by tags
 */
export function invalidateByTags(tags: string[]): void {
  invalidateByTagsLocal(tags);
  broadcast({ type: 'invalidate', tags, timestamp: Date.now() });
}

/**
 * Local tag invalidation (without broadcast)
 */
function invalidateByTagsLocal(tags: string[]): void {
  const tagsSet = new Set(tags);
  const keysToDelete: string[] = [];

  genericCache.forEach((entry, key) => {
    if (entry.tags.some(tag => tagsSet.has(tag))) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => {
    genericCache.delete(key);
    notifyListeners(key, null);
  });
}

/**
 * Invalidate all cache entries matching a pattern
 */
export function invalidateByPattern(pattern: string | RegExp): void {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const keysToDelete: string[] = [];

  genericCache.forEach((_, key) => {
    if (regex.test(key)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => {
    deleteCached(key);
  });
}

// =====================================================
// OPTIMISTIC UPDATES
// =====================================================

/**
 * Perform optimistic update with rollback capability
 */
export function optimisticUpdate<T>(
  key: string,
  optimisticData: T,
  options?: OptimisticUpdateOptions<T>
): () => void {
  const previousData = getCached<T>(key);

  // Set optimistic data
  setCached(key, optimisticData);

  // Return rollback function
  return () => {
    if (previousData !== null) {
      setCached(key, previousData);
    } else {
      deleteCached(key);
    }
    options?.onError?.(previousData);
  };
}

/**
 * Execute async operation with optimistic update
 */
export async function withOptimisticUpdate<T, R>(
  key: string,
  optimisticData: T,
  operation: () => Promise<R>,
  options?: {
    onSuccess?: (result: R) => T;
    ttl?: number;
    tags?: string[];
  }
): Promise<R> {
  const rollback = optimisticUpdate(key, optimisticData);

  try {
    const result = await operation();

    // Update cache with final data if transformer provided
    if (options?.onSuccess) {
      setCached(key, options.onSuccess(result), {
        ttl: options.ttl,
        tags: options.tags,
      });
    }

    return result;
  } catch (error) {
    rollback();
    throw error;
  }
}

// =====================================================
// STALE-WHILE-REVALIDATE
// =====================================================

/**
 * Get data with stale-while-revalidate pattern
 */
export async function revalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    tags?: string[];
    skipCache?: boolean;
    staleWhileRevalidate?: boolean;
  }
): Promise<T> {
  // Prevent concurrent revalidations for the same key
  if (pendingRevalidations.has(key)) {
    const cached = getCached<T>(key, { allowStale: true });
    if (cached !== null) {
      return cached;
    }
    // Wait for pending revalidation
    return new Promise((resolve) => {
      const unsubscribe = subscribeToCache<T>(key, (data) => {
        if (data !== null) {
          unsubscribe();
          resolve(data);
        }
      });
    });
  }

  // Check cache first
  const cached = getCached<T>(key);
  if (cached !== null && !options?.skipCache) {
    return cached;
  }

  // Check for stale data
  const staleData = getCached<T>(key, { allowStale: true });

  // Mark as revalidating
  pendingRevalidations.add(key);

  try {
    // If we have stale data and staleWhileRevalidate is enabled
    if (staleData !== null && options?.staleWhileRevalidate) {
      // Fetch fresh data in background
      fetcher()
        .then(freshData => {
          setCached(key, freshData, { ttl: options.ttl, tags: options.tags });
          pendingRevalidations.delete(key);
        })
        .catch(() => {
          pendingRevalidations.delete(key);
        });
      return staleData;
    }

    // Fetch fresh data
    const freshData = await fetcher();
    setCached(key, freshData, { ttl: options?.ttl, tags: options?.tags });
    return freshData;
  } finally {
    pendingRevalidations.delete(key);
  }
}

// =====================================================
// CACHE KEYS
// =====================================================

/**
 * Predefined cache keys for consistent usage
 */
export const CACHE_KEYS = {
  // User data
  user: (userId: string) => `user:${userId}`,
  userPreferences: (userId: string) => `user:${userId}:preferences`,

  // Brand data
  brands: (orgId: string) => `brands:${orgId}`,
  brand: (brandId: string) => `brand:${brandId}`,
  brandFiles: (brandId: string) => `brand:${brandId}:files`,

  // Conversation data
  conversations: (brandId: string) => `conversations:${brandId}`,
  conversation: (convId: string) => `conversation:${convId}`,
  messages: (convId: string) => `messages:${convId}`,

  // Artifacts
  artifacts: (convId: string) => `artifacts:${convId}`,
  artifact: (artifactId: string) => `artifact:${artifactId}`,

  // Modes/Prompts
  modes: (orgId: string) => `modes:${orgId}`,
  prompts: (orgId: string) => `prompts:${orgId}`,

  // Team
  teamMembers: (orgId: string) => `team:${orgId}`,
} as const;

/**
 * Cache tags for grouped invalidation
 */
export const CACHE_TAGS = {
  user: (userId: string) => `tag:user:${userId}`,
  brand: (brandId: string) => `tag:brand:${brandId}`,
  conversation: (convId: string) => `tag:conversation:${convId}`,
  organization: (orgId: string) => `tag:org:${orgId}`,
} as const;

// =====================================================
// CLEANUP
// =====================================================

/**
 * Cleanup expired entries
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();

  // Cleanup message cache
  messageCache.forEach((entry, key) => {
    if (now - entry.timestamp > entry.ttl) {
      messageCache.delete(key);
    }
  });

  // Cleanup conversation cache
  conversationCache.forEach((entry, key) => {
    if (now - entry.timestamp > entry.ttl) {
      conversationCache.delete(key);
    }
  });

  // Cleanup metadata cache
  conversationMetadataCache.forEach((entry, key) => {
    if (now - entry.timestamp > entry.ttl) {
      conversationMetadataCache.delete(key);
    }
  });

  // Cleanup generic cache
  genericCache.forEach((entry, key) => {
    if (now > entry.expiresAt + STALE_WHILE_REVALIDATE_WINDOW) {
      genericCache.delete(key);
    }
  });
}

/**
 * Destroy cache manager (cleanup resources)
 */
export function destroyCacheManager(): void {
  clearAllCaches();
  cacheListeners.clear();
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }
}

// Periodic cleanup (every 2 minutes in browser)
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredEntries, 2 * 60 * 1000);
}

