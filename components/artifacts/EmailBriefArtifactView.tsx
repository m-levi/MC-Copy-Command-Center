'use client';

import { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  CalendarIcon,
  TargetIcon,
  MessageSquareIcon,
  SparklesIcon,
  PackageIcon,
  ArrowRightIcon,
  PencilIcon,
  SendIcon,
  AlertCircleIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { EmailBriefApprovalStatus, EmailBriefCampaignType } from '@/types/artifacts';

/**
 * Email Brief Artifact - represents a planning document for an email campaign
 * Used in the Calendar Planner flow to create structured briefs that can be
 * approved and then converted into actual email conversations.
 */

interface EmailBriefMetadata {
  campaign_type?: EmailBriefCampaignType;
  send_date?: string;
  target_segment?: string;
  objective?: string;
  key_message?: string;
  value_proposition?: string;
  product_ids?: string[];
  call_to_action?: string;
  subject_line_direction?: string;
  tone_notes?: string;
  content_guidelines?: string;
  approval_status?: EmailBriefApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_notes?: string;
  calendar_artifact_id?: string;
  calendar_slot_index?: number;
}

interface EmailBriefArtifact {
  id: string;
  title: string;
  content: string;
  metadata?: EmailBriefMetadata;
}

interface EmailBriefArtifactViewProps {
  artifact: EmailBriefArtifact;
  onApprove?: (artifactId: string) => Promise<void>;
  onReject?: (artifactId: string, notes?: string) => Promise<void>;
  onCreateEmail?: (artifactId: string) => Promise<void>;
  onEdit?: (artifactId: string) => void;
  isStreaming?: boolean;
  readOnly?: boolean;
}

const CAMPAIGN_TYPE_CONFIG: Record<EmailBriefCampaignType, { label: string; color: string; icon: typeof SparklesIcon }> = {
  promotional: { label: 'Promotional', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: SparklesIcon },
  content: { label: 'Content', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: MessageSquareIcon },
  announcement: { label: 'Announcement', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: AlertCircleIcon },
  transactional: { label: 'Transactional', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: SendIcon },
  nurture: { label: 'Nurture', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: TargetIcon },
};

const APPROVAL_STATUS_CONFIG: Record<EmailBriefApprovalStatus, { label: string; color: string; icon: typeof CheckCircle2Icon }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: PencilIcon },
  pending_review: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: ClockIcon },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2Icon },
  rejected: { label: 'Needs Changes', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircleIcon },
};

