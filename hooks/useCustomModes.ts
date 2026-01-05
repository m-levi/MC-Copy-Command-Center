import { useState, useEffect, useCallback } from 'react';
import { CustomMode } from '@/types';

/**
 * Hook to fetch and manage custom agents (formerly "modes")
 * The underlying data model is still CustomMode for backwards compatibility,
 * but the UI now refers to these as "Agents"
 */
export function useCustomModes() {
  const [customModes, setCustomModes] = useState<CustomMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModes = useCallback(async () => {
    try {
      const response = await fetch('/api/modes?active=true');
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      const data = await response.json();
      setCustomModes(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModes();
  }, [fetchModes]);

  const refetch = useCallback(() => {
    setLoading(true);
    return fetchModes();
  }, [fetchModes]);

  return {
    // Primary export - use "agents" for new code
    agents: customModes,
    // Legacy export for backwards compatibility
    customModes,
    loading,
    error,
    refetch,
  };
}

// Alias for new code - prefer this import
export const useAgents = useCustomModes;

























