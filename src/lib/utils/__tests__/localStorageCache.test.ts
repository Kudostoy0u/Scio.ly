/**
 * Tests for localStorage caching utility
 */

import { LocalStorageCache } from '../localStorageCache';

import { vi } from 'vitest';

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

describe('LocalStorageCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return null when no cached data exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = LocalStorageCache.get('test-key');
      
      expect(result).toBeNull();
      expect(localStorageMock.getItem).toHaveBeenCalledWith('scioly_cache_test-key');
    });

    it('should return cached data when it exists and is not expired', () => {
      const testData = { name: 'test', value: 123 };
      const cacheItem = {
        data: testData,
        timestamp: Date.now(),
        expiresIn: 5000
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheItem));
      
      const result = LocalStorageCache.get('test-key');
      
      expect(result).toEqual(testData);
    });

    it('should return null when cached data is expired', () => {
      const testData = { name: 'test', value: 123 };
      const cacheItem = {
        data: testData,
        timestamp: Date.now() - 10000, // 10 seconds ago
        expiresIn: 5000 // 5 seconds expiry
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheItem));
      
      const result = LocalStorageCache.get('test-key');
      
      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('scioly_cache_test-key');
    });
  });

  describe('set', () => {
    it('should store data with timestamp and expiry', () => {
      const testData = { name: 'test', value: 123 };
      const expiresIn = 5000;
      
      LocalStorageCache.set('test-key', testData, expiresIn);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'scioly_cache_test-key',
        expect.stringContaining(JSON.stringify(testData))
      );
    });
  });

  describe('remove', () => {
    it('should remove cached data', () => {
      LocalStorageCache.remove('test-key');
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('scioly_cache_test-key');
    });
  });

  describe('getTeamKey', () => {
    it('should generate correct team cache key', () => {
      const result = LocalStorageCache.getTeamKey('team-123', 'events');
      
      expect(result).toBe('team_team-123_events');
    });
  });

  describe('getUserKey', () => {
    it('should generate correct user cache key', () => {
      const result = LocalStorageCache.getUserKey('user-456', 'teams');
      
      expect(result).toBe('user_user-456_teams');
    });
  });
});
