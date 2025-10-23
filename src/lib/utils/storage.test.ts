import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService, StorageKeys } from './storage';
import SyncLocalStorage from '@/lib/database/localStorage-replacement';

describe('StorageService', () => {
  beforeEach(() => {
    SyncLocalStorage.clear();
  });

  describe('get/set', () => {
    it('stores and retrieves objects', () => {
      const data = { name: 'test', count: 42 };
      StorageService.set('testKey', data);
      const retrieved = StorageService.get<typeof data>('testKey');
      expect(retrieved).toEqual(data);
    });

    it('returns null for non-existent keys', () => {
      const result = StorageService.get('nonExistent');
      expect(result).toBeNull();
    });

    it('handles arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      StorageService.set('testArray', arr);
      const retrieved = StorageService.get<number[]>('testArray');
      expect(retrieved).toEqual(arr);
    });
  });

  describe('getString/setString', () => {
    it('stores and retrieves plain strings', () => {
      StorageService.setString('testString', 'hello world');
      const retrieved = StorageService.getString('testString');
      expect(retrieved).toBe('hello world');
    });

    it('returns null for non-existent strings', () => {
      const result = StorageService.getString('nonExistent');
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('removes items from storage', () => {
      StorageService.set('toRemove', { data: 'test' });
      expect(StorageService.has('toRemove')).toBe(true);

      StorageService.remove('toRemove');
      expect(StorageService.has('toRemove')).toBe(false);
    });
  });

  describe('removeMultiple', () => {
    it('removes multiple items at once', () => {
      StorageService.set('key1', 'value1');
      StorageService.set('key2', 'value2');
      StorageService.set('key3', 'value3');

      StorageService.removeMultiple(['key1', 'key2']);

      expect(StorageService.has('key1')).toBe(false);
      expect(StorageService.has('key2')).toBe(false);
      expect(StorageService.has('key3')).toBe(true);
    });
  });

  describe('has', () => {
    it('checks if key exists', () => {
      expect(StorageService.has('testKey')).toBe(false);

      StorageService.set('testKey', 'value');
      expect(StorageService.has('testKey')).toBe(true);
    });
  });

  describe('getWithDefault', () => {
    it('returns stored value if exists', () => {
      StorageService.set('testKey', { count: 10 });
      const result = StorageService.getWithDefault('testKey', { count: 0 });
      expect(result).toEqual({ count: 10 });
    });

    it('returns default value if key does not exist', () => {
      const result = StorageService.getWithDefault('nonExistent', { count: 0 });
      expect(result).toEqual({ count: 0 });
    });
  });

  describe('error handling', () => {
    it('handles JSON parse errors gracefully', () => {
      SyncLocalStorage.setItem('invalidJSON', 'not valid json {');
      const result = StorageService.get('invalidJSON');
      expect(result).toBeNull();
    });
  });

  describe('StorageKeys', () => {
    it('has all expected keys', () => {
      expect(StorageKeys.TEST_QUESTIONS).toBe('testQuestions');
      expect(StorageKeys.TEST_USER_ANSWERS).toBe('testUserAnswers');
      expect(StorageKeys.CODEBUSTERS_PREFERENCES).toBe('scio_codebusters_preferences');
    });
  });
});
