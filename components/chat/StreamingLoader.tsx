'use client';

import { memo } from 'react';
import { Loader } from '@/components/ai-elements/loader';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { cn } from '@/lib/utils';
import { AIStatus } from '@/types';

interface StreamingLoaderProps {
  status: AIStatus;
  className?: string;
}

// Get human-readable status label
function getStatusLabel(status: AIStatus): string {
  switch (status) {
    case 'thinking':
      return 'Thinking...';
    case 'searching_web':
      return 'Searching the web...';
    case 'analyzing_brand':
      return 'Analyzing brand...';
    case 'crafting_subject':
      return 'Crafting subject line...';
    case 'writing_hero':
      return 'Writing hero section...';
    case 'developing_body':
      return 'Developing body content...';
    case 'creating_cta':
      return 'Creating call-to-action...';
    case 'finalizing':
      return 'Finalizing response...';
    default:
      return 'Processing...';
  }
}

// Get status color classes
function getStatusColor(status: AIStatus): string {
  switch (status) {
    case 'thinking':
      return 'text-blue-600 dark:text-blue-400';
    case 'searching_web':
      return 'text-purple-600 dark:text-purple-400';
    case 'analyzing_brand':
      return 'text-amber-600 dark:text-amber-400';
    case 'crafting_subject':
    case 'writing_hero':
    case 'developing_body':
    case 'creating_cta':
      return 'text-green-600 dark:text-green-400';
    case 'finalizing':
      return 'text-emerald-600 dark:text-emerald-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

const StreamingLoaderBase = function StreamingLoader({
  status,
  className,
}: StreamingLoaderProps) {
  if (status === 'idle') return null;

  const label = getStatusLabel(status);
  const colorClass = getStatusColor(status);

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border bg-background/80 backdrop-blur-sm',
        'border-gray-200 dark:border-gray-700',
        'animate-in fade-in slide-in-from-bottom-2 duration-300',
        className
      )}
    >
      {/* Animated loader */}
      <div className={cn('shrink-0', colorClass)}>
        <Loader size={20} />
      </div>

      {/* Status label with shimmer effect */}
      <Shimmer duration={2} className={cn('text-sm font-medium', colorClass)}>
        {label}
      </Shimmer>

      {/* Progress dots */}
      <div className="flex gap-1 ml-auto">
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full animate-bounce',
            colorClass.includes('blue')
              ? 'bg-blue-500'
              : colorClass.includes('purple')
                ? 'bg-purple-500'
                : colorClass.includes('amber')
                  ? 'bg-amber-500'
                  : colorClass.includes('green')
                    ? 'bg-green-500'
                    : colorClass.includes('emerald')
                      ? 'bg-emerald-500'
                      : 'bg-gray-500'
          )}
          style={{ animationDelay: '0ms' }}
        />
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full animate-bounce',
            colorClass.includes('blue')
              ? 'bg-blue-500'
              : colorClass.includes('purple')
                ? 'bg-purple-500'
                : colorClass.includes('amber')
                  ? 'bg-amber-500'
                  : colorClass.includes('green')
                    ? 'bg-green-500'
                    : colorClass.includes('emerald')
                      ? 'bg-emerald-500'
                      : 'bg-gray-500'
          )}
          style={{ animationDelay: '150ms' }}
        />
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full animate-bounce',
            colorClass.includes('blue')
              ? 'bg-blue-500'
              : colorClass.includes('purple')
                ? 'bg-purple-500'
                : colorClass.includes('amber')
                  ? 'bg-amber-500'
                  : colorClass.includes('green')
                    ? 'bg-green-500'
                    : colorClass.includes('emerald')
                      ? 'bg-emerald-500'
                      : 'bg-gray-500'
          )}
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
};

export const StreamingLoader = memo(StreamingLoaderBase);

StreamingLoader.displayName = 'StreamingLoader';

export default StreamingLoader;
