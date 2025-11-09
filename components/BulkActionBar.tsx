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
      // Auto-hide confirmation after 5 seconds
      setTimeout(() => setShowDeleteConfirm(false), 5000);
    }
  };

  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white shadow-lg">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Selection info */}
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              title="Cancel selection"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">{selectedCount}</span>
              <span className="text-blue-100">selected</span>
            </div>

            {/* Select All button */}
            {onSelectAll && totalCount > 0 && !allSelected && (
              <button
                onClick={onSelectAll}
                className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md text-sm font-medium transition-colors cursor-pointer"
              >
                Select all ({totalCount})
              </button>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Pin */}
            <button
              onClick={() => onAction('pin')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors group relative cursor-pointer"
              title="Pin selected"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Pin
              </span>
            </button>

            {/* Unpin */}
            <button
              onClick={() => onAction('unpin')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors group relative cursor-pointer"
              title="Unpin selected"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Unpin
              </span>
            </button>

            {/* Archive */}
            <button
              onClick={() => onAction('archive')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors group relative cursor-pointer"
              title="Archive selected"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Archive
              </span>
            </button>

            {/* Unarchive */}
            <button
              onClick={() => onAction('unarchive')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors group relative cursor-pointer"
              title="Unarchive selected"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Unarchive
              </span>
            </button>

            {/* Export */}
            <button
              onClick={() => onAction('export')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors group relative cursor-pointer"
              title="Export selected"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Export
              </span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-white/30 mx-1"></div>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className={`px-3 py-2 rounded-lg transition-all font-medium cursor-pointer ${
                showDeleteConfirm
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              title={showDeleteConfirm ? 'Click again to confirm deletion' : 'Delete selected'}
            >
              {showDeleteConfirm ? (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Confirm Delete?
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Delete confirmation message */}
        {showDeleteConfirm && (
          <div className="mt-2 text-sm text-blue-100 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Click &quot;Confirm Delete?&quot; again to permanently delete {selectedCount} conversation{selectedCount > 1 ? 's' : ''}. This cannot be undone.</span>
          </div>
        )}
      </div>
    </div>
  );
}

