'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { 
  forwardRef, 
  useImperativeHandle, 
  useEffect,
  useCallback,
} from 'react';
import { cn } from '@/lib/utils';

export interface TipTapEditorHandle {
  focus: () => void;
  clear: () => void;
  getMarkdown: () => string;
  setContent: (content: string) => void;
  getEditor: () => Editor | null;
}

export interface TipTapEditorProps {
  value?: string;
  onChange?: (markdown: string) => void;
  onKeyDown?: (event: KeyboardEvent) => boolean | void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  editorClassName?: string;
  minHeight?: string;
  maxHeight?: string;
  autoFocus?: boolean;
}

/**
 * TipTap-based rich text editor with live markdown rendering
 * - Type `-` or `*` + space → bullet list
 * - Type `1.` + space → numbered list
 * - Type `**text**` → bold
 * - Type `*text*` → italic
 * - Type `# ` → heading
 * - Type `> ` → blockquote
 * - Type ``` → code block
 */
export const TipTapEditor = forwardRef<TipTapEditorHandle, TipTapEditorProps>(
  function TipTapEditor({
    value = '',
    onChange,
    onKeyDown,
    placeholder = 'Type your message...',
    disabled = false,
    className,
    editorClassName,
    minHeight = '24px',
    maxHeight = '200px',
    autoFocus = false,
  }, ref) {
    
    const editor = useEditor({
      immediatelyRender: false, // Required for SSR/Next.js
      extensions: [
        StarterKit.configure({
          // Enable markdown shortcuts
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: false,
          },
          heading: {
            levels: [1, 2, 3],
          },
          codeBlock: {
            HTMLAttributes: {
              class: 'bg-gray-100 dark:bg-gray-800 rounded-md p-3 font-mono text-sm',
            },
          },
          code: {
            HTMLAttributes: {
              class: 'bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono',
            },
          },
          blockquote: {
            HTMLAttributes: {
              class: 'border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400',
            },
          },
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: 'is-editor-empty',
        }),
        Typography,
      ],
      content: value ? convertMarkdownToTipTap(value) : '',
      editable: !disabled,
      autofocus: autoFocus ? 'end' : false,
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm dark:prose-invert max-w-none',
            'focus:outline-none',
            'min-h-[24px]',
            editorClassName
          ),
          style: `min-height: ${minHeight}; max-height: ${maxHeight}; overflow-y: auto;`,
        },
        handleKeyDown: (view, event) => {
          // Pass to custom handler first for slash commands
          if (onKeyDown && event.key !== 'Enter') {
            const result = onKeyDown(event);
            if (result === true) {
              return true;
            }
          }
          
          // Handle Enter keys
          if (event.key === 'Enter') {
            const { state } = view;
            const { $from } = state.selection;
            
            // Check if we're in a list item
            let inListItem = false;
            for (let d = $from.depth; d > 0; d--) {
              if ($from.node(d).type.name === 'listItem') {
                inListItem = true;
                break;
              }
            }
            
            if (event.shiftKey) {
              // Shift+Enter: Create new list item if in list
              if (inListItem) {
                event.preventDefault();
                // Manually create a new list item by splitting
                view.dispatch(view.state.tr.split(view.state.selection.$from.pos));
                return true;
              }
              // Not in list, insert hard break
              return false;
            } else {
              // Plain Enter: Submit (pass to custom handler)
              if (onKeyDown) {
                const result = onKeyDown(event);
                if (result === true) {
                  return true;
                }
              }
            }
          }
          
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        const markdown = convertTipTapToMarkdown(editor.getHTML());
        onChange?.(markdown);
      },
    });

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus('end'),
      clear: () => {
        editor?.commands.clearContent();
      },
      getMarkdown: () => editor ? convertTipTapToMarkdown(editor.getHTML()) : '',
      setContent: (content: string) => {
        editor?.commands.setContent(convertMarkdownToTipTap(content));
      },
      getEditor: () => editor,
    }), [editor]);

    // Sync external value changes (but avoid updating if user is actively typing)
    useEffect(() => {
      if (editor && value !== undefined && !editor.isFocused) {
        const currentMarkdown = convertTipTapToMarkdown(editor.getHTML());
        // Normalize whitespace for comparison to avoid unnecessary updates
        if (currentMarkdown.trim() !== value.trim()) {
          editor.commands.setContent(convertMarkdownToTipTap(value));
        }
      }
    }, [value, editor]);

    // Update editable state
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [disabled, editor]);

    return (
      <div className={cn('tiptap-editor-wrapper', className)}>
        <EditorContent 
          editor={editor} 
          className={cn(
            'w-full text-[15px] leading-relaxed',
            'text-gray-900 dark:text-gray-100',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        
        <style jsx global>{`
          .tiptap-editor-wrapper .ProseMirror {
            outline: none;
          }
          
          .tiptap-editor-wrapper .ProseMirror p {
            margin: 0;
          }
          
          .tiptap-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: rgb(156 163 175);
            pointer-events: none;
            height: 0;
          }
          
          .dark .tiptap-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
            color: rgb(107 114 128);
          }
          
          .tiptap-editor-wrapper .ProseMirror ul,
          .tiptap-editor-wrapper .ProseMirror ol {
            padding-left: 1.5rem;
            margin: 0.25rem 0;
          }
          
          .tiptap-editor-wrapper .ProseMirror ul {
            list-style-type: disc;
          }
          
          .tiptap-editor-wrapper .ProseMirror ol {
            list-style-type: decimal;
          }
          
          .tiptap-editor-wrapper .ProseMirror li {
            margin: 0.125rem 0;
          }
          
          .tiptap-editor-wrapper .ProseMirror li p {
            margin: 0;
          }
          
          .tiptap-editor-wrapper .ProseMirror h1 {
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0.5rem 0 0.25rem;
          }
          
          .tiptap-editor-wrapper .ProseMirror h2 {
            font-size: 1.125rem;
            font-weight: 600;
            margin: 0.5rem 0 0.25rem;
          }
          
          .tiptap-editor-wrapper .ProseMirror h3 {
            font-size: 1rem;
            font-weight: 600;
            margin: 0.5rem 0 0.25rem;
          }
          
          .tiptap-editor-wrapper .ProseMirror strong {
            font-weight: 600;
          }
          
          .tiptap-editor-wrapper .ProseMirror em {
            font-style: italic;
          }
          
          .tiptap-editor-wrapper .ProseMirror code {
            background: rgb(243 244 246);
            padding: 0.125rem 0.375rem;
            border-radius: 0.25rem;
            font-family: ui-monospace, monospace;
            font-size: 0.875em;
          }
          
          .dark .tiptap-editor-wrapper .ProseMirror code {
            background: rgb(31 41 55);
          }
          
          .tiptap-editor-wrapper .ProseMirror pre {
            background: rgb(243 244 246);
            padding: 0.75rem;
            border-radius: 0.5rem;
            font-family: ui-monospace, monospace;
            font-size: 0.875rem;
            margin: 0.5rem 0;
            overflow-x: auto;
          }
          
          .dark .tiptap-editor-wrapper .ProseMirror pre {
            background: rgb(31 41 55);
          }
          
          .tiptap-editor-wrapper .ProseMirror blockquote {
            border-left: 3px solid rgb(209 213 219);
            padding-left: 1rem;
            margin: 0.5rem 0;
            color: rgb(107 114 128);
            font-style: italic;
          }
          
          .dark .tiptap-editor-wrapper .ProseMirror blockquote {
            border-left-color: rgb(75 85 99);
            color: rgb(156 163 175);
          }
          
          .tiptap-editor-wrapper .ProseMirror hr {
            border: none;
            border-top: 1px solid rgb(229 231 235);
            margin: 1rem 0;
          }
          
          .dark .tiptap-editor-wrapper .ProseMirror hr {
            border-top-color: rgb(55 65 81);
          }
        `}</style>
      </div>
    );
  }
);

