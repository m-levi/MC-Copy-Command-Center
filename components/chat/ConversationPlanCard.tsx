'use client';

import React, { useState } from 'react';
import {
  MessageSquarePlus,
  Check,
  X,
  Loader2,
  ChevronRight,
  Calendar,
  Mail,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react';

// Types
export interface PlannedConversation {
  title: string;
  purpose: string;
  timing?: string;
  email_type?: 'design' | 'letter';
  estimated_complexity?: 'simple' | 'moderate' | 'complex';
}

export interface ConversationPlan {
  id: string;
  messageId: string;
  plan_name: string;
  plan_description: string;
  conversations: PlannedConversation[];
  total_count: number;
  relationship_type: 'sequence' | 'parallel' | 'hierarchical';
  can_be_sub_conversations: boolean;
  parent_conversation_id?: string;
}

interface ConversationPlanCardProps {
  plan: ConversationPlan;
  onApprove: (plan: ConversationPlan) => Promise<void>;
  onReject: (plan: ConversationPlan) => void;
  onModify?: (plan: ConversationPlan) => void;
  isLoading?: boolean;
}

// Complexity badge colors
const complexityColors = {
  simple: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  moderate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  complex: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

// Email type icons
const emailTypeIcons = {
  design: '🎨',
  letter: '✉️',
};

// Relationship type descriptions
const relationshipDescriptions = {
  sequence: 'Emails will be sent in order',
  parallel: 'Independent conversations',
  hierarchical: 'Nested sub-conversations',
};

/**
 * Conversation Plan Card - Shows a proposed plan for creating multiple conversations
 * User can approve, reject, or modify the plan
 */
export function ConversationPlanCard({
  plan,
  onApprove,
  onReject,
  onModify,
  isLoading = false,
}: ConversationPlanCardProps) {
  const [approving, setApproving] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApprove(plan);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40 shadow-lg">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border-b border-indigo-200/50 dark:border-indigo-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-md">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {plan.plan_name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {plan.plan_description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-bold">
              {plan.total_count} {plan.total_count === 1 ? 'conversation' : 'conversations'}
            </span>
          </div>
        </div>
      </div>

      {/* Relationship Type Badge */}
      <div className="px-5 py-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-900/30">
        <ArrowRight className="w-4 h-4" />
        <span>{relationshipDescriptions[plan.relationship_type]}</span>
        {plan.can_be_sub_conversations && (
          <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
            Sub-conversations
          </span>
        )}
      </div>

      {/* Conversations List */}
      <div className="px-5 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-2"
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          View all {plan.total_count} planned conversations
        </button>

        {expanded && (
          <div className="space-y-2 mt-3">
            {plan.conversations.map((conv, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                {/* Sequence Number */}
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {idx + 1}
                </div>

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {conv.title}
                    </h4>
                    {conv.email_type && (
                      <span className="text-xs" title={`${conv.email_type} email`}>
                        {emailTypeIcons[conv.email_type]}
                      </span>
                    )}
                    {conv.estimated_complexity && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs ${complexityColors[conv.estimated_complexity]}`}
                      >
                        {conv.estimated_complexity}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {conv.purpose}
                  </p>
                  {conv.timing && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{conv.timing}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {plan.conversations.length < plan.total_count && (
              <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400 italic">
                + {plan.total_count - plan.conversations.length} more conversations...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ready to create these conversations?
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReject(plan)}
            disabled={approving || isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          {onModify && (
            <button
              onClick={() => onModify(plan)}
              disabled={approving || isLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              Modify
            </button>
          )}
          <button
            onClick={handleApprove}
            disabled={approving || isLoading}
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 text-sm font-medium"
          >
            {approving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Create {plan.total_count} Conversations
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConversationPlanCard;

















