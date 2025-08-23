import type { EloData } from '../types/elo';

/**
 * Centralized data loading system for Elo ratings
 * 
 * CURRENT STRUCTURE:
 * - Loads from state-based JSON files: /public/statesB/ and /public/statesC/
 * - Individual state JSON files: IL.json, CA.json, etc.
 * - meta.json in each folder containing number->name mappings
 * - Lazy loading of state data as needed
 */

export interface DataLoadOptions {
  division: 'b' | 'c';
  states?: string[]; // For future: specific states to load
  forceReload?: boolean; // For future: bypass cache
}

export interface DataLoadResult {
  data: EloData | null;
  metadata?: any;
  loading: boolean;
  error: string | null;
}

// Cache for loaded data (for future optimization)
const dataCache = new Map<string, { data: EloData; metadata: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load Elo data for the specified division
 * 
 * IMPLEMENTATION:
 * - Loads from state-based JSON files
 * - Uses meta.json for metadata mappings
 * - No fallbacks to single files
 */
export async function loadEloData(options: DataLoadOptions): Promise<DataLoadResult> {
  const { division, states, forceReload = false } = options;
  
  // Clear cache to ensure fresh data with metadata is loaded
  dataCache.clear();
  
  try {
    // Check cache first (for future optimization)
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

    // Load state-based files
    const metaResponse = await fetch(`/states${division.toUpperCase()}/meta.json`);
    if (!metaResponse.ok) {
      throw new Error(`Failed to load metadata for division ${division}: ${metaResponse.status} ${metaResponse.statusText}`);
    }
    
    const metadata = await metaResponse.json();
    
    // Determine which states to load
    const statesToLoad = states || Object.keys(metadata.states);
    const data: EloData = {};
    
    // Load each state's data
    for (const stateCode of statesToLoad) {
      try {
        const stateResponse = await fetch(`/states${division.toUpperCase()}/${stateCode}.json`);
        if (stateResponse.ok) {
          const stateData = await stateResponse.json();
          // State data is already in the correct format, no conversion needed
          data[stateCode] = stateData;
        } else {
          console.warn(`Failed to load data for state ${stateCode}: ${stateResponse.status}`);
        }
      } catch (error) {
        console.warn(`Error loading state ${stateCode}:`, error);
      }
    }
    
    // Cache the result
    dataCache.set(cacheKey, { data, metadata, timestamp: Date.now() });
    
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
 * Preload data for better performance
 * Can be called on app initialization
 */
export async function preloadEloData(): Promise<void> {
  try {
    // Preload both divisions
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
 * Load specific state data on demand
 * This is used for lazy loading of state data
 */
export async function loadStateData(division: 'b' | 'c', stateCode: string): Promise<EloData | null> {
  try {
    const response = await fetch(`/states${division.toUpperCase()}/${stateCode}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load state ${stateCode}: ${response.status} ${response.statusText}`);
    }
    
    const stateData = await response.json();
    return { [stateCode]: stateData };
  } catch (error) {
    console.error(`Error loading state ${stateCode}:`, error);
    return null;
  }
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
