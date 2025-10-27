'use client';

import { Conversation } from '@/types';
import { useState } from 'react';

interface ChatSidebarProps {
  brandName: string;
  conversations: Conversation[];
  currentConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
}

export default function ChatSidebar({
  brandName,
  conversations,
  currentConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}: ChatSidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      onDeleteConversation(conversationId);
    }
  };

  return (
    <div className="w-72 bg-gray-900 text-white flex flex-col h-screen border-r border-gray-700">
      {/* Brand header */}
      <div className="px-3 py-3 border-b border-gray-700">
        <h2 className="text-base font-semibold truncate">{brandName}</h2>
        <p className="text-xs text-gray-400 mt-0.5">Email Copywriter</p>
      </div>

      {/* New conversation button */}
      <div className="p-3">
        <button
          onClick={onNewConversation}
          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Conversation
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="px-3 py-4 text-center text-gray-400 text-xs">
            No conversations yet
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`
                  group relative px-2.5 py-2 rounded-md cursor-pointer transition-all
                  ${
                    currentConversationId === conversation.id
                      ? 'bg-gray-700 shadow-sm'
                      : 'hover:bg-gray-800'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-medium truncate leading-tight">
                      {conversation.title || 'New Conversation'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(conversation.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conversation.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-opacity flex-shrink-0"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-gray-400 hover:text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back to brands link */}
      <div className="px-3 py-3 border-t border-gray-700">
        <a
          href="/"
          className="block text-center text-xs text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Brands
        </a>
      </div>
    </div>
  );
}


