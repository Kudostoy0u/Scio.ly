import { describe, it, expect, vi } from 'vitest';

// Mock DB import used within base52 to avoid loading Cockroach in tests
vi.mock('@/lib/db', () => ({ db: {} }));

import { encodeBase52, decodeBase52 } from './base52';

// Focus on pure helpers; DB-backed functions would need integration setup

describe('base52 encode/decode', () => {
  it('encodes fixed-size 4-char core for small indices', () => {
    expect(encodeBase52(0)).toHaveLength(4);
    expect(encodeBase52(1)).toHaveLength(4);
    expect(encodeBase52(52)).toHaveLength(4);
  });
  it('round-trips through decode for a range', () => {
    const limit = 52 ** 4;
    for (let i = 0; i < 1000; i += 37) {
      const v = i % limit;
      const core = encodeBase52(v);
      const back = decodeBase52(core);
      expect(back).toBe(v);
    }
  });
  it('rejects invalid decode inputs', () => {
    expect(() => decodeBase52('')).toThrow();
    expect(() => decodeBase52('abc')).toThrow();
    expect(() => decodeBase52('ab#d')).toThrow();
    expect(() => decodeBase52('ABCDE')).toThrow();
  });
});
