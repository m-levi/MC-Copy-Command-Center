'use client';

import { ConversationQuickAction, ConversationVisibility } from '@/types';
import { useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';

interface ConversationContextMenuProps {
  conversationId: string;
  isPinned: boolean;
  isArchived?: boolean;
  visibility?: ConversationVisibility;
  isOwner?: boolean; // Only owner can change visibility
  position: { x: number; y: number } | null;
  onAction: (action: ConversationQuickAction) => void;
  onClose: () => void;
  bulkSelectMode?: boolean;
}

function ConversationContextMenu({
  conversationId,
  isPinned,
  isArchived = false,
  visibility = 'private',
  isOwner = true,
  position,
  onAction,
  onClose,
  bulkSelectMode = false
}: ConversationContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (position) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [position, onClose]);

  const handleAction = useCallback((action: ConversationQuickAction) => {
    onAction(action);
    onClose();
  }, [onAction, onClose]);

  if (!position) return null;

  // Adjust position to keep menu on screen
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 300)
  };

  const isTeamVisible = visibility === 'team';
  
  const menuItems = [
    // Visibility toggle - only show if user is owner
    ...(isOwner ? [{
      action: (isTeamVisible ? 'make_private' : 'share_with_team') as ConversationQuickAction,
      icon: isTeamVisible ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      label: isTeamVisible ? 'Make Private' : 'Share with Team',
      color: isTeamVisible 
        ? 'text-gray-700 dark:text-gray-300' 
        : 'text-blue-600 dark:text-blue-400',
      highlight: !isTeamVisible
    }] : []),
    { type: 'divider' as const },
    {
      action: isPinned ? 'unpin' : 'pin' as ConversationQuickAction,
      icon: isPinned ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
      label: isPinned ? 'Unpin' : 'Pin',
      color: 'text-gray-700 dark:text-gray-300'
    },
    {
      action: isArchived ? 'unarchive' : 'archive' as ConversationQuickAction,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      label: isArchived ? 'Unarchive' : 'Archive',
      color: 'text-gray-700 dark:text-gray-300'
    },
    {
      action: 'duplicate' as ConversationQuickAction,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      label: 'Duplicate',
      color: 'text-gray-700 dark:text-gray-300'
    },
    {
      action: 'rename' as ConversationQuickAction,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      label: 'Rename',
      color: 'text-gray-700 dark:text-gray-300'
    },
    {
      action: 'export' as ConversationQuickAction,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      label: 'Export',
      color: 'text-gray-700 dark:text-gray-300'
    },
    { type: 'divider' },
    {
      action: 'delete' as ConversationQuickAction,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      label: 'Delete',
      color: 'text-red-600 dark:text-red-400'
    }
  ];

  // Render menu in a portal to escape sidebar's stacking context
  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 min-w-[180px] animate-in fade-in zoom-in-95 duration-150 origin-top-left"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {menuItems.map((item, index) => {
        if (item.type === 'divider') {
          return (
            <div key={`divider-${index}`} className="my-1.5 mx-2 border-t border-gray-200 dark:border-gray-700" />
          );
        }

        return (
          <button
            key={item.action}
            onClick={() => handleAction(item.action as ConversationQuickAction)}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-100 cursor-pointer rounded-md mx-1 ${item.color}`}
            style={{ width: 'calc(100% - 8px)' }}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  // Use portal to render outside the sidebar DOM tree
  if (typeof document !== 'undefined') {
    return createPortal(menuContent, document.body);
  }

  return null;
}

// Memoize to prevent re-renders when position hasn't changed
export default memo(ConversationContextMenu, (prevProps, nextProps) => {
  return (
    prevProps.conversationId === nextProps.conversationId &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.isArchived === nextProps.isArchived &&
    prevProps.visibility === nextProps.visibility &&
    prevProps.isOwner === nextProps.isOwner &&
    prevProps.position?.x === nextProps.position?.x &&
    prevProps.position?.y === nextProps.position?.y &&
    prevProps.bulkSelectMode === nextProps.bulkSelectMode
  );
});
