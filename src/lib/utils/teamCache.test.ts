import { describe, it, expect, beforeEach, vi } from 'vitest';
import { teamCache } from './teamCache';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Object.keys for localStorage
Object.keys = vi.fn().mockImplementation((obj) => {
  if (obj === localStorageMock) {
    return ['scioly_team_cache_key1', 'scioly_team_cache_key2'];
  }
  return Object.getOwnPropertyNames(obj);
});

describe('TeamCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teamCache.invalidate(); // Clear all caches
  });

  it('should cache data in memory and localStorage', async () => {
    const testData = { test: 'data' };
    const cacheKey = 'test-key';
    
    // Mock localStorage to return null (no cached data)
    localStorageMock.getItem.mockReturnValue(null);
    
    const fetcher = vi.fn().mockResolvedValue(testData);
    
    // First call should fetch data
    const result = await teamCache.fetchWithCache(cacheKey, fetcher);
    
    expect(result).toEqual(testData);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'scioly_team_cache_test-key',
      expect.stringContaining('{"data":{"test":"data"},"timestamp":')
    );
    
    // Second call should return cached data
    const cachedResult = await teamCache.fetchWithCache(cacheKey, fetcher);
    expect(cachedResult).toEqual(testData);
    expect(fetcher).toHaveBeenCalledTimes(1); // Should not call fetcher again
  });

  it('should load from localStorage when memory cache is empty', async () => {
    const testData = { test: 'data' };
    const cacheKey = 'test-key';
    const timestamp = Date.now() - 1000; // 1 second ago
    
    // Mock localStorage to return cached data
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({ data: testData, timestamp })
    );
    
    const fetcher = vi.fn().mockResolvedValue(testData);
    
    // Should return cached data from localStorage
    const result = await teamCache.fetchWithCache(cacheKey, fetcher);
    expect(result).toEqual(testData);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('should handle expired cache from localStorage', async () => {
    const testData = { test: 'data' };
    const cacheKey = 'test-key';
    const timestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago (expired)
    
    // Mock localStorage to return expired cached data
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({ data: testData, timestamp })
    );
    
    const fetcher = vi.fn().mockResolvedValue(testData);
    
    // Should fetch fresh data since cache is expired
    const result = await teamCache.fetchWithCache(cacheKey, fetcher);
    expect(result).toEqual(testData);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('scioly_team_cache_test-key');
  });

  it('should prevent duplicate requests', async () => {
    const testData = { test: 'data' };
    const cacheKey = 'test-key';
    
    localStorageMock.getItem.mockReturnValue(null);
    
    const fetcher = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(testData), 100))
    );
    
    // Start multiple concurrent requests
    const promises = [
      teamCache.fetchWithCache(cacheKey, fetcher),
      teamCache.fetchWithCache(cacheKey, fetcher),
      teamCache.fetchWithCache(cacheKey, fetcher),
    ];
    
    const results = await Promise.all(promises);
    
    // All should return the same data
    results.forEach(result => expect(result).toEqual(testData));
    
    // Fetcher should only be called once
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should invalidate specific cache entries', () => {
    const cacheKey = 'test-key';
    const testData = { test: 'data' };
    
    // Set some data
    teamCache.set(cacheKey, testData);
    expect(teamCache.get(cacheKey)).toEqual(testData);
    
    // Invalidate specific key
    teamCache.invalidate(cacheKey);
    expect(teamCache.get(cacheKey)).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('scioly_team_cache_test-key');
  });

  it('should invalidate all cache entries', () => {
    const testData1 = { test: 'data1' };
    const testData2 = { test: 'data2' };
    
    // Set some data
    teamCache.set('key1', testData1);
    teamCache.set('key2', testData2);
    
    expect(teamCache.get('key1')).toEqual(testData1);
    expect(teamCache.get('key2')).toEqual(testData2);
    
    // Invalidate all
    teamCache.invalidate();
    expect(teamCache.get('key1')).toBeNull();
    expect(teamCache.get('key2')).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('scioly_team_cache_key1');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('scioly_team_cache_key2');
  });

  it('should return cache statistics', () => {
    const stats = teamCache.getStats();
    expect(stats).toHaveProperty('memoryEntries');
    expect(stats).toHaveProperty('backgroundTimers');
    expect(typeof stats.memoryEntries).toBe('number');
    expect(typeof stats.backgroundTimers).toBe('number');
  });

  it('should handle different cache configurations for different data types', async () => {
    const rosterData = { roster: 'data' };
    const streamData = { stream: 'data' };
    
    localStorageMock.getItem.mockReturnValue(null);
    
    const rosterFetcher = vi.fn().mockResolvedValue(rosterData);
    const streamFetcher = vi.fn().mockResolvedValue(streamData);
    
    // Test roster caching (5 minute duration)
    await teamCache.fetchWithCache('roster-team1-subteam1', rosterFetcher, 'roster');
    expect(rosterFetcher).toHaveBeenCalledTimes(1);
    
    // Test stream caching (2 minute duration)
    await teamCache.fetchWithCache('stream-team1-subteam1', streamFetcher, 'stream');
    expect(streamFetcher).toHaveBeenCalledTimes(1);
  });
});
