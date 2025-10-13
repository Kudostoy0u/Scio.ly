import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerUser } from '@/lib/supabaseServer';
import { hasLeadershipAccessCockroach } from '@/lib/utils/team-auth-v2';
import { resolveTeamSlugToUnits, getUserTeamMemberships } from '@/lib/utils/team-resolver';
import { dbPg } from '@/lib/db';

// Mock dependencies
vi.mock('@/lib/supabaseServer', () => ({
  getServerUser: vi.fn()
}));

vi.mock('@/lib/utils/team-auth-v2', () => ({
  hasLeadershipAccessCockroach: vi.fn()
}));

vi.mock('@/lib/utils/team-resolver', () => ({
  resolveTeamSlugToUnits: vi.fn(),
  getUserTeamMemberships: vi.fn()
}));

vi.mock('@/lib/db', () => ({
  dbPg: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis()
  }
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockHasLeadershipAccessCockroach = vi.mocked(hasLeadershipAccessCockroach);
const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);
const mockGetUserTeamMemberships = vi.mocked(getUserTeamMemberships);
const mockDbPg = vi.mocked(dbPg);

describe('/api/teams/[teamId]/assignments', () => {
  const mockUserId = 'user-123';
  const mockTeamId = 'team-456';
  const mockGroupId = 'group-789';
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

  describe('GET /api/teams/[teamId]/assignments', () => {
    it('should return 500 when DATABASE_URL is missing', async () => {
      const originalEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Database configuration error');

      // Restore environment
      process.env.DATABASE_URL = originalEnv;
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return assignments when user has access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockResolveTeamSlugToUnits.mockResolvedValue({
        groupId: mockGroupId,
        teamUnitIds: [mockSubteamId]
      });
      mockGetUserTeamMemberships.mockResolvedValue([
        { team_id: mockSubteamId, role: 'member' }
      ]);

      // Mock Drizzle ORM chain for assignments query
      const mockAssignmentsResult = [
        {
          id: 'assignment-1',
          title: 'Test Assignment',
          description: 'Test description',
          assignmentType: 'homework',
          dueDate: new Date('2024-12-31'),
          points: 100,
          isRequired: true,
          maxAttempts: 1,
          timeLimitMinutes: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          creatorEmail: 'creator@test.com',
          creatorName: 'Test Creator'
        }
      ];

      // Mock the Drizzle query chain
      mockDbPg.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockAssignmentsResult)
            })
          })
        })
      });

      // Mock submission and roster queries
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockAssignmentsResult)
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.assignments).toHaveLength(1);
      expect(body.assignments[0].id).toBe('assignment-1');
      expect(body.assignments[0].title).toBe('Test Assignment');
    });

    it('should return empty array when no assignments exist', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockResolveTeamSlugToUnits.mockResolvedValue({
        groupId: mockGroupId,
        teamUnitIds: [mockSubteamId]
      });
      mockGetUserTeamMemberships.mockResolvedValue([
        { team_id: mockSubteamId, role: 'member' }
      ]);

      // Mock empty assignments result
      mockDbPg.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([])
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.assignments).toHaveLength(0);
    });
  });

  describe('POST /api/teams/[teamId]/assignments', () => {
    it('should return 500 when DATABASE_URL is missing', async () => {
      const originalEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Assignment',
          description: 'Test description',
          dueDate: '2024-12-31',
          targetTeamId: mockSubteamId
        })
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

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Assignment',
          description: 'Test description',
          dueDate: '2024-12-31',
          targetTeamId: mockSubteamId
        })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 403 when user has no leadership access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockResolveTeamSlugToUnits.mockResolvedValue({
        groupId: mockGroupId,
        teamUnitIds: [mockSubteamId]
      });
      mockHasLeadershipAccessCockroach.mockResolvedValue(false);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Assignment',
          description: 'Test description',
          due_date: '2024-12-31'
        })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Only captains and co-captains can create assignments');
    });

    it('should handle missing required fields', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test description',
          due_date: '2024-12-31'
        })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Title is required');
    });
  });
});
