'use client';

import { Conversation, FlowConversation, FlowOutlineData } from '@/types';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Mail, Check, LayoutTemplate, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowNavigationProps {
  parentFlow?: FlowConversation;
  currentConversation: Conversation;
  brandId: string;
  onNavigateToParent: () => void;
  onNavigateToChild?: (childId: string) => void;
  children?: Conversation[];
  outline?: FlowOutlineData;
}

export default function FlowNavigation({
  parentFlow,
  currentConversation,
  brandId,
  onNavigateToParent,
  onNavigateToChild,
  children = [],
  outline
}: FlowNavigationProps) {
  const isChildConversation = !!currentConversation.parent_conversation_id;
  const isParentFlow = currentConversation.is_flow && !isChildConversation;

  // For parent flow - show email list navigation
  if (isParentFlow && children.length > 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Flow header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-violet-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {parentFlow?.flow_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Email'} Flow
              </h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full">
                {children.length} emails
              </span>
            </div>
          </div>
        </div>

        {/* Email tabs */}
        <div className="px-2 py-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {children.map((child, index) => {
              const emailOutline = outline?.emails.find(e => e.sequence === child.flow_sequence_order);
              const emailType = emailOutline?.emailType || 'design';
              
              return (
                <button
                  key={child.id}
                  onClick={() => onNavigateToChild?.(child.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                    "hover:bg-gray-100 dark:hover:bg-gray-700/50",
                    "border border-transparent",
                    "focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  )}
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {child.flow_email_title || `Email ${child.flow_sequence_order}`}
                  </span>
                  {emailType === 'design' ? (
                    <LayoutTemplate className="w-3.5 h-3.5 text-purple-500" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // For child conversation - show breadcrumb navigation
  if (!isChildConversation) {
    return null;
  }

  // Find current position in flow
  const currentIndex = children.findIndex(c => c.id === currentConversation.id);
  const prevChild = currentIndex > 0 ? children[currentIndex - 1] : null;
  const nextChild = currentIndex < children.length - 1 ? children[currentIndex + 1] : null;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Breadcrumb */}
      <div className="px-4 py-3 flex items-center gap-2 text-sm">
        {/* Back to Flow Parent */}
        <button
          onClick={onNavigateToParent}
          className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>
            {parentFlow?.flow_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Flow'}
          </span>
        </button>

        <span className="text-gray-300 dark:text-gray-600">/</span>

        {/* Current Email */}
        <span className="text-gray-900 dark:text-gray-100 font-medium">
          Email {currentConversation.flow_sequence_order}: {currentConversation.flow_email_title}
        </span>
      </div>

      {/* Email navigation pills */}
      {children.length > 1 && (
        <div className="px-4 pb-3 flex items-center justify-between">
          {/* Previous email */}
          <button
            onClick={() => prevChild && onNavigateToChild?.(prevChild.id)}
            disabled={!prevChild}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors",
              prevChild 
                ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50" 
                : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{prevChild ? `Email ${prevChild.flow_sequence_order}` : 'Previous'}</span>
          </button>

          {/* Position indicator */}
          <div className="flex items-center gap-1">
            {children.map((child, index) => (
              <button
                key={child.id}
                onClick={() => onNavigateToChild?.(child.id)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  child.id === currentConversation.id
                    ? "bg-violet-500 w-4"
                    : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                )}
                title={`Email ${index + 1}: ${child.flow_email_title}`}
              />
            ))}
          </div>

          {/* Next email */}
          <button
            onClick={() => nextChild && onNavigateToChild?.(nextChild.id)}
            disabled={!nextChild}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors",
              nextChild 
                ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50" 
                : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
          >
            <span>{nextChild ? `Email ${nextChild.flow_sequence_order}` : 'Next'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
