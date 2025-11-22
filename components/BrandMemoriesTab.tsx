'use client';

import BrandMemoriesManager from './BrandMemoriesManager';

interface BrandMemoriesTabProps {
  brandId: string;
}

export default function BrandMemoriesTab({ brandId }: BrandMemoriesTabProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Memories & Notes
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Keep track of important facts, preferences, insights, and learnings about this brand
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-900/30 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          What are Memories?
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          Memories are quick notes and insights that help you remember important details about your brand. Use them for:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-6 list-disc">
          <li>Important dates and milestones</li>
          <li>Customer preferences and feedback patterns</li>
          <li>Campaign performance insights</li>
          <li>Product launch notes</li>
          <li>Team decisions and rationale</li>
          <li>Quick facts and statistics</li>
        </ul>
      </div>

      {/* Memories Manager */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <BrandMemoriesManager
          brandId={brandId}
          category="general"
          title="All Memories"
          description="Quick notes, insights, and important facts about your brand"
          placeholder="What would you like to remember about this brand?"
        />
      </div>
    </div>
  );
}

