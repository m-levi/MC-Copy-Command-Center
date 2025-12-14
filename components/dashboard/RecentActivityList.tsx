'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { isPersonalAI, PERSONAL_AI_INFO } from '@/lib/personal-ai';

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

export default function RecentActivityList() {
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

      // Fetch conversations without joining brands (FK was removed for Personal AI support)
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          updated_at,
          brand_id,
          last_message_preview
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get unique brand IDs (excluding Personal AI)
      const brandIds = [...new Set(
        (data || [])
          .filter(c => !isPersonalAI(c.brand_id))
          .map(c => c.brand_id)
      )];

      // Fetch brands separately
      let brandsMap: Record<string, { id: string; name: string }> = {};
      if (brandIds.length > 0) {
        const { data: brands } = await supabase
          .from('brands')
          .select('id, name')
          .in('id', brandIds);
        
        if (brands) {
          brandsMap = Object.fromEntries(brands.map(b => [b.id, b]));
        }
      }

      // Transform data: add brand info or Personal AI info
      const transformedConversations = (data || []).map(c => ({
        ...c,
        brand: isPersonalAI(c.brand_id)
          ? { id: PERSONAL_AI_INFO.id, name: PERSONAL_AI_INFO.name }
          : brandsMap[c.brand_id] || null
      })).filter(c => c.brand !== null);

      setConversations(transformedConversations);
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
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 w-64 shrink-0 bg-gray-100 dark:bg-gray-700/50 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (conversations.length === 0) return null;

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Jump Back In
        </h3>
      </div>
      
      <div className="overflow-x-auto p-3 flex gap-3 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => router.push(`/brands/${conv.brand_id}/chat?conversation=${conv.id}`)}
            className="group flex flex-col w-[220px] shrink-0 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 shrink-0 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                  {conv.brand?.name ? getInitials(conv.brand.name) : '?'}
                </div>
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                  {conv.brand?.name}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {formatTimeAgo(conv.updated_at)}
              </span>
            </div>
            
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
              {conv.title || 'Untitled Conversation'}
            </h4>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {conv.last_message_preview || 'No preview available'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
