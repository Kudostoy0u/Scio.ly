import { useState, useEffect, useCallback, useMemo } from 'react';
import type { EloData } from '../types/elo';
import { loadEloData, type DataLoadOptions } from '../utils/dataLoader';

/**
 * Simplified hook for lazy loading Elo data with batched state updates
 * Provides loading states and updates data in batches of 5 states
 */
export function useLazyEloData(options: DataLoadOptions) {
  const [data, setData] = useState<EloData | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedStates, setLoadedStates] = useState<Set<string>>(new Set());
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number }>({ loaded: 0, total: 0 });

  // Callback for batch loading progress
  const handleBatchLoaded = useCallback((batchStates: string[], totalStates: number) => {
    setLoadedStates(prev => {
      const newSet = new Set(prev);
      batchStates.forEach(state => newSet.add(state));
      return newSet;
    });
    setLoadingProgress({ loaded: batchStates.length, total: totalStates });
  }, []);

  // Memoize options to prevent infinite re-renders
  const memoizedOptions = useMemo(() => ({
    division: options.division,
    states: options.states,
    forceReload: options.forceReload,
    onBatchLoaded: handleBatchLoaded
  }), [options.division, options.states, options.forceReload, handleBatchLoaded]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await loadEloData(memoizedOptions);
        setData(result.data);
        setMetadata(result.metadata);
        setError(result.error);
        
        // Track which states are initially loaded
        if (result.data) {
          const initialStates = new Set(Object.keys(result.data));
          setLoadedStates(initialStates);
          
          // Set background loading if we expect more data
          if (!memoizedOptions.states && initialStates.size > 0) {
            setBackgroundLoading(true);
            
            // Stop showing background loading after 5 seconds
            setTimeout(() => {
              setBackgroundLoading(false);
            }, 5000);
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
  }, [memoizedOptions]);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await loadEloData({ ...memoizedOptions, forceReload: true });
      setData(result.data);
      setMetadata(result.metadata);
      setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload Elo data');
      console.error('Error reloading Elo data:', err);
    } finally {
      setLoading(false);
    }
  }, [memoizedOptions]);

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
    loadingProgress,
    refetch,
    isStateLoaded,
    isSchoolDataAvailable
  };
}