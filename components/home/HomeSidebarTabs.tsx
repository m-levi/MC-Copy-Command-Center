'use client';

import { cn } from '@/lib/utils';
import { MessageSquare, Users, FileText } from 'lucide-react';

export type SidebarFilter = 'all' | 'chats' | 'clients' | 'documents';

interface HomeSidebarTabsProps {
  activeFilter: SidebarFilter;
  onFilterChange: (filter: SidebarFilter) => void;
  chatCount?: number;
  clientCount?: number;
  documentCount?: number;
}

export default function HomeSidebarTabs({
  activeFilter,
  onFilterChange,
  chatCount,
  clientCount,
  documentCount,
}: HomeSidebarTabsProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      {/* Chats tab - main view */}
      <button
        onClick={() => onFilterChange('all')}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
          activeFilter === 'all' || activeFilter === 'chats'
            ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        )}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>Chats</span>
        {chatCount !== undefined && chatCount > 0 && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
            activeFilter === 'all' || activeFilter === 'chats'
              ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          )}>
            {chatCount}
          </span>
        )}
      </button>

      {/* Filter icons */}
      <div className="flex items-center gap-0.5 ml-auto">
        {/* Clients filter with person icon */}
        <button
          onClick={() => onFilterChange('clients')}
          className={cn(
            "p-1.5 rounded-lg transition-all cursor-pointer",
            activeFilter === 'clients'
              ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          )}
          title={`Clients${clientCount ? ` (${clientCount})` : ''}`}
        >
          <Users className="w-4 h-4" />
        </button>

        {/* Documents filter */}
        <button
          onClick={() => onFilterChange('documents')}
          className={cn(
            "p-1.5 rounded-lg transition-all cursor-pointer",
            activeFilter === 'documents'
              ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          )}
          title={`Documents${documentCount ? ` (${documentCount})` : ''}`}
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