/**
 * Convert markdown to TipTap-compatible HTML
 */
function convertMarkdownToTipTap(markdown: string): string {
  if (!markdown) return '<p></p>';
  
  const lines = markdown.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Bullet list
    if (trimmed.match(/^[-*]\s/)) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      const content = processInlineMarkdown(trimmed.slice(2));
      result.push(`<li><p>${content}</p></li>`);
      continue;
    }
    
    // Numbered list
    if (trimmed.match(/^\d+\.\s/)) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      const content = processInlineMarkdown(trimmed.replace(/^\d+\.\s/, ''));
      result.push(`<li><p>${content}</p></li>`);
      continue;
    }
    
    // Close list if we're not in a list item anymore
    if (inList && trimmed) {
      result.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
      listType = null;
    }
    
    // Regular line
    if (trimmed) {
      const content = processInlineMarkdown(trimmed);
      result.push(`<p>${content}</p>`);
    } else if (!inList) {
      result.push('<p></p>');
    }
  }
  
  // Close any open list
  if (inList) {
    result.push(listType === 'ul' ? '</ul>' : '</ol>');
  }
  
  return result.join('') || '<p></p>';
}

/**
 * Process inline markdown (bold, italic, code)
 */
function processInlineMarkdown(text: string): string {
  let result = text;
  
  // Code (do first to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold (**text** or __text__)
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic (*text* or _text_) - but not ** or __
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  result = result.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  
  return result;
}

/**
 * Convert TipTap HTML back to markdown
 */
function convertTipTapToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return '';
  
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  let markdown = '';
  
  const processNode = (node: Node, listDepth = 0): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    
    // Get children content
    let content = '';
    el.childNodes.forEach(child => {
      content += processNode(child, listDepth);
    });
    
    switch (tag) {
      case 'p':
        return content + '\n';
      case 'br':
        return '\n';
      case 'strong':
      case 'b':
        return `**${content}**`;
      case 'em':
      case 'i':
        return `*${content}*`;
      case 'code':
        return `\`${content}\``;
      case 'pre':
        return '```\n' + content.replace(/<[^>]+>/g, '') + '\n```\n';
      case 'h1':
        return `# ${content}\n`;
      case 'h2':
        return `## ${content}\n`;
      case 'h3':
        return `### ${content}\n`;
      case 'blockquote':
        return content.split('\n').filter(l => l).map(l => `> ${l}`).join('\n') + '\n';
      case 'ul':
        let ulContent = '';
        el.querySelectorAll(':scope > li').forEach(li => {
          ulContent += processNode(li, listDepth);
        });
        return ulContent;
      case 'ol':
        let olContent = '';
        let num = 1;
        el.querySelectorAll(':scope > li').forEach(li => {
          const liText = processNode(li, listDepth).replace(/^- /, `${num}. `);
          olContent += liText;
          num++;
        });
        return olContent;
      case 'li':
        return `- ${content.trim()}\n`;
      case 'hr':
        return '---\n';
      default:
        return content;
    }
  };
  
  temp.childNodes.forEach(node => {
    markdown += processNode(node);
  });
  
  // Clean up extra newlines
  return markdown.replace(/\n{3,}/g, '\n\n').trim();
}

export default TipTapEditor;

