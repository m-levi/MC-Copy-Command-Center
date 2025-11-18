'use client';

import { useState, useMemo } from 'react';
import { FlowOutlineData } from '@/types';
import InlineActionBanner from './InlineActionBanner';
import FlowchartViewer from './FlowchartViewer';
import { generateMermaidChart } from '@/lib/mermaid-generator';

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
  const [showPreview, setShowPreview] = useState(false);
  
  // Generate Mermaid chart for preview
  const mermaidChart = useMemo(() => generateMermaidChart(outline), [outline]);
  
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
    <div className="space-y-4">
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
      
      {/* Flow Preview Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${showPreview ? 'rotate-90' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>📊 Preview Flow Visualization</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {showPreview ? 'Hide' : 'Show'}
          </span>
        </button>
        
        {showPreview && mermaidChart && (
          <div className="border-t border-gray-200 dark:border-gray-800 overflow-visible">
            <FlowchartViewer
              mermaidChart={mermaidChart}
              flowName={outline.flowName}
              isVisible={true}
              onToggle={() => setShowPreview(!showPreview)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

