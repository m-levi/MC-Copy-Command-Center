'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCached,
  setCached,
  deleteCached,
  subscribeToCache,
  revalidate,
  withOptimisticUpdate,
  CACHE_KEYS,
  CACHE_TAGS,
} from '@/lib/cache-manager';

// =====================================================
// TYPES
// =====================================================

interface UseCacheOptions<T> {
  /** Time to live in milliseconds */
  ttl?: number;
  /** Tags for grouped invalidation */
  tags?: string[];
  /** Initial data while loading */
  initialData?: T;
  /** Whether to fetch immediately */
  enabled?: boolean;
  /** Use stale-while-revalidate pattern */
  staleWhileRevalidate?: boolean;
  /** Skip cache and always fetch fresh */
  skipCache?: boolean;
  /** Refetch interval in ms (0 = disabled) */
  refetchInterval?: number;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface UseCacheReturn<T> {
  /** Current data */
  data: T | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Whether data is stale */
  isStale: boolean;
  /** Refetch data */
  refetch: () => Promise<void>;
  /** Mutate data with optimistic update */
  mutate: (
    newData: T | ((prev: T | null) => T),
    options?: { revalidate?: boolean }
  ) => void;
  /** Invalidate and refetch */
  invalidate: () => Promise<void>;
}

interface UseMutationOptions<T, V> {
  /** Cache key to update on success */
  cacheKey?: string;
  /** Tags to invalidate on success */
  invalidateTags?: string[];
  /** Optimistic data while mutating */
  optimisticUpdate?: (variables: V, currentData: T | null) => T;
  /** Transform mutation result to cache data */
  onSuccess?: (result: T, variables: V) => void;
  /** Callback on error */
  onError?: (error: Error, variables: V) => void;
  /** Callback when mutation settles */
  onSettled?: (result: T | undefined, error: Error | null, variables: V) => void;
}

interface UseMutationReturn<T, V> {
  /** Trigger the mutation */
  mutate: (variables: V) => Promise<T>;
  /** Async version of mutate */
  mutateAsync: (variables: V) => Promise<T>;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Reset error state */
  reset: () => void;
}

// =====================================================
// MAIN HOOK: useCache
// =====================================================

/**
 * Hook for cached data fetching with automatic subscriptions
 *
 * @example
 * ```tsx
 * const { data, isLoading, refetch } = useCache(
 *   'brands:org123',
 *   () => fetchBrands(),
 *   { ttl: 5 * 60 * 1000 }
 * );
 * ```
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions<T> = {}
): UseCacheReturn<T> {
  const {
    ttl,
    tags,
    initialData,
    enabled = true,
    staleWhileRevalidate = true,
    skipCache = false,
    refetchInterval = 0,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(() => {
    if (initialData !== undefined) return initialData;
    return getCached<T>(key);
  });
  const [isLoading, setIsLoading] = useState(data === null && enabled);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await revalidate(key, fetcherRef.current, {
        ttl,
        tags,
        skipCache,
        staleWhileRevalidate,
      });

      setData(result);
      setIsStale(false);
      onSuccessRef.current?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onErrorRef.current?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, key, ttl, tags, skipCache, staleWhileRevalidate]);

  // Subscribe to cache changes
  useEffect(() => {
    const unsubscribe = subscribeToCache<T>(key, (newData) => {
      if (newData !== null) {
        setData(newData);
        setIsStale(false);
      } else {
        // Cache was invalidated, mark as stale
        setIsStale(true);
      }
    });

    return unsubscribe;
  }, [key]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  // Refetch interval
  useEffect(() => {
    if (refetchInterval > 0 && enabled) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [refetchInterval, enabled, fetchData]);

  // Refetch function
  const refetch = useCallback(async () => {
    await revalidate(key, fetcherRef.current, {
      ttl,
      tags,
      skipCache: true, // Force refetch
      staleWhileRevalidate: false,
    }).then(result => {
      setData(result);
      setIsStale(false);
    }).catch(err => {
      setError(err instanceof Error ? err : new Error(String(err)));
    });
  }, [key, ttl, tags]);

  // Mutate function for optimistic updates
  const mutate = useCallback(
    (
      newData: T | ((prev: T | null) => T),
      options?: { revalidate?: boolean }
    ) => {
      const resolvedData = typeof newData === 'function'
        ? (newData as (prev: T | null) => T)(data)
        : newData;

      setCached(key, resolvedData, { ttl, tags });
      setData(resolvedData);

      if (options?.revalidate) {
        refetch();
      }
    },
    [key, ttl, tags, data, refetch]
  );

  // Invalidate function
  const invalidate = useCallback(async () => {
    deleteCached(key);
    setIsStale(true);
    await refetch();
  }, [key, refetch]);

  return {
    data,
    isLoading,
    error,
    isStale,
    refetch,
    mutate,
    invalidate,
  };
}

// =====================================================
// MUTATION HOOK: useMutation
// =====================================================

/**
 * Hook for mutations with cache updates
 *
 * @example
 * ```tsx
 * const { mutate, isLoading } = useMutation(
 *   (data) => createBrand(data),
 *   {
 *     invalidateTags: [CACHE_TAGS.organization(orgId)],
 *     onSuccess: () => toast.success('Brand created!'),
 *   }
 * );
 * ```
 */
export function useMutation<T, V = void>(
  mutationFn: (variables: V) => Promise<T>,
  options: UseMutationOptions<T, V> = {}
): UseMutationReturn<T, V> {
  const {
    cacheKey,
    invalidateTags,
    optimisticUpdate: optimisticFn,
    onSuccess,
    onError,
    onSettled,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutationFnRef = useRef(mutationFn);
  mutationFnRef.current = mutationFn;

  const mutateAsync = useCallback(async (variables: V): Promise<T> => {
    setIsLoading(true);
    setError(null);

    let result: T | undefined;
    let mutationError: Error | null = null;

    try {
      // If we have optimistic update and cache key
      if (cacheKey && optimisticFn) {
        const currentData = getCached<T>(cacheKey);
        const optimisticData = optimisticFn(variables, currentData);

        result = await withOptimisticUpdate<T, T>(
          cacheKey,
          optimisticData,
          () => mutationFnRef.current(variables),
          {
            onSuccess: (actualResult) => actualResult,
          }
        );
      } else {
        result = await mutationFnRef.current(variables);

        // Update cache with result if key provided
        if (cacheKey) {
          setCached(cacheKey, result);
        }
      }

      // Invalidate tags
      if (invalidateTags && invalidateTags.length > 0) {
        const { invalidateByTags } = await import('@/lib/cache-manager');
        invalidateByTags(invalidateTags);
      }

      onSuccess?.(result!, variables);
      return result!;
    } catch (err) {
      mutationError = err instanceof Error ? err : new Error(String(err));
      setError(mutationError);
      onError?.(mutationError, variables);
      throw mutationError;
    } finally {
      setIsLoading(false);
      onSettled?.(result, mutationError, variables);
    }
  }, [cacheKey, optimisticFn, invalidateTags, onSuccess, onError, onSettled]);

  const mutate = useCallback((variables: V) => {
    mutateAsync(variables).catch(() => {
      // Error already handled
    });
    return mutateAsync(variables);
  }, [mutateAsync]);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    mutate,
    mutateAsync,
    isLoading,
    error,
    reset,
  };
}

// =====================================================
// QUERY INVALIDATION HOOK
// =====================================================

/**
 * Hook to invalidate cache queries
 *
 * @example
 * ```tsx
 * const invalidate = useInvalidateQueries();
 *
 * // Invalidate specific key
 * invalidate('brands:org123');
 *
 * // Invalidate by tags
 * invalidate({ tags: [CACHE_TAGS.brand('brand123')] });
 *
 * // Invalidate by pattern
 * invalidate({ pattern: /^brands:/ });
 * ```
 */
export function useInvalidateQueries() {
  return useCallback(async (
    target: string | { tags?: string[]; pattern?: RegExp | string }
  ) => {
    const { invalidateByTags, invalidateByPattern, deleteCached } = await import('@/lib/cache-manager');

    if (typeof target === 'string') {
      deleteCached(target);
    } else {
      if (target.tags) {
        invalidateByTags(target.tags);
      }
      if (target.pattern) {
        invalidateByPattern(target.pattern);
      }
    }
  }, []);
}

// =====================================================
// PREFETCH HOOK
// =====================================================

/**
 * Hook to prefetch data into cache
 *
 * @example
 * ```tsx
 * const prefetch = usePrefetch();
 *
 * // Prefetch on hover
 * <div onMouseEnter={() => prefetch('brand:123', () => fetchBrand('123'))}>
 *   ...
 * </div>
 * ```
 */
export function usePrefetch() {
  const prefetchedKeys = useRef(new Set<string>());

  return useCallback(async <T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; tags?: string[] }
  ) => {
    // Skip if already prefetched
    if (prefetchedKeys.current.has(key)) return;

    // Check if already cached
    const cached = getCached<T>(key);
    if (cached !== null) return;

    // Mark as prefetching
    prefetchedKeys.current.add(key);

    try {
      const data = await fetcher();
      setCached(key, data, options);
    } catch {
      // Silent fail for prefetch
      prefetchedKeys.current.delete(key);
    }
  }, []);
}

// =====================================================
// EXPORTS
// =====================================================

export { CACHE_KEYS, CACHE_TAGS };

export default useCache;
