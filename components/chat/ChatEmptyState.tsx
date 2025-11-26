'use client';

import { ConversationMode } from '@/types';

interface ChatEmptyStateProps {
  mode: ConversationMode;
  onNewConversation: () => void;
}

export default function ChatEmptyState({ mode, onNewConversation }: ChatEmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-2xl px-4 sm:px-6">
        <div className="mb-6 flex justify-center">
          {mode === 'planning' ? (
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
              <svg className="w-12 h-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          ) : (
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
              <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          {mode === 'planning' 
            ? 'Your Brand Strategy Partner' 
            : 'Create Your Email'}
        </h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
          {mode === 'planning'
            ? 'Get marketing advice, brainstorm campaigns, explore creative ideas, and develop winning strategies for your brand.'
            : 'Describe the email you want to create and I\'ll generate it for you with high-converting copy.'}
        </p>
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            {mode === 'planning' ? '💡 What You Can Do Here:' : '✉️ Email Copy Mode Tips:'}
          </p>
          {mode === 'planning' ? (
            <div className="space-y-3">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">💬 Get Marketing Advice</p>
                <p className="text-xs ml-3">"What are best practices for abandoned cart emails?"</p>
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">🎨 Brainstorm Creative Ideas</p>
                <p className="text-xs ml-3">"I need creative campaign ideas for our new product launch"</p>
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">🎯 Develop Strategy</p>
                <p className="text-xs ml-3">"Help me plan a re-engagement campaign for inactive customers"</p>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> When we develop a campaign concept together, I'll offer to create it in Writing mode.
                </p>
              </div>
            </div>
          ) : (
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Be specific about your product or offer</li>
              <li>• Mention your target audience</li>
              <li>• Include any key details like discounts or timeframes</li>
              <li>• Provide context about the email's purpose and goal</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function NoConversationState({ onNewConversation }: { onNewConversation: () => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md px-4">
        <div className="mb-6">
          <svg
            className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No conversation selected
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Select a conversation from the sidebar or start a new one to begin creating email copy.
        </p>
        <button
          onClick={onNewConversation}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm hover:shadow-md"
        >
          Start New Conversation
        </button>
      </div>
    </div>
  );
}

export function PreparingResponseIndicator() {
  return (
    <div className="mb-3 inline-block">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
          <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
          <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
        </div>
        <span className="font-medium">preparing response</span>
      </div>
    </div>
  );
}

