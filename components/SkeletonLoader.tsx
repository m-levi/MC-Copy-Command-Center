'use client';

interface SkeletonProps {
  className?: string;
}

/**
 * Basic skeleton component
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  );
}

/**
 * Skeleton for conversation list item
 */
export function ConversationSkeleton() {
  return (
    <div className="px-2.5 py-2 rounded-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for message
 */
export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`
          ${isUser ? 'max-w-[85%]' : 'w-full'}
        `}
      >
        {isUser ? (
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-4 py-2.5">
            <Skeleton className="h-4 w-64 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-3 w-20" />
              <div className="flex gap-1">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-6 rounded" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton for email section card
 */
export function SectionSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded" />
          <Skeleton className="h-7 w-20 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

/**
 * Skeleton for conversation stats
 */
export function StatsSkeleton() {
  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for loading conversation messages
 */
export function ConversationLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <StatsSkeleton />
      <MessageSkeleton isUser />
      <MessageSkeleton />
      <MessageSkeleton isUser />
      <MessageSkeleton />
    </div>
  );
}

/**
 * Skeleton for sidebar conversations
 */
export function SidebarLoadingSkeleton() {
  return (
    <div className="space-y-0.5 px-2">
      {[...Array(8)].map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Pulsing skeleton for streaming content
 */
export function StreamingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

