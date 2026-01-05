'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { 
  forwardRef, 
  useImperativeHandle, 
  useEffect,
  useCallback,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Undo,
  Redo,
  Minus,
  Pilcrow,
  X,
} from 'lucide-react';

export interface TipTapDocEditorHandle {
  focus: () => void;
  clear: () => void;
  getHTML: () => string;
  getMarkdown: () => string;
  setContent: (content: string) => void;
  getEditor: () => Editor | null;
}

export interface TipTapDocEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  editorClassName?: string;
  autoFocus?: boolean;
  showToolbar?: boolean;
}

// Toolbar button component
function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        isActive 
          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />;
}

export const TipTapDocEditor = forwardRef<TipTapDocEditorHandle, TipTapDocEditorProps>(
  function TipTapDocEditor({
    value = '',
    onChange,
    placeholder = 'Start writing...',
    disabled = false,
    className,
    editorClassName,
    autoFocus = false,
    showToolbar = true,
  }, ref) {
    const [linkUrl, setLinkUrl] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
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
              class: 'bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto',
            },
          },
          code: {
            HTMLAttributes: {
              class: 'bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono',
            },
          },
          blockquote: {
            HTMLAttributes: {
              class: 'border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4',
            },
          },
          horizontalRule: {
            HTMLAttributes: {
              class: 'border-gray-200 dark:border-gray-700 my-6',
            },
          },
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: 'is-editor-empty',
        }),
        Typography,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300',
          },
        }),
        Underline,
      ],
      content: value ? convertMarkdownToHTML(value) : '',
      editable: !disabled,
      autofocus: autoFocus ? 'end' : false,
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm dark:prose-invert max-w-none',
            'focus:outline-none',
            'min-h-[300px] px-4 py-3',
            editorClassName
          ),
        },
      },
      onUpdate: ({ editor }) => {
        const markdown = convertHTMLToMarkdown(editor.getHTML());
        onChange?.(markdown);
      },
    });

    // Link handling
    const addLink = useCallback(() => {
      if (!editor || !linkUrl) return;
      
      // Check if URL has protocol
      const url = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') 
        ? linkUrl 
        : `https://${linkUrl}`;
      
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }, [editor, linkUrl]);

    const removeLink = useCallback(() => {
      if (!editor) return;
      editor.chain().focus().unsetLink().run();
    }, [editor]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus('end'),
      clear: () => {
        editor?.commands.clearContent();
      },
      getHTML: () => editor?.getHTML() || '',
      getMarkdown: () => editor ? convertHTMLToMarkdown(editor.getHTML()) : '',
      setContent: (content: string) => {
        editor?.commands.setContent(convertMarkdownToHTML(content));
      },
      getEditor: () => editor,
    }), [editor]);

    // Sync external value changes
    useEffect(() => {
      if (editor && value !== undefined && !editor.isFocused) {
        const currentMarkdown = convertHTMLToMarkdown(editor.getHTML());
        if (currentMarkdown.trim() !== value.trim()) {
          editor.commands.setContent(convertMarkdownToHTML(value));
        }
      }
    }, [value, editor]);

    // Update editable state
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [disabled, editor]);

    if (!editor) {
      return (
        <div className={cn('rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900', className)}>
          <div className="h-[350px] flex items-center justify-center text-gray-400">
            Loading editor...
          </div>
        </div>
      );
    }

    return (
      <div className={cn('rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden', className)}>
        {/* Toolbar */}
        {showToolbar && (
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-wrap">
            {/* Text Formatting */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              disabled={disabled}
              title="Bold (⌘B)"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              disabled={disabled}
              title="Italic (⌘I)"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              disabled={disabled}
              title="Underline (⌘U)"
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              disabled={disabled}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              disabled={disabled}
              title="Code"
            >
              <Code className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Headings */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setParagraph().run()}
              isActive={editor.isActive('paragraph')}
              disabled={disabled}
              title="Paragraph"
            >
              <Pilcrow className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              disabled={disabled}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              disabled={disabled}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              disabled={disabled}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              disabled={disabled}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              disabled={disabled}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              disabled={disabled}
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              disabled={disabled}
              title="Horizontal Rule"
            >
              <Minus className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Link */}
            <div className="relative">
              <ToolbarButton
                onClick={() => {
                  if (editor.isActive('link')) {
                    removeLink();
                  } else {
                    setShowLinkInput(!showLinkInput);
                  }
                }}
                isActive={editor.isActive('link')}
                disabled={disabled}
                title={editor.isActive('link') ? 'Remove Link' : 'Add Link'}
              >
                <LinkIcon className="w-4 h-4" />
              </ToolbarButton>
              
              {showLinkInput && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 flex gap-2">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Enter URL..."
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addLink();
                      } else if (e.key === 'Escape') {
                        setShowLinkInput(false);
                        setLinkUrl('');
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={addLink}
                    className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowLinkInput(false);
                      setLinkUrl('');
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1" />

            {/* Undo/Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={disabled || !editor.can().undo()}
              title="Undo (⌘Z)"
            >
              <Undo className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={disabled || !editor.can().redo()}
              title="Redo (⌘⇧Z)"
            >
              <Redo className="w-4 h-4" />
            </ToolbarButton>
          </div>
        )}

        {/* Editor Content */}
        <EditorContent 
          editor={editor} 
          className={cn(
            'w-full text-gray-900 dark:text-gray-100 min-h-[300px] max-h-[500px] overflow-y-auto',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />

        <style jsx global>{`
          .ProseMirror {
            outline: none;
          }
          
          .ProseMirror p {
            margin: 0.5rem 0;
          }
          
          .ProseMirror p:first-child {
            margin-top: 0;
          }
          
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: rgb(156 163 175);
            pointer-events: none;
            height: 0;
          }
          
          .dark .ProseMirror p.is-editor-empty:first-child::before {
            color: rgb(107 114 128);
          }
          
          .ProseMirror ul,
          .ProseMirror ol {
            padding-left: 1.5rem;
            margin: 0.5rem 0;
          }
          
          .ProseMirror ul {
            list-style-type: disc;
          }
          
          .ProseMirror ol {
            list-style-type: decimal;
          }
          
          .ProseMirror li {
            margin: 0.25rem 0;
          }
          
          .ProseMirror li p {
            margin: 0;
          }
          
          .ProseMirror h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 1rem 0 0.5rem;
            line-height: 1.3;
          }
          
          .ProseMirror h2 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0.75rem 0 0.5rem;
            line-height: 1.3;
          }
          
          .ProseMirror h3 {
            font-size: 1.125rem;
            font-weight: 600;
            margin: 0.5rem 0 0.25rem;
            line-height: 1.4;
          }
          
          .ProseMirror strong {
            font-weight: 600;
          }
          
          .ProseMirror em {
            font-style: italic;
          }
          
          .ProseMirror u {
            text-decoration: underline;
          }
          
          .ProseMirror s {
            text-decoration: line-through;
          }
          
          .ProseMirror code {
            background: rgb(243 244 246);
            padding: 0.125rem 0.375rem;
            border-radius: 0.25rem;
            font-family: ui-monospace, monospace;
            font-size: 0.875em;
          }
          
          .dark .ProseMirror code {
            background: rgb(31 41 55);
          }
          
          .ProseMirror pre {
            background: rgb(243 244 246);
            padding: 1rem;
            border-radius: 0.5rem;
            font-family: ui-monospace, monospace;
            font-size: 0.875rem;
            margin: 0.5rem 0;
            overflow-x: auto;
          }
          
          .dark .ProseMirror pre {
            background: rgb(31 41 55);
          }
          
          .ProseMirror pre code {
            background: none;
            padding: 0;
          }
          
          .ProseMirror blockquote {
            border-left: 4px solid rgb(59 130 246);
            padding-left: 1rem;
            margin: 1rem 0;
            color: rgb(107 114 128);
            font-style: italic;
          }
          
          .dark .ProseMirror blockquote {
            color: rgb(156 163 175);
          }
          
          .ProseMirror hr {
            border: none;
            border-top: 1px solid rgb(229 231 235);
            margin: 1.5rem 0;
          }
          
          .dark .ProseMirror hr {
            border-top-color: rgb(55 65 81);
          }
          
          .ProseMirror a {
            color: rgb(37 99 235);
            text-decoration: underline;
          }
          
          .ProseMirror a:hover {
            color: rgb(29 78 216);
          }
          
          .dark .ProseMirror a {
            color: rgb(96 165 250);
          }
          
          .dark .ProseMirror a:hover {
            color: rgb(147 197 253);
          }
        `}</style>
      </div>
    );
  }
);

/**
 * Convert markdown to HTML for TipTap
 */
function convertMarkdownToHTML(markdown: string): string {
  if (!markdown) return '<p></p>';
  
  const lines = markdown.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let inCodeBlock = false;
  let codeContent = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Code block
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        result.push(`<pre><code>${escapeHTML(codeContent.trim())}</code></pre>`);
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }
    
    // Horizontal rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      if (inList) {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
        listType = null;
      }
      result.push('<hr>');
      continue;
    }
    
    // Headings
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      if (inList) {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
        listType = null;
      }
      const level = headingMatch[1].length;
      const content = processInline(headingMatch[2]);
      result.push(`<h${level}>${content}</h${level}>`);
      continue;
    }
    
    // Blockquote
    if (trimmed.startsWith('> ')) {
      if (inList) {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
        listType = null;
      }
      const content = processInline(trimmed.slice(2));
      result.push(`<blockquote><p>${content}</p></blockquote>`);
      continue;
    }
    
    // Bullet list
    if (trimmed.match(/^[-*]\s/)) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      const content = processInline(trimmed.slice(2));
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
      const content = processInline(trimmed.replace(/^\d+\.\s/, ''));
      result.push(`<li><p>${content}</p></li>`);
      continue;
    }
    
    // Close list if we're not in a list item anymore
    if (inList && trimmed) {
      result.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
      listType = null;
    }
    
    // Regular paragraph
    if (trimmed) {
      const content = processInline(trimmed);
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
 * Process inline markdown (bold, italic, code, links, etc.)
 */
function processInline(text: string): string {
  let result = escapeHTML(text);
  
  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Code (do first to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold + Italic (***text***)
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  
  // Bold (**text** or __text__)
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic (*text* or _text_)
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  result = result.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  
  // Strikethrough (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  
  return result;
}

function escapeHTML(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert HTML back to markdown
 */
function convertHTMLToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return '';
  
  if (typeof document === 'undefined') return html;
  
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  let markdown = '';
  
  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    
    // Get children content
    let content = '';
    el.childNodes.forEach(child => {
      content += processNode(child);
    });
    
    switch (tag) {
      case 'p':
        return content + '\n\n';
      case 'br':
        return '\n';
      case 'strong':
      case 'b':
        return `**${content}**`;
      case 'em':
      case 'i':
        return `*${content}*`;
      case 'u':
        return content; // No direct markdown for underline
      case 's':
      case 'strike':
        return `~~${content}~~`;
      case 'code':
        if (el.parentElement?.tagName.toLowerCase() === 'pre') {
          return content;
        }
        return `\`${content}\``;
      case 'pre':
        return '```\n' + content + '\n```\n\n';
      case 'h1':
        return `# ${content}\n\n`;
      case 'h2':
        return `## ${content}\n\n`;
      case 'h3':
        return `### ${content}\n\n`;
      case 'blockquote':
        return content.split('\n').filter(l => l.trim()).map(l => `> ${l.trim()}`).join('\n') + '\n\n';
      case 'ul':
        let ulContent = '';
        el.querySelectorAll(':scope > li').forEach(li => {
          ulContent += processNode(li);
        });
        return ulContent + '\n';
      case 'ol':
        let olContent = '';
        let num = 1;
        el.querySelectorAll(':scope > li').forEach(li => {
          const liText = processNode(li).replace(/^- /, `${num}. `);
          olContent += liText;
          num++;
        });
        return olContent + '\n';
      case 'li':
        return `- ${content.trim()}\n`;
      case 'hr':
        return '---\n\n';
      case 'a':
        const href = el.getAttribute('href');
        return href ? `[${content}](${href})` : content;
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

export default TipTapDocEditor;

