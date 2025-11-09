'use client';

import { BulkActionType } from '@/types';
import { useState } from 'react';

interface BulkActionBarProps {
  selectedCount: number;
  onAction: (action: BulkActionType) => void;
  onCancel: () => void;
  onSelectAll?: () => void;
  totalCount?: number;
}

export default function BulkActionBar({
  selectedCount,
  onAction,
  onCancel,
  onSelectAll,
  totalCount = 0,
}: BulkActionBarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onAction('delete');
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Selection info */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onCancel}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors cursor-pointer text-gray-600 dark:text-gray-400"
              title="Cancel (Esc)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedCount} selected
            </span>

            {onSelectAll && totalCount > 0 && !allSelected && (
              <button
                onClick={onSelectAll}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
              >
                Select all {totalCount}
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {/* Archive/Unarchive */}
            <button
              onClick={() => onAction('archive')}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors group cursor-pointer text-gray-600 dark:text-gray-400"
              title="Archive"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>

            {/* Export */}
            <button
              onClick={() => onAction('export')}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors group cursor-pointer text-gray-600 dark:text-gray-400"
              title="Export"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                showDeleteConfirm
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400'
              }`}
              title={showDeleteConfirm ? 'Click to confirm' : 'Delete'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {showDeleteConfirm ? 'Confirm?' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

