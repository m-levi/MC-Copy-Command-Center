'use client';

import { useState, memo } from 'react';
import { Message, Profile } from '@/types';
import MessageEditor from '../MessageEditor';
import toast from 'react-hot-toast';

interface ChatMessageUserProps {
  message: Message;
  onEdit?: (newContent: string) => void;
}

export const ChatMessageUser = memo(function ChatMessageUser({
  message,
  onEdit
}: ChatMessageUserProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const messageContent = message.content ?? '';
  const formattedTimestamp = new Date(message.created_at).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const getInitials = (email: string, fullName?: string) => {
    if (fullName) return fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    return email?.substring(0, 2).toUpperCase() || '??';
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageContent);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = (newContent: string) => {
    setIsEditing(false);
    onEdit?.(newContent);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  return (
    <div className="flex w-full justify-end mb-6 sm:mb-8 group animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards">
      <div className="flex flex-col items-end max-w-[85%] sm:max-w-[70%]">
        {message.user && (
          <div className="flex items-center gap-2 mb-1.5 px-1 opacity-80">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {message.user.full_name || message.user.email?.split('@')[0]}
            </span>
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold shadow-sm">
              {getInitials(message.user.email || '', message.user.full_name)}
            </div>
          </div>
        )}
        
        <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-2xl rounded-tr-sm px-5 py-3.5 transition-all shadow-sm">
          {isEditing ? (
            <MessageEditor
              initialContent={messageContent}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
            />
          ) : (
            <p className="whitespace-pre-wrap break-words text-[15px] sm:text-base leading-relaxed font-normal text-white">
              {messageContent}
            </p>
          )}
        </div>
        
        {/* User message actions - visible on hover (desktop), always visible on mobile */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          <span>{formattedTimestamp}</span>
          {message.edited_at && message.edited_at !== message.created_at && (
            <span className="italic opacity-80">(Edited)</span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              title="Copy message"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {onEdit && !isEditing && (
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title="Edit message"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m-1-1v2m-7 7h2m-1-1v2m10.586-7.414l-6.172 6.172a2 2 0 00-.586 1.414V17h1.828a2 2 0 001.414-.586l6.172-6.172a2 2 0 00-2.828-2.828z" />
                </svg>
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});


