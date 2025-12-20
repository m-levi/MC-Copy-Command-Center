import { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationMode } from '@/types';

export interface ChatSuggestion {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: string;
  category: 'campaign' | 'content' | 'strategy' | 'optimization';
}

interface UseChatSuggestionsOptions {
  brandId: string | null;
  mode: ConversationMode;
  enabled?: boolean;
}

interface UseChatSuggestionsResult {
  suggestions: ChatSuggestion[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// Simple in-memory cache with expiration
const cache = new Map<string, { data: ChatSuggestion[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(brandId: string, mode: string): string {
  return `suggestions-${brandId}-${mode}`;
}

function getFromCache(key: string): ChatSuggestion[] | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: ChatSuggestion[]): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function useChatSuggestions({
  brandId,
  mode,
  enabled = true,
}: UseChatSuggestionsOptions): UseChatSuggestionsResult {
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchInProgressRef = useRef(false);

  const fetchSuggestions = useCallback(async (force = false) => {
    if (!brandId || !enabled) {
      setSuggestions([]);
      return;
    }

    // Check cache first (unless force refresh)
    const cacheKey = getCacheKey(brandId, mode);
    if (!force) {
      const cached = getFromCache(cacheKey);
      if (cached) {
        setSuggestions(cached);
        return;
      }
    }

    // Prevent duplicate fetches
    if (fetchInProgressRef.current) {
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    fetchInProgressRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/chat-suggestions?brandId=${encodeURIComponent(brandId)}&mode=${encodeURIComponent(mode)}`,
        {
          signal: abortControllerRef.current.signal,
          // Use low priority to not block other requests
          priority: 'low',
        } as RequestInit
      );

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      const newSuggestions = data.suggestions || [];
      
      setSuggestions(newSuggestions);
      setCache(cacheKey, newSuggestions);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('[useChatSuggestions] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Set empty array on error so we show fallback UI
      setSuggestions([]);
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [brandId, mode, enabled]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    // Small delay to prevent fetching during rapid mode changes
    const timeoutId = setTimeout(() => {
      fetchSuggestions();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSuggestions]);

  const refresh = useCallback(() => {
    fetchSuggestions(true);
  }, [fetchSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
    refresh,
  };
}

// Export cache clearing function for when brand/mode context changes significantly
export function clearSuggestionsCache(brandId?: string, mode?: string): void {
  if (brandId && mode) {
    cache.delete(getCacheKey(brandId, mode));
  } else if (brandId) {
    // Clear all modes for this brand
    for (const key of cache.keys()) {
      if (key.startsWith(`suggestions-${brandId}-`)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}


