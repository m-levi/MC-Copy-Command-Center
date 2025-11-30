'use client';

import { useMemo, useState } from 'react';
import { 
  parseEmailCopy, 
  EmailSection, 
  EmailField,
  isStructuredEmailCopy, 
  formatSectionName,
  isHeadlineField,
  isSubheadField,
  isBodyField,
  isCtaField,
  isAccentField,
} from '@/lib/email-copy-parser';

interface StructuredEmailRendererProps {
  content: string;
  onCopy?: () => void;
}

/**
 * FULLY DYNAMIC Email Copy Renderer
 * Displays ALL content from the AI without assumptions about field names
 */
export default function StructuredEmailRenderer({ content, onCopy }: StructuredEmailRendererProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'blocks' | 'plain'>('plain');
  
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
          {/* Preamble (Approach/Strategy notes) */}
          {parsedEmail.preamble && (
            <PreambleCard content={parsedEmail.preamble} />
          )}
          
          {/* All Sections */}
          {parsedEmail.sections.map((section, index) => (
            <SectionCard key={index} section={section} />
          ))}
          
          {/* Postamble (Design notes) */}
          {parsedEmail.postamble && (
            <PostambleCard content={parsedEmail.postamble} />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Preamble card for approach/strategy notes
 */
function PreambleCard({ content }: { content: string }) {
  // Check if it starts with "Approach:" and extract it
  const approachMatch = content.match(/^(?:\*\*)?Approach:?\*?\*?\s*(.+)/i);
  const displayContent = approachMatch ? approachMatch[1].trim() : content;
  
  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-3">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 w-6 h-6 bg-violet-100 dark:bg-violet-900/50 rounded flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <p className="text-sm text-violet-900 dark:text-violet-100 leading-relaxed">
          {displayContent}
        </p>
      </div>
    </div>
  );
}

/**
 * Postamble card for design notes
 */
function PostambleCard({ content }: { content: string }) {
  // Check if it starts with "Design notes:" and extract it
  const notesMatch = content.match(/^(?:\*\*)?Design notes?:?\*?\*?\s*(.+)/i);
  const displayContent = notesMatch ? notesMatch[1].trim() : content;
  
  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 w-6 h-6 bg-amber-100 dark:bg-amber-900/50 rounded flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
          {displayContent}
        </p>
      </div>
    </div>
  );
}

/**
 * Section card - FULLY DYNAMIC
 * Renders ALL fields from the section with appropriate styling
 */
function SectionCard({ section }: { section: EmailSection }) {
  const sectionLabel = formatSectionName(section.name);
  
  // Separate fields by type for rendering order
  const accentFields = section.fields.filter(f => isAccentField(f.label));
  const headlineFields = section.fields.filter(f => isHeadlineField(f.label));
  const subheadFields = section.fields.filter(f => isSubheadField(f.label));
  const bodyFields = section.fields.filter(f => isBodyField(f.label));
  const ctaFields = section.fields.filter(f => isCtaField(f.label));
  
  // All other fields (not matching known patterns)
  const otherFields = section.fields.filter(f => 
    !isAccentField(f.label) &&
    !isHeadlineField(f.label) &&
    !isSubheadField(f.label) &&
    !isBodyField(f.label) &&
    !isCtaField(f.label)
  );
  
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Section Label */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {sectionLabel}
          </span>
          <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700"></div>
        </div>
      </div>
      
      {/* Section Content */}
      <div className="px-4 pb-4 space-y-2">
        {/* Accent fields - small caps above headline */}
        {accentFields.map((field, i) => (
          <div key={`accent-${i}`} className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {field.value}
          </div>
        ))}
        
        {/* Headline fields - large and bold */}
        {headlineFields.map((field, i) => (
          <div key={`headline-${i}`} className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug">
            {field.value}
          </div>
        ))}
        
        {/* Subhead fields - medium emphasis */}
        {subheadFields.map((field, i) => (
          <div key={`subhead-${i}`} className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {field.value}
          </div>
        ))}
        
        {/* Body fields - regular text */}
        {bodyFields.map((field, i) => (
          <div key={`body-${i}`} className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            {field.value}
          </div>
        ))}
        
        {/* Other fields - show with label */}
        {otherFields.map((field, i) => (
          <div key={`other-${i}`} className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">{field.label}:</span>{' '}
            <span className="text-gray-900 dark:text-gray-100">{field.value}</span>
          </div>
        ))}
        
        {/* Bullets */}
        {section.bullets.length > 0 && (
          <ul className="space-y-1 mt-1">
            {section.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-gray-400 dark:bg-gray-500 rounded-full"></span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
        
        {/* CTA fields - styled as buttons */}
        {ctaFields.map((field, i) => (
          <div key={`cta-${i}`} className="pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md text-sm font-medium">
              {field.value}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </div>
        ))}
        
        {/* Unlabeled content - lines that didn't match Label: Value format */}
        {/* This ensures we NEVER drop any content from the AI */}
        {section.unlabeledContent && section.unlabeledContent.length > 0 && (
          <div className="space-y-1">
            {section.unlabeledContent.map((line, i) => (
              <div key={`unlabeled-${i}`} className="text-sm text-gray-700 dark:text-gray-200">
                {line}
              </div>
            ))}
          </div>
        )}
        
        {/* Fallback: If nothing was parsed, show raw content */}
        {section.fields.length === 0 && 
         section.bullets.length === 0 && 
         (!section.unlabeledContent || section.unlabeledContent.length === 0) && 
         section.rawContent && (
          <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
            {section.rawContent}
          </div>
        )}
      </div>
    </div>
  );
}

export { isStructuredEmailCopy };
