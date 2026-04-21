'use client';

import { useRouter } from 'next/navigation';
import { Brand } from '@/types';

interface RecentBrandsListProps {
  brands: Brand[];
  activityMap: Map<string, string>;
}

export default function RecentBrandsList({ brands, activityMap }: RecentBrandsListProps) {
  const router = useRouter();

  // Sort brands by activity (most recent first)
  const sortedBrands = [...brands].sort((a, b) => {
    const timeA = activityMap.get(a.id) 
      ? new Date(activityMap.get(a.id)!).getTime() 
      : new Date(a.updated_at || a.created_at).getTime();
      
    const timeB = activityMap.get(b.id) 
      ? new Date(activityMap.get(b.id)!).getTime() 
      : new Date(b.updated_at || b.created_at).getTime();
      
    return timeB - timeA;
  }).slice(0, 5); // Limit to top 5

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (sortedBrands.length === 0) return null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Recent Brands
        </h3>
      </div>
      
      <div className="p-2 space-y-1">
        {sortedBrands.map((brand) => (
          <div
            key={brand.id}
            onClick={() => router.push(`/brands/${brand.id}/chat`)}
            className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
          >
            <div className="shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                {getInitials(brand.name)}
              </div>
            </div>
            
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {brand.name}
              </span>
              {activityMap.get(brand.id) && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {formatTimeAgo(activityMap.get(brand.id))}
                </span>
              )}
            </div>
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

