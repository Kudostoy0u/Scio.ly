import type { EloData, EloMetadata } from "@/app/analytics/types/elo";
import {
	type DataLoadOptions,
	loadEloData,
} from "@/app/analytics/utils/dataLoader";
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
	const [loadingProgress, setLoadingProgress] = useState<{
		loaded: number;
		total: number;
	}>({
		loaded: 0,
		total: 0,
	});

	// Callback for batch loading progress
	const handleBatchLoaded = useCallback(
		(batchStates: string[], totalStates: number, updatedData?: EloData) => {
			setLoadedStates((prev) => {
				const newSet = new Set(prev);
				for (const state of batchStates) {
					newSet.add(state);
				}
				return newSet;
			});
			// Update progress - track cumulative loaded states
			setLoadingProgress((prev) => {
				const newLoaded = prev.loaded + batchStates.length;
				const isComplete = newLoaded >= totalStates;
				// Hide progress bar when loading is complete
				if (isComplete) {
					setBackgroundLoading(false);
				}
				return {
					loaded: newLoaded,
					total: totalStates,
				};
			});
			// Update data every batch (every 8 states) for leaderboard
			// Batches are now 8 states, so this updates every 8 states
			if (updatedData) {
				setData(updatedData);
			}
		},
		[],
	);

	// Memoize options to prevent infinite re-renders
	const memoizedOptions = useMemo(
		() => ({
			division: options.division,
			states: options.states,
			forceReload: options.forceReload,
			priorityStates: options.priorityStates,
			onBatchLoaded: handleBatchLoaded,
		}),
		[
			options.division,
			options.states,
			options.forceReload,
			options.priorityStates,
			handleBatchLoaded,
		],
	);

	const handleInitialDataLoad = useCallback(
		(resultData: EloData | null, totalStates?: number) => {
			// Always set background loading if we expect more data (even if initial data is empty)
			if (!memoizedOptions.states && totalStates && totalStates > 0) {
				setBackgroundLoading(true);
				const initialStates = resultData ? Object.keys(resultData) : [];
				setLoadedStates(new Set(initialStates));
				setLoadingProgress({
					loaded: initialStates.length,
					total: totalStates,
				});
			} else if (resultData) {
				const initialStates = new Set(Object.keys(resultData));
				setLoadedStates(initialStates);
			}
		},
		[memoizedOptions.states],
	);

	useEffect(() => {
		const loadData = async () => {
			try {
				setLoading(true);
				setError(null);
				// Don't reset progress to 0/0 - let handleInitialDataLoad set it properly
				// This prevents the loading indicator from disappearing

				const result = await loadEloData(memoizedOptions);
				// Set data immediately (may be empty initially)
				setData(result.data);
				setMetadata(result.metadata ?? null);
				setError(result.error);

				const totalStates =
					(result.metadata as EloMetadata & { totalStates?: number })
						?.totalStates || 0;
				handleInitialDataLoad(result.data, totalStates);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load Elo data",
				);
				// Reset progress on error
				setLoadingProgress({ loaded: 0, total: 0 });
				setBackgroundLoading(false);
			} finally {
				// Set loading to false immediately so UI can render
				setLoading(false);
			}
		};

		loadData();
	}, [memoizedOptions, handleInitialDataLoad]);

	const refetch = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const result = await loadEloData({
				...memoizedOptions,
				forceReload: true,
			});
			setData(result.data);
			setMetadata(result.metadata ?? null);
			setError(result.error);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to reload Elo data",
			);
		} finally {
			setLoading(false);
		}
	}, [memoizedOptions]);

	// Check if a specific state is loaded
	const isStateLoaded = useCallback(
		(stateCode: string) => {
			return loadedStates.has(stateCode);
		},
		[loadedStates],
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
				data[stateCode]?.[schoolName.replace(` (${stateCode})`, "")] !==
					undefined
			);
		},
		[data, isStateLoaded],
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
