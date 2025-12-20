import { useState, useEffect, useCallback } from 'react';
import { CustomMode } from '@/types';

export function useCustomModes() {
  const [customModes, setCustomModes] = useState<CustomMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModes = useCallback(async () => {
    try {
      const response = await fetch('/api/modes?active=true');
      if (!response.ok) {
        throw new Error('Failed to fetch modes');
      }
      const data = await response.json();
      setCustomModes(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching custom modes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch modes');
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
    customModes,
    loading,
    error,
    refetch,
  };
}


