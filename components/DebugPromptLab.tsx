'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

interface CustomPrompt {
  id: string;
  name: string;
  description?: string;
  prompt_type: 'design_email' | 'letter_email' | 'flow_email';
  system_prompt: string;
  user_prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProcessedPromptPreview {
  system_prompt: string;
  user_prompt: string;
  variables_used: Record<string, string>;
}

interface DebugPromptLabProps {
  brandId: string;
  isOpen: boolean;
  onClose: () => void;
  onPromptChange?: () => void;
  currentEmailType?: 'design' | 'letter';
}

type TabType = 'edit' | 'preview' | 'defaults' | 'compare';

const PROMPT_VARIABLES = {
  design_email: [
    { name: '{{COPY_BRIEF}}', description: 'The user\'s message/request' },
    { name: '{{BRAND_INFO}}', description: 'Brand details (name, description, tone, etc.)' },
    { name: '{{BRAND_VOICE_GUIDELINES}}', description: 'Copywriting style guide' },
    { name: '{{RAG_CONTEXT}}', description: 'Retrieved brand documents/context' },
    { name: '{{MEMORY_CONTEXT}}', description: 'Saved memories about this brand' },
    { name: '{{WEBSITE_URL}}', description: 'Brand website URL' },
    { name: '{{CONTEXT_INFO}}', description: 'Conversation history context' },
  ],
  letter_email: [
    { name: '{{EMAIL_BRIEF}}', description: 'The email brief/request' },
    { name: '{{BRAND_INFO}}', description: 'Brand details' },
    { name: '{{RAG_CONTEXT}}', description: 'Retrieved brand documents' },
    { name: '{{MEMORY_CONTEXT}}', description: 'Saved memories' },
    { name: '{{WEBSITE_URL}}', description: 'Brand website URL' },
    { name: '{{CONTEXT_INFO}}', description: 'Conversation context' },
  ],
  flow_email: [
    { name: '{{EMAIL_SEQUENCE}}', description: 'Current email number in flow' },
    { name: '{{TOTAL_EMAILS}}', description: 'Total emails in flow' },
    { name: '{{FLOW_NAME}}', description: 'Name of the automation flow' },
    { name: '{{BRAND_INFO}}', description: 'Brand details' },
    { name: '{{FLOW_GOAL}}', description: 'Goal of the flow' },
    { name: '{{TARGET_AUDIENCE}}', description: 'Target audience description' },
    { name: '{{EMAIL_TITLE}}', description: 'This email\'s title' },
    { name: '{{EMAIL_PURPOSE}}', description: 'Purpose of this email' },
    { name: '{{KEY_POINTS}}', description: 'Key points to cover' },
    { name: '{{PRIMARY_CTA}}', description: 'Main call to action' },
  ],
};

export default function DebugPromptLab({
  brandId,
  isOpen,
  onClose,
  onPromptChange,
  currentEmailType = 'design',
}: DebugPromptLabProps) {
  const [activeTab, setActiveTab] = useState<TabType>('edit');
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<CustomPrompt | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    prompt_type: 'design_email' as 'design_email' | 'letter_email' | 'flow_email',
    system_prompt: '',
    user_prompt: '',
  });
  const [defaultPrompts, setDefaultPrompts] = useState<Record<string, { system: string; user: string }>>({});
  const [processedPreview, setProcessedPreview] = useState<ProcessedPromptPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [comparePromptId, setComparePromptId] = useState<string | null>(null);
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  const userPromptRef = useRef<HTMLTextAreaElement>(null);

  // Determine prompt type from email type
  const getPromptType = useCallback(() => {
    return currentEmailType === 'letter' ? 'letter_email' : 'design_email';
  }, [currentEmailType]);

  // Load prompts
  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    }
  }, [isOpen]);

  // Load defaults when switching to defaults tab
  useEffect(() => {
    if (activeTab === 'defaults' && Object.keys(defaultPrompts).length === 0) {
      loadDefaultPrompts();
    }
  }, [activeTab]);

  // Generate preview when switching to preview tab or when form changes
  useEffect(() => {
    if (activeTab === 'preview' && (editForm.system_prompt || editForm.user_prompt)) {
      generatePreview();
    }
  }, [activeTab, editForm.system_prompt, editForm.user_prompt, editForm.prompt_type]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/prompts');
      if (response.ok) {
        const data = await response.json();
        setCustomPrompts(data);
        
        // Select active prompt for current type, or first of that type
        const promptType = getPromptType();
        const activePrompt = data.find((p: CustomPrompt) => p.is_active && p.prompt_type === promptType);
        const firstOfType = data.find((p: CustomPrompt) => p.prompt_type === promptType);
        
        if (activePrompt) {
          selectPrompt(activePrompt);
        } else if (firstOfType) {
          selectPrompt(firstOfType);
        } else {
          // No prompts exist - start with new
          startNewPrompt();
        }
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultPrompts = async () => {
    setLoadingDefaults(true);
    try {
      const response = await fetch('/api/debug/prompts/defaults');
      if (response.ok) {
        const data = await response.json();
        setDefaultPrompts(data);
      }
    } catch (error) {
      console.error('Error loading defaults:', error);
      toast.error('Failed to load default prompts');
    } finally {
      setLoadingDefaults(false);
    }
  };

  const generatePreview = async () => {
    if (!editForm.system_prompt && !editForm.user_prompt) return;
    
    setLoadingPreview(true);
    try {
      const response = await fetch('/api/debug/prompts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          prompt_type: editForm.prompt_type,
          system_prompt: editForm.system_prompt,
          user_prompt: editForm.user_prompt,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setProcessedPreview(data);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const selectPrompt = (prompt: CustomPrompt) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setSelectedPrompt(prompt);
    setEditForm({
      name: prompt.name,
      description: prompt.description || '',
      prompt_type: prompt.prompt_type,
      system_prompt: prompt.system_prompt || '',
      user_prompt: prompt.user_prompt || '',
    });
    setIsCreatingNew(false);
    setHasUnsavedChanges(false);
  };

  const startNewPrompt = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setSelectedPrompt(null);
    setEditForm({
      name: '',
      description: '',
      prompt_type: getPromptType(),
      system_prompt: '',
      user_prompt: '',
    });
    setIsCreatingNew(true);
    setHasUnsavedChanges(false);
  };

  const handleFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const copyFromDefault = (type: 'system' | 'user') => {
    const defaultPrompt = defaultPrompts[editForm.prompt_type];
    if (!defaultPrompt) {
      toast.error('Default prompt not available. Load defaults first.');
      return;
    }
    
    if (type === 'system') {
      handleFormChange('system_prompt', defaultPrompt.system);
      toast.success('Copied default system prompt');
    } else {
      handleFormChange('user_prompt', defaultPrompt.user);
      toast.success('Copied default user prompt');
    }
  };

  const insertVariable = (variable: string, target: 'system' | 'user') => {
    const ref = target === 'system' ? systemPromptRef : userPromptRef;
    const field = target === 'system' ? 'system_prompt' : 'user_prompt';
    
    if (ref.current) {
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      const currentValue = editForm[field];
      const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
      handleFormChange(field, newValue);
      
      // Restore cursor position
      setTimeout(() => {
        if (ref.current) {
          ref.current.selectionStart = ref.current.selectionEnd = start + variable.length;
          ref.current.focus();
        }
      }, 0);
    } else {
      handleFormChange(field, editForm[field] + variable);
    }
  };

  const savePrompt = async () => {
    if (!editForm.name) {
      toast.error('Prompt name is required');
      return;
    }
    
    if (!editForm.system_prompt && !editForm.user_prompt) {
      toast.error('At least one prompt (system or user) is required');
      return;
    }

    setSaving(true);
    try {
      const url = isCreatingNew 
        ? '/api/debug/prompts'
        : `/api/debug/prompts/${selectedPrompt?.id}`;
      
      const method = isCreatingNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          is_active: selectedPrompt?.is_active || false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save prompt');
      }

      const savedPrompt = await response.json();
      toast.success(`Prompt ${isCreatingNew ? 'created' : 'updated'} successfully`);
      setHasUnsavedChanges(false);
      
      // Refresh prompts list
      await loadPrompts();
      
      // Select the saved prompt
      if (isCreatingNew && savedPrompt.id) {
        const updatedResponse = await fetch('/api/debug/prompts');
        if (updatedResponse.ok) {
          const updatedPrompts = await updatedResponse.json();
          const newPrompt = updatedPrompts.find((p: CustomPrompt) => p.id === savedPrompt.id);
          if (newPrompt) selectPrompt(newPrompt);
        }
      }
      
      onPromptChange?.();
    } catch (error: any) {
      console.error('Error saving prompt:', error);
      toast.error(error.message || 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const activatePrompt = async () => {
    if (!selectedPrompt) return;
    
    try {
      const response = await fetch(`/api/debug/prompts/${selectedPrompt.id}/activate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to activate prompt');

      toast.success('Prompt activated! It will be used for your next message.');
      await loadPrompts();
      onPromptChange?.();
    } catch (error) {
      console.error('Error activating prompt:', error);
      toast.error('Failed to activate prompt');
    }
  };

  const deletePrompt = async () => {
    if (!selectedPrompt) return;
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const response = await fetch(`/api/debug/prompts/${selectedPrompt.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete prompt');

      toast.success('Prompt deleted');
      startNewPrompt();
      await loadPrompts();
      onPromptChange?.();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };

  const duplicatePrompt = () => {
    if (!selectedPrompt) return;
    setEditForm({
      ...editForm,
      name: `${editForm.name} (Copy)`,
    });
    setSelectedPrompt(null);
    setIsCreatingNew(true);
    setHasUnsavedChanges(true);
    toast.success('Prompt duplicated. Make changes and save.');
  };

  if (!isOpen) return null;

  const promptsOfCurrentType = customPrompts.filter(p => p.prompt_type === editForm.prompt_type);
  const variables = PROMPT_VARIABLES[editForm.prompt_type] || PROMPT_VARIABLES.design_email;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/30 dark:to-purple-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Prompt Lab</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Edit and test prompts with real brand data</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">
                Unsaved changes
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {(['edit', 'preview', 'defaults', 'compare'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
            >
              {tab === 'edit' && '✏️ Edit'}
              {tab === 'preview' && '👁️ Preview'}
              {tab === 'defaults' && '📋 Defaults'}
              {tab === 'compare' && '⚖️ Compare'}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Prompt List */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={startNewPrompt}
                className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Prompt
              </button>
            </div>
            
            <div className="p-3">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Prompt Type
              </label>
              <select
                value={editForm.prompt_type}
                onChange={(e) => handleFormChange('prompt_type', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="design_email">Design Email</option>
                <option value="letter_email">Letter Email</option>
                <option value="flow_email">Flow Email</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Your Prompts
              </label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : promptsOfCurrentType.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No prompts yet for this type
                </p>
              ) : (
                promptsOfCurrentType.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => selectPrompt(prompt)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                      selectedPrompt?.id === prompt.id
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 ring-1 ring-indigo-300 dark:ring-indigo-700'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{prompt.name}</span>
                      {prompt.is_active && (
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 ml-2"></span>
                      )}
                    </div>
                    {prompt.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {prompt.description}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Edit Tab */}
            {activeTab === 'edit' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Name & Description */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Prompt Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. Conversational Tone v2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="What makes this prompt different..."
                    />
                  </div>
                </div>

                {/* System Prompt */}
                <div className="border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="font-semibold text-purple-900 dark:text-purple-100 text-sm">System Prompt</span>
                      <span className="text-xs text-purple-600 dark:text-purple-400">— AI's instructions & role</span>
                    </div>
                    <button
                      onClick={() => copyFromDefault('system')}
                      className="px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/40 rounded-md transition-colors"
                    >
                      📋 Copy Default
                    </button>
                  </div>
                  <textarea
                    ref={systemPromptRef}
                    value={editForm.system_prompt}
                    onChange={(e) => handleFormChange('system_prompt', e.target.value)}
                    className="w-full px-4 py-3 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-0 focus:ring-0 resize-none"
                    style={{ minHeight: '180px' }}
                    placeholder="You are an expert email copywriter..."
                    spellCheck={false}
                  />
                </div>

                {/* User Prompt */}
                <div className="border border-emerald-200 dark:border-emerald-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">User Prompt</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">— Template with variables</span>
                    </div>
                    <button
                      onClick={() => copyFromDefault('user')}
                      className="px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 rounded-md transition-colors"
                    >
                      📋 Copy Default
                    </button>
                  </div>
                  <textarea
                    ref={userPromptRef}
                    value={editForm.user_prompt}
                    onChange={(e) => handleFormChange('user_prompt', e.target.value)}
                    className="w-full px-4 py-3 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-0 focus:ring-0 resize-none"
                    style={{ minHeight: '180px' }}
                    placeholder="Create an email based on: {{COPY_BRIEF}}..."
                    spellCheck={false}
                  />
                </div>

                {/* Variables Reference */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Available Variables (click to insert)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {variables.map((v) => (
                      <button
                        key={v.name}
                        onClick={() => insertVariable(v.name, 'user')}
                        className="group relative px-2.5 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-xs font-mono text-gray-700 dark:text-gray-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title={v.description}
                      >
                        {v.name}
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {v.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div className="flex-1 overflow-y-auto p-6">
                {loadingPreview ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Generating preview with brand data...</span>
                  </div>
                ) : !processedPreview ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400">
                      Add a prompt and switch to Preview to see how it looks with real brand data
                    </p>
                    <button
                      onClick={generatePreview}
                      className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Generate Preview
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Variables Substituted
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(processedPreview.variables_used).map(([key, value]) => (
                          <div key={key} className="flex items-start gap-2">
                            <code className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded text-xs font-mono text-blue-700 dark:text-blue-300">
                              {key}
                            </code>
                            <span className="text-blue-800 dark:text-blue-200 truncate flex-1" title={value}>
                              {value.substring(0, 50)}{value.length > 50 ? '...' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {processedPreview.system_prompt && (
                      <div className="border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
                          <span className="font-semibold text-purple-900 dark:text-purple-100 text-sm">Processed System Prompt</span>
                        </div>
                        <pre className="p-4 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto">
                          {processedPreview.system_prompt}
                        </pre>
                      </div>
                    )}

                    {processedPreview.user_prompt && (
                      <div className="border border-emerald-200 dark:border-emerald-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800">
                          <span className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">Processed User Prompt</span>
                        </div>
                        <pre className="p-4 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto">
                          {processedPreview.user_prompt}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Defaults Tab */}
            {activeTab === 'defaults' && (
              <div className="flex-1 overflow-y-auto p-6">
                {loadingDefaults ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading default prompts...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>💡 Tip:</strong> These are the built-in default prompts. Use them as starting points—copy sections you like and customize them.
                      </p>
                    </div>

                    {Object.entries(defaultPrompts).map(([type, prompts]) => (
                      <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        <div className="p-4 space-y-4">
                          {prompts.system && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">System Prompt</span>
                                <button
                                  onClick={() => {
                                    handleFormChange('system_prompt', prompts.system);
                                    handleFormChange('prompt_type', type as any);
                                    setActiveTab('edit');
                                    toast.success('Copied to editor');
                                  }}
                                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                  Use this →
                                </button>
                              </div>
                              <pre className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {prompts.system.substring(0, 1000)}{prompts.system.length > 1000 ? '...' : ''}
                              </pre>
                            </div>
                          )}
                          {prompts.user && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">User Prompt</span>
                                <button
                                  onClick={() => {
                                    handleFormChange('user_prompt', prompts.user);
                                    handleFormChange('prompt_type', type as any);
                                    setActiveTab('edit');
                                    toast.success('Copied to editor');
                                  }}
                                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                  Use this →
                                </button>
                              </div>
                              <pre className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {prompts.user.substring(0, 1000)}{prompts.user.length > 1000 ? '...' : ''}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Compare Tab */}
            {activeTab === 'compare' && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Compare current prompt with:
                  </label>
                  <select
                    value={comparePromptId || ''}
                    onChange={(e) => setComparePromptId(e.target.value || null)}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a prompt to compare...</option>
                    <option value="default">Default Prompt</option>
                    {promptsOfCurrentType.filter(p => p.id !== selectedPrompt?.id).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {comparePromptId && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                        Current ({editForm.name || 'New Prompt'})
                      </h4>
                      <div className="space-y-4">
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                          <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase">System</span>
                          <pre className="mt-2 text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                            {editForm.system_prompt || '(empty)'}
                          </pre>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase">User</span>
                          <pre className="mt-2 text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                            {editForm.user_prompt || '(empty)'}
                          </pre>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        {comparePromptId === 'default' ? 'Default Prompt' : customPrompts.find(p => p.id === comparePromptId)?.name}
                      </h4>
                      <div className="space-y-4">
                        {(() => {
                          const compareData = comparePromptId === 'default' 
                            ? defaultPrompts[editForm.prompt_type] 
                            : customPrompts.find(p => p.id === comparePromptId);
                          
                          if (!compareData) return <p className="text-gray-500">Loading...</p>;
                          
                          const systemPrompt = comparePromptId === 'default' 
                            ? (compareData as { system: string; user: string }).system 
                            : (compareData as CustomPrompt).system_prompt;
                          const userPrompt = comparePromptId === 'default'
                            ? (compareData as { system: string; user: string }).user
                            : (compareData as CustomPrompt).user_prompt;

                          return (
                            <>
                              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase">System</span>
                                <pre className="mt-2 text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                  {systemPrompt || '(empty)'}
                                </pre>
                              </div>
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase">User</span>
                                <pre className="mt-2 text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                  {userPrompt || '(empty)'}
                                </pre>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            {selectedPrompt && !isCreatingNew && (
              <>
                <button
                  onClick={duplicatePrompt}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Duplicate
                </button>
                <button
                  onClick={deletePrompt}
                  className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {selectedPrompt && !selectedPrompt.is_active && !isCreatingNew && (
              <button
                onClick={activatePrompt}
                className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              >
                Set as Active
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={savePrompt}
              disabled={saving || !hasUnsavedChanges}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Prompt
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}





