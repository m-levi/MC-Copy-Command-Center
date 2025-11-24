/**
 * Cache Manager - LRU cache for messages and conversations
 */

import { Message, Conversation } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
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
  };
}

