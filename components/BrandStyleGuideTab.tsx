'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brand, BrandVoiceData } from '@/types';

interface BrandStyleGuideTabProps {
  brand: Brand;
  onUpdate: (updates: Partial<Brand>) => void;
}

export default function BrandStyleGuideTab({ brand, onUpdate }: BrandStyleGuideTabProps) {
  const router = useRouter();
  const [copywritingStyleGuide, setCopywritingStyleGuide] = useState(brand.copywriting_style_guide || '');
  const [brandVoice, setBrandVoice] = useState<BrandVoiceData | undefined>(brand.brand_voice);
  const [viewMode, setViewMode] = useState<'structured' | 'text'>(brand.brand_voice ? 'structured' : 'text');

  // Sync brand voice from prop when it changes (e.g., after returning from voice builder page)
  useEffect(() => {
    if (brand.brand_voice) {
      setBrandVoice(brand.brand_voice);
      setViewMode('structured');
    }
    if (brand.copywriting_style_guide) {
      setCopywritingStyleGuide(brand.copywriting_style_guide);
    }
  }, [brand.brand_voice, brand.copywriting_style_guide]);

  // Sync text changes (debounced)
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
  }, [copywritingStyleGuide, onUpdate, brand.copywriting_style_guide]);

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Brand Voice & Style Guide
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Define your brand's voice, tone, vocabulary, and copywriting patterns
            </p>
          </div>
          <button
            onClick={() => router.push(`/brands/${brand.id}/brand-builder`)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2 ${
              brandVoice || copywritingStyleGuide
                ? 'border border-violet-600 dark:border-violet-500 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {brandVoice || copywritingStyleGuide ? 'Rebuild Brand' : 'Build Brand'}
          </button>
        </div>

        {/* View Mode Toggle (only if we have structured data) */}
        {brandVoice && (
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
            <button
              onClick={() => setViewMode('structured')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'structured'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Structured View
            </button>
            <button
              onClick={() => setViewMode('text')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'text'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Text View
            </button>
          </div>
        )}

        {/* Structured View */}
        {brandVoice && viewMode === 'structured' && (
          <div className="space-y-4">
            {/* Brand & Voice Summary */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Brand</span>
                </div>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{brandVoice.brand_summary}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Voice</span>
                </div>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{brandVoice.voice_description}</p>
              </div>
            </div>

            {/* We Sound / We Never Sound */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">We Sound</span>
                </div>
                <ul className="space-y-2">
                  {brandVoice.we_sound?.map((trait, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{trait.trait}:</span>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{trait.explanation}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">We Never Sound</span>
                </div>
                <ul className="space-y-1">
                  {brandVoice.we_never_sound?.map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="text-red-500">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Vocabulary */}
            {brandVoice.vocabulary && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Vocabulary</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 mb-1 block">Use</span>
                    <div className="flex flex-wrap gap-1">
                      {brandVoice.vocabulary.use?.map((word, i) => (
                        <span key={i} className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 mb-1 block">Avoid</span>
                    <div className="flex flex-wrap gap-1">
                      {brandVoice.vocabulary.avoid?.map((word, i) => (
                        <span key={i} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs line-through">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audience & Patterns */}
            <div className="grid md:grid-cols-2 gap-4">
              {brandVoice.audience && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Audience</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{brandVoice.audience}</p>
                </div>
              )}
              
              {brandVoice.patterns && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Patterns</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{brandVoice.patterns}</p>
                </div>
              )}
            </div>

            {/* Copy Examples */}
            <div className="grid md:grid-cols-2 gap-4">
              {brandVoice.good_copy_example && (
                <div className="bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-900/30 p-5">
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Good Copy Example</span>
                  <blockquote className="mt-2 text-sm text-green-900 dark:text-green-100 italic border-l-2 border-green-400 pl-3">
                    "{brandVoice.good_copy_example}"
                  </blockquote>
                </div>
              )}
              
              {brandVoice.bad_copy_example && (
                <div className="bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/30 p-5">
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Bad Copy (Contrast)</span>
                  <blockquote className="mt-2 text-sm text-red-900 dark:text-red-100 italic border-l-2 border-red-400 pl-3 line-through opacity-75">
                    "{brandVoice.bad_copy_example}"
                  </blockquote>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Text View (legacy or fallback) */}
        {(!brandVoice || viewMode === 'text') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="relative">
              <textarea
                value={copywritingStyleGuide}
                onChange={(e) => setCopywritingStyleGuide(e.target.value)}
                rows={16}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y transition-all font-sans leading-relaxed"
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

Or click 'Build Brand Voice' to generate a style guide automatically!"
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
        )}

        {/* Getting Started (only if no content) */}
        {!copywritingStyleGuide && !brandVoice && (
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 rounded-xl border border-violet-200 dark:border-violet-900/30 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Getting Started
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Use the <strong>Brand Voice Builder</strong> to automatically extract your brand voice from existing materials 
              like website copy, emails, or style guides.
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Paste text content directly</li>
              <li>• Enter your website URL for auto-extraction</li>
              <li>• Upload documents (.txt, .md, .pdf)</li>
              <li>• Iterate with AI feedback until it feels right</li>
            </ul>
          </div>
        )}
      </div>

    </>
  );
}

