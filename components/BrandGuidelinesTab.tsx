'use client';

import { useState, useEffect } from 'react';
import { Brand } from '@/types';

interface BrandGuidelinesTabProps {
  brand: Brand;
  onUpdate: (updates: Partial<Brand>) => void;
}

export default function BrandGuidelinesTab({ brand, onUpdate }: BrandGuidelinesTabProps) {
  const [brandGuidelines, setBrandGuidelines] = useState(brand.brand_guidelines || '');

  useEffect(() => {
    const hasChanges = brandGuidelines !== (brand.brand_guidelines || '');

    if (hasChanges) {
      const timeoutId = setTimeout(() => {
        onUpdate({
          brand_guidelines: brandGuidelines,
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [brandGuidelines]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Brand Guidelines
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Define your brand's values, voice, messaging principles, and strategic guidelines
        </p>
      </div>

      {/* Guidelines Document */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="relative">
          <textarea
            value={brandGuidelines}
            onChange={(e) => setBrandGuidelines(e.target.value)}
            rows={16}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y transition-all font-sans leading-relaxed"
            placeholder="Write your brand guidelines...

Consider including:
• Brand Voice & Personality (e.g., authentic, innovative, trustworthy)
• Core Values and Mission Statement
• Target Audience & Customer Personas
• Key Messaging Pillars
• Positioning & Differentiation
• Communication Principles
• Things to Emphasize
• Things to Avoid or De-emphasize
• Brand Story & Heritage
• Visual Identity Principles (colors, imagery style)
• Social Media Guidelines
• Crisis Communication Guidelines"
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 px-2 py-1 rounded">
            {brandGuidelines.length} characters
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p>Brand guidelines ensure consistent messaging and help the AI understand your brand's strategic direction.</p>
        </div>
      </div>

      {/* Example Template */}
      {!brandGuidelines && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-200 dark:border-green-900/30 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Example Guidelines Template
          </h3>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <strong>Brand Voice:</strong>
              <p className="text-gray-600 dark:text-gray-400 mt-1">We are authentic, empowering, and approachable. We speak as a trusted friend who genuinely cares about our customers' success.</p>
            </div>
            <div>
              <strong>What We Emphasize:</strong>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Quality, sustainability, customer care, innovation, and community.</p>
            </div>
            <div>
              <strong>What We Avoid:</strong>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Jargon, aggressive sales tactics, making unrealistic promises, or being overly formal.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

