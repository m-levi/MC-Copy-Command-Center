'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  GripVerticalIcon,
  XIcon,
  CheckIcon,
  Loader2Icon,
  SparklesIcon,
  InfoIcon,
  SlashIcon,
  SearchIcon,
} from 'lucide-react';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import {
  SavedPrompt,
  CreatePromptInput,
  PROMPT_ICONS,
} from '@/types/prompts';
import { ConversationMode } from '@/types';

export const dynamic = 'force-dynamic';

const MODE_LABELS: Record<string, string> = {
  assistant: 'Assistant',
  email_copy: 'Email',
  flow: 'Flow',
  planning: 'Planning',
};

export default function PromptsSettingsPage() {
  const { prompts, isLoading, createPrompt, updatePrompt, deletePrompt } = usePromptLibrary({ activeOnly: false });
  const [showEditor, setShowEditor] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);
  const [orderedPrompts, setOrderedPrompts] = useState<SavedPrompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync ordered prompts when prompts change
  useEffect(() => {
    setOrderedPrompts(prompts);
  }, [prompts]);

  // Filter prompts by search query
  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) return orderedPrompts;

    const query = searchQuery.toLowerCase().trim();
    return orderedPrompts.filter(
      (prompt) =>
        prompt.name.toLowerCase().includes(query) ||
        (prompt.description?.toLowerCase().includes(query) ?? false) ||
        prompt.prompt.toLowerCase().includes(query) ||
        (prompt.slash_command?.toLowerCase().includes(query) ?? false)
    );
  }, [orderedPrompts, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  const handleSave = async (input: CreatePromptInput) => {
    if (editingPrompt) {
      await updatePrompt(editingPrompt.id, input);
    } else {
      await createPrompt(input);
    }
    setShowEditor(false);
    setEditingPrompt(null);
  };

  const handleDelete = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      // Can't delete default, just disable
      await updatePrompt(id, { is_active: false });
    } else if (confirm('Delete this prompt?')) {
      await deletePrompt(id);
    }
  };

  const handleReorder = useCallback(async (newOrder: SavedPrompt[]) => {
    setOrderedPrompts(newOrder);
    // Update sort order in DB
    for (let i = 0; i < newOrder.length; i++) {
      if (newOrder[i].sort_order !== i) {
        await updatePrompt(newOrder[i].id, { sort_order: i });
      }
    }
  }, [updatePrompt]);

  const activeCount = prompts.filter(p => p.is_active).length;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2Icon className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Quick Actions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create shortcuts that appear as buttons in chat and can be triggered with slash commands.
          </p>
        </div>
        <button
          onClick={() => { setEditingPrompt(null); setShowEditor(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-medium hover:from-violet-600 hover:to-indigo-700 transition-all shadow-sm"
        >
          <PlusIcon className="w-4 h-4" />
          New Shortcut
        </button>
      </div>

      {/* Search */}
      {orderedPrompts.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search shortcuts by name, description, or command..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          {isSearching && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {filteredPrompts.length === 0
                ? 'No shortcuts found'
                : `Showing ${filteredPrompts.length} of ${orderedPrompts.length} shortcut${orderedPrompts.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      {!isSearching && (
        <div className="mb-6 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-xl border border-violet-100 dark:border-violet-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {activeCount} Active Shortcuts
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Drag to reorder • Click to edit
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/50">
        <div className="flex gap-3">
          <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Shortcuts appear as quick action buttons below AI responses in chat. 
              You can also enable a slash command (e.g., <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded text-xs font-mono">/subjects</code>) to trigger them from the input field.
            </p>
          </div>
        </div>
      </div>

      {/* Prompts List */}
      {orderedPrompts.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-4">
            <SparklesIcon className="w-8 h-8 text-violet-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Shortcuts Yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Create your first shortcut to speed up your workflow.
          </p>
        </div>
      ) : isSearching && filteredPrompts.length === 0 ? (
        <div className="text-center py-12 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <SearchIcon className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No shortcuts match your search
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Try adjusting your search terms
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Clear Search
          </button>
        </div>
      ) : isSearching ? (
        /* When searching, show a static list (no reorder) */
        <div className="space-y-2">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                prompt.is_active
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-60'
              }`}
            >
              <div className="text-gray-300 dark:text-gray-600">
                <GripVerticalIcon className="w-5 h-5" />
              </div>

              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xl">
                {prompt.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {prompt.name}
                  </h4>
                  {prompt.slash_command && (
                    <code className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">
                      /{prompt.slash_command}
                    </code>
                  )}
                  {prompt.is_default && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded">
                      Default
                    </span>
                  )}
                </div>
                {prompt.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-1">
                    {prompt.description}
                  </p>
                )}
                <div className="flex gap-1">
                  {prompt.modes.map(mode => (
                    <span
                      key={mode}
                      className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                    >
                      {MODE_LABELS[mode]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditingPrompt(prompt); setShowEditor(true); }}
                  className="p-2 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(prompt.id, prompt.is_default)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title={prompt.is_default ? 'Disable shortcut' : 'Delete shortcut'}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updatePrompt(prompt.id, { is_active: !prompt.is_active })}
                  className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${
                    prompt.is_active ? 'bg-gradient-to-r from-violet-500 to-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    prompt.is_active ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={orderedPrompts}
          onReorder={handleReorder}
          className="space-y-2"
        >
          {orderedPrompts.map((prompt) => (
            <Reorder.Item
              key={prompt.id}
              value={prompt}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                prompt.is_active 
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
                  : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-60'
              }`}
            >
              <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                <GripVerticalIcon className="w-5 h-5" />
              </div>
              
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xl">
                {prompt.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {prompt.name}
                  </h4>
                  {prompt.slash_command && (
                    <code className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">
                      /{prompt.slash_command}
                    </code>
                  )}
                  {prompt.is_default && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded">
                      Default
                    </span>
                  )}
                </div>
                {prompt.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-1">
                    {prompt.description}
                  </p>
                )}
                <div className="flex gap-1">
                  {prompt.modes.map(mode => (
                    <span 
                      key={mode}
                      className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                    >
                      {MODE_LABELS[mode]}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditingPrompt(prompt); setShowEditor(true); }}
                  className="p-2 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(prompt.id, prompt.is_default)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title={prompt.is_default ? 'Disable shortcut' : 'Delete shortcut'}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updatePrompt(prompt.id, { is_active: !prompt.is_active })}
                  className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${
                    prompt.is_active ? 'bg-gradient-to-r from-violet-500 to-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    prompt.is_active ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <PromptEditor
            prompt={editingPrompt}
            onSave={handleSave}
            onCancel={() => { setShowEditor(false); setEditingPrompt(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Prompt Editor Modal
function PromptEditor({
  prompt,
  onSave,
  onCancel,
}: {
  prompt: SavedPrompt | null;
  onSave: (input: CreatePromptInput) => Promise<void>;
  onCancel: () => void;
}) {
  const isEditing = !!prompt;
  
  const [name, setName] = useState(prompt?.name || '');
  const [description, setDescription] = useState(prompt?.description || '');
  const [icon, setIcon] = useState(prompt?.icon || '💬');
  const [promptText, setPromptText] = useState(prompt?.prompt || '');
  const [slashCommand, setSlashCommand] = useState(prompt?.slash_command || '');
  const [modes, setModes] = useState<ConversationMode[]>(prompt?.modes || ['email_copy']);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Normalize slash command input (remove leading slash and spaces, lowercase)
  const handleSlashCommandChange = (value: string) => {
    // Remove leading slash if user types it, remove spaces, lowercase
    const normalized = value.replace(/^\//, '').replace(/\s/g, '').toLowerCase();
    setSlashCommand(normalized);
  };

  const handleSave = async () => {
    if (!name.trim() || !promptText.trim()) return;
    
    setIsSaving(true);
    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      prompt: promptText.trim(),
      slash_command: slashCommand.trim() || undefined,
      modes,
    });
    setIsSaving(false);
  };

  const toggleMode = (mode: ConversationMode) => {
    setModes(prev => 
      prev.includes(mode) 
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Shortcut' : 'New Shortcut'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Name & Icon */}
          <div className="flex gap-3">
            <div className="relative">
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-2xl hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
              >
                {icon}
              </button>
              
              <AnimatePresence>
                {showIconPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute left-0 top-full mt-2 z-20 p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl"
                  >
                    <div className="grid grid-cols-5 gap-1">
                      {PROMPT_ICONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => { setIcon(emoji); setShowIconPicker(false); }}
                          className={`w-8 h-8 rounded-lg text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                            icon === emoji ? 'bg-violet-100 dark:bg-violet-900/30' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prompt name"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
              />
            </div>
          </div>

          {/* Description */}
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
          />

          {/* Slash Command */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slash Command <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SlashIcon className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={slashCommand}
                onChange={(e) => handleSlashCommandChange(e.target.value)}
                placeholder="e.g., subjects"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 font-mono text-sm"
              />
            </div>
            {slashCommand && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Type <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono">/{slashCommand}</code> in chat to trigger this shortcut
              </p>
            )}
          </div>

          {/* Prompt Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prompt
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="What should this prompt ask the AI to do?"
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none"
            />
          </div>

          {/* Modes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Show in modes
            </label>
            <div className="flex gap-2">
              {(['email_copy', 'flow', 'planning'] as ConversationMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => toggleMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    modes.includes(mode)
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-2 border-violet-300 dark:border-violet-700'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent'
                  }`}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !promptText.trim() || modes.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? (
              <>
                <Loader2Icon className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4" />
                {isEditing ? 'Save Changes' : 'Create Shortcut'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}








