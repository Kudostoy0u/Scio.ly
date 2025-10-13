import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerUser } from '@/lib/supabaseServer';
import { createTeamGroup } from '@/lib/services/cockroachdb-teams';

// Mock dependencies
vi.mock('@/lib/supabaseServer', () => ({
  getServerUser: vi.fn()
}));

vi.mock('@/lib/services/cockroachdb-teams', () => ({
  createTeamGroup: vi.fn()
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockCreateTeamGroup = vi.mocked(createTeamGroup);

describe('/api/teams/create', () => {
  const mockUserId = 'user-123';
  // const mockTeamId = 'team-456';
  const mockGroupId = 'group-789';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/teams/create', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/teams/create', {
        method: 'POST',
        body: JSON.stringify({
          school: 'Test School',
          division: 'C',
          description: 'Test team description'
        })
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 400 when school is missing', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/create', {
        method: 'POST',
        body: JSON.stringify({
          division: 'C',
          description: 'Test team description'
        })
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('School, division, and description are required');
    });

    it('should return 400 when division is missing', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/create', {
        method: 'POST',
        body: JSON.stringify({
          school: 'Test School',
          description: 'Test team description'
        })
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('School, division, and description are required');
    });

    it('should return 400 when description is missing', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/create', {
        method: 'POST',
        body: JSON.stringify({
          school: 'Test School',
          division: 'C'
        })
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('School, division, and description are required');
    });

    it('should return 400 when division is invalid', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/create', {
        method: 'POST',
        body: JSON.stringify({
          school: 'Test School',
          division: 'A',
          description: 'Test team description'
        })
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Division must be B or C');
    });

    it('should create team when all required fields are provided', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCreateTeamGroup.mockResolvedValue({
        id: mockGroupId,
        name: 'Test School C',
        slug: 'test-school-c-abc123',
        school: 'Test School',
        division: 'C',
        description: 'Test team description',
        captainCode: 'CAP123456',
        userCode: 'USR123456',
        members: [
          {
            id: mockUserId,
            name: 'John Doe',
            email: 'john@example.com',
            role: 'captain'
          }
        ],
        wasReactivated: false
      });

      const request = new NextRequest('http://localhost:3000/api/teams/create', {
        method: 'POST',
        body: JSON.stringify({
          school: 'Test School',
          division: 'C',
          description: 'Test team description'
        })
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        id: mockGroupId,
        name: 'Test School C',
        slug: 'test-school-c-abc123',
        school: 'Test School',
        division: 'C',
        description: 'Test team description',
        captainCode: 'CAP123456',
        userCode: 'USR123456',
        members: [
          {
            id: mockUserId,
            name: 'John Doe',
            email: 'john@example.com',
            role: 'captain'
          }
        ],
        wasReactivated: false
      });
    });

    it('should create team for division B', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCreateTeamGroup.mockResolvedValue({
        id: mockGroupId,
        name: 'Test School B',
        slug: 'test-school-b-abc123',
        school: 'Test School',
        division: 'B',
        description: 'Test team description',
        captainCode: 'CAP123456',
        userCode: 'USR123456',
        members: [
          {
            id: mockUserId,
            name: 'John Doe',
            email: 'john@example.com',
            role: 'captain'
          }
        ],
        wasReactivated: false
      });

      const request = new NextRequest('http://localhost:3000/api/teams/create', {
        method: 'POST',
        body: JSON.stringify({
          school: 'Test School',
          division: 'B',
          description: 'Test team description'
        })
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.division).toBe('B');
    });

    it('should handle team creation errors gracefully', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCreateTeamGroup.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/teams/create', {
        method: 'POST',
        body: JSON.stringify({
          school: 'Test School',
          division: 'C',
          description: 'Test team description'
        })
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
    });

    it('should handle invalid JSON in request body', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/create', {
        method: 'POST',
        body: 'invalid json'
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid JSON in request body');
    });

    it('should handle empty request body', async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/create', {
        method: 'POST',
        body: ''
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Request body is required');
    });
  });
});