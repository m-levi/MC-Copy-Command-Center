'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Brand } from '@/types';
import { 
  BrainIcon, 
  PlusIcon, 
  SearchIcon, 
  FilterIcon,
  ArrowLeftIcon,
  TrashIcon,
  EditIcon,
  TagIcon,
  SparklesIcon,
  ClockIcon,
  RefreshCwIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
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

const CATEGORY_CONFIG = {
  general: { label: 'General', color: 'bg-gray-500', bgLight: 'bg-gray-100 dark:bg-gray-800', textColor: 'text-gray-700 dark:text-gray-300' },
  preference: { label: 'Preference', color: 'bg-blue-500', bgLight: 'bg-blue-100 dark:bg-blue-900/50', textColor: 'text-blue-700 dark:text-blue-300' },
  guideline: { label: 'Guideline', color: 'bg-green-500', bgLight: 'bg-green-100 dark:bg-green-900/50', textColor: 'text-green-700 dark:text-green-300' },
  fact: { label: 'Fact', color: 'bg-yellow-500', bgLight: 'bg-yellow-100 dark:bg-yellow-900/50', textColor: 'text-yellow-700 dark:text-yellow-300' },
  dos_donts: { label: "Do's & Don'ts", color: 'bg-red-500', bgLight: 'bg-red-100 dark:bg-red-900/50', textColor: 'text-red-700 dark:text-red-300' },
};

export default function MemoriesPage({ params }: { params: Promise<{ brandId: string }> }) {
  const resolvedParams = use(params);
  const brandId = resolvedParams.brandId;
  const router = useRouter();
  const supabase = createClient();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [memories, setMemories] = useState<BrandMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMemory, setEditingMemory] = useState<BrandMemory | null>(null);
  const [newMemory, setNewMemory] = useState({ title: '', content: '', category: 'general' });

  // Load brand data
  useEffect(() => {
    const loadBrand = async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();
      
      if (error) {
        toast.error('Failed to load brand');
        router.push('/');
        return;
      }
      setBrand(data);
    };
    loadBrand();
  }, [brandId, supabase, router]);

  // Load memories
  const loadMemories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/brands/${brandId}/memories`);
      const data = await response.json();
      
      // Gracefully handle errors - show empty state
      if (!response.ok && response.status !== 503) {
        logger.warn('Memories API returned error:', data.error);
      }
      setMemories(data.memories || []);
    } catch (error) {
      // Silently handle errors - just show empty state
      logger.warn('Error loading memories (showing empty state):', error);
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Filter memories
  const filteredMemories = memories.filter(memory => {
    const matchesSearch = !searchQuery || 
      memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || memory.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group memories by category
  const memoriesByCategory = filteredMemories.reduce((acc, memory) => {
    if (!acc[memory.category]) acc[memory.category] = [];
    acc[memory.category].push(memory);
    return acc;
  }, {} as Record<string, BrandMemory[]>);

  // Handle add memory
  const handleAddMemory = async () => {
    if (!newMemory.title.trim() || !newMemory.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    try {
      const response = await fetch(`/api/brands/${brandId}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemory),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      toast.success('Memory saved! AI will remember this.');
      setNewMemory({ title: '', content: '', category: 'general' });
      setShowAddForm(false);
      loadMemories();
    } catch (error) {
      toast.error('Failed to save memory');
    }
  };

  // Handle update memory
  const handleUpdateMemory = async () => {
    if (!editingMemory) return;

    try {
      const response = await fetch(`/api/brands/${brandId}/memories/${editingMemory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingMemory.title,
          content: editingMemory.content,
          category: editingMemory.category,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      toast.success('Memory updated!');
      setEditingMemory(null);
      loadMemories();
    } catch (error) {
      toast.error('Failed to update memory');
    }
  };

  // Handle delete memory
  const handleDeleteMemory = async (memoryId: string) => {
    if (!confirm('Delete this memory? The AI will no longer remember this.')) return;

    try {
      const response = await fetch(`/api/brands/${brandId}/memories/${memoryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      toast.success('Memory deleted');
      loadMemories();
    } catch (error) {
      toast.error('Failed to delete memory');
    }
  };

  if (!brand) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-3">
          <BrainIcon className="w-8 h-8 text-purple-500" />
          <span className="text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/brands/${brandId}`)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                  <BrainIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Brand Memories
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {brand.name} • {memories.length} memories
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadMemories}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCwIcon className={cn("w-5 h-5", loading && "animate-spin")} />
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                Add Memory
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  !selectedCategory
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                All
              </button>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    selectedCategory === key
                      ? "bg-purple-600 text-white"
                      : `${config.bgLight} ${config.textColor} hover:opacity-80`
                  )}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Info Banner */}
        <div className="mb-8 p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl">
          <div className="flex items-start gap-3">
            <SparklesIcon className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                AI-Powered Memory
              </p>
              <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">
                These memories are automatically used by the AI to personalize responses. 
                Add important facts, preferences, and guidelines that the AI should remember.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-gray-900 rounded-xl p-6">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full mb-4">
              <BrainIcon className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {searchQuery || selectedCategory ? 'No memories found' : 'No memories yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {searchQuery || selectedCategory 
                ? 'Try adjusting your search or filters'
                : 'Add memories to help the AI understand your brand better. These will be automatically used in conversations.'}
            </p>
            {!searchQuery && !selectedCategory && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
              >
                <PlusIcon className="w-5 h-5" />
                Add Your First Memory
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(memoriesByCategory).map(([category, categoryMemories]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={cn("w-3 h-3 rounded-full", CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]?.color || 'bg-gray-500')} />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]?.label || category}
                  </h2>
                  <span className="text-sm text-gray-500">({categoryMemories.length})</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {categoryMemories.map((memory, index) => (
                      <motion.div
                        key={memory.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow group"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                            {memory.title}
                          </h3>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingMemory(memory)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                              title="Edit"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMemory(memory.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
                          {memory.content}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full",
                            CATEGORY_CONFIG[memory.category]?.bgLight
                          )}>
                            <TagIcon className="w-3 h-3 inline mr-1" />
                            {CATEGORY_CONFIG[memory.category]?.label}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {new Date(memory.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
                    <BrainIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      Add New Memory
                    </h2>
                    <p className="text-sm text-gray-500">
                      AI will remember this in future conversations
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newMemory.title}
                    onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
                    placeholder="e.g., Brand voice preference"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content
                  </label>
                  <textarea
                    value={newMemory.content}
                    onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                    placeholder="e.g., Always use casual, friendly tone with occasional humor"
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => setNewMemory({ ...newMemory, category: key })}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                          newMemory.category === key
                            ? "bg-purple-600 text-white shadow-md"
                            : `${config.bgLight} ${config.textColor} hover:opacity-80`
                        )}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMemory}
                    disabled={!newMemory.title.trim() || !newMemory.content.trim()}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg font-medium transition-all",
                      !newMemory.title.trim() || !newMemory.content.trim()
                        ? "bg-purple-400 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg"
                    )}
                  >
                    <BrainIcon className="w-4 h-4" />
                    Save Memory
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Memory Modal */}
      <AnimatePresence>
        {editingMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEditingMemory(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                    <EditIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      Edit Memory
                    </h2>
                    <p className="text-sm text-gray-500">
                      Update this memory
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingMemory.title}
                    onChange={(e) => setEditingMemory({ ...editingMemory, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content
                  </label>
                  <textarea
                    value={editingMemory.content}
                    onChange={(e) => setEditingMemory({ ...editingMemory, content: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => setEditingMemory({ ...editingMemory, category: key as BrandMemory['category'] })}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                          editingMemory.category === key
                            ? "bg-blue-600 text-white shadow-md"
                            : `${config.bgLight} ${config.textColor} hover:opacity-80`
                        )}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditingMemory(null)}
                    className="flex-1 px-4 py-2.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateMemory}
                    disabled={!editingMemory.title.trim() || !editingMemory.content.trim()}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg font-medium transition-all",
                      !editingMemory.title.trim() || !editingMemory.content.trim()
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg"
                    )}
                  >
                    <EditIcon className="w-4 h-4" />
                    Update Memory
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

