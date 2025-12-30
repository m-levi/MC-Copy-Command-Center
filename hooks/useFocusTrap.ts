'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createFocusTrap } from '@/lib/accessibility';

interface UseFocusTrapOptions {
  /** Whether the trap is active */
  isActive: boolean;
  /** Callback when escape is pressed */
  onEscape?: () => void;
  /** Initial element to focus (selector or element) */
  initialFocus?: string | HTMLElement | null;
  /** Element to return focus to on close */
  returnFocus?: HTMLElement | null;
  /** Whether to auto-focus on activation */
  autoFocus?: boolean;
}

/**
 * Hook for trapping focus within a container (for modals, dialogs, etc.)
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const containerRef = useFocusTrap({
 *     isActive: isOpen,
 *     onEscape: onClose,
 *   });
 *
 *   return (
 *     <div ref={containerRef} role="dialog" aria-modal="true">
 *       ...
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions
) {
  const { isActive, onEscape, initialFocus, returnFocus, autoFocus = true } = options;

  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const trapRef = useRef<ReturnType<typeof createFocusTrap> | null>(null);

  // Store the previously focused element when activating
  useEffect(() => {
    if (isActive && autoFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isActive, autoFocus]);

  // Create and manage the focus trap
  useEffect(() => {
    if (!isActive || !containerRef.current) {
      if (trapRef.current) {
        trapRef.current.deactivate();
        trapRef.current = null;
      }
      return;
    }

    // Determine initial focus element
    let initialFocusElement: HTMLElement | null = null;
    if (typeof initialFocus === 'string') {
      initialFocusElement = containerRef.current.querySelector(initialFocus);
    } else if (initialFocus instanceof HTMLElement) {
      initialFocusElement = initialFocus;
    }

    // Determine return focus element
    const returnFocusElement = returnFocus || previousFocusRef.current;

    trapRef.current = createFocusTrap({
      container: containerRef.current,
      initialFocus: initialFocusElement,
      returnFocus: returnFocusElement,
      onEscape,
    });

    trapRef.current.activate();

    return () => {
      if (trapRef.current) {
        trapRef.current.deactivate();
        trapRef.current = null;
      }
    };
  }, [isActive, initialFocus, returnFocus, onEscape]);

  return containerRef;
}

/**
 * Hook for managing focus when a list of items changes
 * Useful for maintaining focus after items are added/removed
 */
export function useFocusManagement<T extends { id: string }>(
  items: T[],
  focusedId: string | null
) {
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const previousFocusedId = useRef<string | null>(null);

  // Register an item ref
  const registerRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      itemRefs.current.set(id, element);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  // Focus the current item when focusedId changes
  useEffect(() => {
    if (focusedId && focusedId !== previousFocusedId.current) {
      const element = itemRefs.current.get(focusedId);
      if (element) {
        element.focus();
      }
    }
    previousFocusedId.current = focusedId;
  }, [focusedId]);

  // When an item is removed, focus the next or previous item
  const handleItemRemoved = useCallback((removedId: string) => {
    const itemIds = items.map(item => item.id);
    const removedIndex = itemIds.indexOf(removedId);

    if (removedIndex === -1) return null;

    // Try to focus the next item, or the previous one
    const nextIndex = removedIndex < itemIds.length - 1 ? removedIndex + 1 : removedIndex - 1;

    if (nextIndex >= 0 && nextIndex < itemIds.length) {
      return itemIds[nextIndex];
    }

    return null;
  }, [items]);

  return {
    registerRef,
    handleItemRemoved,
    itemRefs: itemRefs.current,
  };
}

/**
 * Hook for roving tabindex pattern
 * Only one item in a group is tabbable at a time
 */
export function useRovingTabIndex<T extends HTMLElement = HTMLElement>(
  itemCount: number,
  initialIndex: number = 0
) {
  const focusedIndex = useRef(initialIndex);
  const itemRefs = useRef<(T | null)[]>([]);

  const setRef = useCallback((index: number) => (el: T | null) => {
    itemRefs.current[index] = el;
  }, []);

  const getTabIndex = useCallback((index: number) => {
    return index === focusedIndex.current ? 0 : -1;
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    let newIndex = index;
    let handled = false;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        newIndex = (index + 1) % itemCount;
        handled = true;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        newIndex = (index - 1 + itemCount) % itemCount;
        handled = true;
        break;
      case 'Home':
        newIndex = 0;
        handled = true;
        break;
      case 'End':
        newIndex = itemCount - 1;
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      focusedIndex.current = newIndex;
      itemRefs.current[newIndex]?.focus();
    }
  }, [itemCount]);

  const focusItem = useCallback((index: number) => {
    if (index >= 0 && index < itemCount) {
      focusedIndex.current = index;
      itemRefs.current[index]?.focus();
    }
  }, [itemCount]);

  return {
    setRef,
    getTabIndex,
    handleKeyDown,
    focusItem,
    focusedIndex: focusedIndex.current,
  };
}

export default useFocusTrap;
