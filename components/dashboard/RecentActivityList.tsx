'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { isPersonalAI, PERSONAL_AI_INFO } from '@/lib/personal-ai';
import ActivityFeedItem from './ActivityFeedItem';
import { Search, X } from 'lucide-react';

interface RecentConversation {
  id: string;
  title: string;
  updated_at: string;
  brand_id: string;
  mode?: string;
  brand?: {
    id: string;
    name: string;
  };
  last_message_preview?: string;
}

interface EmptyStateProps {
  onCreateBrand?: () => void;
}

function EmptyFeedState({ onCreateBrand }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
        No conversations yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-5">
        Use the composer above to start your first conversation.
      </p>
      {onCreateBrand && (
        <button
          onClick={onCreateBrand}
          className="px-4 py-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg transition-colors text-sm"
        >
          Create Brand
        </button>
      )}
    </div>
  );
}

export default function RecentActivityList({ emptyState }: { emptyState?: React.ReactNode }) {
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchRecentConversations();
  }, []);

  const fetchRecentConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          updated_at,
          brand_id,
          mode,
          last_message_preview
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const brandIds = [...new Set(
        (data || [])
          .filter(c => !isPersonalAI(c.brand_id))
          .map(c => c.brand_id)
      )];

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

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv =>
      conv.title?.toLowerCase().includes(query) ||
      conv.last_message_preview?.toLowerCase().includes(query) ||
      conv.brand?.name?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const groups: Record<string, RecentConversation[]> = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Earlier': []
    };

    filteredConversations.forEach(conv => {
      const convDate = new Date(conv.updated_at);
      if (convDate >= todayStart) {
        groups['Today'].push(conv);
      } else if (convDate >= yesterdayStart) {
        groups['Yesterday'].push(conv);
      } else if (convDate >= weekStart) {
        groups['This Week'].push(conv);
      } else {
        groups['Earlier'].push(conv);
      }
    });

    return Object.entries(groups).filter(([_, convs]) => convs.length > 0);
  }, [filteredConversations]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-gray-100 dark:bg-gray-800/50 rounded-xl animate-pulse" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100/60 dark:bg-gray-800/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return emptyState || <EmptyFeedState />;
  }

  return (
    <div className="space-y-4">
      {/* Search Bar - Always visible with clear styling */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 focus:border-gray-300 dark:focus:border-gray-700 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* No Results */}
      {groupedConversations.length === 0 && searchQuery && (
        <div className="text-center py-10">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No results for "<span className="font-medium text-gray-700 dark:text-gray-300">{searchQuery}</span>"
          </p>
          <button 
            onClick={() => setSearchQuery('')}
            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Grouped Conversations */}
      {groupedConversations.map(([groupName, convs], groupIndex) => (
        <section key={groupName} className={groupIndex > 0 ? "pt-2" : ""}>
          <h3 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            {groupName}
          </h3>
          <div className="space-y-1">
            {convs.map((conv) => (
              <ActivityFeedItem key={conv.id} conversation={conv} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
