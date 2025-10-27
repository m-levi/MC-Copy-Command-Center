'use client';

import { EmailSection } from '@/types';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EmailSectionCardProps {
  section: EmailSection;
  onRegenerateSection: (sectionType: string, sectionTitle: string) => void;
  isRegenerating?: boolean;
}

export default function EmailSectionCard({
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
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-2 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      {/* Section Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
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
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            {section.title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
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
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Section Content */}
      {isExpanded && (
        <div className="px-3 py-2">
          <div className="prose prose-sm max-w-none prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 text-gray-900 dark:text-gray-100">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {section.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

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

