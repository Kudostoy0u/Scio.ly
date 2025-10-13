import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../route';
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

describe('/api/teams/[teamId]/stream', () => {
  const mockUserId = 'user-123';
  const mockTeamId = 'team-456';
  // const mockGroupId = 'group-789';
  const mockSubteamId = 'subteam-999';
  const mockPostId = 'post-123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/teams/[teamId]/stream', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`);
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

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Not authorized to access this team');
    });

    it('should return stream posts when user has access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupAccessCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock stream posts query
      mockQueryCockroachDB.mockResolvedValue({
        rows: [
          {
            id: mockPostId,
            content: 'Test post content',
            author_id: mockUserId,
            team_unit_id: mockSubteamId,
            created_at: new Date('2024-01-01'),
            updated_at: new Date('2024-01-01')
          }
        ]
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.posts).toHaveLength(1);
      expect(body.posts[0]).toEqual({
        id: mockPostId,
        content: 'Test post content',
        authorId: mockUserId,
        teamUnitId: mockSubteamId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
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

      // Mock stream posts query
      mockQueryCockroachDB.mockResolvedValue({
        rows: []
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream?subteamId=${mockSubteamId}`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.posts).toHaveLength(0);
    });
  });

  describe('POST /api/teams/[teamId]/stream', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test post content',
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

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test post content',
          teamUnitId: mockSubteamId
        })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Only captains and co-captains can create posts');
    });

    it('should create post when user has leadership access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock post creation
      mockQueryCockroachDB.mockResolvedValue({
        rows: [{
          id: mockPostId,
          content: 'Test post content',
          author_id: mockUserId,
          team_unit_id: mockSubteamId,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        }]
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test post content',
          teamUnitId: mockSubteamId
        })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.post).toEqual({
        id: mockPostId,
        content: 'Test post content',
        authorId: mockUserId,
        teamUnitId: mockSubteamId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
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

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`, {
        method: 'POST',
        body: JSON.stringify({
          teamUnitId: mockSubteamId
        })
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Content and team unit ID are required');
    });
  });

  describe('PUT /api/teams/[teamId]/stream', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`, {
        method: 'PUT',
        body: JSON.stringify({
          postId: mockPostId,
          content: 'Updated post content'
        })
      });
      const response = await PUT(request, { params: Promise.resolve({ teamId: mockTeamId }) });

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

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`, {
        method: 'PUT',
        body: JSON.stringify({
          postId: mockPostId,
          content: 'Updated post content'
        })
      });
      const response = await PUT(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Only captains and co-captains can edit posts');
    });

    it('should update post when user has leadership access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock post update
      mockQueryCockroachDB.mockResolvedValue({
        rows: [{
          id: mockPostId,
          content: 'Updated post content',
          author_id: mockUserId,
          team_unit_id: mockSubteamId,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-02')
        }]
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`, {
        method: 'PUT',
        body: JSON.stringify({
          postId: mockPostId,
          content: 'Updated post content'
        })
      });
      const response = await PUT(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.post).toEqual({
        id: mockPostId,
        content: 'Updated post content',
        authorId: mockUserId,
        teamUnitId: mockSubteamId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      });
    });
  });

  describe('DELETE /api/teams/[teamId]/stream', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`, {
        method: 'DELETE',
        body: JSON.stringify({
          postId: mockPostId
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

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`, {
        method: 'DELETE',
        body: JSON.stringify({
          postId: mockPostId
        })
      });
      const response = await DELETE(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Only captains and co-captains can delete posts');
    });

    it('should delete post when user has leadership access', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: 'captain'
      });

      // Mock post deletion
      mockQueryCockroachDB.mockResolvedValue({
        rows: [{ id: mockPostId }]
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/stream`, {
        method: 'DELETE',
        body: JSON.stringify({
          postId: mockPostId
        })
      });
      const response = await DELETE(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Post deleted successfully');
    });
  });
});
