'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/types';
import { PERSONAL_AI_INFO } from '@/lib/personal-ai';
import { cn } from '@/lib/utils';
import { MessageSquare, Sparkles, Building2, FileText, ArrowRight } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  brand_id: string;
  updated_at: string;
  last_message_preview?: string;
}

interface CombinedActivityContentProps {
  conversations: Conversation[];
  brands: Brand[];
  recentBrandIds: string[];
  onSelectConversation: (conversationId: string, brandId: string) => void;
  onBrandSelect: (brandId: string) => void;
}

export default function CombinedActivityContent({
  conversations,
  brands,
  recentBrandIds,
  onSelectConversation,
  onBrandSelect,
}: CombinedActivityContentProps) {
  const router = useRouter();

  // Recent chats (limit to 5)
  const recentChats = useMemo(() => conversations.slice(0, 5), [conversations]);

  // Recent brands (limit to 3)
  const recentBrands = useMemo(() => {
    return recentBrandIds
      .map(id => brands.find(b => b.id === id))
      .filter((b): b is Brand => b !== undefined)
      .slice(0, 3);
  }, [recentBrandIds, brands]);

  const getBrandName = (brandId: string) => {
    if (brandId === PERSONAL_AI_INFO.id) return PERSONAL_AI_INFO.name;
    return brands.find(b => b.id === brandId)?.name || 'Unknown';
  };

  const isPersonalAI = (brandId: string) => brandId === PERSONAL_AI_INFO.id;

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderSectionHeader = (label: string, icon: React.ReactNode) => (
    <div className="py-1.5 px-3 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5 sticky top-0 bg-white dark:bg-gray-900 z-10">
      {icon}
      {label}
    </div>
  );

  const renderChat = (conversation: Conversation) => {
    const isAI = isPersonalAI(conversation.brand_id);
    const brandName = getBrandName(conversation.brand_id);

    return (
      <button
        key={conversation.id}
        onClick={() => onSelectConversation(conversation.id, conversation.brand_id)}
        className={cn(
          "w-full px-3 py-2 text-left rounded-md transition-all group cursor-pointer",
          "hover:bg-gray-50 dark:hover:bg-gray-800/50"
        )}
      >
        <div className="flex items-center gap-2">
          {isAI ? (
            <Sparkles className="w-3 h-3 text-violet-500 flex-shrink-0" />
          ) : (
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
              {conversation.title || 'Untitled'}
            </span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0",
              isAI
                ? "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            )}>
              {brandName}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
            {formatTimeAgo(conversation.updated_at)}
          </span>
        </div>
      </button>
    );
  };

  const renderBrand = (brand: Brand) => (
    <button
      key={brand.id}
      onClick={() => {
        onBrandSelect(brand.id);
        router.push(`/brands/${brand.id}`);
      }}
      className={cn(
        "w-full px-3 py-2 text-left rounded-md transition-all group cursor-pointer",
        "hover:bg-gray-50 dark:hover:bg-gray-800/50",
        "flex items-center gap-2"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded flex items-center justify-center flex-shrink-0",
        "bg-gradient-to-br from-gray-400 to-gray-500 group-hover:from-blue-400 group-hover:to-indigo-500",
        "transition-all"
      )}>
        <span className="text-white font-bold text-[10px]">
          {brand.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <span className="text-sm text-gray-900 dark:text-gray-100 truncate flex-1">
        {brand.name}
      </span>
      <ArrowRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );

  if (recentChats.length === 0 && recentBrands.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start a chat to get going</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1">
      {/* Recent Chats */}
      {recentChats.length > 0 && (
        <div className="pb-2">
          {renderSectionHeader('Recent Chats', <MessageSquare className="w-3 h-3" />)}
          {recentChats.map(renderChat)}
        </div>
      )}

      {/* Recent Clients */}
      {recentBrands.length > 0 && (
        <div className="pb-2 border-t border-gray-100 dark:border-gray-800 pt-1">
          {renderSectionHeader('Recent Clients', <Building2 className="w-3 h-3" />)}
          {recentBrands.map(renderBrand)}
        </div>
      )}

      {/* Placeholder for recent documents - can be expanded later */}
      {/*
      <div className="pb-2 border-t border-gray-100 dark:border-gray-800 pt-1">
        {renderSectionHeader('Recent Documents', <FileText className="w-3 h-3" />)}
      </div>
      */}
    </div>
  );
}
