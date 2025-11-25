import type { EloData, EloMetadata } from "@/app/analytics/types/elo";
import { type DataLoadOptions, loadEloData } from "@/app/analytics/utils/dataLoader";
import { useCallback, useEffect, useMemo, useState } from "react";

// Regex for extracting state codes from school names (moved to top level for performance)
const STATE_CODE_REGEX = /\(([A-Z]{2})\)$/;

/**
 * Simplified hook for lazy loading Elo data with batched state updates
 * Provides loading states and updates data in batches of 5 states
 */
export function useLazyEloData(options: DataLoadOptions) {
  const [data, setData] = useState<EloData | null>(null);
  const [metadata, setMetadata] = useState<EloMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedStates, setLoadedStates] = useState<Set<string>>(new Set());
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number }>({
    loaded: 0,
    total: 0,
  });

  // Callback for batch loading progress
  const handleBatchLoaded = useCallback((batchStates: string[], totalStates: number) => {
    setLoadedStates((prev) => {
      const newSet = new Set(prev);
      for (const state of batchStates) {
        newSet.add(state);
      }
      return newSet;
    });
    setLoadingProgress({ loaded: batchStates.length, total: totalStates });
  }, []);

  // Memoize options to prevent infinite re-renders
  const memoizedOptions = useMemo(
    () => ({
      division: options.division,
      states: options.states,
      forceReload: options.forceReload,
      onBatchLoaded: handleBatchLoaded,
    }),
    [options.division, options.states, options.forceReload, handleBatchLoaded]
  );

  const handleInitialDataLoad = useCallback(
    (resultData: EloData | null) => {
      if (!resultData) {
        return;
      }

      const initialStates = new Set(Object.keys(resultData));
      setLoadedStates(initialStates);

      // Set background loading if we expect more data
      if (!memoizedOptions.states && initialStates.size > 0) {
        setBackgroundLoading(true);

        // Stop showing background loading after 5 seconds
        setTimeout(() => {
          setBackgroundLoading(false);
        }, 5000);
      }
    },
    [memoizedOptions.states]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await loadEloData(memoizedOptions);
        setData(result.data);
        setMetadata(result.metadata ?? null);
        setError(result.error);

        handleInitialDataLoad(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Elo data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [memoizedOptions, handleInitialDataLoad]);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await loadEloData({ ...memoizedOptions, forceReload: true });
      setData(result.data);
      setMetadata(result.metadata ?? null);
      setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reload Elo data");
    } finally {
      setLoading(false);
    }
  }, [memoizedOptions]);

  // Check if a specific state is loaded
  const isStateLoaded = useCallback(
    (stateCode: string) => {
      return loadedStates.has(stateCode);
    },
    [loadedStates]
  );

  // Check if data for a specific school is available
  const isSchoolDataAvailable = useCallback(
    (schoolName: string) => {
      if (!data) {
        return false;
      }

      // Extract state from school name (format: "School Name (STATE)")
      const stateMatch = schoolName.match(STATE_CODE_REGEX);
      if (!stateMatch) {
        return false;
      }

      const stateCode = stateMatch[1];
      if (!stateCode) {
        return false;
      }
      return (
        isStateLoaded(stateCode) &&
        data[stateCode]?.[schoolName.replace(` (${stateCode})`, "")] !== undefined
      );
    },
    [data, isStateLoaded]
  );

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
    isSchoolDataAvailable,
  };
}
