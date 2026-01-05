'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  CheckSquareIcon,
  SquareIcon,
  CopyIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  GripVerticalIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ChecklistItem, ChecklistArtifactMetadata } from '@/types/artifacts';

interface ChecklistArtifactViewProps {
  items: ChecklistItem[];
  title: string;
  metadata?: ChecklistArtifactMetadata;
  className?: string;
  isStreaming?: boolean;
  onUpdate?: (items: ChecklistItem[]) => void;
  editable?: boolean;
  showProgress?: boolean;
  allowAdd?: boolean;
}

/**
 * Checklist Artifact View - Interactive todo list with progress tracking
 */
export function ChecklistArtifactView({
  items: initialItems,
  title,
  metadata,
  className = '',
  isStreaming = false,
  onUpdate,
  editable = true,
  showProgress = metadata?.show_progress ?? true,
  allowAdd = metadata?.allow_add ?? true,
}: ChecklistArtifactViewProps) {
  const [items, setItems] = useState(initialItems);
  const [copied, setCopied] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Calculate progress
  const progress = useMemo(() => {
    if (items.length === 0) return 0;
    const checked = items.filter(i => i.checked).length;
    return Math.round((checked / items.length) * 100);
  }, [items]);

  const handleToggle = useCallback((id: string) => {
    const newItems = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(newItems);
    onUpdate?.(newItems);
  }, [items, onUpdate]);

  const handleCopy = useCallback(async () => {
    const text = items
      .map(item => `${item.checked ? '[x]' : '[ ]'} ${item.text}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [items]);

  const handleAddItem = useCallback(() => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim(),
      checked: false,
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    setNewItemText('');
    onUpdate?.(newItems);
  }, [newItemText, items, onUpdate]);

  const handleDeleteItem = useCallback((id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    onUpdate?.(newItems);
  }, [items, onUpdate]);

  const startEditing = useCallback((item: ChecklistItem) => {
    if (!editable) return;
    setEditingId(item.id);
    setEditText(item.text);
  }, [editable]);

  const finishEditing = useCallback(() => {
    if (!editingId) return;
    const newItems = items.map(item =>
      item.id === editingId ? { ...item, text: editText.trim() || item.text } : item
    );
    setItems(newItems);
    setEditingId(null);
    onUpdate?.(newItems);
  }, [editingId, editText, items, onUpdate]);

  const handleReorder = useCallback((newOrder: ChecklistItem[]) => {
    setItems(newOrder);
    onUpdate?.(newOrder);
  }, [onUpdate]);

  return (
    <div className={`rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
            <CheckSquareIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {items.filter(i => i.checked).length} of {items.length} completed
              {isStreaming && (
                <span className="ml-2 inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Loading...
                </span>
              )}
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className={`p-2 rounded-lg transition-colors ${
            copied
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title="Copy checklist"
        >
          {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
        </motion.button>
      </div>

      {/* Progress Bar */}
      {showProgress && items.length > 0 && (
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Progress</span>
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                progress === 100
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                  : 'bg-gradient-to-r from-violet-400 to-purple-500'
              }`}
            />
          </div>
        </div>
      )}

      {/* Items */}
      <div className="p-4 bg-white dark:bg-gray-900/50">
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={handleReorder}
          className="space-y-2"
        >
          <AnimatePresence>
            {items.map((item) => (
              <Reorder.Item
                key={item.id}
                value={item}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`group flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  item.checked
                    ? 'border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-900/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
                }`}
                style={{ marginLeft: item.indent ? `${item.indent * 24}px` : undefined }}
              >
                {editable && (
                  <div className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                    <GripVerticalIcon className="w-4 h-4" />
                  </div>
                )}

                <button
                  onClick={() => handleToggle(item.id)}
                  className={`flex-shrink-0 mt-0.5 transition-colors ${
                    item.checked
                      ? 'text-green-500 dark:text-green-400'
                      : 'text-gray-400 hover:text-violet-500'
                  }`}
                >
                  {item.checked ? (
                    <CheckSquareIcon className="w-5 h-5" />
                  ) : (
                    <SquareIcon className="w-5 h-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={finishEditing}
                      onKeyDown={e => {
                        if (e.key === 'Enter') finishEditing();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="w-full px-2 py-1 rounded border border-violet-400 dark:border-violet-500 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                      autoFocus
                    />
                  ) : (
                    <span
                      onDoubleClick={() => startEditing(item)}
                      className={`text-sm leading-relaxed ${
                        item.checked
                          ? 'line-through text-gray-500 dark:text-gray-400'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {item.text}
                    </span>
                  )}
                </div>

                {editable && (
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {/* Add new item */}
        {allowAdd && editable && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={e => setNewItemText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddItem();
              }}
              placeholder="Add new item..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddItem}
              disabled={!newItemText.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="w-4 h-4" />
            </motion.button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {editable ? 'Click to toggle • Double-click to edit • Drag to reorder' : 'Click to toggle items'}
        </p>
      </div>
    </div>
  );
}

export default ChecklistArtifactView;
