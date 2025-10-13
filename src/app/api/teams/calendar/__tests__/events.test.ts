import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../events/route';

// Mock the database functions
vi.mock('@/lib/cockroachdb', () => ({
  queryCockroachDB: vi.fn(),
}));

vi.mock('@/lib/supabaseServer', () => ({
  getServerUser: vi.fn(),
}));

vi.mock('@/lib/utils/team-resolver', () => ({
  resolveTeamSlugToUnits: vi.fn(),
}));

import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';
import { resolveTeamSlugToUnits } from '@/lib/utils/team-resolver';

const mockQueryCockroachDB = vi.mocked(queryCockroachDB);
const mockGetServerUser = vi.mocked(getServerUser);
const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);

describe('/api/teams/calendar/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/teams/calendar/events', () => {
    it('creates event successfully', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockResolveTeamSlugToUnits.mockResolvedValue({
        teamUnitIds: ['event-123'],
        teamGroupId: 'group-123'
      });
      mockQueryCockroachDB.mockResolvedValue({
        rows: [{ id: 'event-123' }],
      } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Event',
          description: 'Test Description',
          start_time: '2024-01-15T14:00:00Z',
          end_time: '2024-01-15T16:00:00Z',
          location: 'Test Location',
          event_type: 'practice',
          is_all_day: false,
          is_recurring: false,
          team_id: 'team-123',
          created_by: 'user-123',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eventId).toBe('event-123');
      // The function now resolves team slug to team units, so we expect multiple calls
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO new_team_events'),
        expect.arrayContaining([
          'event-123', // resolved team unit ID
          'user-123',
          'Test Event',
          'Test Description',
          'practice',
          '2024-01-15T14:00:00Z',
          '2024-01-15T16:00:00Z',
          'Test Location',
          false,
          false,
          null,
        ])
      );
    });

    it('returns 401 for unauthenticated user', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Event',
          start_time: '2024-01-15T14:00:00Z',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 for missing required fields', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test Description',
          // Missing title and start_time
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title is required');
    });

    it('handles database errors', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Event',
          start_time: '2024-01-15T14:00:00Z',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create event');
    });
  });

  describe('GET /api/teams/calendar/events', () => {
    it('fetches events successfully', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockResolveTeamSlugToUnits.mockResolvedValue({
        teamUnitIds: ['team-123'],
        teamGroupId: 'group-123'
      });
      mockQueryCockroachDB
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'event-1',
              title: 'Team Practice',
              description: 'Weekly practice',
              start_time: '2024-01-15T14:00:00Z',
              end_time: '2024-01-15T16:00:00Z',
              location: 'Gym',
              event_type: 'practice',
              is_all_day: false,
              is_recurring: false,
              recurrence_pattern: null,
              created_by: 'user-123',
              team_id: 'team-123',
              creator_email: 'user@example.com',
              creator_name: 'John Doe',
            },
          ],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 'user-456',
              status: 'attending',
              responded_at: '2024-01-15T10:00:00Z',
              notes: 'Will be there',
              email: 'member@example.com',
              name: 'Jane Smith',
            },
          ],
        } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events?teamId=team-123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events).toHaveLength(1);
      expect(data.events[0].title).toBe('Team Practice');
      expect(data.events[0].attendees).toHaveLength(1);
    });

    it('fetches events with date range', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockResolveTeamSlugToUnits.mockResolvedValue({
        teamUnitIds: ['team-123'],
        teamGroupId: 'group-123'
      });
      mockQueryCockroachDB.mockResolvedValue({ rows: [] } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/teams/calendar/events?teamId=team-123&startDate=2024-01-01&endDate=2024-01-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1'),
        expect.arrayContaining(['team-123', '2024-01-01', '2024-01-31'])
      );
    });

    it('fetches personal events', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB.mockResolvedValue({ rows: [] } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events?userId=user-123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('WHERE 1=1'),
        expect.arrayContaining(['user-123'])
      );
    });

    it('returns 401 for unauthenticated user', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('handles database errors', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/events');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch events');
    });
  });
});
