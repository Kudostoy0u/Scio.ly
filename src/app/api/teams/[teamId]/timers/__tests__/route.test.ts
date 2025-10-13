import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';
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

describe('/api/teams/[teamId]/timers', () => {
  const mockUserId = 'user-123';
  const mockTeamId = 'team-456';
  // const mockGroupId = 'group-789';
  const mockSubteamId = 'subteam-999';
  const mockTimerId = 'timer-123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/teams/[teamId]/timers', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`);
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

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Not authorized to access this team');
    });

    it('should return timers when user has access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupAccessCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock timers query
      mockQueryCockroachDB.mockResolvedValue({
        rows: [
          {
            id: mockTimerId,
            event_name: 'Anatomy',
            duration: 50,
            team_unit_id: mockSubteamId,
            created_by: mockUserId,
            created_at: new Date('2024-01-01'),
            is_active: true
          }
        ]
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.timers).toHaveLength(1);
      expect(body.timers[0]).toEqual({
        id: mockTimerId,
        eventName: 'Anatomy',
        duration: 50,
        teamUnitId: mockSubteamId,
        createdBy: mockUserId,
        createdAt: new Date('2024-01-01'),
        isActive: true
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

      // Mock timers query
      mockQueryCockroachDB.mockResolvedValue({
        rows: []
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers?subteamId=${mockSubteamId}`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.timers).toHaveLength(0);
    });

    it('should return empty array when no timers exist', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupAccessCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock empty timers query
      mockQueryCockroachDB.mockResolvedValue({
        rows: []
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.timers).toHaveLength(0);
    });
  });

  describe('POST /api/teams/[teamId]/timers', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: 'POST',
        body: JSON.stringify({
          eventName: 'Anatomy',
          duration: 50,
          teamUnitId: mockSubteamId
        })
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

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: 'POST',
        body: JSON.stringify({
          eventName: 'Anatomy',
          duration: 50,
          teamUnitId: mockSubteamId
        })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Only captains and co-captains can manage timers');
    });

    it('should create timer when user has leadership access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock timer creation
      mockQueryCockroachDB.mockResolvedValue({
        rows: [{
          id: mockTimerId,
          event_name: 'Anatomy',
          duration: 50,
          team_unit_id: mockSubteamId,
          created_by: mockUserId,
          created_at: new Date('2024-01-01'),
          is_active: true
        }]
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: 'POST',
        body: JSON.stringify({
          eventName: 'Anatomy',
          duration: 50,
          teamUnitId: mockSubteamId
        })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.timer).toEqual({
        id: mockTimerId,
        eventName: 'Anatomy',
        duration: 50,
        teamUnitId: mockSubteamId,
        createdBy: mockUserId,
        createdAt: new Date('2024-01-01'),
        isActive: true
      });
    });

    it('should handle missing required fields', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: 'POST',
        body: JSON.stringify({
          duration: 50,
          teamUnitId: mockSubteamId
        })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Event name, duration, and team unit ID are required');
    });

    it('should handle invalid duration', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: 'POST',
        body: JSON.stringify({
          eventName: 'Anatomy',
          duration: -10,
          teamUnitId: mockSubteamId
        })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Duration must be a positive number');
    });
  });

  describe('DELETE /api/teams/[teamId]/timers', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: 'DELETE',
        body: JSON.stringify({
          timerId: mockTimerId
        })
      });
      const response = await DELETE(request, { params: Promise.resolve({ teamId: mockTeamId }) });

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

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: 'DELETE',
        body: JSON.stringify({
          timerId: mockTimerId
        })
      });
      const response = await DELETE(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Only captains and co-captains can manage timers');
    });

    it('should delete timer when user has leadership access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock timer deletion
      mockQueryCockroachDB.mockResolvedValue({
        rows: [{ id: mockTimerId }]
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: 'DELETE',
        body: JSON.stringify({
          timerId: mockTimerId
        })
      });
      const response = await DELETE(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Timer deleted successfully');
    });

    it('should handle missing timer ID', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: 'DELETE',
        body: JSON.stringify({})
      });
      const response = await DELETE(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Timer ID is required');
    });
  });
});
