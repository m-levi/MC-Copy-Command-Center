'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  /** Show preview inline below text, or as floating panel */
  variant?: 'inline' | 'floating';
}

/**
 * Lightweight markdown preview that renders while typing
 * Supports: headings, lists, bold, italic, code, links, blockquotes
 */
export function MarkdownPreview({ 
  content, 
  className,
  variant = 'inline'
}: MarkdownPreviewProps) {
  const renderedContent = useMemo(() => {
    if (!content.trim()) return null;
    
    return parseMarkdown(content);
  }, [content]);
  
  if (!renderedContent) return null;
  
  if (variant === 'floating') {
    return (
      <div className={cn(
        "absolute top-full left-0 right-0 mt-2 z-40",
        "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800",
        "rounded-xl shadow-lg p-4 max-h-64 overflow-y-auto",
        "animate-in fade-in slide-in-from-top-2 duration-200",
        className
      )}>
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Preview
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {renderedContent}
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "border-t border-gray-100 dark:border-gray-800 px-4 py-3",
      "bg-gray-50/50 dark:bg-gray-800/30",
      className
    )}>
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Preview
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none markdown-preview">
        {renderedContent}
      </div>
    </div>
  );
}

/**
 * Parse markdown to React elements
 * This is a lightweight parser for live preview - not meant to replace react-markdown
 */
function parseMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let blockquoteLines: string[] = [];
  
  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ul') {
        elements.push(<ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">{listItems}</ul>);
      } else {
        elements.push(<ol key={`list-${elements.length}`} className="list-decimal list-inside space-y-1 my-2">{listItems}</ol>);
      }
      listItems = [];
      listType = null;
    }
  };
  
  const flushBlockquote = () => {
    if (blockquoteLines.length > 0) {
      elements.push(
        <blockquote 
          key={`quote-${elements.length}`} 
          className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-1 my-2 text-gray-600 dark:text-gray-400 italic"
        >
          {blockquoteLines.map((line, i) => (
            <span key={i}>
              {parseInline(line)}
              {i < blockquoteLines.length - 1 && <br />}
            </span>
          ))}
        </blockquote>
      );
      blockquoteLines = [];
    }
  };
  
  lines.forEach((line, index) => {
    // Headings
    if (line.startsWith('### ')) {
      flushList();
      flushBlockquote();
      elements.push(
        <h3 key={index} className="text-base font-semibold text-gray-900 dark:text-white mt-3 mb-1">
          {parseInline(line.slice(4))}
        </h3>
      );
      return;
    }
    if (line.startsWith('## ')) {
      flushList();
      flushBlockquote();
      elements.push(
        <h2 key={index} className="text-lg font-semibold text-gray-900 dark:text-white mt-3 mb-1">
          {parseInline(line.slice(3))}
        </h2>
      );
      return;
    }
    if (line.startsWith('# ')) {
      flushList();
      flushBlockquote();
      elements.push(
        <h1 key={index} className="text-xl font-bold text-gray-900 dark:text-white mt-3 mb-1">
          {parseInline(line.slice(2))}
        </h1>
      );
      return;
    }
    
    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      blockquoteLines.push(line.slice(2));
      return;
    } else if (blockquoteLines.length > 0) {
      flushBlockquote();
    }
    
    // Bullet list
    if (line.match(/^[\-\*] /)) {
      flushBlockquote();
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(
        <li key={`item-${index}`} className="text-gray-700 dark:text-gray-300">
          {parseInline(line.slice(2))}
        </li>
      );
      return;
    }
    
    // Numbered list
    if (line.match(/^\d+\. /)) {
      flushBlockquote();
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      const content = line.replace(/^\d+\. /, '');
      listItems.push(
        <li key={`item-${index}`} className="text-gray-700 dark:text-gray-300">
          {parseInline(content)}
        </li>
      );
      return;
    }
    
    // Regular paragraph or empty line
    flushList();
    flushBlockquote();
    
    if (line.trim()) {
      elements.push(
        <p key={index} className="text-gray-700 dark:text-gray-300 my-1">
          {parseInline(line)}
        </p>
      );
    } else if (elements.length > 0) {
      // Add spacing for empty lines
      elements.push(<div key={index} className="h-2" />);
    }
  });
  
  // Flush any remaining list/blockquote
  flushList();
  flushBlockquote();
  
  return <>{elements}</>;
}

/**
 * Parse inline markdown (bold, italic, code, links)
 */
function parseInline(text: string): React.ReactNode {
  if (!text) return text;
  
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  
  while (remaining) {
    // Bold: **text** or __text__
    let match = remaining.match(/^(.*?)(\*\*|__)(.+?)\2(.*)$/s);
    if (match) {
      if (match[1]) parts.push(parseInlineSimple(match[1], key++));
      parts.push(<strong key={key++} className="font-semibold text-gray-900 dark:text-white">{match[3]}</strong>);
      remaining = match[4];
      continue;
    }
    
    // Italic: *text* or _text_
    match = remaining.match(/^(.*?)(\*|_)(.+?)\2(.*)$/s);
    if (match) {
      if (match[1]) parts.push(parseInlineSimple(match[1], key++));
      parts.push(<em key={key++} className="italic">{match[3]}</em>);
      remaining = match[4];
      continue;
    }
    
    // Inline code: `code`
    match = remaining.match(/^(.*?)`([^`]+)`(.*)$/s);
    if (match) {
      if (match[1]) parts.push(parseInlineSimple(match[1], key++));
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
          {match[2]}
        </code>
      );
      remaining = match[3];
      continue;
    }
    
    // Link: [text](url)
    match = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)$/s);
    if (match) {
      if (match[1]) parts.push(parseInlineSimple(match[1], key++));
      parts.push(
        <a 
          key={key++} 
          href={match[3]} 
          className="text-blue-600 dark:text-blue-400 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[2]}
        </a>
      );
      remaining = match[4];
      continue;
    }
    
    // No more matches, add remaining text
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }
  
  return <>{parts}</>;
}

function parseInlineSimple(text: string, key: number): React.ReactNode {
  return <span key={key}>{text}</span>;
}

/**
 * Determines if content has markdown that would benefit from preview
 */
export function hasSignificantMarkdown(text: string): boolean {
  if (!text) return false;
  
  // Check for markdown patterns
  const patterns = [
    /^#+\s/m,           // Headings
    /^[\-\*]\s/m,       // Bullet lists
    /^\d+\.\s/m,        // Numbered lists
    /^>\s/m,            // Blockquotes
    /\*\*.+\*\*/,       // Bold
    /\*.+\*/,           // Italic
    /`.+`/,             // Inline code
    /\[.+\]\(.+\)/,     // Links
  ];
  
  return patterns.some(pattern => pattern.test(text));
}























