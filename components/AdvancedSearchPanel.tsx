'use client';

import { useState } from 'react';
import { ConversationMode, OrganizationMember } from '@/types';

export interface AdvancedSearchFilters {
  query: string;
  dateRange?: { start: Date; end: Date };
  mode?: ConversationMode;
  creator?: string;
  hasAttachments?: boolean;
  messageCountMin?: number;
  messageCountMax?: number;
  tags?: string[];
}

interface AdvancedSearchPanelProps {
  filters: AdvancedSearchFilters;
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  teamMembers: OrganizationMember[];
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedSearchPanel({
  filters,
  onFiltersChange,
  teamMembers,
  isOpen,
  onClose
}: AdvancedSearchPanelProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedSearchFilters>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: AdvancedSearchFilters = { query: filters.query };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.dateRange) count++;
    if (localFilters.mode) count++;
    if (localFilters.creator) count++;
    if (localFilters.hasAttachments) count++;
    if (localFilters.messageCountMin !== undefined || localFilters.messageCountMax !== undefined) count++;
    if (localFilters.tags && localFilters.tags.length > 0) count++;
    return count;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 mx-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Advanced Search
            </h3>
            {getActiveFilterCount() > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={localFilters.dateRange?.start.toISOString().split('T')[0] || ''}
                onChange={(e) => {
                  const start = e.target.value ? new Date(e.target.value) : undefined;
                  setLocalFilters({
                    ...localFilters,
                    dateRange: start && localFilters.dateRange?.end
                      ? { start, end: localFilters.dateRange.end }
                      : undefined
                  });
                }}
                className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Start date"
              />
              <input
                type="date"
                value={localFilters.dateRange?.end.toISOString().split('T')[0] || ''}
                onChange={(e) => {
                  const end = e.target.value ? new Date(e.target.value) : undefined;
                  setLocalFilters({
                    ...localFilters,
                    dateRange: end && localFilters.dateRange?.start
                      ? { start: localFilters.dateRange.start, end }
                      : undefined
                  });
                }}
                className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="End date"
              />
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Conversation Mode
            </label>
            <select
              value={localFilters.mode || ''}
              onChange={(e) => setLocalFilters({
                ...localFilters,
                mode: e.target.value as ConversationMode || undefined
              })}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Modes</option>
              <option value="email_copy">Email Copy</option>
              <option value="planning">Planning</option>
            </select>
          </div>

          {/* Creator */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Created By
            </label>
            <select
              value={localFilters.creator || ''}
              onChange={(e) => setLocalFilters({
                ...localFilters,
                creator: e.target.value || undefined
              })}
              className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Anyone</option>
              {teamMembers.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.profile?.full_name || member.profile?.email}
                </option>
              ))}
            </select>
          </div>

          {/* Message Count */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Count
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                value={localFilters.messageCountMin || ''}
                onChange={(e) => setLocalFilters({
                  ...localFilters,
                  messageCountMin: e.target.value ? parseInt(e.target.value) : undefined
                })}
                placeholder="Min"
                className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                min="0"
                value={localFilters.messageCountMax || ''}
                onChange={(e) => setLocalFilters({
                  ...localFilters,
                  messageCountMax: e.target.value ? parseInt(e.target.value) : undefined
                })}
                placeholder="Max"
                className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.hasAttachments || false}
                onChange={(e) => setLocalFilters({
                  ...localFilters,
                  hasAttachments: e.target.checked || undefined
                })}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300">
                Has attachments
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            Reset All
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

