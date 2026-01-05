'use client';

import { ArrowRight, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isPersonalAI, PERSONAL_AI_INFO } from '@/lib/personal-ai';
import { cn } from '@/lib/utils';

interface ActivityFeedItemProps {
  conversation: {
    id: string;
    title: string;
    updated_at: string;
    brand_id: string;
    brand?: {
      id: string;
      name: string;
    };
    last_message_preview?: string;
  };
}

export default function ActivityFeedItem({ conversation }: ActivityFeedItemProps) {
  const router = useRouter();

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleClick = () => {
    router.push(`/brands/${conversation.brand_id}/chat?conversation=${conversation.id}`);
  };

  const isPersonal = isPersonalAI(conversation.brand_id);
  const brandName = isPersonal ? PERSONAL_AI_INFO.name : (conversation.brand?.name || 'Unknown');
  const timeAgo = formatTimeAgo(conversation.updated_at);
  const isRecent = timeAgo === 'now' || timeAgo.endsWith('m');

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group w-full text-left py-3 px-3 rounded-xl cursor-pointer",
        "bg-transparent hover:bg-white dark:hover:bg-gray-800/80",
        "border border-transparent hover:border-gray-200 dark:hover:border-gray-700/80",
        "hover:shadow-sm",
        "transition-all duration-150"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
          "transition-colors duration-150",
          isPersonal
            ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700"
        )}>
          {isPersonal ? (
            <span className="text-sm">✨</span>
          ) : (
            <MessageSquare className="w-3.5 h-3.5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h4 className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">
              {conversation.title || 'Untitled'}
            </h4>
            <span className={cn(
              "text-[11px] tabular-nums flex-shrink-0",
              isRecent 
                ? "text-blue-600 dark:text-blue-400 font-medium" 
                : "text-gray-400 dark:text-gray-500"
            )}>
              {timeAgo}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded flex-shrink-0",
                isPersonal
                  ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              )}>
                {brandName.length > 16 ? brandName.slice(0, 16) + '…' : brandName}
              </span>
              {conversation.last_message_preview && (
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {conversation.last_message_preview}
                </p>
              )}
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </div>
        </div>
      </div>
    </button>
  );
}
