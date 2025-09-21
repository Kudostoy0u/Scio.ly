import { describe, it, expect } from 'vitest';
import { stripTrailingParenthetical } from './string';

describe('stripTrailingParenthetical', () => {
  it('removes trailing parenthetical groups', () => {
    expect(stripTrailingParenthetical('Foo (CA)')).toBe('Foo');
    expect(stripTrailingParenthetical('Bar (NY)  ')).toBe('Bar');
  });

  it('keeps inner parentheses not at the end', () => {
    expect(stripTrailingParenthetical('A (B) C')).toBe('A (B) C');
  });

  it('handles non-strings gracefully', () => {
    // @ts-expect-error testing runtime behavior
    expect(stripTrailingParenthetical(null)).toBe(null);
  });
});


