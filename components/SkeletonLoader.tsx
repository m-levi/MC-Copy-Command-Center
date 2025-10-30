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
 * Skeleton for brand card on home page
 */
export function BrandCardSkeleton() {
  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
      {/* Header */}
      <div className="mb-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      
      {/* Content */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      
      {/* Arrow indicator */}
      <div className="absolute bottom-4 right-4">
        <Skeleton className="h-5 w-5 rounded" />
      </div>
    </div>
  );
}

/**
 * Skeleton grid for multiple brand cards
 */
export function BrandGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <BrandCardSkeleton key={i} />
      ))}
    </div>
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

/**
 * Skeleton for admin page initial load
 */
export function AdminPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-32 rounded" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Invite form skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <div>
                  <Skeleton className="h-4 w-12 mb-2" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>

            {/* Pending invitations skeleton */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column - Team members skeleton */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <Skeleton className="h-6 w-32 mb-6" />
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-40 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-24 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Comprehensive skeleton for chat page initial load
 */
export function ChatPageSkeleton() {
  return (
    <div className="flex h-screen bg-[#fcfcfc] dark:bg-gray-950 animate-in fade-in duration-300">
      {/* Sidebar Skeleton */}
      <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Skeleton className="h-6 w-32 mb-3" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        
        {/* Filter Dropdown */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        
        {/* Conversation List */}
        <div className="flex-1 overflow-hidden p-2 space-y-2">
          {[...Array(5)].map((_, i) => (
            <ConversationSkeleton key={i} />
          ))}
        </div>
        
        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Skeleton className="h-9 w-full rounded-lg mb-2" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>

      {/* Main Chat Area Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <StatsSkeleton />
            <MessageSkeleton isUser />
            <MessageSkeleton />
            <MessageSkeleton isUser />
            <MessageSkeleton />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

