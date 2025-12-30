/**
 * Pagination Utilities
 *
 * Provides cursor-based and offset-based pagination helpers
 * for consistent pagination across the application.
 */

export interface PaginationParams {
  /** Number of items per page */
  limit: number;
  /** Cursor for cursor-based pagination (usually last item's ID or timestamp) */
  cursor?: string;
  /** Offset for offset-based pagination */
  offset?: number;
  /** Sort direction */
  direction?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  /** The data items */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Total count of items (if available) */
    total?: number;
    /** Number of items in current page */
    count: number;
    /** Whether there are more items */
    hasMore: boolean;
    /** Next cursor for fetching more */
    nextCursor?: string;
    /** Current offset (for offset-based) */
    offset?: number;
    /** Items per page */
    limit: number;
  };
}

export interface InfiniteScrollState<T> {
  /** All loaded items */
  items: T[];
  /** Whether currently loading */
  isLoading: boolean;
  /** Whether initial load is happening */
  isInitialLoading: boolean;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Error if any */
  error: Error | null;
  /** Current cursor */
  cursor?: string;
  /** Current offset */
  offset: number;
  /** Total count if known */
  total?: number;
}

/**
 * Default pagination limits
 */
export const PAGINATION_DEFAULTS = {
  conversations: 50,
  messages: 100,
  artifacts: 20,
  teamMembers: 50,
  notifications: 30,
} as const;

/**
 * Parse pagination params from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const cursor = searchParams.get('cursor') || undefined;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;
  const direction = (searchParams.get('direction') as 'asc' | 'desc') || 'desc';

  return {
    limit: Math.min(Math.max(1, limit), 100), // Clamp between 1 and 100
    cursor,
    offset,
    direction,
  };
}

/**
 * Supabase query builder type for pagination
 */
interface SupabaseQueryBuilder {
  select: (...args: unknown[]) => SupabaseQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder;
  limit: (count: number) => SupabaseQueryBuilder;
  range: (from: number, to: number) => SupabaseQueryBuilder;
  lt: (column: string, value: unknown) => SupabaseQueryBuilder;
  gt: (column: string, value: unknown) => SupabaseQueryBuilder;
}

/**
 * Build pagination query params for Supabase
 */
export function buildSupabasePaginationQuery<T extends SupabaseQueryBuilder>(
  query: T,
  params: PaginationParams,
  cursorField: string = 'created_at'
): T {
  let q: SupabaseQueryBuilder = query;

  // Apply cursor-based pagination if cursor provided
  if (params.cursor) {
    if (params.direction === 'desc') {
      q = q.lt(cursorField, params.cursor);
    } else {
      q = q.gt(cursorField, params.cursor);
    }
  }

  // Apply ordering
  q = q.order(cursorField, { ascending: params.direction === 'asc' });

  // Apply limit (fetch one extra to check hasMore)
  q = q.limit(params.limit + 1);

  return q as T;
}

/**
 * Process paginated results and determine if there are more items
 */
export function processPaginatedResults<T>(
  data: T[],
  limit: number,
  getCursor: (item: T) => string
): { items: T[]; hasMore: boolean; nextCursor?: string } {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const nextCursor = items.length > 0 ? getCursor(items[items.length - 1]) : undefined;

  return {
    items,
    hasMore,
    nextCursor,
  };
}

/**
 * Create a paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  limit: number,
  getCursor: (item: T) => string,
  total?: number,
  offset?: number
): PaginatedResponse<T> {
  const { items, hasMore, nextCursor } = processPaginatedResults(data, limit, getCursor);

  return {
    data: items,
    pagination: {
      total,
      count: items.length,
      hasMore,
      nextCursor,
      offset,
      limit,
    },
  };
}

/**
 * Merge new paginated data with existing data
 * Handles deduplication by ID
 */
export function mergePaginatedData<T extends { id: string }>(
  existing: T[],
  newItems: T[],
  prepend: boolean = false
): T[] {
  const existingIds = new Set(existing.map(item => item.id));
  const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));

  if (prepend) {
    return [...uniqueNewItems, ...existing];
  }

  return [...existing, ...uniqueNewItems];
}

/**
 * Calculate offset for next page
 */
export function getNextOffset(currentOffset: number, limit: number): number {
  return currentOffset + limit;
}

/**
 * Check if we're at the last page
 */
export function isLastPage(count: number, limit: number): boolean {
  return count < limit;
}

/**
 * Generate pagination headers for API responses
 */
export function getPaginationHeaders(
  pagination: PaginatedResponse<unknown>['pagination']
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Pagination-Limit': String(pagination.limit),
    'X-Pagination-Count': String(pagination.count),
    'X-Pagination-Has-More': String(pagination.hasMore),
  };

  if (pagination.total !== undefined) {
    headers['X-Pagination-Total'] = String(pagination.total);
  }

  if (pagination.nextCursor) {
    headers['X-Pagination-Next-Cursor'] = pagination.nextCursor;
  }

  if (pagination.offset !== undefined) {
    headers['X-Pagination-Offset'] = String(pagination.offset);
  }

  return headers;
}

/**
 * Parse pagination info from response headers
 */
export function parsePaginationHeaders(headers: Headers): Partial<PaginatedResponse<unknown>['pagination']> {
  return {
    limit: parseInt(headers.get('X-Pagination-Limit') || '50', 10),
    count: parseInt(headers.get('X-Pagination-Count') || '0', 10),
    hasMore: headers.get('X-Pagination-Has-More') === 'true',
    total: headers.get('X-Pagination-Total')
      ? parseInt(headers.get('X-Pagination-Total')!, 10)
      : undefined,
    nextCursor: headers.get('X-Pagination-Next-Cursor') || undefined,
    offset: headers.get('X-Pagination-Offset')
      ? parseInt(headers.get('X-Pagination-Offset')!, 10)
      : undefined,
  };
}
