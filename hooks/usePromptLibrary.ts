import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  SavedPrompt,
  CreatePromptInput,
  UpdatePromptInput,
} from '@/types/prompts';
import { ConversationMode } from '@/types';

interface UsePromptLibraryOptions {
  mode?: ConversationMode;
  activeOnly?: boolean;
}

interface UsePromptLibraryReturn {
  prompts: SavedPrompt[];
  isLoading: boolean;
  error: string | null;
  
  // CRUD operations
  createPrompt: (input: CreatePromptInput) => Promise<SavedPrompt | null>;
  updatePrompt: (id: string, input: UpdatePromptInput) => Promise<SavedPrompt | null>;
  deletePrompt: (id: string) => Promise<boolean>;
  
  // Helpers
  getPromptsForMode: (mode: ConversationMode) => SavedPrompt[];
  refresh: () => Promise<void>;
}

export function usePromptLibrary(options: UsePromptLibraryOptions = {}): UsePromptLibraryReturn {
  const { mode, activeOnly = true } = options;
  
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch prompts
  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (mode) params.set('mode', mode);
      
      const url = `/api/prompts${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      
      const data = await response.json();
      let fetchedPrompts = data.prompts || [];
      
      // Filter to active only if requested
      if (activeOnly) {
        fetchedPrompts = fetchedPrompts.filter((p: SavedPrompt) => p.is_active);
      }
      
      setPrompts(fetchedPrompts);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching prompts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [mode, activeOnly]);

  // Initial fetch
  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Create a new prompt
  const createPrompt = useCallback(async (input: CreatePromptInput): Promise<SavedPrompt | null> => {
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create prompt');
      }
      
      const data = await response.json();
      setPrompts(prev => [...prev, data.prompt]);
      toast.success('Prompt created!');
      return data.prompt;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(message);
      return null;
    }
  }, []);

  // Update a prompt
  const updatePrompt = useCallback(async (id: string, input: UpdatePromptInput): Promise<SavedPrompt | null> => {
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update prompt');
      }
      
      const data = await response.json();
      setPrompts(prev => prev.map(p => p.id === id ? data.prompt : p));
      return data.prompt;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(message);
      return null;
    }
  }, []);

  // Delete a prompt
  const deletePrompt = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete prompt');
      }
      
      setPrompts(prev => prev.filter(p => p.id !== id));
      toast.success('Prompt deleted');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(message);
      return false;
    }
  }, []);

  // Get prompts for a specific mode
  const getPromptsForMode = useCallback((targetMode: ConversationMode): SavedPrompt[] => {
    return prompts.filter(p => p.modes.includes(targetMode) && p.is_active);
  }, [prompts]);

  return {
    prompts,
    isLoading,
    error,
    createPrompt,
    updatePrompt,
    deletePrompt,
    getPromptsForMode,
    refresh: fetchPrompts,
  };
}

export default usePromptLibrary;























