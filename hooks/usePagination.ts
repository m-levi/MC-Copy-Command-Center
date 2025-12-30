'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  PaginatedResponse,
  InfiniteScrollState,
  PAGINATION_DEFAULTS,
  mergePaginatedData,
} from '@/lib/pagination';

export interface UsePaginationOptions<T> {
  /** Initial limit per page */
  limit?: number;
  /** Function to fetch data */
  fetchFn: (params: {
    limit: number;
    cursor?: string;
    offset?: number;
  }) => Promise<PaginatedResponse<T>>;
  /** Whether to fetch on mount */
  fetchOnMount?: boolean;
  /** Key for deduplication (default: 'id') */
  idKey?: keyof T;
  /** Callback when data changes */
  onDataChange?: (items: T[]) => void;
}

export interface UsePaginationReturn<T> extends InfiniteScrollState<T> {
  /** Load more items */
  loadMore: () => Promise<void>;
  /** Refresh all data */
  refresh: () => Promise<void>;
  /** Reset to initial state */
  reset: () => void;
  /** Prepend new items (for real-time updates) */
  prepend: (items: T[]) => void;
  /** Update a specific item */
  updateItem: (id: string, updater: (item: T) => T) => void;
  /** Remove an item */
  removeItem: (id: string) => void;
}

/**
 * Hook for infinite scroll / load more pagination
 */
export function usePagination<T extends { id: string }>(
  options: UsePaginationOptions<T>
): UsePaginationReturn<T> {
  const {
    limit = PAGINATION_DEFAULTS.conversations,
    fetchFn,
    fetchOnMount = true,
    onDataChange,
  } = options;

  const [state, setState] = useState<InfiniteScrollState<T>>({
    items: [],
    isLoading: false,
    isInitialLoading: fetchOnMount,
    hasMore: true,
    error: null,
    cursor: undefined,
    offset: 0,
    total: undefined,
  });

  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Notify parent of data changes
  useEffect(() => {
    onDataChange?.(state.items);
  }, [state.items, onDataChange]);

  /**
   * Load initial data
   */
  const loadInitial = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    setState(prev => ({
      ...prev,
      isLoading: true,
      isInitialLoading: true,
      error: null,
    }));

    try {
      const response = await fetchFn({ limit });

      if (!isMountedRef.current) return;

      setState({
        items: response.data,
        isLoading: false,
        isInitialLoading: false,
        hasMore: response.pagination.hasMore,
        error: null,
        cursor: response.pagination.nextCursor,
        offset: response.pagination.count,
        total: response.pagination.total,
      });
    } catch (error) {
      if (!isMountedRef.current) return;

      setState(prev => ({
        ...prev,
        isLoading: false,
        isInitialLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load data'),
      }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [fetchFn, limit]);

  /**
   * Load more items
   */
  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !state.hasMore) return;
    isLoadingRef.current = true;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetchFn({
        limit,
        cursor: state.cursor,
        offset: state.offset,
      });

      if (!isMountedRef.current) return;

      setState(prev => ({
        ...prev,
        items: mergePaginatedData(prev.items, response.data),
        isLoading: false,
        hasMore: response.pagination.hasMore,
        cursor: response.pagination.nextCursor,
        offset: prev.offset + response.pagination.count,
        total: response.pagination.total,
      }));
    } catch (error) {
      if (!isMountedRef.current) return;

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load more'),
      }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [fetchFn, limit, state.cursor, state.offset, state.hasMore]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    setState(prev => ({
      ...prev,
      items: [],
      cursor: undefined,
      offset: 0,
      hasMore: true,
    }));
    await loadInitial();
  }, [loadInitial]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setState({
      items: [],
      isLoading: false,
      isInitialLoading: false,
      hasMore: true,
      error: null,
      cursor: undefined,
      offset: 0,
      total: undefined,
    });
  }, []);

  /**
   * Prepend new items (for real-time updates)
   */
  const prepend = useCallback((newItems: T[]) => {
    setState(prev => ({
      ...prev,
      items: mergePaginatedData(prev.items, newItems, true),
      total: prev.total ? prev.total + newItems.length : undefined,
    }));
  }, []);

  /**
   * Update a specific item
   */
  const updateItem = useCallback((id: string, updater: (item: T) => T) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => (item.id === id ? updater(item) : item)),
    }));
  }, []);

  /**
   * Remove an item
   */
  const removeItem = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
      total: prev.total ? prev.total - 1 : undefined,
    }));
  }, []);

  // Fetch on mount if enabled
  useEffect(() => {
    if (fetchOnMount) {
      loadInitial();
    }
  }, [fetchOnMount, loadInitial]);

  return {
    ...state,
    loadMore,
    refresh,
    reset,
    prepend,
    updateItem,
    removeItem,
  };
}

/**
 * Hook for intersection observer based infinite scroll
 */
export function useInfiniteScroll(
  loadMore: () => Promise<void>,
  hasMore: boolean,
  isLoading: boolean
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef(loadMore);

  // Keep loadMore ref current
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (isLoading) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!hasMore) return;

      observerRef.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasMore && !isLoading) {
            loadMoreRef.current();
          }
        },
        { threshold: 0.1 }
      );

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [hasMore, isLoading]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return lastElementRef;
}

export default usePagination;
