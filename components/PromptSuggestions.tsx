'use client';

import { PROMPT_TEMPLATES } from '@/lib/prompt-templates';
import { PromptTemplate } from '@/types';
import { useState } from 'react';

interface PromptSuggestionsProps {
  onSelectTemplate: (template: PromptTemplate) => void;
  brandName: string;
}

export default function PromptSuggestions({
  onSelectTemplate,
  brandName,
}: PromptSuggestionsProps) {
  const [selectedCategory, setSelectedCategory] = useState<PromptTemplate['category'] | 'all'>('all');

  const categories = [
    { id: 'all', label: 'All Templates', icon: '📋' },
    { id: 'promotional', label: 'Promotional', icon: '🎯' },
    { id: 'announcement', label: 'Announcements', icon: '📢' },
    { id: 'transactional', label: 'Transactional', icon: '✉️' },
    { id: 'nurture', label: 'Nurture', icon: '🌱' },
  ];

  const filteredTemplates = selectedCategory === 'all'
    ? PROMPT_TEMPLATES
    : PROMPT_TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <div className="flex items-center justify-center h-full px-4 py-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            What would you like to create?
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a template to get started with {brandName}
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id as any)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer
                ${selectedCategory === category.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              <span className="mr-1.5">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="group text-left p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{template.icon}</span>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                {template.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {template.description}
              </p>
            </button>
          ))}
        </div>

        {/* Quick Start Tips */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Pro Tips:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Be specific about your product, discount, or timeframe</li>
                <li>• Mention your target audience if you have one in mind</li>
                <li>• You can always refine the output with quick actions after</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


