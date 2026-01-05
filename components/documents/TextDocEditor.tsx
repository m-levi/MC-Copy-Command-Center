'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { DocumentCategory, DocumentVisibility } from '@/types';
import { cn } from '@/lib/utils';
import { 
  X, 
  Loader2,
  Tag,
  Lock,
  Users,
  Building2,
  Sparkles,
  Check,
  Folder,
} from 'lucide-react';
import EnhancedTipTapEditor, { EnhancedTipTapEditorHandle } from './EnhancedTipTapEditor';

interface TextDocEditorProps {
  brandId: string;
  initialData?: {
    title: string;
    description: string;
    content: string;
    category: DocumentCategory;
    visibility: DocumentVisibility;
    tags: string[];
  };
  onSave: (data: {
    title: string;
    description: string;
    content: string;
    category: DocumentCategory;
    visibility: DocumentVisibility;
    tags: string[];
  }) => Promise<void>;
  onClose: () => void;
  isEditing?: boolean;
}

export default function TextDocEditor({
  brandId,
  initialData,
  onSave,
  onClose,
  isEditing = false,
}: TextDocEditorProps) {
  const editorRef = useRef<EnhancedTipTapEditorHandle>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [category, setCategory] = useState<DocumentCategory>(initialData?.category || 'general');
  const [visibility, setVisibility] = useState<DocumentVisibility>(initialData?.visibility || 'org');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    category: DocumentCategory;
    tags: string[];
    summary: string;
  } | null>(null);

  // Auto-analyze document with AI
  const analyzeDocument = useCallback(async () => {
    if (!title.trim() || !content.trim() || content.length < 50) {
      return; // Need minimum content to analyze
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/brands/${brandId}/documents-v2/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: content.substring(0, 5000) }),
      });

      if (response.ok) {
        const analysis = await response.json();
        setAiAnalysis(analysis);
        setCategory(analysis.category);
        setTags(analysis.tags);
        setDescription(analysis.summary || description);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [brandId, title, content, description]);

  // Trigger AI analysis when content changes (debounced)
  useEffect(() => {
    if (!initialData && content.length > 100) {
      const timer = setTimeout(() => {
        analyzeDocument();
      }, 3000); // 3 seconds after user stops typing
      
      return () => clearTimeout(timer);
    }
  }, [content, initialData, analyzeDocument]);

  // Autosave functionality
  const handleAutoSave = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    setIsSaving(true);
    setIsSaved(false);
    
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || aiAnalysis?.summary || '',
        content: content.trim(),
        category: aiAnalysis?.category || category,
        visibility,
        tags: aiAnalysis?.tags || tags,
      });
      setIsSaved(true);
    } catch (error) {
      console.error('Autosave failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [title, description, content, category, visibility, tags, aiAnalysis, onSave]);

  // Trigger autosave when content changes (debounced)
  useEffect(() => {
    if (isEditing && (title || content)) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      
      autosaveTimerRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000); // 2 seconds after user stops typing
      
      return () => {
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
        }
      };
    }
  }, [title, content, isEditing, handleAutoSave]);

  const handleManualSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }
    
    const currentContent = editorRef.current?.getHTML() || content;
    
    if (!currentContent.trim()) {
      alert('Please enter some content');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || aiAnalysis?.summary || '',
        content: currentContent.trim(),
        category: aiAnalysis?.category || category,
        visibility,
        tags: aiAnalysis?.tags || tags,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save document:', error);
      alert('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  const visibilityOptions = [
    { value: 'private', label: 'Private', icon: Lock, description: 'Only you' },
    { value: 'shared', label: 'Shared', icon: Users, description: 'Specific people' },
    { value: 'org', label: 'Organization', icon: Building2, description: 'Everyone' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            {/* Visibility Selector */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              {visibilityOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setVisibility(opt.value as DocumentVisibility)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      visibility === opt.value
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    )}
                    title={opt.description}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* AI Analysis Indicator */}
            {isAnalyzing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                AI analyzing...
              </div>
            )}

            {/* Auto-save indicator */}
            {isEditing && (
              <div className="flex items-center gap-2 text-xs">
                {isSaving ? (
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                ) : isSaved ? (
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3" />
                    Saved
                  </span>
                ) : null}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 max-w-5xl mx-auto space-y-4">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsSaved(false);
              }}
              placeholder="Untitled Document"
              className="w-full px-0 py-2 text-3xl font-bold bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-0"
              autoFocus={!initialData}
            />

            {/* AI-Generated Metadata */}
            {aiAnalysis && (
              <div className="flex flex-wrap items-center gap-2 pb-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                  <Sparkles className="w-3 h-3" />
                  {aiAnalysis.category.replace('_', ' ')}
                </div>
                
                {aiAnalysis.tags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </div>
                ))}
                
                <div className="ml-auto text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI-organized
                </div>
              </div>
            )}

            {/* Enhanced Editor */}
            <EnhancedTipTapEditor
              ref={editorRef}
              value={content}
              onChange={(html) => {
                setContent(html);
                setIsSaved(false);
              }}
              onSave={handleManualSave}
              placeholder="Start writing..."
              autoFocus={!initialData && !title}
              showSavingIndicator={isSaving}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {isEditing && (
              <span>Auto-saves every 2 seconds • ⌘S to save manually</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isEditing && (
              <button
                onClick={handleManualSave}
                disabled={isSaving || !title.trim() || !content.trim()}
                className={cn(
                  'px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
                  isSaving || !title.trim() || !content.trim()
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Document
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
