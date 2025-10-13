import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './src/app/api/teams/[teamId]/subteams/route';
import { getServerUser } from '@/lib/supabaseServer';
import { getTeamAccessCockroach } from '@/lib/utils/team-auth-v2';
import { dbPg } from '@/lib/db';

// Mock dependencies
vi.mock('@/lib/supabaseServer', () => ({
  getServerUser: vi.fn()
}));

vi.mock('@/lib/utils/team-auth-v2', () => ({
  getTeamAccessCockroach: vi.fn()
}));

vi.mock('@/lib/db', () => ({
  dbPg: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis()
  }
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockGetTeamAccessCockroach = vi.mocked(getTeamAccessCockroach);
const mockDbPg = vi.mocked(dbPg);

describe('Debug Subteams Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should return 404 when team group is not found', async () => {
    mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
    
    // Mock the database chain to return empty result
    mockDbPg.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    } as any);

    const request = new NextRequest('http://localhost:3000/api/teams/team-456/subteams');
    const response = await GET(request, { params: Promise.resolve({ teamId: 'team-456' }) });

    console.log('Response status:', response.status);
    const body = await response.json();
    console.log('Response body:', body);

    expect(response.status).toBe(404);
    expect(body.error).toBe('Team group not found');
  });
});
