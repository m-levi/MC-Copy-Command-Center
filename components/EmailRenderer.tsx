'use client';

import { useState } from 'react';

interface EmailRendererProps {
  content: string;
}

// Parse email content to detect structure
function parseEmailContent(content: string) {
  const sections: Array<{ type: string; label: string; content: string }> = [];
  
  // Extract subject line
  const subjectMatch = content.match(/EMAIL SUBJECT LINE:\s*(.*?)(?=\n|$)/i);
  if (subjectMatch) {
    sections.push({ type: 'subject', label: 'Subject', content: subjectMatch[1].trim() });
  }
  
  // Extract preview text
  const previewMatch = content.match(/PREVIEW TEXT:\s*(.*?)(?=\n|$)/i);
  if (previewMatch) {
    sections.push({ type: 'preview', label: 'Preview Text', content: previewMatch[1].trim() });
  }
  
  // Check if content looks like an email
  const hasEmailStructure = content.includes('EMAIL SUBJECT LINE:') || 
                            content.includes('HERO SECTION:') || 
                            content.includes('CALL-TO-ACTION');
  
  return { sections, hasEmailStructure };
}

export default function EmailRenderer({ content }: EmailRendererProps) {
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);
  const { sections, hasEmailStructure } = parseEmailContent(content);
  
  // If it doesn't look like an email, just render as clean text in a code block
  if (!hasEmailStructure) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5 font-mono text-sm overflow-hidden">
        <pre className="whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 leading-relaxed">
          {content}
        </pre>
      </div>
    );
  }
  
  // Show raw text in code block if toggled
  if (showRawMarkdown) {
    return (
      <div>
        <button
          onClick={() => setShowRawMarkdown(false)}
          className="mb-3 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Show Email Preview
        </button>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5 font-mono text-sm overflow-hidden">
          <pre className="whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 leading-relaxed">
            {content}
          </pre>
        </div>
      </div>
    );
  }
  
  // Extract subject for the email header
  const subjectSection = sections.find(s => s.type === 'subject');
  const previewSection = sections.find(s => s.type === 'preview');
  
  return (
    <div className="space-y-3">
      {/* Toggle button */}
      <button
        onClick={() => setShowRawMarkdown(true)}
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Show Raw Copy
      </button>
      
      {/* Email Content - Clean Code Block */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-5 font-mono text-sm overflow-hidden">
        <pre className="whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  );
}

