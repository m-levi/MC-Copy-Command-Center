'use client';

import { useState, useEffect } from 'react';
import { Brand } from '@/types';
import StyleGuideWizard from './StyleGuideWizard';

interface BrandStyleGuideTabProps {
  brand: Brand;
  onUpdate: (updates: Partial<Brand>) => void;
}

export default function BrandStyleGuideTab({ brand, onUpdate }: BrandStyleGuideTabProps) {
  const [copywritingStyleGuide, setCopywritingStyleGuide] = useState(brand.copywriting_style_guide || '');
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const hasChanges = copywritingStyleGuide !== (brand.copywriting_style_guide || '');

    if (hasChanges) {
      const timeoutId = setTimeout(() => {
        onUpdate({
          copywriting_style_guide: copywritingStyleGuide,
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [copywritingStyleGuide]);

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Copywriting Style Guide
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Define your brand's writing style, tone, and copywriting preferences
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2 ${
              copywritingStyleGuide
                ? 'border border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {copywritingStyleGuide ? 'Regenerate with AI Wizard' : 'Build with AI Wizard'}
          </button>
        </div>

        {/* Style Guide Document */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="relative">
            <textarea
              value={copywritingStyleGuide}
              onChange={(e) => setCopywritingStyleGuide(e.target.value)}
              rows={16}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y transition-all font-sans leading-relaxed"
              placeholder="Define your copywriting style guide...

Consider including:
• Tone and voice characteristics (e.g., professional, casual, friendly)
• Preferred vocabulary and phrases
• Words or phrases to avoid
• Formatting preferences (e.g., sentence length, paragraph structure)
• Punctuation style (e.g., Oxford comma, em dashes)
• Capitalization rules
• How to address customers
• Examples of good vs. bad copy

Or click 'Build with AI Wizard' to generate a style guide automatically!"
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 px-2 py-1 rounded">
              {copywritingStyleGuide.length} characters
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>A well-defined style guide ensures consistent, on-brand copywriting across all AI-generated content.</p>
          </div>
        </div>

        {/* Quick Tips */}
        {!copywritingStyleGuide && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl border border-purple-200 dark:border-purple-900/30 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Getting Started
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Use the <strong>AI Wizard</strong> to automatically generate a comprehensive style guide by answering a few questions about your brand.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Or start writing manually to create a custom style guide from scratch.
            </p>
          </div>
        )}
      </div>

      {/* Style Guide Wizard Modal */}
      {showWizard && (
        <StyleGuideWizard
          brandId={brand.id}
          brandName={brand.name}
          initialStyleGuide={copywritingStyleGuide}
          onComplete={(styleGuide) => {
            setCopywritingStyleGuide(styleGuide);
            setShowWizard(false);
          }}
          onClose={() => setShowWizard(false)}
        />
      )}
    </>
  );
}

