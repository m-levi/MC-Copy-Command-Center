'use client';

import { useState } from 'react';
import { FlowOutlineData } from '@/types';
import InlineActionBanner from './InlineActionBanner';

interface ApproveOutlineButtonProps {
  outline: FlowOutlineData;
  onApprove: () => Promise<void>;
  disabled?: boolean;
}

export default function ApproveOutlineButton({
  outline,
  onApprove,
  disabled = false
}: ApproveOutlineButtonProps) {
  const [isApproving, setIsApproving] = useState(false);
  
  // Count how many of each type
  const designCount = outline.emails.filter(e => e.emailType === 'design').length;
  const letterCount = outline.emails.filter(e => e.emailType === 'letter').length;
  
  let templateDescription = '';
  if (designCount > 0 && letterCount > 0) {
    templateDescription = `${designCount} Design email${designCount !== 1 ? 's' : ''} + ${letterCount} Letter email${letterCount !== 1 ? 's' : ''}`;
  } else if (designCount > 0) {
    templateDescription = `${designCount} Design email${designCount !== 1 ? 's' : ''}`;
  } else {
    templateDescription = `${letterCount} Letter email${letterCount !== 1 ? 's' : ''}`;
  }

  const handleApprove = async () => {
    if (disabled || isApproving) return;

    setIsApproving(true);
    try {
      await onApprove();
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <InlineActionBanner
      tone="primary"
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      title="Outline ready to approve"
      message={`${templateDescription} will be generated in separate conversations.`}
      helperText="You'll be able to edit each email individually once they're created."
      action={{
        label: 'Approve & Generate',
        onClick: handleApprove,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        ),
        disabled,
        loading: isApproving,
        loadingLabel: 'Generating...'
      }}
    />
  );
}

