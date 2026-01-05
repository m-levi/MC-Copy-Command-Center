'use client';

import { cn } from '@/lib/utils';

// Skeleton shimmer animation
const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent";

export function DocumentGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3",
            shimmer
          )}
        >
          {/* Icon placeholder */}
          <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
          
          {/* Title placeholder */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
          
          {/* Meta placeholder */}
          <div className="flex items-center gap-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocumentListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3",
            shimmer
          )}
        >
          {/* Icon placeholder */}
          <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          
          {/* Content placeholder */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          </div>
          
          {/* Actions placeholder */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-3 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className={cn("h-5 bg-gray-200 dark:bg-gray-700 rounded w-24", shimmer)} />
        <div className={cn("h-3 bg-gray-200 dark:bg-gray-700 rounded w-16", shimmer)} />
      </div>
      
      {/* Section */}
      <div className="space-y-2">
        <div className={cn("h-3 bg-gray-200 dark:bg-gray-700 rounded w-20", shimmer)} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={cn("h-9 bg-gray-200 dark:bg-gray-700 rounded-lg", shimmer)} />
        ))}
      </div>
      
      {/* Section */}
      <div className="space-y-2">
        <div className={cn("h-3 bg-gray-200 dark:bg-gray-700 rounded w-16", shimmer)} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn("h-9 bg-gray-200 dark:bg-gray-700 rounded-lg", shimmer)} />
        ))}
      </div>
    </div>
  );
}

export function ToolbarSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  );
}

// Add shimmer keyframe to tailwind config
// In your tailwind.config.js, add:
// animation: {
//   shimmer: 'shimmer 1.5s infinite',
// },
// keyframes: {
//   shimmer: {
//     '100%': { transform: 'translateX(100%)' },
//   },
// },

export default {
  DocumentGridSkeleton,
  DocumentListSkeleton,
  SidebarSkeleton,
  ToolbarSkeleton,
};

















