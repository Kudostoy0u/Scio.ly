import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getServerUser } from '@/lib/supabaseServer';
import { getTeamAccessCockroach } from '@/lib/utils/team-auth-v2';
import { dbPg } from '@/lib/db';
import { getUserDisplayInfo } from '@/lib/services/cockroachdb-teams';
import { queryCockroachDB } from '@/lib/cockroachdb';

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
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis()
  }
}));

vi.mock('@/lib/services/cockroachdb-teams', () => ({
  getUserDisplayInfo: vi.fn()
}));

vi.mock('@/lib/cockroachdb', () => ({
  queryCockroachDB: vi.fn()
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockGetTeamAccessCockroach = vi.mocked(getTeamAccessCockroach);
const mockDbPg = vi.mocked(dbPg);
const mockGetUserDisplayInfo = vi.mocked(getUserDisplayInfo);
const mockQueryCockroachDB = vi.mocked(queryCockroachDB);

describe('/api/teams/[teamId]/members', () => {
  const mockUserId = 'user-123';
  const mockTeamId = 'team-456';
  const mockGroupId = 'group-789';
  const mockSubteamId = 'subteam-999';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Default mock for queryCockroachDB to return empty results
    mockQueryCockroachDB.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/teams/[teamId]/members', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 404 when team group is not found', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockDbPg.select.mockResolvedValue([]);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Team group not found');
    });

    it('should return 403 when user has no access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockDbPg.select.mockResolvedValue([{ id: mockGroupId }]);
      mockGetTeamAccessCockroach.mockResolvedValue({
        hasAccess: false,
        isCreator: false,
        hasSubteamMembership: false,
        hasRosterEntries: false,
        subteamMemberships: [],
        rosterSubteams: []
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Not authorized to access this team');
    });

    it('should return team creator as member when user is creator', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockDbPg.select.mockResolvedValue([{ id: mockGroupId }]);
      mockGetTeamAccessCockroach.mockResolvedValue({
        hasAccess: true,
        isCreator: true,
        hasSubteamMembership: false,
        hasRosterEntries: false,
        subteamMemberships: [],
        rosterSubteams: []
      });
      mockGetUserDisplayInfo.mockResolvedValue({
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe'
      });
      mockDbPg.select.mockResolvedValue([]); // No subteam members

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members).toHaveLength(1);
      expect(body.members[0]).toEqual({
        id: mockUserId,
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        role: 'creator',
        subteam: null,
        joinedAt: null,
        events: [],
        isCreator: true
      });
    });

    it('should return subteam members when user has subteam membership', async () => {
      const otherUserId = 'user-456';
      
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockDbPg.select.mockResolvedValue([{ id: mockGroupId }]);
      mockGetTeamAccessCockroach.mockResolvedValue({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamMemberships: [],
        rosterSubteams: []
      });
      
      // Mock subteam members query
      mockDbPg.select.mockResolvedValueOnce([{
        userId: otherUserId,
        role: 'captain',
        joinedAt: new Date('2024-01-01'),
        teamUnitId: mockSubteamId,
        teamId: mockSubteamId,
        description: 'Team A'
      }]);
      
      // Mock user profiles query
      mockDbPg.select.mockResolvedValueOnce([{
        id: otherUserId,
        email: 'jane@example.com',
        displayName: 'Jane Smith',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith'
      }]);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members).toHaveLength(1);
      expect(body.members[0]).toEqual({
        id: otherUserId,
        name: 'Jane Smith',
        email: 'jane@example.com',
        username: 'janesmith',
        role: 'captain',
        subteam: {
          id: mockSubteamId,
          name: mockSubteamId,
          description: 'Team A'
        },
        joinedAt: new Date('2024-01-01'),
        events: [],
        isCreator: false
      });
    });

    it('should filter by subteam when subteamId is provided', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockDbPg.select.mockResolvedValue([{ id: mockGroupId }]);
      mockGetTeamAccessCockroach.mockResolvedValue({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamMemberships: [],
        rosterSubteams: []
      });
      mockDbPg.select.mockResolvedValue([]); // No members

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members?subteamId=${mockSubteamId}`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members).toHaveLength(0);
    });

    it('should handle multiple subteam memberships correctly', async () => {
      const user1Id = 'user-1';
      const user2Id = 'user-2';
      const subteam1Id = 'subteam-1';
      const subteam2Id = 'subteam-2';
      
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockDbPg.select.mockResolvedValue([{ id: mockGroupId }]);
      mockGetTeamAccessCockroach.mockResolvedValue({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamMemberships: [],
        rosterSubteams: []
      });
      
      // Mock subteam members query
      mockDbPg.select.mockResolvedValueOnce([
        {
          userId: user1Id,
          role: 'captain',
          joinedAt: new Date('2024-01-01'),
          teamUnitId: subteam1Id,
          teamId: subteam1Id,
          description: 'Team A'
        },
        {
          userId: user2Id,
          role: 'member',
          joinedAt: new Date('2024-01-02'),
          teamUnitId: subteam2Id,
          teamId: subteam2Id,
          description: 'Team B'
        }
      ]);
      
      // Mock user profiles query
      mockDbPg.select.mockResolvedValueOnce([
        {
          id: user1Id,
          email: 'user1@example.com',
          displayName: 'User One',
          firstName: 'User',
          lastName: 'One',
          username: 'user1'
        },
        {
          id: user2Id,
          email: 'user2@example.com',
          displayName: 'User Two',
          firstName: 'User',
          lastName: 'Two',
          username: 'user2'
        }
      ]);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members).toHaveLength(2);
      expect(body.members[0].role).toBe('captain');
      expect(body.members[1].role).toBe('member');
    });

    it('should include unlinked roster members in the response', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockDbPg.select.mockResolvedValue([{ id: mockGroupId }]);
      mockGetTeamAccessCockroach.mockResolvedValue({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamMemberships: [],
        rosterSubteams: []
      });
      
      // Mock subteam members query - no linked members
      mockDbPg.select.mockResolvedValueOnce([]);
      
      // Mock user profiles query - no user profiles
      mockDbPg.select.mockResolvedValueOnce([]);
      
      // Mock unlinked roster members query
      mockQueryCockroachDB.mockResolvedValueOnce({
        rows: [
          {
            student_name: 'Alice Johnson',
            team_unit_id: mockSubteamId,
            subteam_name: 'Team A',
            subteam_description: 'Division B Team A'
          },
          {
            student_name: 'Bob Smith',
            team_unit_id: mockSubteamId,
            subteam_name: 'Team A',
            subteam_description: 'Division B Team A'
          }
        ]
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members).toHaveLength(2);
      
      // Check first unlinked member
      expect(body.members[0]).toEqual({
        id: null,
        name: 'Alice Johnson',
        email: null,
        username: null,
        role: 'unlinked',
        subteam: {
          id: mockSubteamId,
          name: 'Team A',
          description: 'Division B Team A'
        },
        joinedAt: null,
        events: [],
        isCreator: false,
        isUnlinked: true
      });
      
      // Check second unlinked member
      expect(body.members[1]).toEqual({
        id: null,
        name: 'Bob Smith',
        email: null,
        username: null,
        role: 'unlinked',
        subteam: {
          id: mockSubteamId,
          name: 'Team A',
          description: 'Division B Team A'
        },
        joinedAt: null,
        events: [],
        isCreator: false,
        isUnlinked: true
      });
    });

    it('should include both linked and unlinked members in the response', async () => {
      const linkedUserId = 'user-456';
      
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockDbPg.select.mockResolvedValue([{ id: mockGroupId }]);
      mockGetTeamAccessCockroach.mockResolvedValue({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamMemberships: [],
        rosterSubteams: []
      });
      
      // Mock subteam members query - one linked member
      mockDbPg.select.mockResolvedValueOnce([{
        userId: linkedUserId,
        role: 'captain',
        joinedAt: new Date('2024-01-01'),
        teamUnitId: mockSubteamId,
        teamId: mockSubteamId,
        description: 'Team A'
      }]);
      
      // Mock user profiles query - one user profile
      mockDbPg.select.mockResolvedValueOnce([{
        id: linkedUserId,
        email: 'jane@example.com',
        displayName: 'Jane Smith',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith'
      }]);
      
      // Mock unlinked roster members query - one unlinked member
      mockQueryCockroachDB.mockResolvedValueOnce({
        rows: [
          {
            student_name: 'Alice Johnson',
            team_unit_id: mockSubteamId,
            subteam_name: 'Team A',
            subteam_description: 'Division B Team A'
          }
        ]
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members).toHaveLength(2);
      
      // Find linked member
      const linkedMember = body.members.find((m: any) => m.id === linkedUserId);
      expect(linkedMember).toEqual({
        id: linkedUserId,
        name: 'Jane Smith',
        email: 'jane@example.com',
        username: 'janesmith',
        role: 'captain',
        subteam: {
          id: mockSubteamId,
          name: mockSubteamId,
          description: 'Team A'
        },
        joinedAt: new Date('2024-01-01'),
        events: [],
        isCreator: false
      });
      
      // Find unlinked member
      const unlinkedMember = body.members.find((m: any) => m.isUnlinked);
      expect(unlinkedMember).toEqual({
        id: null,
        name: 'Alice Johnson',
        email: null,
        username: null,
        role: 'unlinked',
        subteam: {
          id: mockSubteamId,
          name: 'Team A',
          description: 'Division B Team A'
        },
        joinedAt: null,
        events: [],
        isCreator: false,
        isUnlinked: true
      });
    });

    it('should filter unlinked roster members by subteam when subteamId is provided', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockDbPg.select.mockResolvedValue([{ id: mockGroupId }]);
      mockGetTeamAccessCockroach.mockResolvedValue({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamMemberships: [],
        rosterSubteams: []
      });
      
      // Mock subteam members query - no linked members
      mockDbPg.select.mockResolvedValueOnce([]);
      
      // Mock user profiles query - no user profiles
      mockDbPg.select.mockResolvedValueOnce([]);
      
      // Mock unlinked roster members query with subteam filter
      mockQueryCockroachDB.mockResolvedValueOnce({
        rows: [
          {
            student_name: 'Alice Johnson',
            team_unit_id: mockSubteamId,
            subteam_name: 'Team A',
            subteam_description: 'Division B Team A'
          }
        ]
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members?subteamId=${mockSubteamId}`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members).toHaveLength(1);
      expect(body.members[0].name).toBe('Alice Johnson');
      expect(body.members[0].subteam.id).toBe(mockSubteamId);
      
      // Verify that the query was called with the correct subteam filter
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('AND r.team_unit_id = $2'),
        [mockGroupId, mockSubteamId]
      );
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockDbPg.select.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });
  });
});
