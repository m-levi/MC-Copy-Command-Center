'use client';

import { 
  useRef, 
  useCallback, 
  useEffect, 
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

export interface RichTextInputHandle {
  focus: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
  insertText: (text: string) => void;
}

export interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
  autoFocus?: boolean;
}

/**
 * Rich text input that renders markdown inline as you type
 * - Lists: `-` or `1.` at line start
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Code: `code`
 * - Headings: # ## ###
 * - Blockquote: >
 */
export const RichTextInput = forwardRef<RichTextInputHandle, RichTextInputProps>(
  function RichTextInput({
    value,
    onChange,
    onKeyDown,
    placeholder = 'Type your message...',
    disabled = false,
    className,
    minHeight = '24px',
    maxHeight = '200px',
    autoFocus = false,
  }, ref) {
    const editorRef = useRef<HTMLDivElement>(null);
    const isComposingRef = useRef(false);
    const lastValueRef = useRef(value);
    const [isFocused, setIsFocused] = useState(false);
    
    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      getValue: () => value,
      setValue: (newValue: string) => {
        if (editorRef.current) {
          editorRef.current.innerHTML = markdownToHtml(newValue);
          onChange(newValue);
        }
      },
      insertText: (text: string) => {
        document.execCommand('insertText', false, text);
      },
    }), [value, onChange]);
    
    // Auto-focus
    useEffect(() => {
      if (autoFocus && editorRef.current) {
        editorRef.current.focus();
      }
    }, [autoFocus]);
    
    // Sync external value changes
    useEffect(() => {
      if (editorRef.current && value !== lastValueRef.current) {
        const currentHtml = editorRef.current.innerHTML;
        const expectedHtml = markdownToHtml(value);
        
        // Only update DOM if the markdown actually changed
        // (not just from our own input)
        if (htmlToMarkdown(currentHtml) !== value) {
          // Save cursor position (only if there's an active selection)
          const selection = window.getSelection();
          const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
          
          editorRef.current.innerHTML = expectedHtml;
          
          // Restore cursor at end if we had focus
          if (document.activeElement === editorRef.current) {
            const newRange = document.createRange();
            const lastChild = editorRef.current.lastChild || editorRef.current;
            newRange.selectNodeContents(lastChild);
            newRange.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(newRange);
          }
        }
        lastValueRef.current = value;
      }
    }, [value]);
    
    // Handle input
    const handleInput = useCallback(() => {
      if (isComposingRef.current || !editorRef.current) return;
      
      const html = editorRef.current.innerHTML;
      const markdown = htmlToMarkdown(html);
      
      // Re-render with proper styling
      const cursorPos = saveCursorPosition(editorRef.current);
      const newHtml = markdownToHtml(markdown);
      
      if (html !== newHtml) {
        editorRef.current.innerHTML = newHtml;
        restoreCursorPosition(editorRef.current, cursorPos);
      }
      
      lastValueRef.current = markdown;
      onChange(markdown);
    }, [onChange]);
    
    // Handle paste - convert to plain text
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    }, []);
    
    // Handle key events
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      // Handle Enter for list continuation
      if (e.key === 'Enter' && !e.shiftKey) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.startContainer;
          const textContent = container.textContent || '';
          
          // Check if we're in a list item
          const listMatch = textContent.match(/^(\s*)([-*]|\d+\.)\s/);
          if (listMatch) {
            e.preventDefault();
            const [, indent, bullet] = listMatch;
            const isNumbered = /^\d+\./.test(bullet);
            const nextBullet = isNumbered 
              ? `${parseInt(bullet) + 1}.` 
              : bullet;
            document.execCommand('insertText', false, `\n${indent}${nextBullet} `);
            return;
          }
        }
      }
      
      // Pass through to parent handler
      onKeyDown?.(e);
    }, [onKeyDown]);
    
    const isEmpty = !value || value.trim() === '';
    
    return (
      <div className={cn("relative", className)}>
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { 
            isComposingRef.current = false; 
            handleInput();
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          suppressContentEditableWarning
          data-placeholder={placeholder}
          className={cn(
            "w-full text-[15px] leading-relaxed bg-transparent",
            "text-gray-900 dark:text-gray-100",
            "focus:outline-none resize-none overflow-y-auto",
            "rich-text-editor",
            disabled && "opacity-50 cursor-not-allowed",
            isEmpty && "is-empty"
          )}
          style={{
            minHeight,
            maxHeight,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        />
        
        {/* Placeholder */}
        <style jsx>{`
          .rich-text-editor.is-empty:before {
            content: attr(data-placeholder);
            color: rgb(156 163 175);
            pointer-events: none;
            position: absolute;
            top: 0;
            left: 0;
          }
          :global(.dark) .rich-text-editor.is-empty:before {
            color: rgb(107 114 128);
          }
          
          /* Markdown styling */
          .rich-text-editor :global(strong),
          .rich-text-editor :global(b) {
            font-weight: 600;
            color: inherit;
          }
          .rich-text-editor :global(em),
          .rich-text-editor :global(i) {
            font-style: italic;
          }
          .rich-text-editor :global(code) {
            background: rgb(243 244 246);
            padding: 0.125rem 0.375rem;
            border-radius: 0.25rem;
            font-family: ui-monospace, monospace;
            font-size: 0.875em;
          }
          :global(.dark) .rich-text-editor :global(code) {
            background: rgb(31 41 55);
          }
          .rich-text-editor :global(.heading-1) {
            font-size: 1.25rem;
            font-weight: 700;
            line-height: 1.4;
          }
          .rich-text-editor :global(.heading-2) {
            font-size: 1.125rem;
            font-weight: 600;
            line-height: 1.4;
          }
          .rich-text-editor :global(.heading-3) {
            font-size: 1rem;
            font-weight: 600;
            line-height: 1.4;
          }
          .rich-text-editor :global(.list-item) {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
          }
          .rich-text-editor :global(.list-bullet) {
            color: rgb(156 163 175);
            user-select: none;
            flex-shrink: 0;
            width: 1rem;
          }
          .rich-text-editor :global(.blockquote) {
            border-left: 3px solid rgb(209 213 219);
            padding-left: 0.75rem;
            color: rgb(107 114 128);
            font-style: italic;
          }
          :global(.dark) .rich-text-editor :global(.blockquote) {
            border-left-color: rgb(75 85 99);
            color: rgb(156 163 175);
          }
        `}</style>
      </div>
    );
  }
);

/**
 * Convert markdown text to styled HTML
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  const lines = markdown.split('\n');
  const htmlLines = lines.map(line => {
    // Headings
    if (line.startsWith('### ')) {
      return `<div class="heading-3">${formatInline(line.slice(4))}</div>`;
    }
    if (line.startsWith('## ')) {
      return `<div class="heading-2">${formatInline(line.slice(3))}</div>`;
    }
    if (line.startsWith('# ')) {
      return `<div class="heading-1">${formatInline(line.slice(2))}</div>`;
    }
    
    // Blockquote
    if (line.startsWith('> ')) {
      return `<div class="blockquote">${formatInline(line.slice(2))}</div>`;
    }
    
    // Bullet list
    if (line.match(/^(\s*)([-*])\s(.*)$/)) {
      const match = line.match(/^(\s*)([-*])\s(.*)$/);
      if (match) {
        const [, indent, , content] = match;
        return `<div class="list-item"><span class="list-bullet">•</span><span>${formatInline(content)}</span></div>`;
      }
    }
    
    // Numbered list
    if (line.match(/^(\s*)(\d+)\.\s(.*)$/)) {
      const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);
      if (match) {
        const [, indent, num, content] = match;
        return `<div class="list-item"><span class="list-bullet">${num}.</span><span>${formatInline(content)}</span></div>`;
      }
    }
    
    // Regular line
    return `<div>${formatInline(line) || '<br>'}</div>`;
  });
  
  return htmlLines.join('');
}

/**
 * Format inline markdown (bold, italic, code)
 */
function formatInline(text: string): string {
  if (!text) return text;
  
  let result = escapeHtml(text);
  
  // Code (must be before bold/italic to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold: **text** or __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_ (but not inside words)
  result = result.replace(/(?<![a-zA-Z])\*([^*]+)\*(?![a-zA-Z])/g, '<em>$1</em>');
  result = result.replace(/(?<![a-zA-Z])_([^_]+)_(?![a-zA-Z])/g, '<em>$1</em>');
  
  return result;
}

/**
 * Convert HTML back to markdown
 */
function htmlToMarkdown(html: string): string {
  if (!html) return '';
  
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  const lines: string[] = [];
  
  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const className = el.className;
      
      // Get inner content
      let content = '';
      el.childNodes.forEach(child => {
        content += processNode(child);
      });
      
      // Handle different elements
      switch (tag) {
        case 'strong':
        case 'b':
          return `**${content}**`;
        case 'em':
        case 'i':
          return `*${content}*`;
        case 'code':
          return `\`${content}\``;
        case 'br':
          return '\n';
        case 'div':
          // Check for special classes
          if (className.includes('heading-1')) {
            return `# ${content}`;
          }
          if (className.includes('heading-2')) {
            return `## ${content}`;
          }
          if (className.includes('heading-3')) {
            return `### ${content}`;
          }
          if (className.includes('blockquote')) {
            return `> ${content}`;
          }
          if (className.includes('list-item')) {
            // Extract bullet and content
            const bullet = el.querySelector('.list-bullet');
            const bulletText = bullet?.textContent || '•';
            const contentEl = el.querySelector('span:last-child');
            const itemContent = contentEl ? processNode(contentEl) : content;
            
            if (bulletText === '•') {
              return `- ${itemContent}`;
            }
            return `${bulletText} ${itemContent}`;
          }
          return content;
        case 'span':
          if (className.includes('list-bullet')) {
            return ''; // Skip bullets, handled by parent
          }
          return content;
        default:
          return content;
      }
    }
    
    return '';
  };
  
  // Process each top-level element
  temp.childNodes.forEach(node => {
    const line = processNode(node);
    if (line !== undefined) {
      lines.push(line);
    }
  });
  
  return lines.join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Save cursor position
 */
function saveCursorPosition(element: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  
  const range = selection.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  
  return preRange.toString().length;
}

/**
 * Restore cursor position
 */
function restoreCursorPosition(element: HTMLElement, position: number): void {
  const selection = window.getSelection();
  if (!selection) return;
  
  const range = document.createRange();
  let charCount = 0;
  let found = false;
  
  const traverse = (node: Node): boolean => {
    if (found) return true;
    
    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = node.textContent?.length || 0;
      if (charCount + textLength >= position) {
        range.setStart(node, position - charCount);
        range.collapse(true);
        found = true;
        return true;
      }
      charCount += textLength;
    } else {
      for (const child of Array.from(node.childNodes)) {
        if (traverse(child)) return true;
      }
    }
    return false;
  };
  
  traverse(element);
  
  if (!found) {
    // Put cursor at end
    range.selectNodeContents(element);
    range.collapse(false);
  }
  
  selection.removeAllRanges();
  selection.addRange(range);
}

