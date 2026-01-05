'use client';

import { useMemo } from 'react';
import { Brand } from '@/types';
import { PERSONAL_AI_INFO } from '@/lib/personal-ai';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  brand_id: string;
  updated_at: string;
  last_message_preview?: string;
}

interface ChatsTabContentProps {
  conversations: Conversation[];
  brands: Brand[];
  onSelectConversation: (conversationId: string, brandId: string) => void;
}

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  lastWeek: Conversation[];
  older: Conversation[];
}

export default function ChatsTabContent({
  conversations,
  brands,
  onSelectConversation,
}: ChatsTabContentProps) {
  // Group conversations by date
  const groupedConversations = useMemo((): GroupedConversations => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const result: GroupedConversations = {
      today: [],
      yesterday: [],
      lastWeek: [],
      older: []
    };

    conversations.forEach(c => {
      const date = new Date(c.updated_at);
      if (date >= today) {
        result.today.push(c);
      } else if (date >= yesterday) {
        result.yesterday.push(c);
      } else if (date >= lastWeek) {
        result.lastWeek.push(c);
      } else {
        result.older.push(c);
      }
    });

    return result;
  }, [conversations]);

  const getBrandName = (brandId: string) => {
    if (brandId === PERSONAL_AI_INFO.id) return PERSONAL_AI_INFO.name;
    return brands.find(b => b.id === brandId)?.name || 'Unknown';
  };

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

  const renderHeader = (label: string) => (
    <div className="py-1.5 px-3 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider sticky top-0 bg-white dark:bg-gray-900 z-10">
      {label}
    </div>
  );

  const renderConversation = (conversation: Conversation) => {
    const brandName = getBrandName(conversation.brand_id);

    return (
      <button
        key={conversation.id}
        onClick={() => onSelectConversation(conversation.id, conversation.brand_id)}
        className={cn(
          "w-full px-3 py-2 text-left rounded-md transition-all cursor-pointer",
          "hover:bg-gray-50 dark:hover:bg-gray-800/50"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
              {conversation.title || 'Untitled'}
            </div>
            {/* Client name underneath */}
            <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {brandName}
            </div>
          </div>
          {/* Time */}
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">
            {formatTimeAgo(conversation.updated_at)}
          </span>
        </div>
      </button>
    );
  };

  if (conversations.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-gray-400" />
        </div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          No conversations yet
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] mx-auto">
          Click "New Chat" below to start your first conversation
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1">
      {groupedConversations.today.length > 0 && (
        <>
          {renderHeader('Today')}
          {groupedConversations.today.map(renderConversation)}
        </>
      )}

      {groupedConversations.yesterday.length > 0 && (
        <>
          {renderHeader('Yesterday')}
          {groupedConversations.yesterday.map(renderConversation)}
        </>
      )}

      {groupedConversations.lastWeek.length > 0 && (
        <>
          {renderHeader('Previous 7 Days')}
          {groupedConversations.lastWeek.map(renderConversation)}
        </>
      )}

      {groupedConversations.older.length > 0 && (
        <>
          {renderHeader('Older')}
          {groupedConversations.older.map(renderConversation)}
        </>
      )}
    </div>
  );
}
