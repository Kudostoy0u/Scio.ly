import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock the dependencies
vi.mock('@/lib/supabaseServer', () => ({
  getServerUser: vi.fn()
}));

vi.mock('@/lib/cockroachdb', () => ({
  queryCockroachDB: vi.fn()
}));

vi.mock('@/lib/utils/team-resolver', () => ({
  resolveTeamSlugToUnits: vi.fn()
}));

import { getServerUser } from '@/lib/supabaseServer';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { resolveTeamSlugToUnits } from '@/lib/utils/team-resolver';

const mockGetServerUser = vi.mocked(getServerUser);
const mockQueryCockroachDB = vi.mocked(queryCockroachDB);
const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);

describe('/api/teams/calendar/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should resolve team slug to team unit IDs and fetch events', async () => {
      const mockUser = { id: 'user-123' };
      const mockTeamInfo = {
        groupId: 'group-123',
        teamUnitIds: ['unit-1', 'unit-2']
      };
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Test Event',
          start_time: '2024-01-01T10:00:00Z',
          creator_name: 'John Doe',
          creator_email: 'john@example.com'
        }
      ];

      mockGetServerUser.mockResolvedValue(mockUser);
      mockResolveTeamSlugToUnits.mockResolvedValue(mockTeamInfo);
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: [] }); // attendees query

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events?teamId=neuqua-c-mgk6zb75');
      const response = await GET(request);
      const data = await response.json();

      expect(mockResolveTeamSlugToUnits).toHaveBeenCalledWith('neuqua-c-mgk6zb75');
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('e.team_id IN ($1,$2)'),
        ['unit-1', 'unit-2']
      );
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events).toHaveLength(1);
    });

    it('should return 404 when team slug is not found', async () => {
      const mockUser = { id: 'user-123' };

      mockGetServerUser.mockResolvedValue(mockUser);
      mockResolveTeamSlugToUnits.mockRejectedValue(new Error('Team group not found'));

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events?teamId=invalid-slug');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Team not found');
    });

    it('should return empty events when no team units found', async () => {
      const mockUser = { id: 'user-123' };
      const mockTeamInfo = {
        groupId: 'group-123',
        teamUnitIds: []
      };

      mockGetServerUser.mockResolvedValue(mockUser);
      mockResolveTeamSlugToUnits.mockResolvedValue(mockTeamInfo);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events?teamId=neuqua-c-mgk6zb75');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events).toHaveLength(0);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events?teamId=neuqua-c-mgk6zb75');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST', () => {
    it('should resolve team slug to UUID when creating event', async () => {
      const mockUser = { id: 'user-123' };
      const mockTeamInfo = {
        groupId: 'group-123',
        teamUnitIds: ['unit-1', 'unit-2']
      };

      mockGetServerUser.mockResolvedValue(mockUser);
      mockResolveTeamSlugToUnits.mockResolvedValue(mockTeamInfo);
      mockQueryCockroachDB.mockResolvedValue({ rows: [{ id: 'event-123' }] });

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Event',
          start_time: '2024-01-01T10:00:00Z',
          team_id: 'neuqua-c-mgk6zb75'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockResolveTeamSlugToUnits).toHaveBeenCalledWith('neuqua-c-mgk6zb75');
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO new_team_events'),
        expect.arrayContaining(['unit-1']) // Should use first team unit ID
      );
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eventId).toBe('event-123');
    });

    it('should handle UUID team_id without resolving', async () => {
      const mockUser = { id: 'user-123' };
      const uuidTeamId = '123e4567-e89b-12d3-a456-426614174000';

      mockGetServerUser.mockResolvedValue(mockUser);
      mockQueryCockroachDB.mockResolvedValue({ rows: [{ id: 'event-123' }] });

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Event',
          start_time: '2024-01-01T10:00:00Z',
          team_id: uuidTeamId
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockResolveTeamSlugToUnits).not.toHaveBeenCalled();
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO new_team_events'),
        expect.arrayContaining([uuidTeamId])
      );
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
