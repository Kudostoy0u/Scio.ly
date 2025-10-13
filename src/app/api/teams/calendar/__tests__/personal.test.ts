import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../personal/route';

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

describe('/api/teams/calendar/personal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/teams/calendar/personal', () => {
    it('fetches personal events successfully', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB.mockResolvedValueOnce({
        rows: [
          {
            id: 'personal-1',
            title: 'Personal Study',
            description: 'Study for upcoming exam',
            start_time: '2024-01-15T10:00:00Z',
            end_time: '2024-01-15T12:00:00Z',
            location: 'Library',
            event_type: 'personal',
            is_all_day: false,
            is_recurring: false,
            recurrence_pattern: null,
            created_by: 'user-123',
            team_id: null,
          },
          {
            id: 'personal-2',
            title: 'Doctor Appointment',
            description: 'Annual checkup',
            start_time: '2024-01-16T14:00:00Z',
            end_time: '2024-01-16T15:00:00Z',
            location: 'Medical Center',
            event_type: 'personal',
            is_all_day: false,
            is_recurring: false,
            recurrence_pattern: null,
            created_by: 'user-123',
            team_id: null,
          },
        ],
      } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/personal?userId=user-123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events).toHaveLength(2);
      expect(data.events[0].title).toBe('Personal Study');
      expect(data.events[1].title).toBe('Doctor Appointment');
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.created_by = $1 AND e.team_id IS NULL'),
        ['user-123']
      );
    });

    it('fetches personal events with date range', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB.mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/teams/calendar/personal?userId=user-123&startDate=2024-01-01&endDate=2024-01-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.created_by = $1 AND e.team_id IS NULL'),
        expect.arrayContaining(['user-123', '2024-01-01', '2024-01-31'])
      );
    });

    it('returns 401 for unauthenticated user', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/personal?userId=user-123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 403 for accessing another user\'s personal events', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/personal?userId=user-456');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('handles empty personal events', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB.mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/personal?userId=user-123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events).toHaveLength(0);
    });

    it('handles database errors', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/personal?userId=user-123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch personal events');
    });

    it('filters events by start date', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB.mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/teams/calendar/personal?userId=user-123&startDate=2024-01-15'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('AND e.start_time >= $2'),
        expect.arrayContaining(['user-123', '2024-01-15'])
      );
    });

    it('filters events by end date', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB.mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/teams/calendar/personal?userId=user-123&endDate=2024-01-31'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('AND e.start_time <= $2'),
        expect.arrayContaining(['user-123', '2024-01-31'])
      );
    });

    it('orders events by start time', async () => {
      mockGetServerUser.mockResolvedValue({ id: 'user-123' } as any);
      mockQueryCockroachDB.mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/personal?userId=user-123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryCockroachDB).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY e.start_time ASC'),
        ['user-123']
      );
    });
  });
});
