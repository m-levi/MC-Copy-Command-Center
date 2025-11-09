'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Brand } from '@/types';
import { logger } from '@/lib/logger';
import toast from 'react-hot-toast';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseBrandAutoSaveOptions {
  brandId: string;
  debounceMs?: number;
}

interface UseBrandAutoSaveReturn {
  saveStatus: SaveStatus;
  saveBrand: (updates: Partial<Brand>) => Promise<void>;
  hasUnsavedChanges: boolean;
}

/**
 * Hook for auto-saving brand updates with debouncing
 * Tracks save status and handles errors gracefully
 */
export function useBrandAutoSave({
  brandId,
  debounceMs = 500,
}: UseBrandAutoSaveOptions): UseBrandAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Partial<Brand> | null>(null);
  const supabase = createClient();

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const saveBrand = useCallback(
    async (updates: Partial<Brand>) => {
      // Store pending updates
      pendingUpdatesRef.current = {
        ...pendingUpdatesRef.current,
        ...updates,
      };
      setHasUnsavedChanges(true);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set status to saving after debounce
      timeoutRef.current = setTimeout(async () => {
        if (!pendingUpdatesRef.current) return;

        setSaveStatus('saving');

        try {
          const { error } = await supabase
            .from('brands')
            .update({
              ...pendingUpdatesRef.current,
              updated_at: new Date().toISOString(),
            })
            .eq('id', brandId);

          if (error) throw error;

          setSaveStatus('saved');
          setHasUnsavedChanges(false);
          pendingUpdatesRef.current = null;

          // Reset to idle after showing "saved" for 2 seconds
          setTimeout(() => {
            setSaveStatus('idle');
          }, 2000);
        } catch (error) {
          logger.error('Error auto-saving brand:', error);
          setSaveStatus('error');
          toast.error('Failed to save changes. Please try again.');
          
          // Reset to idle after showing error for 3 seconds
          setTimeout(() => {
            setSaveStatus('idle');
          }, 3000);
        }
      }, debounceMs);
    },
    [brandId, debounceMs, supabase]
  );

  return {
    saveStatus,
    saveBrand,
    hasUnsavedChanges,
  };
}

