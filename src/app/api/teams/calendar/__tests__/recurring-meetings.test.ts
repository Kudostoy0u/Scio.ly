import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../recurring-meetings/route';

// Mock the database functions
vi.mock('@/lib/cockroachdb', () => ({
  queryCockroachDB: vi.fn(),
}));

vi.mock('@/lib/supabaseServer', () => ({
  getServerUser: vi.fn(),
}));

import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

const mockQueryCockroachDB = vi.mocked(queryCockroachDB);
const mockGetServerUser = vi.mocked(getServerUser);

describe('/api/teams/calendar/recurring-meetings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/teams/calendar/recurring-meetings', () => {
    it('creates recurring meeting successfully for captain', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB
        .mockResolvedValueOnce({
          rows: [{ id: 'group-123' }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'team-123' }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: 'captain', team_id: 'team-123' }], // Membership check
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'meeting-123' }], // Insert result
        } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: 'neuqua-c-mgk6zb75',
          title: 'Weekly Practice',
          description: 'Regular team practice',
          location: 'Gym',
          days_of_week: [1, 3], // Monday and Wednesday
          start_time: '15:00',
          end_time: '17:00',
          start_date: '2024-01-15',
          end_date: '2024-06-15',
          exceptions: ['2024-01-15'],
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
      expect(data.meetingId).toBe('meeting-123');
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO new_team_recurring_meetings'),
        expect.arrayContaining([
          'team-123',
          'user-123',
          'Weekly Practice',
          'Regular team practice',
          'Gym',
          JSON.stringify([1, 3]),
          '15:00',
          '17:00',
          JSON.stringify(['2024-01-15']),
        ])
      );
    });

    it('creates recurring meeting successfully for co-captain', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB
        .mockResolvedValueOnce({
          rows: [{ id: 'group-123' }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'team-123' }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: 'co_captain', team_id: 'team-123' }], // Membership check
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'meeting-123' }], // Insert result
        } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: 'neuqua-c-mgk6zb75',
          title: 'Weekly Practice',
          days_of_week: [1, 3],
          start_time: '15:00',
          end_time: '17:00',
          start_date: '2024-01-15',
          end_date: '2024-06-15',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 401 for unauthenticated user', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings', {
        method: 'POST',
        body: JSON.stringify({
          team_id: 'team-123',
          title: 'Weekly Practice',
          days_of_week: [1, 3],
          start_time: '15:00',
          end_time: '17:00',
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

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: 'neuqua-c-mgk6zb75',
          title: 'Weekly Practice',
          // Missing days_of_week, start_time, end_time, start_date
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Team slug, title, days of week, start date, and end date are required');
    });

    it('returns 403 for non-captain users', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB
        .mockResolvedValueOnce({
          rows: [{ id: 'group-123' }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'team-123' }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // No membership found

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: 'neuqua-c-mgk6zb75',
          title: 'Weekly Practice',
          days_of_week: [1, 3],
          start_time: '15:00',
          end_time: '17:00',
          start_date: '2024-01-15',
          end_date: '2024-06-15',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not a team member');
    });

    it('allows member to create personal recurring meeting', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB
        .mockResolvedValueOnce({
          rows: [{ id: 'group-123' }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'team-123' }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: 'member', team_id: 'team-123' }], // Membership check
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'meeting-123' }], // Insert recurring meeting
        } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: 'neuqua-c-mgk6zb75',
          title: 'Weekly Practice',
          days_of_week: [1, 3],
          start_time: '15:00',
          end_time: '17:00',
          start_date: '2024-01-15',
          end_date: '2024-06-15',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meetingId).toBe('meeting-123');
    });

    it('handles database errors', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB
        .mockResolvedValueOnce({
          rows: [{ id: 'group-123' }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'team-123' }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: 'captain', team_id: 'team-123' }], // Membership check
        } as any)
        .mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: 'neuqua-c-mgk6zb75',
          title: 'Weekly Practice',
          days_of_week: [1, 3],
          start_time: '15:00',
          end_time: '17:00',
          start_date: '2024-01-15',
          end_date: '2024-06-15',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create recurring meeting');
    });
  });

  describe('GET /api/teams/calendar/recurring-meetings', () => {
    it('fetches recurring meetings successfully', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB
        .mockResolvedValueOnce({
          rows: [{ id: 'group-123' }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'team-123' }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: 'member' }], // Membership check
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'meeting-1',
              team_id: 'team-123',
              created_by: 'user-456',
              title: 'Weekly Practice',
              description: 'Regular team practice',
              location: 'Gym',
              days_of_week: '[1,3]',
              start_time: '15:00',
              end_time: '17:00',
              exceptions: '[]',
              created_at: '2024-01-01T00:00:00Z',
              creator_email: 'captain@example.com',
              creator_name: 'Captain Name',
            },
          ],
        } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings?teamSlug=neuqua-c-mgk6zb75');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meetings).toHaveLength(1);
      expect(data.meetings[0].title).toBe('Weekly Practice');
      expect(data.meetings[0].days_of_week).toEqual([1, 3]);
      expect(data.meetings[0].exceptions).toEqual([]);
    });

    it('returns 400 for missing team ID', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Team slug is required');
    });

    it('returns 401 for unauthenticated user', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings?teamSlug=neuqua-c-mgk6zb75');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 403 for non-team members', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB
        .mockResolvedValueOnce({
          rows: [{ id: 'group-123' }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'team-123' }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // No membership found

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings?teamSlug=neuqua-c-mgk6zb75');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not a member of this team');
    });

    it('handles database errors', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB
        .mockResolvedValueOnce({
          rows: [{ id: 'group-123' }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'team-123' }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: 'member' }], // Membership check
        } as any)
        .mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings?teamSlug=neuqua-c-mgk6zb75');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch recurring meetings');
    });

    it('parses JSON fields correctly', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB
        .mockResolvedValueOnce({
          rows: [{ id: 'group-123' }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'team-123' }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: 'member' }], // Membership check
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'meeting-1',
              team_id: 'team-123',
              created_by: 'user-456',
              title: 'Weekly Practice',
              description: 'Regular team practice',
              location: 'Gym',
              days_of_week: '[1,3,5]',
              start_time: '15:00',
              end_time: '17:00',
              exceptions: '["2024-01-15","2024-01-22"]',
              created_at: '2024-01-01T00:00:00Z',
              creator_email: 'captain@example.com',
              creator_name: 'Captain Name',
            },
          ],
        } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings?teamSlug=neuqua-c-mgk6zb75');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meetings[0].days_of_week).toEqual([1, 3, 5]);
      expect(data.meetings[0].exceptions).toEqual(['2024-01-15', '2024-01-22']);
    });
  });
});
