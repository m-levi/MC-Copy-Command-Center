'use client';

import { useMemo, useState } from 'react';
import { parseEmailCopy, ParsedEmailCopy, EmailSection, isStructuredEmailCopy, formatSectionLabel } from '@/lib/email-copy-parser';

interface StructuredEmailRendererProps {
  content: string;
  onCopy?: () => void;
}

/**
 * Beautiful structured email copy renderer
 * Transforms raw email copy format into a visual, scannable layout
 * Includes toggle between structured blocks and plain text view
 */
export default function StructuredEmailRenderer({ content, onCopy }: StructuredEmailRendererProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'blocks' | 'plain'>('blocks');
  
  const parsedEmail = useMemo(() => parseEmailCopy(content), [content]);
  
  // Clean content for plain text view and copying
  const cleanContent = useMemo(() => {
    return content
      .replace(/^```\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();
  }, [content]);
  
  // If parsing failed, return null to fall back to default rendering
  if (!parsedEmail) return null;
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="space-y-3">
      {/* View Toggle & Copy Controls */}
      <div className="flex items-center justify-between">
        {/* View Toggle */}
        <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('blocks')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'blocks'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Blocks
          </button>
          <button
            onClick={() => setViewMode('plain')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'plain'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Plain
          </button>
        </div>
        
        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      
      {/* Plain Text View */}
      {viewMode === 'plain' && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-mono">
            {cleanContent}
          </pre>
        </div>
      )}
      
      {/* Blocks View */}
      {viewMode === 'blocks' && (
        <>
          {/* Strategy/Approach Note */}
          {parsedEmail.approach && (
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 bg-violet-100 dark:bg-violet-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-0.5">
                    Strategy
                  </div>
                  <p className="text-sm text-violet-900 dark:text-violet-100 leading-relaxed">
                    {parsedEmail.approach}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Subject Line & Preview Text */}
          {(parsedEmail.subjectLine || parsedEmail.previewText) && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 pt-3 pb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Email Header
                  </span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700"></div>
                </div>
              </div>
              <div className="px-4 pb-4 space-y-2">
                {parsedEmail.subjectLine && (
                  <div>
                    <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Subject</div>
                    <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {parsedEmail.subjectLine}
                    </div>
                  </div>
                )}
                {parsedEmail.previewText && (
                  <div>
                    <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Preview</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 italic">
                      {parsedEmail.previewText}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Email Sections */}
          {parsedEmail.sections.length > 0 && (
            <div className="space-y-2">
              {parsedEmail.sections.map((section, index) => (
                <EmailSectionCard key={index} section={section} index={index} />
              ))}
            </div>
          )}
          
          {/* Design Notes */}
          {parsedEmail.designNotes && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">
                    Design Notes
                  </div>
                  <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                    {parsedEmail.designNotes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Individual section card component
 */
function EmailSectionCard({ section, index }: { section: EmailSection; index: number }) {
  // Get label - use formatted original type for generic/unknown sections
  const label = section.type === 'generic' && section.originalType 
    ? formatSectionLabel(section.originalType)
    : getSectionConfig(section.type).label;
  
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Section Header - Subtle inline label */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {label}
          </span>
          <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700"></div>
        </div>
      </div>
      
      {/* Section Content - No field labels, use visual hierarchy instead */}
      <div className="px-4 pb-4 space-y-2">
        {/* Headline - Large and bold */}
        {section.headline && (
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug">
            {section.headline}
          </div>
        )}
        
        {/* Subhead - Slightly smaller, medium weight */}
        {section.subhead && (
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {section.subhead}
          </div>
        )}
        
        {/* Body - Regular text */}
        {section.body && (
          <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            {section.body}
          </div>
        )}
        
        {/* Bullets - Clean list */}
        {section.bullets && section.bullets.length > 0 && (
          <ul className="space-y-1 mt-1">
            {section.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-gray-400 dark:bg-gray-500 rounded-full"></span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
        
        {/* Extra Fields - Catch-all for any other Label: Value pairs */}
        {section.extraFields && section.extraFields.length > 0 && (
          <div className="space-y-1.5">
            {section.extraFields.map((field, i) => (
              <div key={i} className="text-sm">
                <span className="text-gray-500 dark:text-gray-400">{field.label}:</span>{' '}
                <span className="text-gray-900 dark:text-gray-100">{field.value}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Products - No label, products are self-explanatory */}
        {section.products && section.products.length > 0 && (
          <div className="grid gap-2 mt-1">
            {section.products.map((product, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {product.name}
                  </div>
                  {product.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {product.description}
                    </div>
                  )}
                </div>
                {product.price && (
                  <div className="flex-shrink-0 ml-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {product.price}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* CTA - Styled as a button */}
        {section.cta && (
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md text-sm font-medium">
              {section.cta}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get visual configuration for each section type
 * Uses subtle, muted colors for section labels
 */
function getSectionConfig(type: EmailSection['type']) {
  switch (type) {
    case 'hero':
      return {
        label: 'Hero',
        labelColor: 'text-gray-400 dark:text-gray-500',
      };
    case 'text':
      return {
        label: 'Text',
        labelColor: 'text-gray-400 dark:text-gray-500',
      };
    case 'bullets':
      return {
        label: 'Features',
        labelColor: 'text-gray-400 dark:text-gray-500',
      };
    case 'product_grid':
      return {
        label: 'Products',
        labelColor: 'text-gray-400 dark:text-gray-500',
      };
    case 'cta_block':
      return {
        label: 'CTA',
        labelColor: 'text-gray-400 dark:text-gray-500',
      };
    case 'social_proof':
      return {
        label: 'Social Proof',
        labelColor: 'text-gray-400 dark:text-gray-500',
      };
    case 'testimonial':
      return {
        label: 'Testimonial',
        labelColor: 'text-gray-400 dark:text-gray-500',
      };
    default:
      return {
        label: 'Content',
        labelColor: 'text-gray-400 dark:text-gray-500',
      };
  }
}

export { isStructuredEmailCopy };

