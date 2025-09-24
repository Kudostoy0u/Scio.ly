import { describe, it, expect } from 'vitest';
import { clearPreviewLocalStorage } from './preview';

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

    for (const k of keys) localStorage.setItem(k, 'x');
    clearPreviewLocalStorage();
    for (const k of keys) expect(localStorage.getItem(k)).toBeNull();
    expect(localStorage.getItem('codebustersForceRefresh')).toBe('true');
  });
});


