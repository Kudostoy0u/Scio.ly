import { useState, useEffect } from 'react';
import type { EloData } from '../types/elo';
import { loadEloData, type DataLoadOptions } from '../utils/dataLoader';

/**
 * Custom hook for managing Elo data loading
 * Provides loading state, error handling, and data caching
 */
export function useEloData(options: DataLoadOptions) {
  const [data, setData] = useState<EloData | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await loadEloData(options);
        setData(result.data);
        setMetadata(result.metadata);
        setError(result.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Elo data');
        console.error('Error loading Elo data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [options]);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await loadEloData({ ...options, forceReload: true });
      setData(result.data);
      setMetadata(result.metadata);
      setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload Elo data');
      console.error('Error reloading Elo data:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    metadata,
    loading,
    error,
    refetch
  };
}
