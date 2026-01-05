'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { trackDraftSaved, trackDraftRestored } from '@/lib/analytics';
import { logger } from '@/lib/logger';

interface DraftVersion {
  content: string;
  timestamp: number;
  characterCount: number;
}

const MAX_VERSIONS = 5;
const DRAFT_KEY_PREFIX = 'draft_';
const VERSIONS_KEY_PREFIX = 'draft_versions_';

// Custom event for draft version updates (avoids polling)
const DRAFT_VERSION_EVENT = 'draft-version-updated';

/**
 * Auto-save draft to localStorage with debouncing and versioning
 */
export function useDraftSave(
  conversationId: string | null,
  content: string,
  delay: number = 1000 // Faster save (1s instead of 2s)
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsSaving(true);

    // Set new timeout to save draft
    timeoutRef.current = setTimeout(() => {
      const draftKey = `${DRAFT_KEY_PREFIX}${conversationId}`;
      
      if (content.trim()) {
        try {
          // Save current draft
          localStorage.setItem(draftKey, content);
          
          // Save to version history
          saveDraftVersion(conversationId, content);
          
          setLastSaved(Date.now());
          trackDraftSaved();
        } catch (error) {
          logger.error('Failed to save draft:', error);
        }
      } else {
        localStorage.removeItem(draftKey);
      }
      
      setIsSaving(false);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [conversationId, content, delay]);

  return {
    lastSaved,
    isSaving,
  };
}

/**
 * Save draft version to history
 */
function saveDraftVersion(conversationId: string, content: string): void {
  try {
    const versionsKey = `${VERSIONS_KEY_PREFIX}${conversationId}`;
    const versionsData = localStorage.getItem(versionsKey);

    let versions: DraftVersion[] = versionsData ? JSON.parse(versionsData) : [];

    // Add new version
    versions.push({
      content,
      timestamp: Date.now(),
      characterCount: content.length,
    });

    // Keep only last N versions
    if (versions.length > MAX_VERSIONS) {
      versions = versions.slice(-MAX_VERSIONS);
    }

    localStorage.setItem(versionsKey, JSON.stringify(versions));

    // Dispatch event to notify listeners (avoids polling)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DRAFT_VERSION_EVENT, {
        detail: { conversationId }
      }));
    }
  } catch (error) {
    logger.error('Failed to save draft version:', error);
  }
}

/**
 * Load saved draft from localStorage
 */
export function loadDraft(conversationId: string): string {
  const draftKey = `${DRAFT_KEY_PREFIX}${conversationId}`;
  const draft = localStorage.getItem(draftKey) || '';
  
  if (draft) {
    trackDraftRestored();
  }
  
  return draft;
}

/**
 * Load draft versions
 */
export function loadDraftVersions(conversationId: string): DraftVersion[] {
  try {
    const versionsKey = `${VERSIONS_KEY_PREFIX}${conversationId}`;
    const versionsData = localStorage.getItem(versionsKey);
    
    return versionsData ? JSON.parse(versionsData) : [];
  } catch (error) {
    logger.error('Failed to load draft versions:', error);
    return [];
  }
}

/**
 * Restore a specific draft version
 */
export function restoreDraftVersion(
  conversationId: string,
  versionIndex: number
): string | null {
  try {
    const versions = loadDraftVersions(conversationId);
    
    if (versionIndex >= 0 && versionIndex < versions.length) {
      const version = versions[versionIndex];
      trackDraftRestored();
      return version.content;
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to restore draft version:', error);
    return null;
  }
}

/**
 * Clear saved draft
 */
export function clearDraft(conversationId: string): void {
  const draftKey = `${DRAFT_KEY_PREFIX}${conversationId}`;
  localStorage.removeItem(draftKey);
}

/**
 * Clear draft versions
 */
export function clearDraftVersions(conversationId: string): void {
  const versionsKey = `${VERSIONS_KEY_PREFIX}${conversationId}`;
  localStorage.removeItem(versionsKey);
}

/**
 * Hook to manage draft versions
 */
export function useDraftVersions(conversationId: string | null) {
  const [versions, setVersions] = useState<DraftVersion[]>([]);

  useEffect(() => {
    if (!conversationId) {
      setVersions([]);
      return;
    }

    const loadVersions = () => {
      const loaded = loadDraftVersions(conversationId);
      setVersions(loaded);
    };

    // Initial load
    loadVersions();

    // Listen for draft version updates (event-based, no polling)
    const handleVersionUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ conversationId: string }>;
      if (customEvent.detail?.conversationId === conversationId) {
        loadVersions();
      }
    };

    window.addEventListener(DRAFT_VERSION_EVENT, handleVersionUpdate);

    return () => {
      window.removeEventListener(DRAFT_VERSION_EVENT, handleVersionUpdate);
    };
  }, [conversationId]);

  const restore = useCallback(
    (versionIndex: number): string | null => {
      if (!conversationId) return null;
      return restoreDraftVersion(conversationId, versionIndex);
    },
    [conversationId]
  );

  const clear = useCallback(() => {
    if (!conversationId) return;
    clearDraftVersions(conversationId);
    setVersions([]);
  }, [conversationId]);

  return {
    versions,
    restore,
    clear,
  };
}


