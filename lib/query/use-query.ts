/**
 * Lightweight React Query-like hook
 * Provides caching, deduplication, and background refetching
 * Can be migrated to @tanstack/react-query when installed
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Pending requests for deduplication
const pendingRequests = new Map<string, Promise<any>>();

export interface UseQueryOptions<T> {
  /** Cache time in milliseconds */
  cacheTime?: number;
  /** Stale time in milliseconds */
  staleTime?: number;
  /** Enable/disable the query */
  enabled?: boolean;
  /** Refetch on window focus */
  refetchOnWindowFocus?: boolean;
  /** Initial data */
  initialData?: T;
  /** On success callback */
  onSuccess?: (data: T) => void;
  /** On error callback */
  onError?: (error: Error) => void;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  isStale: boolean;
  refetch: () => Promise<void>;
}

/**
 * Lightweight data fetching hook with caching
 */
export function useQuery<T>(
  queryKey: string | string[],
  queryFn: () => Promise<T>,
  options: UseQueryOptions<T> = {}
): UseQueryResult<T> {
  const {
    cacheTime = CACHE_TTL,
    staleTime = 0,
    enabled = true,
    refetchOnWindowFocus = true,
    initialData,
    onSuccess,
    onError,
  } = options;

  const key = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;
  const mountedRef = useRef(true);
  
  // Get initial state from cache or initialData
  const getCachedData = () => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.data as T;
    }
    return initialData;
  };

  const [data, setData] = useState<T | undefined>(getCachedData);
  const [isLoading, setIsLoading] = useState(!data && enabled);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check for pending request with same key (deduplication)
    const pending = pendingRequests.get(key);
    if (pending) {
      try {
        const result = await pending;
        if (mountedRef.current) {
          setData(result);
          setIsLoading(false);
          setIsFetching(false);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err as Error);
          setIsLoading(false);
          setIsFetching(false);
        }
      }
      return;
    }

    // Check cache
    const cached = cache.get(key);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < staleTime) {
        // Data is fresh, use cache
        if (mountedRef.current) {
          setData(cached.data);
          setIsLoading(false);
        }
        return;
      } else if (age < cacheTime) {
        // Data is stale but valid, use cache and refetch in background
        if (mountedRef.current) {
          setData(cached.data);
          setIsLoading(false);
          setIsStale(true);
        }
      }
    }

    setIsFetching(true);
    if (!data) setIsLoading(true);

    // Create the request promise and store it for deduplication
    const requestPromise = queryFn();
    pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      
      // Update cache
      cache.set(key, { data: result, timestamp: Date.now() });
      
      if (mountedRef.current) {
        setData(result);
        setError(null);
        setIsStale(false);
        onSuccess?.(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err as Error);
        onError?.(err as Error);
      }
    } finally {
      pendingRequests.delete(key);
      if (mountedRef.current) {
        setIsLoading(false);
        setIsFetching(false);
      }
    }
  }, [key, enabled, queryFn, staleTime, cacheTime, data, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [key, enabled]); // Re-fetch when key changes

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp > staleTime) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [key, refetchOnWindowFocus, staleTime, fetchData]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    isLoading,
    isError: !!error,
    error,
    isFetching,
    isStale,
    refetch: fetchData,
  };
}

/**
 * Invalidate cache entries
 */
export function invalidateQueries(keyPrefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Set query data manually (for optimistic updates)
 */
export function setQueryData<T>(queryKey: string | string[], data: T) {
  const key = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;
  cache.set(key, { data, timestamp: Date.now() });
}


