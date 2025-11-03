'use client';

import { EmailSection } from '@/types';
import { useState, memo } from 'react';

interface EmailSectionCardProps {
  section: EmailSection;
  onRegenerateSection: (sectionType: string, sectionTitle: string) => void;
  isRegenerating?: boolean;
}

// Memoized to prevent re-renders when parent updates
const EmailSectionCard = memo(function EmailSectionCard({
  section,
  onRegenerateSection,
  isRegenerating = false,
}: EmailSectionCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(section.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    onRegenerateSection(section.type, section.title);
  };

  return (
    <div 
      className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden mb-2 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md"
      style={{
        // Optimize rendering performance
        contain: 'layout style paint',
        contentVisibility: 'auto',
      }}
    >
      {/* Section Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 transition-all"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <svg
            className={`w-4 h-4 text-blue-600 dark:text-blue-400 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-wide">
              {section.title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-all hover:scale-105 cursor-pointer"
            title="Copy section"
          >
            {copied ? (
              <svg
                className="w-3.5 h-3.5 text-green-600 dark:text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRegenerate();
            }}
            disabled={isRegenerating}
            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
            title="Regenerate section"
          >
            <svg
              className={`w-3.5 h-3.5 text-gray-600 dark:text-gray-400 ${
                isRegenerating ? 'animate-spin' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Section Content - Clean Code Block */}
      {isExpanded && (
        <div className="px-4 py-3 bg-white dark:bg-gray-900">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700 p-3 font-mono text-xs overflow-hidden">
            <pre className="whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 leading-relaxed">
              {section.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if section content or regeneration state changes
  return (
    prevProps.section.content === nextProps.section.content &&
    prevProps.section.title === nextProps.section.title &&
    prevProps.isRegenerating === nextProps.isRegenerating
  );
});

export default EmailSectionCard;

// Helper function to parse email sections from markdown
export function parseEmailSections(content: string): EmailSection[] | null {
  // Check if content looks like structured email copy
  if (!content.includes('EMAIL SUBJECT LINE:') && !content.includes('HERO SECTION:')) {
    return null;
  }

  const sections: EmailSection[] = [];
  const lines = content.split('\n');
  let currentSection: Partial<EmailSection> | null = null;
  let currentContent: string[] = [];
  let order = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect section headers
    if (line.startsWith('EMAIL SUBJECT LINE:') || line.startsWith('PREVIEW TEXT:')) {
      if (currentSection && currentContent.length > 0) {
        sections.push({
          ...currentSection,
          content: currentContent.join('\n').trim(),
        } as EmailSection);
      }
      currentSection = {
        type: 'subject',
        title: line.includes('SUBJECT') ? 'Subject Line' : 'Preview Text',
        order: order++,
      };
      currentContent = [];
    } else if (line.startsWith('HERO SECTION:')) {
      if (currentSection && currentContent.length > 0) {
        sections.push({
          ...currentSection,
          content: currentContent.join('\n').trim(),
        } as EmailSection);
      }
      currentSection = {
        type: 'hero',
        title: 'Hero Section',
        order: order++,
      };
      currentContent = [];
    } else if (line.match(/^SECTION \d+:/)) {
      if (currentSection && currentContent.length > 0) {
        sections.push({
          ...currentSection,
          content: currentContent.join('\n').trim(),
        } as EmailSection);
      }
      currentSection = {
        type: 'body',
        title: line.replace(':', ''),
        order: order++,
      };
      currentContent = [];
    } else if (line.startsWith('CALL-TO-ACTION SECTION:')) {
      if (currentSection && currentContent.length > 0) {
        sections.push({
          ...currentSection,
          content: currentContent.join('\n').trim(),
        } as EmailSection);
      }
      currentSection = {
        type: 'cta',
        title: 'Call-to-Action Section',
        order: order++,
      };
      currentContent = [];
    } else if (line.startsWith('DESIGN NOTES:')) {
      if (currentSection && currentContent.length > 0) {
        sections.push({
          ...currentSection,
          content: currentContent.join('\n').trim(),
        } as EmailSection);
      }
      currentSection = {
        type: 'body',
        title: 'Design Notes',
        order: order++,
      };
      currentContent = [];
    } else if (line !== '---' && line !== '') {
      currentContent.push(lines[i]);
    }
  }

  // Add last section
  if (currentSection && currentContent.length > 0) {
    sections.push({
      ...currentSection,
      content: currentContent.join('\n').trim(),
    } as EmailSection);
  }

  return sections.length > 0 ? sections : null;
}

