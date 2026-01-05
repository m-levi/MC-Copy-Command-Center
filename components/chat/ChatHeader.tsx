'use client';

import { Suspense, lazy, useState } from 'react';
import { Conversation, FlowConversation, ConversationVisibility } from '@/types';
import PresenceIndicator from '@/components/PresenceIndicator';
import { useOptionalArtifactContext } from '@/contexts/ArtifactContext';
import { toggleConversationVisibility } from '@/lib/conversation-actions';
import toast from 'react-hot-toast';
import { 
  MessageSquare, 
  Share2, 
  MessageCircle, 
  MoreVertical, 
  Menu, 
  Sparkles,
  Clock,
  ChevronRight,
  Lock,
  Users,
  Globe
} from 'lucide-react';

const ConversationOptionsMenu = lazy(() => import('@/components/ConversationOptionsMenu'));
const FlowNavigation = lazy(() => import('@/components/FlowNavigation'));

interface ChatHeaderProps {
  currentConversation: Conversation | null;
  parentFlow: FlowConversation | null;
  brandId: string;
  showConversationMenu: boolean;
  currentUserId?: string;
  onToggleConversationMenu: () => void;
  onShowShareModal: () => void;
  onNavigateToParent: () => void;
  onMobileMenuOpen?: () => void;
  onVisibilityChange?: (visibility: ConversationVisibility) => void;
}

