import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { cockroachDBTeamsService } from '@/lib/services/cockroachdb-teams';

// Mock the cockroachDBTeamsService
vi.mock('@/lib/services/cockroachdb-teams', () => ({
  cockroachDBTeamsService: {
    createTeamGroup: vi.fn(),
    createTeamUnit: vi.fn(),
    createTeamMembership: vi.fn(),
    getTeamMembers: vi.fn(),
  },
}));

// Mock the supabaseServer
vi.mock('@/lib/supabaseServer', () => ({
  getServerUser: vi.fn(),
}));

describe('/api/teams/create', () => {
  const mockUser = { id: 'user-123' };
  const mockTeamGroup = {
    id: 'group-123',
    school: 'Test School',
    division: 'C',
    slug: 'test-school-c-abc123',
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };
  const mockTeamUnit = {
    id: 'team-123',
    name: 'Team A',
    description: 'Team A',
    captain_code: 'CAP123',
    user_code: 'USR123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };
  const mockMembers = [
    {
      user_id: 'user-123',
      role: 'captain',
      status: 'active',
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock environment variable
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    
    // Mock getServerUser to return a valid user
    const { getServerUser } = await import('@/lib/supabaseServer');
    (getServerUser as any).mockResolvedValue(mockUser);
    
    // Mock service methods
    cockroachDBTeamsService.createTeamGroup.mockResolvedValue(mockTeamGroup);
    cockroachDBTeamsService.createTeamUnit.mockResolvedValue(mockTeamUnit);
    cockroachDBTeamsService.createTeamMembership.mockResolvedValue({});
    cockroachDBTeamsService.getTeamMembers.mockResolvedValue(mockMembers);
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('should create a new team with unique slug', async () => {
    const requestBody = {
      school: 'Test School',
      division: 'C',
    };

    const request = new NextRequest('http://localhost:3000/api/teams/create', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.slug).toMatch(/^test-school-c-[a-z0-9]+$/);
    expect(responseData.school).toBe('Test School');
    expect(responseData.division).toBe('C');
    expect(responseData.captain_code).toBe('CAP123');
    expect(responseData.user_code).toBe('USR123');
    
    // Verify that createTeamGroup was called with a unique slug
    expect(cockroachDBTeamsService.createTeamGroup).toHaveBeenCalledWith({
      school: 'Test School',
      division: 'C',
      slug: expect.stringMatching(/^test-school-c-[a-z0-9]+$/),
      createdBy: 'user-123',
    });
  });

  it('should generate different slugs for multiple requests', async () => {
    const requestBody = {
      school: 'Test School',
      division: 'C',
    };

    // Mock different slugs for each call
    const mockTeamGroup1 = { ...mockTeamGroup, slug: 'test-school-c-abc123' };
    const mockTeamGroup2 = { ...mockTeamGroup, slug: 'test-school-c-def456' };
    
    cockroachDBTeamsService.createTeamGroup
      .mockResolvedValueOnce(mockTeamGroup1)
      .mockResolvedValueOnce(mockTeamGroup2);

    const request1 = new NextRequest('http://localhost:3000/api/teams/create', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const request2 = new NextRequest('http://localhost:3000/api/teams/create', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response1 = await POST(request1);
    const response2 = await POST(request2);
    
    const data1 = await response1.json();
    const data2 = await response2.json();

    expect(data1.slug).not.toBe(data2.slug);
    expect(data1.slug).toBe('test-school-c-abc123');
    expect(data2.slug).toBe('test-school-c-def456');
  });

  it('should return 401 when user is not authenticated', async () => {
    const { getServerUser } = await import('@/lib/supabaseServer');
    (getServerUser as any).mockResolvedValue(null);

    const requestBody = {
      school: 'Test School',
      division: 'C',
    };

    const request = new NextRequest('http://localhost:3000/api/teams/create', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toBe('Unauthorized');
  });

  it('should return 400 when school is missing', async () => {
    const requestBody = {
      division: 'C',
    };

    const request = new NextRequest('http://localhost:3000/api/teams/create', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe('School and division are required');
  });

  it('should return 400 when division is invalid', async () => {
    const requestBody = {
      school: 'Test School',
      division: 'A',
    };

    const request = new NextRequest('http://localhost:3000/api/teams/create', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe('Division must be B or C');
  });

  it('should return 500 when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    const requestBody = {
      school: 'Test School',
      division: 'C',
    };

    const request = new NextRequest('http://localhost:3000/api/teams/create', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData.error).toBe('Database configuration error');
  });
});
