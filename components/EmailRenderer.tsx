'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  
  // If it doesn't look like an email, just render markdown normally
  if (!hasEmailStructure) {
    return (
      <div className="prose prose-sm max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-900 dark:prose-p:text-gray-100 prose-li:text-gray-900 dark:prose-li:text-gray-100 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-code:text-gray-900 dark:prose-code:text-gray-100 prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:font-mono prose-pre:text-xs prose-pre:text-gray-900 dark:prose-pre:text-gray-100 text-gray-900 dark:text-gray-100">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }
  
  // Show raw markdown if toggled
  if (showRawMarkdown) {
    return (
      <div>
        <button
          onClick={() => setShowRawMarkdown(false)}
          className="mb-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Show Email Preview
        </button>
        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-900 dark:prose-p:text-gray-100 prose-li:text-gray-900 dark:prose-li:text-gray-100 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-code:text-gray-900 dark:prose-code:text-gray-100 prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:font-mono prose-pre:text-xs prose-pre:text-gray-900 dark:prose-pre:text-gray-100 text-gray-900 dark:text-gray-100">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
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
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Show Raw Markdown
      </button>
      
      {/* Email Container - looks like an email client */}
      <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-sm">
        {/* Email Header - like inbox view */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b-2 border-gray-300 dark:border-gray-600 px-4 py-3">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            {/* Subject and Preview */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Subject Line
                </span>
                <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
              </div>
              {subjectSection ? (
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {subjectSection.content}
                </h3>
              ) : (
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Email Copy
                </h3>
              )}
              {previewSection && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  {previewSection.content}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Email Body - styled like an email */}
        <div className="bg-white dark:bg-gray-900 px-6 py-5">
          <div className="prose prose-sm max-w-none
            prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
            prose-h1:text-xl prose-h1:mb-3 prose-h1:border-b prose-h1:border-gray-200 dark:prose-h1:border-gray-700 prose-h1:pb-2
            prose-h2:text-lg prose-h2:mb-2 prose-h2:mt-4
            prose-h3:text-base prose-h3:mb-2 prose-h3:mt-3 prose-h3:text-blue-700 dark:prose-h3:text-blue-400
            prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-p:leading-relaxed prose-p:mb-3
            prose-li:text-gray-800 dark:prose-li:text-gray-200
            prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-bold
            prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
            prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
            prose-pre:bg-gray-50 dark:prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:text-gray-900 dark:prose-pre:text-gray-100
            prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-950/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:italic
            prose-ul:my-2 prose-ol:my-2
            text-gray-800 dark:text-gray-200
          ">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom rendering for better email-like appearance
                h1: ({ node, ...props }) => (
                  <h1 className="!text-gray-900 dark:!text-gray-100" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="!text-gray-900 dark:!text-gray-100" {...props} />
                ),
                h3: ({ node, ...props }) => {
                  const text = props.children?.toString() || '';
                  // Style section headers specially
                  if (text.includes('SECTION') || text.includes('HERO') || text.includes('CTA') || text.includes('CALL-TO-ACTION')) {
                    return (
                      <div className="flex items-center gap-2 my-4 pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <h3 className="!m-0 !text-blue-700 dark:!text-blue-400 !font-bold !text-sm uppercase tracking-wide" {...props} />
                      </div>
                    );
                  }
                  return <h3 {...props} />;
                },
                // Style CTAs as buttons
                strong: ({ node, ...props }) => {
                  const text = props.children?.toString() || '';
                  if (text.toLowerCase().includes('button:') || text.toLowerCase().includes('cta:')) {
                    return (
                      <div className="my-4 flex justify-center">
                        <div className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold px-8 py-3 rounded-lg shadow-lg">
                          {text.replace(/button:|cta:/gi, '').trim()}
                        </div>
                      </div>
                    );
                  }
                  return <strong {...props} />;
                },
                // Highlight design notes
                p: ({ node, ...props }) => {
                  const text = props.children?.toString() || '';
                  if (text.startsWith('[') && text.endsWith(']')) {
                    return (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 my-3">
                        <p className="text-xs text-yellow-800 dark:text-yellow-300 italic !mb-0" {...props} />
                      </div>
                    );
                  }
                  return <p {...props} />;
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
        
        {/* Email Footer - subtle separator */}
        <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            End of Email Preview
          </p>
        </div>
      </div>
    </div>
  );
}

