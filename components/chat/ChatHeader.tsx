'use client';

import { Suspense, lazy } from 'react';
import { Conversation, FlowConversation } from '@/types';
import PresenceIndicator from '@/components/PresenceIndicator';

const ConversationOptionsMenu = lazy(() => import('@/components/ConversationOptionsMenu'));
const FlowNavigation = lazy(() => import('@/components/FlowNavigation'));

interface ChatHeaderProps {
  currentConversation: Conversation | null;
  parentFlow: FlowConversation | null;
  brandId: string;
  commentsSidebarCollapsed: boolean;
  showConversationMenu: boolean;
  onToggleCommentsSidebar: () => void;
  onToggleConversationMenu: () => void;
  onShowShareModal: () => void;
  onShowMemorySettings: () => void;
  onNavigateToParent: () => void;
  onMobileMenuOpen: () => void;
}

export default function ChatHeader({
  currentConversation,
  parentFlow,
  brandId,
  commentsSidebarCollapsed,
  showConversationMenu,
  onToggleCommentsSidebar,
  onToggleConversationMenu,
  onShowShareModal,
  onShowMemorySettings,
  onNavigateToParent,
  onMobileMenuOpen,
}: ChatHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {/* Mobile hamburger menu - only visible on mobile */}
      <div className="lg:hidden px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={onMobileMenuOpen}
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
          aria-label="Open sidebar"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Flow Navigation for child conversations */}
      {currentConversation?.parent_conversation_id && parentFlow && (
        <FlowNavigation
          parentFlow={parentFlow}
          currentConversation={currentConversation}
          brandId={brandId}
          onNavigateToParent={onNavigateToParent}
        />
      )}

      {/* Conversation Info Bar - Clean and Minimal */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Conversation Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {currentConversation?.title || 'No Conversation Selected'}
            </h2>
          </div>
          
          {/* Action buttons */}
          {currentConversation && (
            <div className="flex items-center gap-2">
              <div className="mr-2">
                <PresenceIndicator conversationId={currentConversation.id} />
              </div>

              <button
                onClick={onShowShareModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                title="Share Conversation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <button
                onClick={onToggleCommentsSidebar}
                className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${commentsSidebarCollapsed ? 'text-gray-600 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'}`}
                title={commentsSidebarCollapsed ? 'Show comments' : 'Hide comments'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button
                data-conversation-menu-trigger
                onClick={onToggleConversationMenu}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                title="Conversation Options"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Conversation Options Menu */}
      {showConversationMenu && currentConversation && (
        <Suspense fallback={null}>
          <ConversationOptionsMenu
            conversationId={currentConversation.id}
            conversationTitle={currentConversation.title || 'Conversation'}
            onShowMemory={onShowMemorySettings}
            onToggleTheme={() => {
              const themeButton = document.querySelector('[data-theme-toggle]');
              if (themeButton instanceof HTMLElement) {
                themeButton.click();
              }
            }}
            onClose={onToggleConversationMenu}
          />
        </Suspense>
      )}
    </div>
  );
}

