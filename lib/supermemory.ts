/**
 * Supermemory Service
 * 
 * Provides AI-powered persistent memory per brand per user.
 * Uses Supermemory's API for storing, searching, and managing memories
 * that persist across conversations.
 * 
 * @see https://supermemory.ai/docs
 */

import { logger } from '@/lib/logger';

// Types for Supermemory responses
export interface SupermemoryMemory {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface SupermemorySearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SupermemoryAddResponse {
  id: string;
  status: string;
}

/**
 * Generate a composite userId for Supermemory that scopes memories
 * per brand per user.
 * 
 * @param brandId - The brand's unique identifier
 * @param userId - The user's unique identifier
 * @returns Composite userId in format: brand_{brandId}_user_{userId}
 */
export function getSupermemoryUserId(brandId: string, userId: string): string {
  return `brand_${brandId}_user_${userId}`;
}

/**
 * Get the Supermemory API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) {
    throw new Error('SUPERMEMORY_API_KEY is not configured');
  }
  return apiKey;
}

/**
 * Base fetch helper for Supermemory API calls
 */
async function supermemoryFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const baseUrl = 'https://api.supermemory.ai/v3';

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[Supermemory] API error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Supermemory API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Add a memory to Supermemory
 * 
 * @param brandId - The brand ID
 * @param userId - The user ID
 * @param content - The memory content to store
 * @param metadata - Optional metadata (e.g., title, category)
 */
export async function addMemory(
  brandId: string,
  userId: string,
  content: string,
  metadata?: { title?: string; category?: string; [key: string]: unknown }
): Promise<SupermemoryAddResponse> {
  const compositeUserId = getSupermemoryUserId(brandId, userId);

  logger.log('[Supermemory] Adding memory:', {
    compositeUserId,
    contentLength: content.length,
    metadata,
  });

  return supermemoryFetch<SupermemoryAddResponse>('/add', {
    method: 'POST',
    body: JSON.stringify({
      userId: compositeUserId,
      content,
      metadata: {
        ...metadata,
        brandId,
        originalUserId: userId,
      },
    }),
  });
}

/**
 * Search memories in Supermemory
 * 
 * @param brandId - The brand ID
 * @param userId - The user ID
 * @param query - Search query
 * @param limit - Maximum results to return (default: 10)
 */
export async function searchMemories(
  brandId: string,
  userId: string,
  query: string,
  limit: number = 10
): Promise<SupermemorySearchResult[]> {
  const compositeUserId = getSupermemoryUserId(brandId, userId);

  logger.log('[Supermemory] Searching memories:', {
    compositeUserId,
    query: query.substring(0, 50),
    limit,
  });

  const response = await supermemoryFetch<{ results: SupermemorySearchResult[] }>('/search', {
    method: 'POST',
    body: JSON.stringify({
      userId: compositeUserId,
      query,
      limit,
    }),
  });

  return response.results || [];
}

/**
 * List all memories for a brand/user
 * 
 * @param brandId - The brand ID
 * @param userId - The user ID
 * @param limit - Maximum results to return (default: 50)
 */
export async function listMemories(
  brandId: string,
  userId: string,
  limit: number = 50
): Promise<SupermemoryMemory[]> {
  const compositeUserId = getSupermemoryUserId(brandId, userId);

  logger.log('[Supermemory] Listing memories:', {
    compositeUserId,
    limit,
  });

  const response = await supermemoryFetch<{ memories: SupermemoryMemory[] }>(`/memories?userId=${encodeURIComponent(compositeUserId)}&limit=${limit}`, {
    method: 'GET',
  });

  return response.memories || [];
}

/**
 * Delete a specific memory
 * 
 * @param memoryId - The memory ID to delete
 */
export async function deleteMemory(memoryId: string): Promise<void> {
  logger.log('[Supermemory] Deleting memory:', { memoryId });

  await supermemoryFetch<{ success: boolean }>(`/memories/${encodeURIComponent(memoryId)}`, {
    method: 'DELETE',
  });
}

/**
 * Get user profile from Supermemory
 * This returns the AI-generated profile based on stored memories
 * 
 * @param brandId - The brand ID
 * @param userId - The user ID
 */
export async function getUserProfile(
  brandId: string,
  userId: string
): Promise<string | null> {
  const compositeUserId = getSupermemoryUserId(brandId, userId);

  logger.log('[Supermemory] Getting user profile:', { compositeUserId });

  try {
    const response = await supermemoryFetch<{ profile: string }>(`/profile?userId=${encodeURIComponent(compositeUserId)}`, {
      method: 'GET',
    });

    return response.profile || null;
  } catch (error) {
    // Profile might not exist yet
    logger.log('[Supermemory] No profile found:', { compositeUserId });
    return null;
  }
}

/**
 * Check if Supermemory is configured and available
 */
export function isSupermemoryConfigured(): boolean {
  return !!process.env.SUPERMEMORY_API_KEY;
}









