import type { EloData } from '../types/elo';

/**
 * Centralized data loading system for Elo ratings with lazy loading
 * 
 * CURRENT STRUCTURE:
 * - Loads from state-based JSON files: /public/statesB/ and /public/statesC/
 * - Individual state JSON files: IL.json, CA.json, etc.
 * - meta.json in each folder containing number->name mappings
 * - Lazy loading of state data as needed
 * - Preloads default schools for fast initial display
 */

export interface DataLoadOptions {
  division: 'b' | 'c';
  states?: string[];
  forceReload?: boolean;
}

export interface DataLoadResult {
  data: EloData | null;
  metadata?: any;
  loading: boolean;
  error: string | null;
}

// Default schools to preload for fast initial display
const DEFAULT_SCHOOLS = {
  c: ['IL', 'TX'], // Stevenson (IL) + Seven Lakes (TX)
  b: ['IL', 'TX']  // Same states for Division B
};

const dataCache = new Map<string, { data: EloData; metadata: any; timestamp: number }>();
const loadingStates = new Set<string>();
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
export async function loadEloData(options: DataLoadOptions): Promise<DataLoadResult> {
  const { division, states, forceReload = false } = options;
  
  try {
    const cacheKey = `${division}-${states?.join(',') || 'all'}`;
    const cached = dataCache.get(cacheKey);
    
    if (!forceReload && cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return {
        data: cached.data,
        metadata: cached.metadata,
        loading: false,
        error: null
      };
    }

    // Load metadata first
    const metaResponse = await fetch(`/states${division.toUpperCase()}/meta.json`);
    if (!metaResponse.ok) {
      throw new Error(`Failed to load metadata for division ${division}: ${metaResponse.status} ${metaResponse.statusText}`);
    }
    
    const metadata = await metaResponse.json();
    
    // If specific states requested, load only those
    if (states) {
      const data: EloData = {};
      for (const stateCode of states) {
        const stateData = await loadStateData(division, stateCode);
        if (stateData) data[stateCode] = stateData;
      }
      
      dataCache.set(cacheKey, { data, metadata, timestamp: Date.now() });
      return { data, metadata, loading: false, error: null };
    }

    // For full data load, start with default schools for fast display
    const defaultStates = DEFAULT_SCHOOLS[division];
    const data: EloData = {};
    
    // Load default states first (synchronous for fast display)
    for (const stateCode of defaultStates) {
      const stateData = await loadStateData(division, stateCode);
      if (stateData) data[stateCode] = stateData;
    }
    
    // Cache initial data for immediate display
    dataCache.set(cacheKey, { data, metadata, timestamp: Date.now() });
    
    // Lazy load remaining states in background
    const allStates = Object.keys(metadata.states);
    const remainingStates = allStates.filter(state => !defaultStates.includes(state));
    
    // Start background loading
    loadRemainingStates(division, remainingStates, data, metadata, cacheKey);
    
    return {
      data,
      metadata,
      loading: false,
      error: null
    };
    
  } catch (error) {
    console.error('Error loading Elo data:', error);
    return {
      data: null,
      metadata: null,
      loading: false,
      error: error instanceof Error ? error.message : 'Failed to load Elo data'
    };
  }
}

/**
 * Load data for a single state
 */
async function loadStateData(division: 'b' | 'c', stateCode: string): Promise<any> {
  try {
    const stateResponse = await fetch(`/states${division.toUpperCase()}/${stateCode}.json`);
    if (stateResponse.ok) {
      return await stateResponse.json();
    } else {
      console.warn(`Failed to load data for state ${stateCode}: ${stateResponse.status}`);
      return null;
    }
  } catch (error) {
    console.warn(`Error loading state ${stateCode}:`, error);
    return null;
  }
}

/**
 * Load remaining states in background and update cache
 */
async function loadRemainingStates(
  division: 'b' | 'c', 
  remainingStates: string[], 
  data: EloData, 
  metadata: any, 
  cacheKey: string
) {
  for (const stateCode of remainingStates) {
    if (loadingStates.has(stateCode)) continue; // Avoid duplicate loading
    
    loadingStates.add(stateCode);
    try {
      const stateData = await loadStateData(division, stateCode);
      if (stateData) {
        data[stateCode] = stateData;
        // Update cache with new data
        dataCache.set(cacheKey, { data: { ...data }, metadata, timestamp: Date.now() });
      }
    } finally {
      loadingStates.delete(stateCode);
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
      loadEloData({ division: 'b' }),
      loadEloData({ division: 'c' })
    ]);
  } catch (error) {
    console.warn('Failed to preload Elo data:', error);
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
    keys: Array.from(dataCache.keys())
  };
}


/**
 * Get available states for a division
 * This reads from meta.json
 */
export async function getAvailableStates(division: 'b' | 'c'): Promise<string[]> {
  try {
    const response = await fetch(`/states${division.toUpperCase()}/meta.json`);
    if (!response.ok) {
      throw new Error(`Failed to load metadata for division ${division}: ${response.status} ${response.statusText}`);
    }
    
    const metadata = await response.json();
    return Object.keys(metadata.states || {});
  } catch (error) {
    console.error('Error loading available states:', error);
    return [];
  }
}
