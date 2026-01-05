'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  MessageSquarePlus, 
  Calendar, 
  FileText, 
  Copy, 
  Download, 
  Share2,
  Check,
  X,
  Loader2,
  ChevronRight
} from 'lucide-react';

// Types
export interface PendingAction {
  id: string;
  messageId: string;
  action_type: string;
  title?: string;
  description?: string;
  initial_prompt?: string;
  conversations?: Array<{ title: string; initial_prompt: string; mode?: string }>;
  parent_conversation_id?: string;
  mode?: string;
  metadata?: Record<string, unknown>;
}

export interface SuggestedAction {
  id: string;
  messageId: string;
  label: string;
  action_type: string;
  description: string;
  action_data?: Record<string, unknown>;
  style?: 'primary' | 'secondary' | 'success' | 'warning';
  icon?: string;
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  mail: MessageSquarePlus,
  calendar: Calendar,
  document: FileText,
  copy: Copy,
  download: Download,
  share: Share2,
};

// Get icon component
function getIcon(iconName?: string) {
  if (!iconName) return Sparkles;
  return iconMap[iconName] || Sparkles;
}

// Style classes for different button styles
const styleClasses = {
  primary: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg',
  secondary: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200',
  success: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg',
  warning: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg',
};

/**
 * Pending Action Card - Shows an action that requires user approval
 */
export function PendingActionCard({
  action,
  onApprove,
  onReject,
  isLoading = false,
}: {
  action: PendingAction;
  onApprove: (action: PendingAction) => Promise<void>;
  onReject: (action: PendingAction) => void;
  isLoading?: boolean;
}) {
  const [approving, setApproving] = useState(false);
  
  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApprove(action);
    } finally {
      setApproving(false);
    }
  };

  // Render content based on action type
  const renderContent = () => {
    switch (action.action_type) {
      case 'create_conversation':
        return (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              Create New Conversation
            </h4>
            {action.title && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Title:</strong> {action.title}
              </p>
            )}
            {action.initial_prompt && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {action.initial_prompt}
              </p>
            )}
          </div>
        );
      
      case 'create_bulk_conversations':
        return (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              Create {action.conversations?.length || 0} Conversations
            </h4>
            {action.conversations && (
              <ul className="space-y-1">
                {action.conversations.slice(0, 4).map((conv, idx) => (
                  <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <ChevronRight className="w-3 h-3" />
                    {conv.title}
                  </li>
                ))}
                {action.conversations.length > 4 && (
                  <li className="text-sm text-gray-500 dark:text-gray-400 italic">
                    + {action.conversations.length - 4} more...
                  </li>
                )}
              </ul>
            )}
          </div>
        );
      
      default:
        return (
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              {action.title || 'Pending Action'}
            </h4>
            {action.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {action.description}
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="my-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
          <MessageSquarePlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          {renderContent()}
          
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleApprove}
              disabled={approving || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {approving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Approve
            </button>
            <button
              onClick={() => onReject(action)}
              disabled={approving || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Suggested Action Button - A quick action button suggested by the AI
 */
export function SuggestedActionButton({
  action,
  onClick,
  isLoading = false,
}: {
  action: SuggestedAction;
  onClick: (action: SuggestedAction) => void;
  isLoading?: boolean;
}) {
  const Icon = getIcon(action.icon);
  const style = action.style || 'primary';
  
  return (
    <button
      onClick={() => onClick(action)}
      disabled={isLoading}
      className={`
        group flex items-center gap-2 px-4 py-2.5 rounded-lg 
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        ${styleClasses[style]}
      `}
      title={action.description}
    >
      <Icon className={`w-4 h-4 ${isLoading ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
      <span className="font-medium">{action.label}</span>
    </button>
  );
}

/**
 * Suggested Actions Bar - Container for multiple action buttons
 */
export function SuggestedActionsBar({
  actions,
  onActionClick,
  loadingActionId,
}: {
  actions: SuggestedAction[];
  onActionClick: (action: SuggestedAction) => void;
  loadingActionId?: string;
}) {
  if (actions.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2 my-4">
      {actions.map((action) => (
        <SuggestedActionButton
          key={action.id}
          action={action}
          onClick={onActionClick}
          isLoading={loadingActionId === action.id}
        />
      ))}
    </div>
  );
}

/**
 * Combined Actions Display - Shows both pending actions and suggested buttons
 */
export function AIActionsDisplay({
  pendingActions,
  suggestedActions,
  messageId,
  onApprovePending,
  onRejectPending,
  onSuggestedClick,
  isLoading = false,
  loadingActionId,
}: {
  pendingActions: PendingAction[];
  suggestedActions: SuggestedAction[];
  messageId: string;
  onApprovePending: (action: PendingAction) => Promise<void>;
  onRejectPending: (action: PendingAction) => void;
  onSuggestedClick: (action: SuggestedAction) => void;
  isLoading?: boolean;
  loadingActionId?: string;
}) {
  // Filter actions for this message
  const messagePendingActions = pendingActions.filter(a => a.messageId === messageId);
  const messageSuggestedActions = suggestedActions.filter(a => a.messageId === messageId);
  
  if (messagePendingActions.length === 0 && messageSuggestedActions.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-3">
      {/* Pending Actions (require approval) */}
      {messagePendingActions.map((action) => (
        <PendingActionCard
          key={action.id}
          action={action}
          onApprove={onApprovePending}
          onReject={onRejectPending}
          isLoading={isLoading}
        />
      ))}
      
      {/* Suggested Actions (one-click buttons) */}
      {messageSuggestedActions.length > 0 && (
        <SuggestedActionsBar
          actions={messageSuggestedActions}
          onActionClick={onSuggestedClick}
          loadingActionId={loadingActionId}
        />
      )}
    </div>
  );
}

export default AIActionsDisplay;




















