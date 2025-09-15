import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabaseServer', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({ update: () => ({ eq: () => ({}) }) })
  }))
}));

vi.mock('@/lib/db/teams', () => ({
  loadTeamData: vi.fn(async (_school: string, _division: 'B'|'C') => ({ teams: [{ id: 'A', name: 'Team A', roster: {} }] }))
}));

function makeRequest(url: string, body: any) {
  const req = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
  return new NextRequest(req as any);
}

describe('/api/teams/join route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates body', async () => {
    const res = await POST(makeRequest('http://localhost/api/teams/join', {}) as any);
    expect(res.status).toBe(400);
  });

  it('rejects invalid code format', async () => {
    const res = await POST(makeRequest('http://localhost/api/teams/join', { code: 'BAD' }) as any);
    expect(res.status).toBe(400);
  });

  it('accepts valid code format and returns data', async () => {
    const res = await POST(makeRequest('http://localhost/api/teams/join', { code: 'School::C::A' }) as any);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.teamId).toBe('A');
  });
});
