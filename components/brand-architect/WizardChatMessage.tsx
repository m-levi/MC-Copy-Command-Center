'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '@/types/brand-architect';

interface WizardChatMessageProps {
  message: ChatMessage;
  isTyping?: boolean; // If true, show typing indicator
}

export default function WizardChatMessage({ message, isTyping }: WizardChatMessageProps) {
  const isUser = message.role === 'user';
  const formattedTimestamp = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 sm:mb-8 group animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards`}
      style={{
        contain: 'layout style paint',
        contentVisibility: 'auto',
      }}
    >
      <div className={`flex flex-col ${isUser ? 'items-end max-w-[85%] sm:max-w-[70%]' : 'w-full'}`}>
        <div
          className={`
            transition-all
            ${isUser 
              ? 'bg-gray-50 dark:bg-gray-800/50 rounded-2xl px-5 py-3.5' 
              : 'w-full px-4 sm:px-6' // Assistant messages take full width but padded
            }
          `}
        >
          {/* Avatar for Assistant (Optional, to match main chat style if it had one, but main chat doesn't show avatar in message bubble, just layout) */}
          {!isUser && (
             <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    BA
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">Brand Architect</span>
             </div>
          )}

          {/* Message Content */}
          <div className={`
            text-[15px] sm:text-base leading-relaxed font-normal text-gray-800 dark:text-gray-100
            ${!isUser ? 'prose dark:prose-invert max-w-none' : ''}
          `}>
            {isTyping ? (
               <div className="flex items-center gap-1 h-6">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
               </div>
            ) : (
               isUser ? (
                 <p className="whitespace-pre-wrap break-words">{message.content}</p>
               ) : (
                 <ReactMarkdown>{message.content}</ReactMarkdown>
               )
            )}
          </div>
        </div>

        {/* Metadata / Timestamp */}
        <div className={`flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500 ${isUser ? 'pr-1' : 'pl-6 sm:pl-16'}`}>
           <span>{formattedTimestamp}</span>
        </div>
      </div>
    </div>
  );
}

