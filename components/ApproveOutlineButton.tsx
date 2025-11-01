'use client';

import { useState } from 'react';
import { FlowOutlineData } from '@/types';

interface ApproveOutlineButtonProps {
  outline: FlowOutlineData;
  conversationId: string;
  onApprove: () => Promise<void>;
  disabled?: boolean;
}

export default function ApproveOutlineButton({
  outline,
  conversationId,
  onApprove,
  disabled = false
}: ApproveOutlineButtonProps) {
  const [isApproving, setIsApproving] = useState(false);

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
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-4 py-3 my-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left side - info */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Outline ready to approve
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {outline.emails.length} emails will be generated in separate conversations
            </p>
          </div>
        </div>

        {/* Right side - button */}
        <button
          onClick={handleApprove}
          disabled={disabled || isApproving}
          className={`
            px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150
            ${disabled || isApproving
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm hover:shadow active:scale-95'
            }
          `}
        >
          {isApproving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve & Generate
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

