'use client';

import { useEffect, useRef } from 'react';

/**
 * Auto-save draft to localStorage with debouncing
 */
export function useDraftSave(
  conversationId: string | null,
  content: string,
  delay: number = 2000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to save draft
    timeoutRef.current = setTimeout(() => {
      const draftKey = `draft_${conversationId}`;
      
      if (content.trim()) {
        localStorage.setItem(draftKey, content);
      } else {
        localStorage.removeItem(draftKey);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [conversationId, content, delay]);
}

/**
 * Load saved draft from localStorage
 */
export function loadDraft(conversationId: string): string {
  const draftKey = `draft_${conversationId}`;
  return localStorage.getItem(draftKey) || '';
}

/**
 * Clear saved draft
 */
export function clearDraft(conversationId: string): void {
  const draftKey = `draft_${conversationId}`;
  localStorage.removeItem(draftKey);
}


