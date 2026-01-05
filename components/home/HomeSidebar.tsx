'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/types';
import { MoonCommerceLogo } from '@/components/MoonCommerceLogo';
import HomeSidebarTabs, { SidebarFilter } from './HomeSidebarTabs';
import ChatsTabContent from './ChatsTabContent';
import ClientsTabContent from './ClientsTabContent';
import DocumentsTabContent from './DocumentsTabContent';
import { cn } from '@/lib/utils';
import { Plus, PanelLeftClose, PanelLeft, X, MessageSquare } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  brand_id: string;
  updated_at: string;
  last_message_preview?: string;
}

interface HomeSidebarProps {
  brands: Brand[];
  conversations: Conversation[];
  recentBrandIds: string[];
  onBrandSelect: (brandId: string) => void;
  onNewChat: () => void;
  onCreateBrand?: () => void;
  onEditBrand?: (brand: Brand) => void;
  canManageBrands?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  onMobileClose?: () => void;
  className?: string;
}

export default function HomeSidebar({
  brands,
  conversations,
  recentBrandIds,
  onBrandSelect,
  onNewChat,
  onCreateBrand,
  onEditBrand,
  canManageBrands = false,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  onMobileClose,
  className,
}: HomeSidebarProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<SidebarFilter>('all');

  const handleSelectConversation = useCallback((conversationId: string, brandId: string) => {
    router.push(`/brands/${brandId}/chat?conversation=${conversationId}`);
    if (isMobile && onMobileClose) onMobileClose();
  }, [router, isMobile, onMobileClose]);

  const handleBrandSelect = useCallback((brandId: string) => {
    onBrandSelect(brandId);
    if (isMobile && onMobileClose) onMobileClose();
  }, [onBrandSelect, isMobile, onMobileClose]);

  const handleDeleteBrand = useCallback(async (brandId: string) => {
    // This would be handled by a confirmation modal in production
    // For now, just show an alert
    if (confirm('Are you sure you want to delete this client?')) {
      // TODO: Implement delete via API
      console.log('Delete brand:', brandId);
    }
  }, []);

  // Collapsed state (desktop only)
  if (isCollapsed && !isMobile) {
    return (
      <aside className={cn(
        "flex flex-col h-full w-full",
        "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800",
        className
      )}>
        {/* Logo - Icon only */}
        <div className="h-14 flex items-center justify-center border-b border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-100 dark:to-gray-200 flex items-center justify-center">
            <span className="text-white dark:text-gray-900 font-bold text-sm">M</span>
          </div>
        </div>

        {/* Expand Button */}
        <button
          onClick={onToggleCollapse}
          className="p-3 mx-auto mt-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors cursor-pointer"
          title="Expand sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* New Chat */}
        <button
          onClick={onNewChat}
          className="p-3 mx-auto mt-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer"
          title="New chat"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Conversation indicators */}
        <div className="flex-1 flex flex-col items-center gap-1 mt-4 px-1 overflow-hidden">
          {conversations.slice(0, 8).map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelectConversation(conv.id, conv.brand_id)}
              className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              title={conv.title || 'Untitled'}
            >
              <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
            </button>
          ))}
        </div>
      </aside>
    );
  }

  // Expanded sidebar content
  return (
    <aside className={cn(
      "flex flex-col h-full w-full",
      "bg-white dark:bg-gray-900",
      !isMobile && "border-r border-gray-200 dark:border-gray-800",
      className
    )}>
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <MoonCommerceLogo className="h-4 w-auto text-gray-900 dark:text-white" />
          {/* Collapse button (desktop only) */}
          {!isMobile && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile close button */}
        {isMobile && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs/Filter */}
      <HomeSidebarTabs
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        chatCount={conversations.length}
        clientCount={brands.length}
      />

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {(activeFilter === 'all' || activeFilter === 'chats') && (
          <ChatsTabContent
            conversations={conversations}
            brands={brands}
            onSelectConversation={handleSelectConversation}
          />
        )}
        {activeFilter === 'clients' && (
          <ClientsTabContent
            brands={brands}
            recentBrandIds={recentBrandIds}
            onBrandSelect={handleBrandSelect}
            onCreateBrand={onCreateBrand}
            onEditBrand={onEditBrand}
            onDeleteBrand={handleDeleteBrand}
            canManageBrands={canManageBrands}
          />
        )}
        {activeFilter === 'documents' && (
          <DocumentsTabContent />
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onNewChat}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2.5",
            "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
            "hover:bg-gray-800 dark:hover:bg-gray-100",
            "rounded-lg font-medium text-sm transition-colors cursor-pointer"
          )}
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>
    </aside>
  );
}
