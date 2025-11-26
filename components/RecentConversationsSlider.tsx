'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface RecentConversation {
  id: string;
  title: string;
  updated_at: string;
  brand_id: string;
  brand?: {
    id: string;
    name: string;
  };
  last_message_preview?: string;
}

export default function RecentConversationsSlider() {
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchRecentConversations();
  }, []);

  const fetchRecentConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch most recent conversations across all brands
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          updated_at,
          brand_id,
          last_message_preview,
          brand:brands(id, name)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Filter out any where brand might be null (if brand was deleted)
      // Transform data: Supabase returns brand as array, extract first element
      const validConversations = data
        ?.filter(c => c.brand && (Array.isArray(c.brand) ? c.brand.length > 0 : true))
        .map(c => ({
          ...c,
          brand: Array.isArray(c.brand) ? c.brand[0] : c.brand
        })) || [];
      setConversations(validConversations);
    } catch (error) {
      logger.error('Error fetching recent conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (loading || conversations.length === 0) return null;

  return (
    <div className="mb-10 animate-in slide-in-from-top-2 duration-500">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-1 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          Jump Back In
        </h3>
      </div>
      
      <div className="relative group">
        <div className="flex overflow-x-auto pb-4 gap-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent -mx-6 px-6">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => router.push(`/brands/${conv.brand_id}/chat?conversation=${conv.id}`)}
              className="snap-start shrink-0 w-[280px] bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all cursor-pointer group/card flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 shrink-0">
                    {conv.brand?.name ? getInitials(conv.brand.name) : '?'}
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                    {conv.brand?.name}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {formatTimeAgo(conv.updated_at)}
                </span>
              </div>

              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 mb-1 group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors">
                {conv.title || 'Untitled Conversation'}
              </h4>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed h-8">
                {conv.last_message_preview || 'No preview available'}
              </p>
            </div>
          ))}
          
          {/* View All Link Card */}
          {conversations.length >= 5 && (
            <div className="snap-start shrink-0 w-[100px] flex items-center justify-center">
              <button className="flex flex-col items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors group/more">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover/more:bg-blue-50 dark:group-hover/more:bg-blue-900/20 group-hover/more:border-blue-200 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
                <span className="text-xs font-medium">View All</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Fade gradients for scroll indication */}
        <div className="absolute top-0 bottom-4 left-0 w-6 bg-gradient-to-r from-gray-50 dark:from-gray-950 to-transparent pointer-events-none lg:hidden"></div>
        <div className="absolute top-0 bottom-4 right-0 w-6 bg-gradient-to-l from-gray-50 dark:from-gray-950 to-transparent pointer-events-none lg:hidden"></div>
      </div>
    </div>
  );
}

