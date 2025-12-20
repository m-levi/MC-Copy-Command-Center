'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainIcon, PlusIcon, XIcon, SaveIcon, TagIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface QuickAddMemoryProps {
  brandId: string;
  onMemorySaved?: (memory: { title: string; content: string; category: string }) => void;
  className?: string;
}

const MEMORY_CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-gray-500' },
  { value: 'preference', label: 'Preference', color: 'bg-blue-500' },
  { value: 'guideline', label: 'Guideline', color: 'bg-green-500' },
  { value: 'fact', label: 'Fact', color: 'bg-yellow-500' },
  { value: 'dos_donts', label: "Do's & Don'ts", color: 'bg-red-500' },
];

export function QuickAddMemory({ brandId, onMemorySaved, className }: QuickAddMemoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/brands/${brandId}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save memory');
      }

      toast.success('Memory saved! AI will remember this.');
      onMemorySaved?.({ title, content, category });
      
      // Reset form
      setTitle('');
      setContent('');
      setCategory('general');
      setIsOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save memory');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
          "text-sm font-medium",
          isOpen
            ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30"
        )}
        title="Add memory"
      >
        <BrainIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Add Memory</span>
        {isOpen ? <XIcon className="w-3 h-3" /> : <PlusIcon className="w-3 h-3" />}
      </button>

      {/* Popup Form */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="absolute bottom-full mb-2 right-0 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          >
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <BrainIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Add Memory
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    AI will remember this for future conversations
                  </p>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Brand voice preference"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Content Input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="e.g., Always use casual, friendly tone with humor"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <TagIcon className="w-3 h-3 inline mr-1" />
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {MEMORY_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        category === cat.value
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !title.trim() || !content.trim()}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all",
                    isSaving || !title.trim() || !content.trim()
                      ? "bg-purple-400 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg"
                  )}
                >
                  {isSaving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        <BrainIcon className="w-4 h-4" />
                      </motion.div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-4 h-4" />
                      Save Memory
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default QuickAddMemory;























