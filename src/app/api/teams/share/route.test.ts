import { describe, it, expect, vi } from 'vitest';

function makeRequest(url: string, method: string, body?: any) {
  return new Request(url, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'Content-Type': 'application/json' } });
}

describe('teams slug APIs', () => {
  it('join-by-code rejects missing auth', async () => {
    vi.doMock('@/lib/supabaseServer', () => ({ createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));
    const mod = await import('../join-by-code/route');
    const req = makeRequest('http://localhost/api/teams/join-by-code', 'POST', { code: 'ABC' });
    const res = await mod.POST(req as any);
    const json = await (res as Response).json();
    expect((res as Response).status).toBe(401);
    expect(json.success).toBe(false);
  });

  it('units GET by slug returns success', async () => {
    const mod = await import('../units/route');
    const req = makeRequest('http://localhost/api/teams/units?slug=abc', 'GET');
    const res = await mod.GET(req as any);
    expect((res as Response).ok).toBe(true);
  });
});
