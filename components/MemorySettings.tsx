'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  XMarkIcon,
  CheckIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';

interface Memory {
  id: string;
  key: string;
  value: string;
  category: 'user_preference' | 'brand_context' | 'campaign_info' | 'product_details' | 'decision' | 'fact';
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

interface MemorySettingsProps {
  conversationId: string;
  onClose: () => void;
}

const CATEGORY_LABELS = {
  user_preference: '👤 User Preference',
  brand_context: '🎨 Brand Context',
  campaign_info: '📊 Campaign Info',
  product_details: '🛍️ Product Details',
  decision: '✅ Decision',
  fact: '📝 Fact',
};

const CATEGORY_COLORS = {
  user_preference: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  brand_context: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  campaign_info: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  product_details: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  decision: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  fact: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

export default function MemorySettings({ conversationId, onClose }: MemorySettingsProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState<Memory['category']>('fact');
  const [isAdding, setIsAdding] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadMemories();
  }, [conversationId]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const loadMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_memories')
        .select('*')
        .eq('conversation_id', conversationId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      logger.error('Error loading memories:', error);
      toast.error('Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editKey.trim() || !editValue.trim()) {
      toast.error('Key and value are required');
      return;
    }

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('conversation_memories')
          .update({
            key: editKey.trim(),
            value: editValue.trim(),
            category: editCategory,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Memory updated');
      } else {
        // Create new
        const { error } = await supabase
          .from('conversation_memories')
          .insert({
            conversation_id: conversationId,
            key: editKey.trim(),
            value: editValue.trim(),
            category: editCategory,
          });

        if (error) throw error;
        toast.success('Memory added');
      }

      setEditingId(null);
      setIsAdding(false);
      setEditKey('');
      setEditValue('');
      setEditCategory('fact');
      await loadMemories();
    } catch (error: any) {
      logger.error('Error saving memory:', error);
      if (error.code === '23505') {
        toast.error('A memory with this key already exists');
      } else {
        toast.error('Failed to save memory');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;

    try {
      const { error } = await supabase
        .from('conversation_memories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Memory deleted');
      await loadMemories();
    } catch (error) {
      logger.error('Error deleting memory:', error);
      toast.error('Failed to delete memory');
    }
  };

  const startEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditKey(memory.key);
    setEditValue(memory.value);
    setEditCategory(memory.category);
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setEditKey('');
    setEditValue('');
    setEditCategory('fact');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditKey('');
    setEditValue('');
    setEditCategory('fact');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Conversation Memory
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI remembers these facts across the conversation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add New Memory Button */}
              {!isAdding && !editingId && (
                <button
                  onClick={startAdd}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="font-medium">Add New Memory</span>
                </button>
              )}

              {/* Add/Edit Form */}
              {(isAdding || editingId) && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    {editingId ? 'Edit Memory' : 'Add New Memory'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Key
                      </label>
                      <input
                        type="text"
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                        placeholder="e.g., tone_preference, target_audience"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Value
                      </label>
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="e.g., casual and friendly, millennials interested in tech"
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as Memory['category'])}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckIcon className="w-5 h-5" />
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <XMarkIcon className="w-5 h-5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Memory List */}
              {memories.length === 0 && !isAdding && !editingId ? (
                <div className="text-center py-12">
                  <SparklesIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">No memories yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Add memories to help AI provide more personalized responses
                  </p>
                </div>
              ) : (
                memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[memory.category]}`}>
                            {CATEGORY_LABELS[memory.category]}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(memory.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 font-mono">
                          {memory.key}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
                          {memory.value}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(memory)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(memory.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5">
              <SparklesIcon />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">How Memory Works</p>
              <p>
                The AI will reference these memories throughout the conversation to provide more personalized and consistent responses. 
                Memories are automatically saved when the AI learns important information, and you can manually add or edit them here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


