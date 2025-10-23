import { describe, it, expect } from 'vitest';
import { clearPreviewLocalStorage } from './preview';
import SyncLocalStorage from '@/lib/database/localStorage-replacement';

describe('clearPreviewLocalStorage', () => {
  it('removes preview-related keys and sets force refresh', () => {
    const keys = [
      'codebustersQuotes',
      'codebustersQuoteIndices',
      'codebustersQuoteUUIDs',
      'codebustersShareData',
      'codebustersIsTestSubmitted',
      'codebustersTestScore',
      'codebustersTimeLeft',
      'codebustersRevealedLetters',
      'codebustersHintedLetters',
      'codebustersHintCounts',
      'codebustersQuotesLoadedFromStorage',
    ];

    for (const k of keys) SyncLocalStorage.setItem(k, 'x');
    clearPreviewLocalStorage();
    for (const k of keys) expect(SyncLocalStorage.getItem(k)).toBeNull();
    expect(SyncLocalStorage.getItem('codebustersForceRefresh')).toBe('true');
  });
});


