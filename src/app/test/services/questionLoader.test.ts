import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchBaseQuestions, fetchIdQuestions, supportsIdEvent } from './questionLoader';
import api from '../../api';

type AnyFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<any>;

describe('questionLoader service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // @ts-expect-error override navigator for online
    global.navigator = { onLine: true } as any;
  });

  it('supportsIdEvent recognizes base and variant event names', () => {
    expect(supportsIdEvent('Water Quality')).toBe(true);
    expect(supportsIdEvent('Water Quality - Freshwater')).toBe(true);
    expect(supportsIdEvent('Some Other Event')).toBe(false);
  });

  it('fetchIdQuestions hits idQuestions endpoint and maps images to imageData', async () => {
    const idRows = [
      { id: 'id1', question: 'Identify specimen', answers: [0], options: ['A','B'], difficulty: 0.3, event: 'Water Quality', subtopics: [], images: ['/id/img.png'] },
    ];
    const fetchMock = vi.fn<Parameters<AnyFetch>, ReturnType<AnyFetch>>((input: any) => {
      const url = typeof input === 'string' ? input : input?.toString?.() || '';
      if (url.startsWith(api.idQuestions)) {
        return Promise.resolve({ ok: true, json: async () => ({ data: idRows }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    // @ts-expect-error override global fetch
    global.fetch = fetchMock as any;

    const out = await fetchIdQuestions({ eventName: 'Water Quality - Freshwater', types: 'multiple-choice' }, 1);
    expect(out.length).toBe(1);
    expect(out[0].imageData).toContain('/id/img.png');
    const calls = (global.fetch as any).mock.calls.map((c: any[]) => c[0].toString());
    expect(calls[0].startsWith(api.idQuestions)).toBe(true);
  });

  it('fetchBaseQuestions hits questions endpoint with built params', async () => {
    const base = [{ id: 'q1', question: 'What is X?', options: ['A','B','C','D'], answers: [0], difficulty: 0.5 }];
    const fetchMock = vi.fn<Parameters<AnyFetch>, ReturnType<AnyFetch>>((input: any) => {
      const url = typeof input === 'string' ? input : input?.toString?.() || '';
      if (url.startsWith(api.questions)) {
        expect(url).toContain('limit=3');
        expect(url).toContain('event=Water%20Quality'); // base part extracted
        return Promise.resolve({ ok: true, json: async () => ({ data: base }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    });
    // @ts-expect-error override global fetch
    global.fetch = fetchMock as any;

    const out = await fetchBaseQuestions({ eventName: 'Water Quality - Freshwater', types: 'multiple-choice' }, 3);
    expect(out.length).toBe(1);
  });
});


