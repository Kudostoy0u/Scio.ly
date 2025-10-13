import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';
import { resolveTeamSlugToUnits } from '@/lib/utils/team-resolver';
import { NotificationSyncService } from '@/lib/services/notification-sync';

// Mock dependencies
vi.mock('@/lib/cockroachdb');
vi.mock('@/lib/supabaseServer');
vi.mock('@/lib/utils/team-resolver');
vi.mock('@/lib/services/notification-sync');

const mockQueryCockroachDB = vi.mocked(queryCockroachDB);
const mockGetServerUser = vi.mocked(getServerUser);
const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);
const mockNotificationSyncService = vi.mocked(NotificationSyncService);

describe('/api/teams/[teamId]/invite', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  const mockTeamInfo = {
    teamUnitIds: ['team-unit-1', 'team-unit-2']
  };

  const mockInvitedUser = {
    id: 'invited-user-123',
    email: 'invited@example.com',
    display_name: 'Invited User',
    first_name: 'Invited',
    last_name: 'User',
    username: 'inviteduser'
  };

  const mockMembership = {
    id: 'membership-123',
    role: 'captain',
    team_id: 'team-unit-1'
  };

  const mockTeamCodes = {
    user_code: 'user123',
    captain_code: 'captain123'
  };

  const mockTeamGroup = {
    school: 'Test School',
    division: 'C',
    slug: 'test-school-c'
  };

  const mockNotification = {
    id: 'notification-123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    
    // Default mocks
    mockGetServerUser.mockResolvedValue(mockUser);
    mockResolveTeamSlugToUnits.mockResolvedValue(mockTeamInfo);
    mockQueryCockroachDB.mockResolvedValue({ rows: [] });
    mockNotificationSyncService.syncNotificationToSupabase.mockResolvedValue();
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  describe('POST', () => {
    it('should create team invitation successfully', async () => {
      // Mock successful user lookup
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: [mockInvitedUser] }) // user lookup
        .mockResolvedValueOnce({ rows: [] }) // existing membership check
        .mockResolvedValueOnce({ rows: [] }) // existing invitation check
        .mockResolvedValueOnce({ rows: [mockTeamCodes] }) // get team codes
        .mockResolvedValueOnce({ rows: [mockTeamGroup] }) // get team group
        .mockResolvedValueOnce({ rows: [mockNotification] }); // create notification

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite', {
        method: 'POST',
        body: JSON.stringify({
          username: 'inviteduser',
          role: 'member'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Invitation sent successfully');
      expect(data.joinCode).toBe('user123'); // member role should use user_code
      
      // Verify notification sync was called
      expect(mockNotificationSyncService.syncNotificationToSupabase).toHaveBeenCalledWith('notification-123');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite', {
        method: 'POST',
        body: JSON.stringify({
          username: 'inviteduser',
          role: 'member'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 500 if DATABASE_URL is missing', async () => {
      delete process.env.DATABASE_URL;

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite', {
        method: 'POST',
        body: JSON.stringify({
          username: 'inviteduser',
          role: 'member'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database configuration error');
    });

    it('should return 404 if team is not found', async () => {
      mockResolveTeamSlugToUnits.mockRejectedValue(new Error('Team not found'));

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite', {
        method: 'POST',
        body: JSON.stringify({
          username: 'inviteduser',
          role: 'member'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Team not found');
    });

    it('should return 403 if user is not a team member', async () => {
      mockQueryCockroachDB.mockResolvedValueOnce({ rows: [] }); // no membership

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite', {
        method: 'POST',
        body: JSON.stringify({
          username: 'inviteduser',
          role: 'member'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not a team member');
    });

    it('should return 403 if user is not a captain', async () => {
      const memberMembership = { ...mockMembership, role: 'member' };
      mockQueryCockroachDB.mockResolvedValueOnce({ rows: [memberMembership] });

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite', {
        method: 'POST',
        body: JSON.stringify({
          username: 'inviteduser',
          role: 'member'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only captains can invite members');
    });

    it('should return 404 if invited user is not found', async () => {
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: [] }); // user lookup - no user found

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite', {
        method: 'POST',
        body: JSON.stringify({
          username: 'nonexistentuser',
          role: 'member'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if user is already a team member', async () => {
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: [mockInvitedUser] }) // user lookup
        .mockResolvedValueOnce({ rows: [{ id: 'existing-membership' }] }); // existing membership

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite', {
        method: 'POST',
        body: JSON.stringify({
          username: 'inviteduser',
          role: 'member'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User is already a team member');
    });

    it('should return 400 if invitation already sent', async () => {
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: [mockInvitedUser] }) // user lookup
        .mockResolvedValueOnce({ rows: [] }) // existing membership check
        .mockResolvedValueOnce({ rows: [{ id: 'existing-invitation' }] }); // existing invitation

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite', {
        method: 'POST',
        body: JSON.stringify({
          username: 'inviteduser',
          role: 'member'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invitation already sent');
    });

    it('should handle notification sync failure gracefully', async () => {
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: [mockInvitedUser] }) // user lookup
        .mockResolvedValueOnce({ rows: [] }) // existing membership check
        .mockResolvedValueOnce({ rows: [] }) // existing invitation check
        .mockResolvedValueOnce({ rows: [mockTeamCodes] }) // get team codes
        .mockResolvedValueOnce({ rows: [mockTeamGroup] }) // get team group
        .mockResolvedValueOnce({ rows: [mockNotification] }); // create notification

      mockNotificationSyncService.syncNotificationToSupabase.mockRejectedValue(new Error('Sync failed'));

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite', {
        method: 'POST',
        body: JSON.stringify({
          username: 'inviteduser',
          role: 'member'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      // Should still succeed even if notification sync fails
      expect(response.status).toBe(200);
      expect(data.message).toBe('Invitation sent successfully');
    });
  });

  describe('GET', () => {
    it('should search users successfully', async () => {
      const mockSearchResults = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          display_name: 'User One',
          first_name: 'User',
          last_name: 'One',
          username: 'user1',
          photo_url: null
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          display_name: 'User Two',
          first_name: 'User',
          last_name: 'Two',
          username: 'user2',
          photo_url: null
        }
      ];

      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: mockSearchResults }); // search results

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite?q=user');

      const response = await GET(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toEqual(mockSearchResults);
    });

    it('should return empty array for short queries', async () => {
      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite?q=a');

      const response = await GET(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toEqual([]);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite?q=user');

      const response = await GET(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not a team member', async () => {
      mockQueryCockroachDB.mockResolvedValueOnce({ rows: [] }); // no membership

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite?q=user');

      const response = await GET(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not a team member');
    });

    it('should return 403 if user is not a captain', async () => {
      const memberMembership = { ...mockMembership, role: 'member' };
      mockQueryCockroachDB.mockResolvedValueOnce({ rows: [memberMembership] });

      const request = new NextRequest('http://localhost:3000/api/teams/test-team/invite?q=user');

      const response = await GET(request, { params: Promise.resolve({ teamId: 'test-team' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only captains can search users');
    });
  });
});
