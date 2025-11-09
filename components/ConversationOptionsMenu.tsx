'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

interface ConversationOptionsMenuProps {
  conversationId: string;
  conversationTitle: string;
  onShowMemory: () => void;
  onToggleTheme?: () => void;
  onClose: () => void;
}

export default function ConversationOptionsMenu({
  conversationId,
  conversationTitle,
  onShowMemory,
  onToggleTheme,
  onClose
}: ConversationOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Position menu near the button that opened it
    const calculatePosition = () => {
      const button = document.querySelector('[data-conversation-menu-trigger]');
      if (button) {
        const rect = button.getBoundingClientRect();
        setPosition({
          x: rect.right - 220, // Align right edge of menu with button
          y: rect.bottom + 8
        });
      }
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const trigger = document.querySelector('[data-conversation-menu-trigger]');
        if (trigger && trigger.contains(event.target as Node)) {
          return; // Don't close if clicking the trigger button
        }
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleDownloadLatestEmail = () => {
    // Export the last AI message as HTML/MD
    const messages = document.querySelectorAll('[data-message-role="assistant"]');
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      const content = lastMessage.textContent || '';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-${conversationTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Email downloaded!');
    } else {
      toast.error('No email to download');
    }
    onClose();
  };

  const handleDownloadConversation = () => {
    // Export entire conversation
    const allMessages = Array.from(document.querySelectorAll('[data-message-role]'));
    if (allMessages.length === 0) {
      toast.error('No messages to download');
      onClose();
      return;
    }
    
    const content = allMessages.map(msg => {
      const role = msg.getAttribute('data-message-role');
      const text = msg.textContent || '';
      return `${role === 'user' ? 'You' : 'AI'}:\n${text}\n\n`;
    }).join('---\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversationTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conversation downloaded!');
    onClose();
  };

  const handleCopyURL = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('URL copied to clipboard!');
      onClose();
    }).catch(() => {
      toast.error('Failed to copy URL');
      onClose();
    });
  };

  const handleShareURL = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: conversationTitle || 'Email Conversation',
          text: 'Check out this conversation',
          url: url
        });
      } catch (err) {
        // User cancelled or error occurred - silently handle
      }
    } else {
      // Fallback to copy
      handleCopyURL();
    }
    onClose();
  };

  const menuItems = [
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      label: 'Memory Settings',
      onClick: () => {
        onShowMemory();
        onClose();
      },
      color: 'text-purple-600 dark:text-purple-400'
    },
    { type: 'divider' },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      label: 'Download Latest Email',
      onClick: handleDownloadLatestEmail,
      color: 'text-gray-700 dark:text-gray-300'
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: 'Download Conversation',
      onClick: handleDownloadConversation,
      color: 'text-gray-700 dark:text-gray-300'
    },
    { type: 'divider' },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      label: 'Copy Conversation Link',
      onClick: handleCopyURL,
      color: 'text-gray-700 dark:text-gray-300'
    },
    { type: 'divider' },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
      label: 'Toggle Dark Mode',
      onClick: () => {
        onToggleTheme?.();
        onClose();
      },
      color: 'text-gray-700 dark:text-gray-300'
    }
  ];

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-1 min-w-[220px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {menuItems.map((item, index) => {
        if (item.type === 'divider') {
          return (
            <div key={`divider-${index}`} className="my-1 border-t border-gray-200 dark:border-gray-700" />
          );
        }

        return (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${item.color}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  // Use portal to render outside normal DOM flow
  if (typeof document !== 'undefined') {
    return createPortal(menuContent, document.body);
  }

  return null;
}