export default function ChatHeader({
  currentConversation,
  parentFlow,
  brandId,
  showConversationMenu,
  currentUserId,
  onToggleConversationMenu,
  onShowShareModal,
  onNavigateToParent,
  onMobileMenuOpen,
  onVisibilityChange,
}: ChatHeaderProps) {
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const artifactContext = useOptionalArtifactContext();
  const isCommentsOpen = artifactContext?.isSidebarOpen && artifactContext?.activeTab === 'comments';
  
  const isOwner = currentConversation?.user_id === currentUserId;
  const isTeamVisible = currentConversation?.visibility === 'team';
  
  const handleToggleComments = () => {
    if (!artifactContext) return;
    
    if (isCommentsOpen) {
      artifactContext.closeSidebar();
    } else {
      artifactContext.openSidebarToTab('comments');
    }
  };

  const handleToggleVisibility = async () => {
    if (!currentConversation || !isOwner || isTogglingVisibility) return;
    
    setIsTogglingVisibility(true);
    const newVisibility: ConversationVisibility = isTeamVisible ? 'private' : 'team';
    
    try {
      const success = await toggleConversationVisibility(currentConversation.id, newVisibility);
      if (success) {
        toast.success(
          newVisibility === 'team' 
            ? '✨ Shared with team!' 
            : '🔒 Now private'
        );
        onVisibilityChange?.(newVisibility);
      }
    } catch (error) {
      toast.error('Failed to update visibility');
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  // Format relative time for conversation
  const getRelativeTime = (date?: string) => {
    if (!date) return null;
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative flex-shrink-0">
      {/* Flow Navigation for child conversations */}
      {currentConversation?.parent_conversation_id && parentFlow && (
        <div className="border-b border-gray-200 dark:border-gray-800">
          <FlowNavigation
            parentFlow={parentFlow}
            currentConversation={currentConversation}
            brandId={brandId}
            onNavigateToParent={onNavigateToParent}
          />
        </div>
      )}

      {/* Header Container */}
      <div className="flex items-start gap-2 px-3 sm:px-4 lg:px-6 pt-4 pb-2">
        {/* Mobile Menu Button - Only visible on mobile */}
        {onMobileMenuOpen && (
          <button
            onClick={onMobileMenuOpen}
            className="
              lg:hidden
              flex-shrink-0 
              w-10 h-10 sm:w-11 sm:h-11
              flex items-center justify-center 
              rounded-full
              transition-all duration-200 ease-out
              shadow-sm hover:shadow-md
              bg-white dark:bg-gray-800 
              text-gray-600 dark:text-gray-300 
              hover:bg-gray-100 dark:hover:bg-gray-700
              border border-gray-200/60 dark:border-gray-700/60
              active:scale-95
            "
            title="Open menu"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Main Conversation Bar */}
        <div className="flex-1 min-w-0">
          <div className="
            flex items-center justify-between 
            h-10 sm:h-11
            px-2 sm:px-3 lg:px-4
            bg-white/95 dark:bg-gray-800/95 
            backdrop-blur-md 
            rounded-xl sm:rounded-2xl
            border border-gray-200/50 dark:border-gray-700/50 
            shadow-sm hover:shadow-md
            transition-shadow duration-200
          ">
            {/* Left: Conversation Title & Info */}
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 min-w-0 flex-1">
              {/* Conversation Icon - Hidden on very small screens */}
              <div className="hidden xs:flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 flex-shrink-0">
                {currentConversation?.mode === 'flow' ? (
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" />
                )}
              </div>
              
              {/* Title with breadcrumb for child conversations */}
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {parentFlow && currentConversation?.parent_conversation_id && (
                  <>
                    <button
                      onClick={onNavigateToParent}
                      className="hidden md:block text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 truncate max-w-[80px] lg:max-w-[120px] transition-colors"
                      aria-label={`Navigate to parent: ${parentFlow.title}`}
                    >
                      {parentFlow.title}
                    </button>
                    <ChevronRight className="hidden md:block w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  </>
                )}
                <h2 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {currentConversation?.title || 'New Conversation'}
                </h2>
                
                {/* Visibility Toggle Badge - Only show for conversation owner */}
                {currentConversation && isOwner && (
                  <button
                    onClick={handleToggleVisibility}
                    disabled={isTogglingVisibility}
                    className={`
                      flex items-center gap-1
                      px-2 py-0.5
                      text-[10px] sm:text-xs font-medium
                      rounded-full
                      transition-all duration-200
                      flex-shrink-0
                      ${isTogglingVisibility ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                      ${isTeamVisible
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }
                    `}
                    title={isTeamVisible ? 'Click to make private' : 'Click to share with team'}
                    aria-label={isTeamVisible ? 'Make conversation private' : 'Share conversation with team'}
                  >
                    {isTeamVisible ? (
                      <>
                        <Users className="w-3 h-3" />
                        <span className="hidden sm:inline">Team</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span className="hidden sm:inline">Private</span>
                      </>
                    )}
                  </button>
                )}
                
                {/* Show "Shared with you" badge for non-owners viewing team conversations */}
                {currentConversation && !isOwner && isTeamVisible && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 flex-shrink-0">
                    <Globe className="w-3 h-3" />
                    <span className="hidden sm:inline">Shared</span>
                  </span>
                )}
              </div>
              
              {/* Last Updated - Hidden on small screens */}
              {currentConversation?.updated_at && (
                <div className="hidden lg:flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{getRelativeTime(currentConversation.updated_at)}</span>
                </div>
              )}
            </div>
            
            {/* Right: Action Buttons */}
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              {/* Presence Indicator - Hidden on mobile */}
              {currentConversation && (
                <div className="hidden sm:block mr-1">
                  <PresenceIndicator conversationId={currentConversation.id} />
                </div>
              )}

              {/* Divider - Hidden on mobile */}
              <div className="hidden sm:block w-px h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 sm:mx-1" />

              {/* Share Button */}
              {currentConversation && (
                <button
                  onClick={onShowShareModal}
                  className="
                    p-1.5 sm:p-2
                    hover:bg-gray-100 dark:hover:bg-gray-700/70 
                    rounded-lg 
                    transition-colors 
                    text-gray-500 dark:text-gray-400 
                    hover:text-gray-700 dark:hover:text-gray-200
                  "
                  title="Share Conversation"
                  aria-label="Share conversation"
                >
                  <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {/* Comments Button */}
              {currentConversation && (
                <button
                  onClick={handleToggleComments}
                  className={`
                    p-1.5 sm:p-2 
                    rounded-lg 
                    transition-all duration-200
                    ${isCommentsOpen 
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/70 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }
                  `}
                  title={isCommentsOpen ? 'Hide comments' : 'Show comments'}
                  aria-label={isCommentsOpen ? 'Hide comments' : 'Show comments'}
                >
                  <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {/* More Options Button */}
              {currentConversation && (
                <button
                  data-conversation-menu-trigger
                  onClick={onToggleConversationMenu}
                  className="
                    p-1.5 sm:p-2 
                    hover:bg-gray-100 dark:hover:bg-gray-700/70 
                    rounded-lg 
                    transition-colors 
                    text-gray-500 dark:text-gray-400 
                    hover:text-gray-700 dark:hover:text-gray-200
                  "
                  title="Conversation Options"
                  aria-label="More options"
                >
                  <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Conversation Options Menu */}
      {showConversationMenu && currentConversation && (
        <Suspense fallback={null}>
          <ConversationOptionsMenu
            conversationId={currentConversation.id}
            conversationTitle={currentConversation.title || 'Conversation'}
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
