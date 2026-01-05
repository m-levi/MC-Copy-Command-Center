'use client';

import { useState, useRef, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentCategory, DocumentVisibility } from '@/types';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft,
  Loader2,
  Sparkles,
  Tag,
  Lock,
  Users,
  Building2,
  Check,
  X,
  Globe,
} from 'lucide-react';
import EnhancedTipTapEditor, { EnhancedTipTapEditorHandle } from '@/components/documents/EnhancedTipTapEditor';

export default function NewDocumentPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = use(params);
  const router = useRouter();
  const editorRef = useRef<EnhancedTipTapEditorHandle>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [docId, setDocId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<DocumentVisibility>('org');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<{
    category: DocumentCategory;
    tags: string[];
    summary: string;
  } | null>(null);

  // Auto-analyze document with AI
  const analyzeDocument = useCallback(async () => {
    if (!title.trim() || !content.trim() || content.length < 100) {
      return;
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
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [brandId, title, content]);

  // Trigger AI analysis when content changes (debounced)
  useEffect(() => {
    if (content.length > 100 && title.length > 0) {
      const timer = setTimeout(() => {
        analyzeDocument();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [content, title, analyzeDocument]);

  // Autosave functionality
  const handleAutoSave = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      return;
    }

    setIsSaving(true);
    
    try {
      const payload = {
        doc_type: 'text',
        title: title.trim(),
        description: aiAnalysis?.summary || '',
        content: content.trim(),
        category: aiAnalysis?.category || 'general',
        visibility,
        tags: aiAnalysis?.tags || [],
      };

      let response;
      if (docId) {
        // Update existing document
        response = await fetch(`/api/brands/${brandId}/documents-v2/${docId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new document
        response = await fetch(`/api/brands/${brandId}/documents-v2`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          setDocId(data.document.id);
          // Update URL to edit mode without reload
          window.history.replaceState(null, '', `/brands/${brandId}/documents/${data.document.id}/edit`);
        }
      }

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Autosave failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [title, content, visibility, aiAnalysis, docId, brandId]);

  // Trigger autosave when content changes (debounced)
  useEffect(() => {
    if (title || content) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      
      autosaveTimerRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000);
      
      return () => {
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
        }
      };
    }
  }, [title, content, handleAutoSave]);

  const visibilityOptions = [
    { value: 'private' as const, label: 'Private', icon: Lock, description: 'Only you' },
    { value: 'shared' as const, label: 'Shared', icon: Users, description: 'Specific people' },
    { value: 'org' as const, label: 'Team', icon: Building2, description: 'Everyone' },
  ];

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/brands/${brandId}/documents`)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Save Status */}
          <div className="flex items-center gap-2 text-sm">
            {isSaving ? (
              <span className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                Saved {getRelativeTime(lastSaved)}
              </span>
            ) : (
              <span className="text-gray-400">Not saved yet</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Analysis Indicator */}
          {isAnalyzing && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              AI organizing...
            </div>
          )}

          {/* Visibility Selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {visibilityOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setVisibility(opt.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    visibility === opt.value
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  )}
                  title={opt.description}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-12">
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Document"
            className="w-full px-0 py-3 mb-6 text-4xl font-bold bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-700 focus:outline-none focus:ring-0"
            autoFocus
          />

          {/* AI-Generated Metadata */}
          {aiAnalysis && (
            <div className="flex flex-wrap items-center gap-2 mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                {aiAnalysis.category.replace(/_/g, ' ')}
              </div>
              
              {aiAnalysis.tags.slice(0, 5).map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {tag}
                </div>
              ))}
              
              <div className="ml-auto text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI-organized
              </div>
            </div>
          )}

          {/* Enhanced Editor */}
          <EnhancedTipTapEditor
            ref={editorRef}
            value={content}
            onChange={setContent}
            onSave={handleAutoSave}
            placeholder="Start writing..."
            autoFocus={!title}
            showSavingIndicator={false}
            className="border-none shadow-none"
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Helper */}
      <div className="fixed bottom-6 right-6 px-4 py-2 bg-gray-900/90 dark:bg-gray-800/90 text-white rounded-lg text-xs backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-4">
          <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">⌘S</kbd> Save</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">⌘B</kbd> Bold</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">⌘K</kbd> Link</span>
        </div>
      </div>
    </div>
  );
}

















