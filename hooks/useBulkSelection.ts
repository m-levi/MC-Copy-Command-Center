'use client';

import { useState, useCallback } from 'react';

interface UseBulkSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
}

interface UseBulkSelectionReturn {
  /** Whether bulk selection mode is active */
  bulkSelectMode: boolean;
  /** Set of currently selected item IDs */
  selectedIds: Set<string>;
  /** Last selected index for shift+click range selection */
  lastSelectedIndex: number | null;
  /** Toggle bulk selection mode on/off */
  toggleBulkSelectMode: () => void;
  /** Enable bulk selection mode */
  enableBulkSelectMode: () => void;
  /** Disable bulk selection mode and clear selections */
  disableBulkSelectMode: () => void;
  /** Toggle selection of a single item with support for shift/ctrl+click */
  toggleItemSelection: (itemId: string, event?: React.MouseEvent) => void;
  /** Select all items */
  selectAll: () => void;
  /** Clear all selections */
  clearSelections: () => void;
  /** Check if an item is selected */
  isSelected: (itemId: string) => boolean;
  /** Number of selected items */
  selectedCount: number;
}

/**
 * Hook for managing bulk selection state and operations
 * Supports single click, shift+click range selection, and ctrl/cmd+click multi-selection
 */
export function useBulkSelection<T>({
  items,
  getItemId,
}: UseBulkSelectionOptions<T>): UseBulkSelectionReturn {
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const toggleBulkSelectMode = useCallback(() => {
    setBulkSelectMode(prev => {
      if (prev) {
        // Disabling - clear selections
        setSelectedIds(new Set());
        setLastSelectedIndex(null);
      }
      return !prev;
    });
  }, []);

  const enableBulkSelectMode = useCallback(() => {
    setBulkSelectMode(true);
  }, []);

  const disableBulkSelectMode = useCallback(() => {
    setBulkSelectMode(false);
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  const toggleItemSelection = useCallback((itemId: string, event?: React.MouseEvent) => {
    const currentIndex = items.findIndex(item => getItemId(item) === itemId);

    // Shift+Click: Range selection
    if (event?.shiftKey && lastSelectedIndex !== null && currentIndex !== -1) {
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = items.slice(start, end + 1).map(item => getItemId(item));

      setSelectedIds(prev => {
        const newSet = new Set(prev);
        rangeIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
    // Cmd/Ctrl+Click: Multi-select (toggle individual)
    else if (event?.metaKey || event?.ctrlKey) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
      setLastSelectedIndex(currentIndex);
    }
    // Normal click: Single selection (toggle)
    else {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(itemId)) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });
      setLastSelectedIndex(currentIndex);
    }
  }, [items, getItemId, lastSelectedIndex]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(item => getItemId(item))));
  }, [items, getItemId]);

  const clearSelections = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  const isSelected = useCallback((itemId: string) => {
    return selectedIds.has(itemId);
  }, [selectedIds]);

  return {
    bulkSelectMode,
    selectedIds,
    lastSelectedIndex,
    toggleBulkSelectMode,
    enableBulkSelectMode,
    disableBulkSelectMode,
    toggleItemSelection,
    selectAll,
    clearSelections,
    isSelected,
    selectedCount: selectedIds.size,
  };
}










