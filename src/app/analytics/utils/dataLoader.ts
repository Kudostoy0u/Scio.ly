import type { EloData, EloMetadata } from "@/app/analytics/types/elo";

/**
 * Centralized data loading system for Elo ratings with lazy loading
 *
 * CURRENT STRUCTURE:
 * - Loads from state-based JSON files: /public/statesB/ and /public/statesC/
 * - State group JSON files: group-0.json, group-1.json, etc. (10 states per file)
 * - meta.json in each folder containing number->name mappings
 * - Lazy loading of state data as needed
 * - Preloads default schools for fast initial display
 */

export interface DataLoadOptions {
	division: "b" | "c";
	states?: string[];
	forceReload?: boolean;
	priorityStates?: string[]; // Custom priority states to load first
	onBatchLoaded?: (
		loadedStates: string[],
		totalStates: number,
		updatedData?: EloData,
	) => void;
}

export interface DataLoadResult {
	data: EloData | null;
	metadata?: EloMetadata;
	loading: boolean;
	error: string | null;
}

// Priority order for loading states
const PRIORITY_STATES = ["IL", "TX", "CA", "NY", "OH", "PA"];

const dataCache = new Map<
	string,
	{ data: EloData; metadata: EloMetadata; timestamp: number }
>();
const loadingGroups = new Set<string>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load Elo data for the specified division with lazy loading
 *
 * IMPLEMENTATION:
 * - Loads from state-based JSON files
 * - Uses meta.json for metadata mappings
 * - Preloads default schools for fast initial display
 * - Lazy loads remaining states in background
 */
async function loadMetadata(division: "b" | "c"): Promise<EloMetadata> {
	const metaResponse = await fetch(
		`/states${division.toUpperCase()}/meta.json`,
	);
	if (!metaResponse.ok) {
		throw new Error(
			`Failed to load metadata for division ${division}: ${metaResponse.status} ${metaResponse.statusText}`,
		);
	}
	return await metaResponse.json();
}

async function loadSpecificStates(
	division: "b" | "c",
	states: string[],
	metadata: EloMetadata,
): Promise<EloData> {
	const data: EloData = {};
	const stateToGroup = metadata.stateToGroup || {};
	const hasGrouping = Object.keys(stateToGroup).length > 0;
	const stateSet = new Set(states);

	if (!hasGrouping) {
		for (const stateCode of states) {
			const stateData = await loadStateData(division, stateCode);
			if (stateData) {
				data[stateCode] = stateData as EloData[string];
			}
		}
		return data;
	}

	const groupsToLoad = new Set<string>();

	for (const stateCode of states) {
		const groupId = stateToGroup[stateCode];
		if (groupId) {
			groupsToLoad.add(groupId);
		}
	}

	for (const groupId of groupsToLoad) {
		const groupData = await loadGroupData(division, groupId);
		if (groupData) {
			for (const [stateCode, stateData] of Object.entries(groupData)) {
				if (stateSet.has(stateCode)) {
					data[stateCode] = stateData as EloData[string];
				}
			}
		}
	}
	return data;
}

/**
 * Organize states into priority order: priority states first, then all others
 */
function organizeStatesByPriority(
	allStates: string[],
	customPriority?: string[],
): string[] {
	const priorityList = customPriority || PRIORITY_STATES;
	const prioritySet = new Set(priorityList);
	const priorityStates = priorityList.filter((state) =>
		allStates.includes(state),
	);
	const otherStates = allStates
		.filter((state) => !prioritySet.has(state))
		.sort();
	return [...priorityStates, ...otherStates];
}

function organizeGroupsByPriority(
	allStates: string[],
	stateToGroup: Record<string, string>,
	customPriority?: string[],
): string[] {
	const orderedStates = organizeStatesByPriority(allStates, customPriority);
	const groups: string[] = [];
	const seenGroups = new Set<string>();

	for (const stateCode of orderedStates) {
		const groupId = stateToGroup[stateCode];
		if (!groupId || seenGroups.has(groupId)) {
			continue;
		}
		seenGroups.add(groupId);
		groups.push(groupId);
	}

	return groups;
}

export async function loadEloData(
	options: DataLoadOptions,
): Promise<DataLoadResult> {
	const {
		division,
		states,
		forceReload = false,
		priorityStates,
		onBatchLoaded,
	} = options;

	try {
		const cacheKey = `${division}-${states?.join(",") || "all"}`;
		const cached = dataCache.get(cacheKey);

		if (
			!forceReload &&
			cached &&
			Date.now() - cached.timestamp < CACHE_DURATION
		) {
			return {
				data: cached.data,
				metadata: cached.metadata,
				loading: false,
				error: null,
			};
		}

		const metadata = await loadMetadata(division);

		// If specific states requested, load only those
		if (states) {
			const data = await loadSpecificStates(division, states, metadata);
			dataCache.set(cacheKey, { data, metadata, timestamp: Date.now() });
			return { data, metadata, loading: false, error: null };
		}

		// For full data load, return empty data immediately and start loading in background
		const allStates = Object.keys(metadata.states || {});
		const stateToGroup = metadata.stateToGroup || {};
		const hasGrouping = Object.keys(stateToGroup).length > 0;
		const organizedGroups = hasGrouping
			? organizeGroupsByPriority(allStates, stateToGroup, priorityStates)
			: organizeStatesByPriority(allStates, priorityStates);
		const data: EloData = {};

		// Cache empty initial data for immediate display
		dataCache.set(cacheKey, { data, metadata, timestamp: Date.now() });

		// Start loading all states in priority order in background
		loadRemainingStates(
			division,
			organizedGroups,
			data,
			metadata,
			cacheKey,
			onBatchLoaded,
			allStates.length,
		);

		// Return empty data immediately with total states count in metadata for progress tracking
		return {
			data,
			metadata: { ...metadata, totalStates: allStates.length },
			loading: false,
			error: null,
		};
	} catch (error) {
		return {
			data: null,
			metadata: undefined,
			loading: false,
			error: error instanceof Error ? error.message : "Failed to load Elo data",
		};
	}
}

