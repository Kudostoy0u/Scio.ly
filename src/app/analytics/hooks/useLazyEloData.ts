import { useState, useEffect, useCallback } from 'react';
import type { EloData } from '../types/elo';
import { loadEloData, type DataLoadOptions } from '../utils/dataLoader';

/**
 * Enhanced hook for lazy loading Elo data
 * Provides loading states for queries before full data is loaded
 */
export function useLazyEloData(options: DataLoadOptions) {
  const [data, setData] = useState<EloData | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedStates, setLoadedStates] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await loadEloData(options);
        setData(result.data);
        setMetadata(result.metadata);
        setError(result.error);
        
        // Track which states are initially loaded
        if (result.data) {
          const initialStates = new Set(Object.keys(result.data));
          setLoadedStates(initialStates);
          
          // Set background loading if we expect more data
          if (!options.states && initialStates.size > 0) {
            setBackgroundLoading(true);
            
            // Simple background loading indicator
            setTimeout(() => {
              setBackgroundLoading(false);
            }, 5000); // Stop showing background loading after 5 seconds
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Elo data');
        console.error('Error loading Elo data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [options]);

  const refetch = useCallback(async () => {
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
  }, [options]);

  // Check if a specific state is loaded
  const isStateLoaded = useCallback((stateCode: string) => {
    return loadedStates.has(stateCode);
  }, [loadedStates]);

  // Check if data for a specific school is available
  const isSchoolDataAvailable = useCallback((schoolName: string) => {
    if (!data) return false;
    
    // Extract state from school name (format: "School Name (STATE)")
    const stateMatch = schoolName.match(/\(([A-Z]{2})\)$/);
    if (!stateMatch) return false;
    
    const stateCode = stateMatch[1];
    return isStateLoaded(stateCode) && data[stateCode]?.[schoolName.replace(` (${stateCode})`, '')];
  }, [data, isStateLoaded]);

  return {
    data,
    metadata,
    loading,
    backgroundLoading,
    error,
    loadedStates: Array.from(loadedStates),
    refetch,
    isStateLoaded,
    isSchoolDataAvailable
  };
}
