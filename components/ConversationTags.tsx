'use client';

import { useState } from 'react';

export type ConversationTag = {
  id: string;
  label: string;
  color: 'blue' | 'purple' | 'pink' | 'green' | 'yellow' | 'red' | 'gray' | 'indigo' | 'cyan' | 'orange';
};

interface ConversationTagsProps {
  tags: ConversationTag[];
  onAddTag?: (tag: ConversationTag) => void;
  onRemoveTag?: (tagId: string) => void;
  editable?: boolean;
  compact?: boolean;
  maxVisible?: number;
}

const TAG_COLORS = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

export default function ConversationTags({
  tags,
  onAddTag,
  onRemoveTag,
  editable = false,
  compact = false,
  maxVisible = 3
}: ConversationTagsProps) {
  const [showAll, setShowAll] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const visibleTags = showAll ? tags : tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  const commonTags: ConversationTag[] = [
    { id: 'campaign', label: 'Campaign', color: 'blue' },
    { id: 'draft', label: 'Draft', color: 'yellow' },
    { id: 'review', label: 'Review', color: 'orange' },
    { id: 'urgent', label: 'Urgent', color: 'red' },
    { id: 'approved', label: 'Approved', color: 'green' },
    { id: 'template', label: 'Template', color: 'purple' },
    { id: 'archived', label: 'Archived', color: 'gray' },
    { id: 'scheduled', label: 'Scheduled', color: 'indigo' },
  ];

  if (tags.length === 0 && !editable) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visibleTags.map((tag) => (
        <div
          key={tag.id}
          className={`
            inline-flex items-center gap-1
            ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}
            rounded-full font-medium
            ${TAG_COLORS[tag.color]}
            transition-all duration-150
          `}
        >
          <span>{tag.label}</span>
          {editable && onRemoveTag && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTag(tag.id);
              }}
              className="hover:scale-125 transition-transform"
              title="Remove tag"
            >
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {/* Show more button */}
      {!showAll && hiddenCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAll(true);
          }}
          className={`
            inline-flex items-center
            ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}
            rounded-full font-medium
            bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400
            hover:bg-gray-200 dark:hover:bg-gray-700
            transition-colors
          `}
        >
          +{hiddenCount}
        </button>
      )}

      {/* Add tag button */}
      {editable && onAddTag && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAddMenu(!showAddMenu);
            }}
            className={`
              inline-flex items-center gap-1
              ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}
              rounded-full font-medium
              bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400
              hover:bg-blue-200 dark:hover:bg-blue-900/50
              transition-colors
            `}
            title="Add tag"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {!compact && <span>Tag</span>}
          </button>

          {/* Tag selection menu */}
          {showAddMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddMenu(false);
                }}
              />
              <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[160px]">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1 mb-1">
                  Add Tag
                </div>
                <div className="space-y-1">
                  {commonTags
                    .filter(commonTag => !tags.some(t => t.id === commonTag.id))
                    .map((tag) => (
                      <button
                        key={tag.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddTag(tag);
                          setShowAddMenu(false);
                        }}
                        className={`
                          w-full text-left px-2 py-1.5 text-xs rounded
                          ${TAG_COLORS[tag.color]}
                          hover:opacity-80
                          transition-opacity
                        `}
                      >
                        {tag.label}
                      </button>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

