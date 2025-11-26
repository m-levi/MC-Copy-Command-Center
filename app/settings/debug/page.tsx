'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import PromptEditor from '@/components/PromptEditor';

export const dynamic = 'force-dynamic';

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

export default function DebugPage() {
  const [debugModeEnabled, setDebugModeEnabled] = useState(false);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [promptForm, setPromptForm] = useState<{
    name: string;
    description: string;
    prompt_type: string;
    system_prompt: string;
    user_prompt: string;
  }>({
    name: '',
    description: '',
    prompt_type: 'design_email',
    system_prompt: '',
    user_prompt: '',
  });
  const [savingPrompt, setSavingPrompt] = useState(false);

  useEffect(() => {
    loadDebugSettings();
    loadPrompts();
  }, []);

  const loadDebugSettings = async () => {
    try {
      const response = await fetch('/api/debug/settings');
      if (response.ok) {
        const data = await response.json();
        setDebugModeEnabled(data.debug_mode_enabled);
      }
    } catch (error) {
      console.error('Error loading debug settings:', error);
    }
  };

  const loadPrompts = async () => {
    setLoadingPrompts(true);
    try {
      const response = await fetch('/api/debug/prompts');
      if (response.ok) {
        const data = await response.json();
        setCustomPrompts(data);
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast.error('Failed to load custom prompts');
    } finally {
      setLoadingPrompts(false);
    }
  };

  const toggleDebugMode = async () => {
    const newValue = !debugModeEnabled;
    setDebugModeEnabled(newValue);
    try {
      const response = await fetch('/api/debug/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debug_mode_enabled: newValue }),
      });
      
      if (!response.ok) throw new Error('Failed to update debug settings');
      toast.success(`Debug mode ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating debug settings:', error);
      setDebugModeEnabled(!newValue); // Revert on error
      toast.error('Failed to update settings');
    }
  };

  const handleOpenPromptDialog = (prompt: CustomPrompt | null = null) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setPromptForm({
        name: prompt.name,
        description: prompt.description || '',
        prompt_type: prompt.prompt_type,
        system_prompt: prompt.system_prompt || '',
        user_prompt: prompt.user_prompt || '',
      });
    } else {
      setEditingPrompt(null);
      setPromptForm({
        name: '',
        description: '',
        prompt_type: 'design_email',
        system_prompt: '',
        user_prompt: '',
      });
    }
    setShowPromptDialog(true);
  };

  const handleSavePrompt = async () => {
    if (!promptForm.name) {
      toast.error('Prompt name is required');
      return;
    }
    
    if (!promptForm.system_prompt && !promptForm.user_prompt) {
      toast.error('At least one prompt (system or user) is required');
      return;
    }

    setSavingPrompt(true);
    try {
      const url = editingPrompt 
        ? `/api/debug/prompts/${editingPrompt.id}`
        : '/api/debug/prompts';
      
      const method = editingPrompt ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...promptForm,
          is_active: editingPrompt ? editingPrompt.is_active : false
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save prompt');
      }

      toast.success(`Prompt ${editingPrompt ? 'updated' : 'created'} successfully`);
      setShowPromptDialog(false);
      loadPrompts();
    } catch (error: any) {
      console.error('Error saving prompt:', error);
      toast.error(error.message || 'Failed to save prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const response = await fetch(`/api/debug/prompts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete prompt');

      toast.success('Prompt deleted successfully');
      loadPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
    }
  };

  const handleActivatePrompt = async (prompt: CustomPrompt) => {
    try {
      // Optimistic update
      setCustomPrompts(prev => prev.map(p => {
        if (p.prompt_type === prompt.prompt_type) {
          return { ...p, is_active: p.id === prompt.id };
        }
        return p;
      }));

      const response = await fetch(`/api/debug/prompts/${prompt.id}/activate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to activate prompt');

      toast.success('Prompt activated');
      // Refresh to ensure sync with server triggers
      loadPrompts();
    } catch (error) {
      console.error('Error activating prompt:', error);
      toast.error('Failed to activate prompt');
      loadPrompts(); // Revert on error
    }
  };

  return (
    <div className="space-y-6">
      {/* Toggle Debug Mode */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Debug Mode
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Enable debug mode to test custom prompts during email generation
            </p>
          </div>
          <button
            onClick={toggleDebugMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              debugModeEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span className="sr-only">Enable Debug Mode</span>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                debugModeEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Custom Prompts Library */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Prompt Library
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Create and manage custom prompts for testing
            </p>
          </div>
          <button
            onClick={() => handleOpenPromptDialog()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Prompt
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                How Custom Prompts Work
              </p>
              <ul className="text-blue-700 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li><strong>System Prompt</strong> — Instructions for the AI (tone, rules, format)</li>
                <li><strong>User Prompt</strong> — Template with variables like {'{{COPY_BRIEF}}'}</li>
                <li>Only <strong>one prompt</strong> can be active per email type</li>
                <li>Leave either field empty to use the default for that part</li>
              </ul>
            </div>
          </div>
        </div>

        {loadingPrompts ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading prompts...</p>
          </div>
        ) : customPrompts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">No custom prompts yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Create a custom prompt to test different generation styles
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customPrompts.map((prompt) => (
              <div 
                key={prompt.id}
                className={`border rounded-lg p-4 transition-colors ${
                  prompt.is_active 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {prompt.name}
                      </h3>
                      {prompt.is_active && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`}>
                        {prompt.prompt_type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(prompt.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleActivatePrompt(prompt)}
                      disabled={prompt.is_active}
                      className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        prompt.is_active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                      }`}
                      title={prompt.is_active ? "Currently active" : "Set as active"}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleOpenPromptDialog(prompt)}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Edit prompt"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeletePrompt(prompt.id)}
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete prompt"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                  {prompt.description || 'No description provided.'}
                </p>
                <div className="space-y-1">
                  {prompt.system_prompt && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded px-2 py-1 text-xs font-mono text-purple-700 dark:text-purple-300 truncate">
                      <span className="font-semibold">System:</span> {prompt.system_prompt.substring(0, 50)}...
                    </div>
                  )}
                  {prompt.user_prompt && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded px-2 py-1 text-xs font-mono text-green-700 dark:text-green-300 truncate">
                      <span className="font-semibold">User:</span> {prompt.user_prompt.substring(0, 50)}...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt Editor Dialog */}
      {showPromptDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
              </h2>
              <button
                onClick={() => setShowPromptDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prompt Name
                  </label>
                  <input
                    type="text"
                    value={promptForm.name}
                    onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Formal Corporate Tone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prompt Type
                  </label>
                  <select
                    value={promptForm.prompt_type}
                    onChange={(e) => setPromptForm({ ...promptForm, prompt_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="design_email">Design Email</option>
                    <option value="letter_email">Letter Email</option>
                    <option value="flow_email">Flow Email</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={promptForm.description}
                  onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of what this prompt does..."
                />
              </div>

              {/* System Prompt */}
              <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-950/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <label className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    System Prompt
                  </label>
                  <span className="text-xs text-purple-600 dark:text-purple-400">(Instructions for the AI)</span>
                </div>
                <PromptEditor
                  value={promptForm.system_prompt}
                  onChange={(value) => setPromptForm({ ...promptForm, system_prompt: value })}
                  minHeight="200px"
                  placeholder="You are an expert email copywriter..."
                />
              </div>

              {/* User Prompt */}
              <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50/50 dark:bg-green-950/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <label className="text-sm font-semibold text-green-900 dark:text-green-100">
                    User Prompt Template
                  </label>
                  <span className="text-xs text-green-600 dark:text-green-400">(Template with variables)</span>
                </div>
                <PromptEditor
                  value={promptForm.user_prompt}
                  onChange={(value) => setPromptForm({ ...promptForm, user_prompt: value })}
                  minHeight="200px"
                  placeholder="Create an email based on this brief: {{COPY_BRIEF}}..."
                />
              </div>

              {/* Help Section */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Available Variables
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-200 mb-3">
                  Use these in your <strong>User Prompt</strong>. They will be replaced with actual values:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  {promptForm.prompt_type === 'design_email' && (
                    <>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{COPY_BRIEF}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{BRAND_INFO}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{BRAND_VOICE_GUIDELINES}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{RAG_CONTEXT}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{MEMORY_CONTEXT}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{WEBSITE_URL}}'}</code>
                    </>
                  )}
                  {promptForm.prompt_type === 'letter_email' && (
                    <>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{COPY_BRIEF}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{EMAIL_BRIEF}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{BRAND_INFO}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{RAG_CONTEXT}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{MEMORY_CONTEXT}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{WEBSITE_URL}}'}</code>
                    </>
                  )}
                  {promptForm.prompt_type === 'flow_email' && (
                    <>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{EMAIL_SEQUENCE}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{TOTAL_EMAILS}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{FLOW_NAME}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{BRAND_INFO}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{FLOW_GOAL}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{TARGET_AUDIENCE}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{EMAIL_TITLE}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{EMAIL_PURPOSE}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{KEY_POINTS}}'}</code>
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded text-blue-800 dark:text-blue-300">{'{{PRIMARY_CTA}}'}</code>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPromptDialog(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrompt}
                disabled={savingPrompt}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingPrompt ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  'Save Prompt'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


