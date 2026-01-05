import { useState, useEffect, useCallback } from 'react';
import { AIModelOption } from '@/types';
import { AI_MODELS } from '@/lib/ai-models';

interface EnabledModelsState {
  models: AIModelOption[];
  defaultModel: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch user's enabled AI models
 * Fetches available models from API and filters based on user preferences
 */
export function useEnabledModels() {
  const [state, setState] = useState<EnabledModelsState>({
    models: AI_MODELS, // Default to hardcoded models while loading
    defaultModel: null,
    loading: true,
    error: null,
  });

  const fetchEnabledModels = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Fetch both available models and user preferences in parallel
      const [modelsResponse, prefsResponse] = await Promise.all([
        fetch('/api/ai-models'),
        fetch('/api/user-preferences'),
      ]);
      
      // Get available models from API
      let availableModels: AIModelOption[] = AI_MODELS;
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        if (modelsData.models && modelsData.models.length > 0) {
          availableModels = modelsData.models.map((m: any) => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
          }));
        }
      }
      
      // Get user preferences
      if (!prefsResponse.ok) {
        // If unauthorized or error, return all available models
        setState({
          models: availableModels,
          defaultModel: null,
          loading: false,
          error: null,
        });
        return;
      }

      const prefs = await prefsResponse.json();
      
      // If enabled_models is null, all models are enabled
      // Otherwise, filter available models to only show enabled ones
      let enabledModels: AIModelOption[];
      if (prefs.enabled_models === null) {
        enabledModels = availableModels;
      } else if (Array.isArray(prefs.enabled_models) && prefs.enabled_models.length > 0) {
        enabledModels = availableModels.filter(model => 
          prefs.enabled_models.includes(model.id)
        );
      } else {
        enabledModels = availableModels;
      }

      setState({
        models: enabledModels.length > 0 ? enabledModels : availableModels,
        defaultModel: prefs.default_model,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching enabled models:', error);
      setState({
        models: AI_MODELS,
        defaultModel: null,
        loading: false,
        error: 'Failed to load model preferences',
      });
    }
  }, []);

  useEffect(() => {
    fetchEnabledModels();
  }, [fetchEnabledModels]);

  return {
    ...state,
    refresh: fetchEnabledModels,
  };
}

/**
 * Get enabled models synchronously from cache (if available)
 * This is useful for components that need immediate access
 */
export function getEnabledModelsFromCache(): AIModelOption[] {
  if (typeof window === 'undefined') return AI_MODELS;
  
  const cached = localStorage.getItem('user_preferences_cache');
  if (!cached) return AI_MODELS;
  
  try {
    const { data } = JSON.parse(cached);
    if (!data?.enabled_models) return AI_MODELS;
    
    const enabledModels = AI_MODELS.filter(model => 
      data.enabled_models.includes(model.id)
    );
    
    return enabledModels.length > 0 ? enabledModels : AI_MODELS;
  } catch {
    return AI_MODELS;
  }
}

/**
 * Get the default model from cache
 */
export function getDefaultModelFromCache(): string | null {
  if (typeof window === 'undefined') return null;
  
  const cached = localStorage.getItem('user_preferences_cache');
  if (!cached) return null;
  
  try {
    const { data } = JSON.parse(cached);
    return data?.default_model || null;
  } catch {
    return null;
  }
}

