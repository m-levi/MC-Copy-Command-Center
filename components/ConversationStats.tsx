'use client';

import { Message } from '@/types';
import { parseEmailSections } from './EmailSectionCard';

interface ConversationStatsProps {
  messages: Message[];
}

export default function ConversationStats({ messages }: ConversationStatsProps) {
  // Get the last AI message
  const lastAIMessage = messages
    .slice()
    .reverse()
    .find(m => m.role === 'assistant');

  if (!lastAIMessage) return null;

  const sections = parseEmailSections(lastAIMessage.content);
  const wordCount = lastAIMessage.content.split(/\s+/).length;
  
  // Estimate read time (average reading speed: 200 words per minute)
  const readTimeMinutes = Math.ceil(wordCount / 200);

  // Character count (useful for email length)
  const charCount = lastAIMessage.content.length;

  return (
    <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {wordCount.toLocaleString()} words
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            ~{readTimeMinutes} min read
          </span>
        </div>

        {sections && (
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {sections.length} sections
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {charCount.toLocaleString()} chars
          </span>
        </div>
      </div>
    </div>
  );
}


