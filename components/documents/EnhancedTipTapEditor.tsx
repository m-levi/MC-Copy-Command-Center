'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { 
  forwardRef, 
  useImperativeHandle, 
  useEffect,
  useCallback,
  useState,
  useRef,
} from 'react';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
  Table as TableIcon,
  Image as ImageIcon,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  CheckSquare,
  MoreHorizontal,
  Type,
  Palette,
} from 'lucide-react';

export interface EnhancedTipTapEditorHandle {
  focus: () => void;
  clear: () => void;
  getHTML: () => string;
  setContent: (content: string) => void;
  getEditor: () => Editor | null;
}

export interface EnhancedTipTapEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  showSavingIndicator?: boolean;
}

const COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#F97316', '#14B8A6',
];

const HIGHLIGHT_COLORS = [
  '#FEF3C7', '#FED7AA', '#FCA5A5', '#FBCFE8',
  '#DDD6FE', '#BAE6FD', '#A7F3D0', '#D1D5DB',
];

export const EnhancedTipTapEditor = forwardRef<EnhancedTipTapEditorHandle, EnhancedTipTapEditorProps>(
  function EnhancedTipTapEditor({
    value = '',
    onChange,
    onSave,
    placeholder = 'Start writing...',
    disabled = false,
    className,
    autoFocus = false,
    showSavingIndicator = false,
  }, ref) {
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const linkInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
      immediatelyRender: false, // Fix SSR hydration mismatch
      extensions: [
        StarterKit.configure({
          bulletList: { keepMarks: true, keepAttributes: false },
          orderedList: { keepMarks: true, keepAttributes: false },
          heading: { levels: [1, 2, 3] },
          codeBlock: false, // Using Code instead
        }),
        Placeholder.configure({ 
          placeholder,
          emptyEditorClass: 'is-editor-empty' 
        }),
        Typography,
        Link.configure({ 
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
        }),
        Underline,
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: 'border-collapse table-auto w-full',
          },
        }),
        TableRow,
        TableCell.configure({
          HTMLAttributes: {
            class: 'border border-gray-300 dark:border-gray-600 px-3 py-2 min-w-[100px]',
          },
        }),
        TableHeader.configure({
          HTMLAttributes: {
            class: 'border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-800 font-bold',
          },
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        TextStyle,
        Color,
        Highlight.configure({
          multicolor: true,
        }),
        Image.configure({
          inline: true,
          allowBase64: true,
          HTMLAttributes: {
            class: 'rounded-lg max-w-full h-auto',
          },
        }),
        TaskList.configure({
          HTMLAttributes: {
            class: 'not-prose',
          },
        }),
        TaskItem.configure({
          nested: true,
          HTMLAttributes: {
            class: 'flex items-start gap-2',
          },
        }),
      ],
      content: value,
      editable: !disabled,
      autofocus: autoFocus ? 'end' : false,
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm dark:prose-invert max-w-none',
            'focus:outline-none min-h-[500px] px-12 py-8',
            'prose-headings:font-bold prose-headings:tracking-tight',
            'prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl',
            'prose-p:leading-7 prose-p:text-gray-700 dark:prose-p:text-gray-300',
            'prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline',
            'prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono',
            'prose-pre:bg-gray-900 prose-pre:text-gray-100',
            'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-4 prose-blockquote:italic',
            'prose-ul:list-disc prose-ol:list-decimal',
            'prose-li:my-1',
            'prose-img:rounded-lg prose-img:shadow-md',
          ),
        },
        handleKeyDown: (view, event) => {
          // Cmd/Ctrl+S to save
          if ((event.metaKey || event.ctrlKey) && event.key === 's') {
            event.preventDefault();
            onSave?.();
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML());
      },
    });

    useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus('end'),
      clear: () => editor?.commands.clearContent(),
      getHTML: () => editor ? editor.getHTML() : '',
      setContent: (content: string) => editor?.commands.setContent(content),
      getEditor: () => editor,
    }), [editor]);

    useEffect(() => {
      if (editor && value !== undefined && !editor.isFocused) {
        if (editor.getHTML() !== value) {
          editor.commands.setContent(value, { emitUpdate: false });
        }
      }
    }, [value, editor]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [disabled, editor]);

    const setLink = useCallback(() => {
      if (!editor) return;
      
      const previousUrl = editor.getAttributes('link').href;
      setLinkUrl(previousUrl || '');
      setShowLinkInput(true);
      
      setTimeout(() => linkInputRef.current?.focus(), 100);
    }, [editor]);

    const saveLinkAction = useCallback(() => {
      if (!editor) return;
      
      if (linkUrl === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      }
      
      setShowLinkInput(false);
      setLinkUrl('');
    }, [editor, linkUrl]);

    const addImage = useCallback(() => {
      if (!editor) return;
      
      const url = window.prompt('Enter image URL:');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }, [editor]);

    const addTable = useCallback(() => {
      if (!editor) return;
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }, [editor]);

    if (!editor) {
      return null;
    }

    const ToolbarButton = ({ 
      onClick, 
      isActive = false, 
      disabled = false,
      children,
      title,
    }: {
      onClick: () => void;
      isActive?: boolean;
      disabled?: boolean;
      children: React.ReactNode;
      title?: string;
    }) => (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
          'p-2 rounded-md transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isActive && 'bg-gray-200 dark:bg-gray-600 text-blue-600 dark:text-blue-400'
        )}
      >
        {children}
      </button>
    );

    return (
      <div className={cn('enhanced-tiptap-editor-wrapper bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700', className)}>
        {/* Fixed Toolbar */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 backdrop-blur-sm">
          {/* Text Formatting */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 dark:border-gray-600">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (⌘B)"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (⌘I)"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline (⌘U)"
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Code"
            >
              <Code className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 dark:border-gray-600">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 dark:border-gray-600">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
              title="Task List"
            >
              <CheckSquare className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 dark:border-gray-600">
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              isActive={editor.isActive({ textAlign: 'justify' })}
              title="Justify"
            >
              <AlignJustify className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Colors */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 dark:border-gray-600 relative">
            <div className="relative">
              <ToolbarButton
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Text Color"
              >
                <Type className="w-4 h-4" />
              </ToolbarButton>
              {showColorPicker && (
                <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1 z-50">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        editor.chain().focus().setColor(color).run();
                        setShowColorPicker(false);
                      }}
                      className="w-6 h-6 rounded border-2 border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <ToolbarButton
                onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                title="Highlight"
              >
                <Highlighter className="w-4 h-4" />
              </ToolbarButton>
              {showHighlightPicker && (
                <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1 z-50">
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        editor.chain().focus().setHighlight({ color }).run();
                        setShowHighlightPicker(false);
                      }}
                      className="w-6 h-6 rounded border-2 border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <button
                    onClick={() => {
                      editor.chain().focus().unsetHighlight().run();
                      setShowHighlightPicker(false);
                    }}
                    className="w-6 h-6 rounded border-2 border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform flex items-center justify-center"
                    title="Remove highlight"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Insert */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-gray-300 dark:border-gray-600">
            <ToolbarButton onClick={setLink} title="Insert Link (⌘K)">
              <LinkIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={addImage} title="Insert Image">
              <ImageIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={addTable} title="Insert Table">
              <TableIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (⌘Z)"
            >
              <Undo className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (⌘⇧Z)"
            >
              <Redo className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Saving Indicator */}
          {showSavingIndicator && (
            <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              Auto-saving...
            </div>
          )}
        </div>

        {/* Link Input Modal */}
        {showLinkInput && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[400px]">
            <div className="flex items-center gap-2">
              <input
                ref={linkInputRef}
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveLinkAction();
                  } else if (e.key === 'Escape') {
                    setShowLinkInput(false);
                  }
                }}
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              />
              <button
                onClick={saveLinkAction}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setShowLinkInput(false);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-md transition-colors"
                title="Remove link"
              >
                <Unlink className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Editor Content */}
        <div className="relative">
          <EditorContent 
            editor={editor} 
            className={cn(
              'w-full min-h-[500px] max-w-4xl mx-auto',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>

        {/* Global styles */}
        <style jsx global>{`
          .ProseMirror .is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #9ca3af;
            pointer-events: none;
            height: 0;
          }

          .ProseMirror:focus {
            outline: none;
          }

          .ProseMirror ul[data-type="taskList"] {
            list-style: none;
            padding: 0;
          }

          .ProseMirror ul[data-type="taskList"] li {
            display: flex;
            align-items: flex-start;
          }

          .ProseMirror ul[data-type="taskList"] li > label {
            flex: 0 0 auto;
            margin-right: 0.5rem;
            user-select: none;
          }

          .ProseMirror ul[data-type="taskList"] li > div {
            flex: 1 1 auto;
          }

          .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
            cursor: pointer;
            width: 1rem;
            height: 1rem;
          }

          .ProseMirror table {
            border-collapse: collapse;
            table-layout: fixed;
            width: 100%;
            margin: 1rem 0;
            overflow: hidden;
          }

          .ProseMirror td,
          .ProseMirror th {
            min-width: 1em;
            border: 2px solid #d1d5db;
            padding: 0.5rem 0.75rem;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
          }

          .ProseMirror th {
            font-weight: bold;
            text-align: left;
            background-color: #f9fafb;
          }

          .dark .ProseMirror td,
          .dark .ProseMirror th {
            border-color: #4b5563;
          }

          .dark .ProseMirror th {
            background-color: #1f2937;
          }

          .ProseMirror .selectedCell:after {
            z-index: 2;
            position: absolute;
            content: "";
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            background: rgba(59, 130, 246, 0.15);
            pointer-events: none;
          }

          .ProseMirror .column-resize-handle {
            position: absolute;
            right: -2px;
            top: 0;
            bottom: -2px;
            width: 4px;
            background-color: #3b82f6;
            pointer-events: none;
          }

          .ProseMirror img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1rem 0;
          }

          .ProseMirror img.ProseMirror-selectednode {
            outline: 3px solid #3b82f6;
          }
        `}</style>
      </div>
    );
  }
);

export default EnhancedTipTapEditor;

