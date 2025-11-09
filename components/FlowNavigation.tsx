'use client';

import { Conversation, FlowConversation } from '@/types';
import Link from 'next/link';

interface FlowNavigationProps {
  parentFlow?: FlowConversation;
  currentConversation: Conversation;
  brandId: string;
  onNavigateToParent: () => void;
  onNavigateToChild?: (childId: string) => void;
}

export default function FlowNavigation({
  parentFlow,
  currentConversation,
  brandId,
  onNavigateToParent,
  onNavigateToChild
}: FlowNavigationProps) {
  const isChildConversation = !!currentConversation.parent_conversation_id;

  if (!isChildConversation) {
    // If we're in the parent flow, no navigation needed
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
      <div className="flex items-center gap-2 text-sm">
        {/* Back to Brands */}
        <Link
          href={`/`}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          All Brands
        </Link>

        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        {/* Back to Flow Parent */}
        <button
          onClick={onNavigateToParent}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {parentFlow?.flow_type && (
            <span className="hover:underline">
              {parentFlow.flow_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Flow
            </span>
          )}
        </button>

        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        {/* Current Email */}
        <span className="text-gray-900 dark:text-gray-100 font-medium">
          Email {currentConversation.flow_sequence_order}: {currentConversation.flow_email_title}
        </span>
      </div>

      {/* Additional info */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          This email is part of the {parentFlow?.flow_type?.replace(/_/g, ' ')} sequence
        </span>
      </div>
    </div>
  );
}


