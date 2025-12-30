'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadMoreProps {
  /** Whether more items are loading */
  isLoading?: boolean;
  /** Whether there are more items to load */
  hasMore?: boolean;
  /** Callback to load more items */
  onLoadMore?: () => void;
  /** Custom loading text */
  loadingText?: string;
  /** Custom button text */
  buttonText?: string;
  /** Custom end of list text */
  endText?: string;
  /** Hide the end text */
  hideEndText?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Variant style */
  variant?: 'button' | 'text' | 'minimal';
}

/**
 * Load More component for pagination
 *
 * Can be used as:
 * 1. A button that users click to load more
 * 2. A sentinel element for intersection observer (infinite scroll)
 * 3. An end-of-list indicator
 */
export const LoadMore = forwardRef<HTMLDivElement, LoadMoreProps>(
  function LoadMore(
    {
      isLoading = false,
      hasMore = true,
      onLoadMore,
      loadingText = 'Loading...',
      buttonText = 'Load more',
      endText = 'No more items',
      hideEndText = false,
      className,
      variant = 'button',
    },
    ref
  ) {
    // Show loading state
    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex items-center justify-center py-4',
            className
          )}
        >
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">{loadingText}</span>
        </div>
      );
    }

    // Show load more button/text
    if (hasMore) {
      if (variant === 'button') {
        return (
          <div
            ref={ref}
            className={cn('flex justify-center py-4', className)}
          >
            <button
              onClick={onLoadMore}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg',
                'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
                'text-gray-700 dark:text-gray-300',
                'transition-colors duration-150',
                'touch-feedback'
              )}
            >
              {buttonText}
            </button>
          </div>
        );
      }

      if (variant === 'text') {
        return (
          <div
            ref={ref}
            className={cn(
              'flex justify-center py-4 cursor-pointer',
              className
            )}
            onClick={onLoadMore}
          >
            <span className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              {buttonText}
            </span>
          </div>
        );
      }

      // Minimal - just a sentinel for intersection observer
      return (
        <div
          ref={ref}
          className={cn('h-4', className)}
          aria-hidden="true"
        />
      );
    }

    // Show end of list
    if (!hideEndText) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex justify-center py-4 text-sm text-gray-400 dark:text-gray-500',
            className
          )}
        >
          {endText}
        </div>
      );
    }

    // Hidden sentinel for ref
    return <div ref={ref} className="h-0" aria-hidden="true" />;
  }
);

/**
 * Skeleton loader for list items while loading
 */
export function LoadMoreSkeleton({
  count = 3,
  height = 'h-16',
  className,
}: {
  count?: number;
  height?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            height,
            'bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Pull to refresh indicator (for mobile)
 */
export function PullToRefreshIndicator({
  isRefreshing = false,
  pullProgress = 0,
  className,
}: {
  isRefreshing?: boolean;
  pullProgress?: number;
  className?: string;
}) {
  if (!isRefreshing && pullProgress === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center py-4 transition-opacity',
        className
      )}
      style={{ opacity: isRefreshing ? 1 : pullProgress }}
    >
      <Loader2
        className={cn(
          'w-5 h-5 text-gray-400',
          isRefreshing && 'animate-spin'
        )}
        style={{
          transform: isRefreshing
            ? 'rotate(0deg)'
            : `rotate(${pullProgress * 360}deg)`,
        }}
      />
      <span className="ml-2 text-sm text-gray-500">
        {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
      </span>
    </div>
  );
}

export default LoadMore;