export const EmailBriefArtifactView = memo(function EmailBriefArtifactView({
  artifact,
  onApprove,
  onReject,
  onCreateEmail,
  onEdit,
  isStreaming = false,
  readOnly = false,
}: EmailBriefArtifactViewProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isCreatingEmail, setIsCreatingEmail] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const metadata = artifact.metadata || {};
  const approvalStatus = metadata.approval_status || 'draft';
  const campaignType = metadata.campaign_type || 'content';

  const statusConfig = APPROVAL_STATUS_CONFIG[approvalStatus];
  const campaignConfig = CAMPAIGN_TYPE_CONFIG[campaignType];
  const StatusIcon = statusConfig.icon;
  const CampaignIcon = campaignConfig.icon;

  const handleApprove = useCallback(async () => {
    if (!onApprove || isApproving) return;
    setIsApproving(true);
    try {
      await onApprove(artifact.id);
      toast.success('Brief approved!');
    } catch (error) {
      toast.error('Failed to approve brief');
    } finally {
      setIsApproving(false);
    }
  }, [artifact.id, onApprove, isApproving]);

  const handleReject = useCallback(async () => {
    if (!onReject || isRejecting) return;
    setIsRejecting(true);
    try {
      await onReject(artifact.id, rejectNotes);
      toast.success('Feedback sent');
      setShowRejectDialog(false);
      setRejectNotes('');
    } catch (error) {
      toast.error('Failed to send feedback');
    } finally {
      setIsRejecting(false);
    }
  }, [artifact.id, onReject, isRejecting, rejectNotes]);

  const handleCreateEmail = useCallback(async () => {
    if (!onCreateEmail || isCreatingEmail || approvalStatus !== 'approved') return;
    setIsCreatingEmail(true);
    try {
      await onCreateEmail(artifact.id);
      toast.success('Email conversation created!');
    } catch (error) {
      toast.error('Failed to create email');
    } finally {
      setIsCreatingEmail(false);
    }
  }, [artifact.id, onCreateEmail, isCreatingEmail, approvalStatus]);

  // Parse send date for display
  const formattedSendDate = metadata.send_date
    ? new Date(metadata.send_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between gap-3">
          {/* Status Badge */}
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            statusConfig.color
          )}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusConfig.label}
          </div>

          {/* Campaign Type Badge */}
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            campaignConfig.color
          )}>
            <CampaignIcon className="w-3.5 h-3.5" />
            {campaignConfig.label}
          </div>
        </div>

        {/* Send Date & Segment */}
        {(formattedSendDate || metadata.target_segment) && (
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            {formattedSendDate && (
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{formattedSendDate}</span>
              </div>
            )}
            {metadata.target_segment && (
              <div className="flex items-center gap-1">
                <TargetIcon className="w-3.5 h-3.5" />
                <span>{metadata.target_segment}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isStreaming && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-600 dark:text-blue-400">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span className="font-medium">Creating brief...</span>
          </div>
        )}

        {/* Objective */}
        {metadata.objective && (
          <BriefSection title="Objective" icon={TargetIcon}>
            <p className="text-sm text-gray-700 dark:text-gray-300">{metadata.objective}</p>
          </BriefSection>
        )}

        {/* Key Message */}
        {metadata.key_message && (
          <BriefSection title="Key Message" icon={MessageSquareIcon} highlight>
            <p className="text-sm text-gray-900 dark:text-white font-medium">{metadata.key_message}</p>
          </BriefSection>
        )}

        {/* Value Proposition */}
        {metadata.value_proposition && (
          <BriefSection title="Value Proposition" icon={SparklesIcon}>
            <p className="text-sm text-gray-700 dark:text-gray-300">{metadata.value_proposition}</p>
          </BriefSection>
        )}

        {/* Products */}
        {metadata.product_ids && metadata.product_ids.length > 0 && (
          <BriefSection title="Featured Products" icon={PackageIcon}>
            <div className="flex flex-wrap gap-2">
              {metadata.product_ids.map((productId, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md"
                >
                  {productId}
                </span>
              ))}
            </div>
          </BriefSection>
        )}

        {/* Call to Action */}
        {metadata.call_to_action && (
          <BriefSection title="Call to Action" icon={ArrowRightIcon}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                {metadata.call_to_action}
              </span>
            </div>
          </BriefSection>
        )}

        {/* Subject Line Direction */}
        {metadata.subject_line_direction && (
          <BriefSection title="Subject Line Direction" icon={MessageSquareIcon}>
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
              &quot;{metadata.subject_line_direction}&quot;
            </p>
          </BriefSection>
        )}

        {/* Tone Notes */}
        {metadata.tone_notes && (
          <BriefSection title="Tone & Voice Notes" icon={SparklesIcon}>
            <p className="text-sm text-gray-700 dark:text-gray-300">{metadata.tone_notes}</p>
          </BriefSection>
        )}

        {/* Content Guidelines */}
        {metadata.content_guidelines && (
          <BriefSection title="Content Guidelines" icon={PencilIcon}>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {metadata.content_guidelines}
            </p>
          </BriefSection>
        )}

        {/* Raw Content (if any additional content exists) */}
        {artifact.content && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Additional Notes
            </p>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {artifact.content}
              </p>
            </div>
          </div>
        )}

        {/* Rejection Notes */}
        {approvalStatus === 'rejected' && metadata.rejection_notes && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Feedback:</p>
            <p className="text-sm text-red-700 dark:text-red-300">{metadata.rejection_notes}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {!readOnly && !isStreaming && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
          {/* Reject Dialog */}
          {showRejectDialog && (
            <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What changes are needed?
              </p>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Describe the changes you'd like to see..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                rows={3}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectNotes('');
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isRejecting || !rejectNotes.trim()}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-lg',
                    'bg-orange-500 text-white hover:bg-orange-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isRejecting ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {approvalStatus === 'approved' ? (
              // Approved state - show Create Email button
              <button
                onClick={handleCreateEmail}
                disabled={isCreatingEmail || !onCreateEmail}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
                  'hover:shadow-lg hover:shadow-green-500/25 hover:-translate-y-0.5',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none'
                )}
              >
                {isCreatingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Email...
                  </>
                ) : (
                  <>
                    <SendIcon className="w-4 h-4" />
                    Create Email Conversation
                  </>
                )}
              </button>
            ) : (
              // Not approved - show Approve/Request Changes buttons
              <>
                <button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isApproving}
                  className={cn(
                    'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                    'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <XCircleIcon className="w-4 h-4" />
                  Request Changes
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving || !onApprove}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                    'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
                    'hover:shadow-lg hover:shadow-green-500/25 hover:-translate-y-0.5',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none'
                  )}
                >
                  {isApproving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2Icon className="w-4 h-4" />
                      Approve Brief
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Edit button */}
          {onEdit && (
            <button
              onClick={() => onEdit(artifact.id)}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <PencilIcon className="w-4 h-4" />
              Edit Brief
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// Helper component for brief sections
function BriefSection({
  title,
  icon: Icon,
  children,
  highlight = false
}: {
  title: string;
  icon: typeof TargetIcon;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-lg p-3',
      highlight
        ? 'bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-100 dark:border-violet-800/50'
        : 'bg-gray-50 dark:bg-gray-800/50'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center',
          highlight
            ? 'bg-violet-100 dark:bg-violet-800/50'
            : 'bg-gray-200 dark:bg-gray-700'
        )}>
          <Icon className={cn(
            'w-3 h-3',
            highlight
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-gray-500 dark:text-gray-400'
          )} />
        </div>
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wide',
          highlight
            ? 'text-violet-700 dark:text-violet-300'
            : 'text-gray-600 dark:text-gray-400'
        )}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

export default EmailBriefArtifactView;
