'use client';

import Link from 'next/link';
import BrandMemoriesManager from './BrandMemoriesManager';
import { BrainIcon, SparklesIcon, ExternalLinkIcon } from 'lucide-react';

interface BrandMemoriesTabProps {
  brandId: string;
}

export default function BrandMemoriesTab({ brandId }: BrandMemoriesTabProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <BrainIcon className="w-7 h-7 text-purple-500" />
            Brand Memories
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered memory that persists across all conversations
          </p>
        </div>
        <Link
          href={`/brands/${brandId}/memories`}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
        >
          View All Memories
          <ExternalLinkIcon className="w-4 h-4" />
        </Link>
      </div>

      {/* AI Memory Info Card */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-xl border border-purple-200 dark:border-purple-800/30 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          AI-Powered Memory
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          Memories are automatically used by the AI to personalize responses in your conversations. Add important facts and preferences that the AI should remember:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-6 list-disc">
          <li>Brand voice and tone preferences</li>
          <li>Target audience insights</li>
          <li>Product details and features</li>
          <li>Campaign goals and strategies</li>
          <li>Do&apos;s and don&apos;ts for copywriting</li>
          <li>Important facts the AI should know</li>
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

