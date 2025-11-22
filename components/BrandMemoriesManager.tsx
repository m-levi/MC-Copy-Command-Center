'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface BrandMemory {
  id: string;
  brand_id: string;
  title: string;
  content: string;
  category: 'general' | 'preference' | 'guideline' | 'fact' | 'dos_donts';
  created_at: string;
  updated_at: string;
}

interface BrandMemoriesManagerProps {
  brandId: string;
  category?: 'general' | 'preference' | 'guideline' | 'fact' | 'dos_donts';
  title?: string;
  description?: string;
  placeholder?: string;
}

export default function BrandMemoriesManager({
  brandId,
  category = 'general',
  title = 'Memories & Notes',
  description = 'Keep track of important facts, preferences, and insights about this brand',
  placeholder = 'Add a new memory...',
}: BrandMemoriesManagerProps) {
  const supabase = createClient();
  const [memories, setMemories] = useState<BrandMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newMemory, setNewMemory] = useState({ title: '', content: '' });
  const [editMemory, setEditMemory] = useState({ title: '', content: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadMemories();
  }, [brandId, category]);

  const loadMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('brand_memories')
        .select('*')
        .eq('brand_id', brandId)
        .eq('category', category)
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

  const handleAdd = async () => {
    if (!newMemory.title.trim() || !newMemory.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    try {
      const response = await fetch(`/api/brands/${brandId}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMemory.title,
          content: newMemory.content,
          category,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMemories([data.memory, ...memories]);
      setNewMemory({ title: '', content: '' });
      setShowAddForm(false);
      toast.success('Memory added!');
    } catch (error) {
      logger.error('Error adding memory:', error);
      toast.error('Failed to add memory');
    }
  };

  const handleUpdate = async (memoryId: string) => {
    if (!editMemory.title.trim() || !editMemory.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    try {
      const response = await fetch(`/api/brands/${brandId}/memories/${memoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editMemory),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMemories(memories.map(m => m.id === memoryId ? data.memory : m));
      setEditingId(null);
      toast.success('Memory updated!');
    } catch (error) {
      logger.error('Error updating memory:', error);
      toast.error('Failed to update memory');
    }
  };

  const handleDelete = async (memoryId: string) => {
    if (!confirm('Delete this memory?')) return;

    try {
      const response = await fetch(`/api/brands/${brandId}/memories/${memoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setMemories(memories.filter(m => m.id !== memoryId));
      toast.success('Memory deleted');
    } catch (error) {
      logger.error('Error deleting memory:', error);
      toast.error('Failed to delete memory');
    }
  };

  const startEdit = (memory: BrandMemory) => {
    setEditingId(memory.id);
    setEditMemory({ title: memory.title, content: memory.content });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditMemory({ title: '', content: '' });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
        <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Memory
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
          <input
            type="text"
            value={newMemory.title}
            onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
            placeholder="Memory title..."
            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <textarea
            value={newMemory.content}
            onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
            placeholder={placeholder}
            rows={3}
            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewMemory({ title: '', content: '' });
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Memories List */}
      <div className="space-y-3">
        {memories.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No memories yet</p>
            <p className="text-xs mt-1">Click "Add Memory" to get started</p>
          </div>
        ) : (
          memories.map((memory) => (
            <div
              key={memory.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {editingId === memory.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editMemory.title}
                    onChange={(e) => setEditMemory({ ...editMemory, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <textarea
                    value={editMemory.content}
                    onChange={(e) => setEditMemory({ ...editMemory, content: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(memory.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {memory.title}
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {memory.content}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Updated {new Date(memory.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(memory)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-all"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(memory.id)}
                        className="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-all"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

