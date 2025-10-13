import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerUser } from '@/lib/supabaseServer';
import { checkTeamGroupAccessCockroach, checkTeamGroupLeadershipCockroach } from '@/lib/utils/team-auth';
import { queryCockroachDB } from '@/lib/cockroachdb';

// Mock dependencies
vi.mock('@/lib/supabaseServer', () => ({
  getServerUser: vi.fn()
}));

vi.mock('@/lib/utils/team-auth', () => ({
  checkTeamGroupAccessCockroach: vi.fn(),
  checkTeamGroupLeadershipCockroach: vi.fn()
}));

vi.mock('@/lib/cockroachdb', () => ({
  queryCockroachDB: vi.fn()
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockCheckTeamGroupAccessCockroach = vi.mocked(checkTeamGroupAccessCockroach);
const mockCheckTeamGroupLeadershipCockroach = vi.mocked(checkTeamGroupLeadershipCockroach);
const mockQueryCockroachDB = vi.mocked(queryCockroachDB);

describe('/api/teams/[teamId]/roster', () => {
  const mockUserId = 'user-123';
  const mockTeamId = 'team-456';
  // const mockGroupId = 'group-789';
  const mockSubteamId = 'subteam-999';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/teams/[teamId]/roster', () => {
    it('should return 500 when DATABASE_URL is missing', async () => {
      const originalEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/roster`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Database configuration error');

      // Restore environment
      process.env.DATABASE_URL = originalEnv;
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/roster`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 403 when user has no access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupAccessCockroach.mockResolvedValue({
        isAuthorized: false,
        hasMembership: false,
        hasRosterEntry: false,
        role: undefined
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/roster`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Not authorized to access this team');
    });

    it('should return roster data when user has access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupAccessCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock roster data query
      mockQueryCockroachDB.mockResolvedValue({
        rows: [
          {
            id: 'roster-1',
            user_id: 'user-456',
            team_unit_id: mockSubteamId,
            student_name: 'John Doe',
            event_name: 'Anatomy',
            created_at: new Date('2024-01-01')
          }
        ]
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/roster`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.roster).toHaveLength(1);
      expect(body.roster[0]).toEqual({
        id: 'roster-1',
        userId: 'user-456',
        teamUnitId: mockSubteamId,
        studentName: 'John Doe',
        eventName: 'Anatomy',
        createdAt: new Date('2024-01-01')
      });
    });

    it('should filter by subteam when subteamId is provided', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupAccessCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock roster data query
      mockQueryCockroachDB.mockResolvedValue({
        rows: []
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/roster?subteamId=${mockSubteamId}`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.roster).toHaveLength(0);
    });

    it('should return empty array when no roster data exists', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupAccessCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock empty roster data query
      mockQueryCockroachDB.mockResolvedValue({
        rows: []
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/roster`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.roster).toHaveLength(0);
    });
  });

  describe('POST /api/teams/[teamId]/roster', () => {
    it('should return 500 when DATABASE_URL is missing', async () => {
      const originalEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/roster`, {
        method: 'POST',
        body: JSON.stringify({ roster: [] })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Database configuration error');

      // Restore environment
      process.env.DATABASE_URL = originalEnv;
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/roster`, {
        method: 'POST',
        body: JSON.stringify({ roster: [] })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 403 when user has no leadership access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        isAuthorized: false,
        hasMembership: false,
        hasRosterEntry: false,
        role: 'member'
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/roster`, {
        method: 'POST',
        body: JSON.stringify({ roster: [] })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Only captains and co-captains can manage roster');
    });

    it('should update roster when user has leadership access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock roster update queries
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [] }) // Delete existing roster
        .mockResolvedValueOnce({ rows: [] }); // Insert new roster

      const rosterData = [
        {
          userId: 'user-456',
          teamUnitId: mockSubteamId,
          studentName: 'John Doe',
          eventName: 'Anatomy'
        }
      ];

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/roster`, {
        method: 'POST',
        body: JSON.stringify({ roster: rosterData })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Roster updated successfully');
    });

    it('should handle empty roster data', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock roster update queries
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [] }) // Delete existing roster
        .mockResolvedValueOnce({ rows: [] }); // Insert new roster (empty)

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/roster`, {
        method: 'POST',
        body: JSON.stringify({ roster: [] })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock database error
      mockQueryCockroachDB.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/roster`, {
        method: 'POST',
        body: JSON.stringify({ roster: [] })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });
});