/**
 * Load data for a single state
 */
async function loadGroupData(
	division: "b" | "c",
	groupId: string,
): Promise<Record<string, Record<string, unknown>> | null> {
	try {
		const groupResponse = await fetch(
			`/states${division.toUpperCase()}/${groupId}.json`,
		);
		if (groupResponse.ok) {
			return await groupResponse.json();
		}
		return null;
	} catch (_error) {
		return null;
	}
}

async function loadStateData(
	division: "b" | "c",
	stateCode: string,
): Promise<Record<string, unknown> | null> {
	try {
		const stateResponse = await fetch(
			`/states${division.toUpperCase()}/${stateCode}.json`,
		);
		if (stateResponse.ok) {
			return await stateResponse.json();
		}
		return null;
	} catch (_error) {
		return null;
	}
}

/**
 * Load states in background and update cache in batches
 * Updates state every 2 states loaded for frequent re-renders
 */
async function loadRemainingStates(
	division: "b" | "c",
	groupsToLoad: string[],
	data: EloData,
	metadata: EloMetadata,
	cacheKey: string,
	onBatchLoaded?: (
		loadedStates: string[],
		totalStates: number,
		updatedData?: EloData,
	) => void,
	totalStates?: number,
) {
	const batchSize = 8; // Load 8 states at a time for better performance
	const batches: string[][] = [];
	const stateToGroup = metadata.stateToGroup || {};
	const hasGrouping = Object.keys(stateToGroup).length > 0;

	// Split states into batches of 8
	for (let i = 0; i < groupsToLoad.length; i += batchSize) {
		batches.push(groupsToLoad.slice(i, i + batchSize));
	}

	// Process each batch
	for (const batch of batches) {
		const batchData: Record<string, Record<string, unknown>> = {};
		const batchLoadedStates = new Set<string>();

		// Load all states in current batch
		const loadPromises = batch.map(async (groupId) => {
			if (loadingGroups.has(groupId)) {
				return null;
			}

			loadingGroups.add(groupId);

			try {
				if (!hasGrouping) {
					const stateData = await loadStateData(division, groupId);
					if (stateData) {
						batchData[groupId] = stateData;
						batchLoadedStates.add(groupId);
					}
					return stateData;
				}

				const groupData = await loadGroupData(division, groupId);
				if (groupData) {
					for (const [stateCode, stateData] of Object.entries(groupData)) {
						batchData[stateCode] = stateData;
						batchLoadedStates.add(stateCode);
					}
				}
				return groupData;
			} finally {
				loadingGroups.delete(groupId);
			}
		});

		// Wait for all states in batch to load
		await Promise.all(loadPromises);

		// Update data and cache with entire batch
		if (Object.keys(batchData).length > 0) {
			// Add batch data to the data object
			for (const [stateCode, stateData] of Object.entries(batchData)) {
				data[stateCode] = stateData as EloData[string];
			}

			// Create a new object reference for React to detect the change
			// This ensures React sees the state update
			const updatedData: EloData = { ...data };

			dataCache.set(cacheKey, {
				data: updatedData,
				metadata,
				timestamp: Date.now(),
			});

			// Notify UI about batch completion with updated data
			if (onBatchLoaded && totalStates) {
				onBatchLoaded(Array.from(batchLoadedStates), totalStates, updatedData);
			}
		}

		// Minimal delay between batches to maximize throughput
		if (batches.indexOf(batch) < batches.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
	}
}

/**
 * Preload data for better performance
 * Can be called on app initialization
 */
export async function preloadEloData(): Promise<void> {
	try {
		await Promise.all([
			loadEloData({ division: "b" }),
			loadEloData({ division: "c" }),
		]);
	} catch {
		// Ignore preload errors
	}
}

/**
 * Clear the data cache
 * Useful for development or when data is updated
 */
export function clearDataCache(): void {
	dataCache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): { size: number; keys: string[] } {
	return {
		size: dataCache.size,
		keys: Array.from(dataCache.keys()),
	};
}

/**
 * Get available states for a division
 * This reads from meta.json
 */
export async function getAvailableStates(
	division: "b" | "c",
): Promise<string[]> {
	try {
		const response = await fetch(`/states${division.toUpperCase()}/meta.json`);
		if (!response.ok) {
			throw new Error(
				`Failed to load metadata for division ${division}: ${response.status} ${response.statusText}`,
			);
		}

		const metadata = await response.json();
		return Object.keys(metadata.states || {});
	} catch (_error) {
		return [];
	}
}
