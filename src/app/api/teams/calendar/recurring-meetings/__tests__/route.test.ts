import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock the dependencies
vi.mock('@/lib/supabaseServer', () => ({
  getServerUser: vi.fn()
}));

vi.mock('@/lib/cockroachdb', () => ({
  queryCockroachDB: vi.fn()
}));

import { getServerUser } from '@/lib/supabaseServer';
import { queryCockroachDB } from '@/lib/cockroachdb';

const mockGetServerUser = vi.mocked(getServerUser);
const mockQueryCockroachDB = vi.mocked(queryCockroachDB);

describe('/api/teams/calendar/recurring-meetings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should create recurring meeting successfully', async () => {
      const mockUser = { id: 'user-123' };
      const mockGroupId = 'group-123';
      const mockTeamUnitId = 'unit-123';
      const mockMeetingId = 'meeting-123';

      mockGetServerUser.mockResolvedValue(mockUser);
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [{ id: mockGroupId }] }) // group lookup
        .mockResolvedValueOnce({ rows: [{ id: mockTeamUnitId }] }) // team units
        .mockResolvedValueOnce({ rows: [{ role: 'captain', team_id: mockTeamUnitId }] }) // membership check
        .mockResolvedValueOnce({ rows: [{ id: mockMeetingId }] }); // insert meeting

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: 'test-team',
          title: 'Weekly Practice',
          days_of_week: [1, 3], // Monday, Wednesday
          start_time: '15:00',
          end_time: '17:00',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          created_by: 'user-123'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meetingId).toBe(mockMeetingId);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: 'test-team',
          title: 'Weekly Practice',
          days_of_week: [1, 3],
          start_time: '15:00',
          end_time: '17:00',
          start_date: '2024-01-01'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when required fields are missing', async () => {
      const mockUser = { id: 'user-123' };

      mockGetServerUser.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: 'test-team',
          // Missing required fields
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 404 when team is not found', async () => {
      const mockUser = { id: 'user-123' };

      mockGetServerUser.mockResolvedValue(mockUser);
      mockQueryCockroachDB.mockResolvedValueOnce({ rows: [] }); // No group found

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: 'invalid-team',
          title: 'Weekly Practice',
          days_of_week: [1, 3],
          start_time: '15:00',
          end_time: '17:00',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          created_by: 'user-123'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Team not found');
    });

    it('should create personal recurring meeting for non-captain members', async () => {
      const mockUser = { id: 'user-123' };
      const mockGroupId = 'group-123';
      const mockTeamUnitId = 'unit-123';
      const mockMeetingId = 'meeting-123';
      const mockEventId = 'event-123';

      mockGetServerUser.mockResolvedValue(mockUser);
      mockQueryCockroachDB
        .mockResolvedValueOnce({ rows: [{ id: mockGroupId }] }) // group lookup
        .mockResolvedValueOnce({ rows: [{ id: mockTeamUnitId }] }) // team units
        .mockResolvedValueOnce({ rows: [{ role: 'member', team_id: mockTeamUnitId }] }) // membership check - member
        .mockResolvedValueOnce({ rows: [{ id: mockMeetingId }] }) // insert meeting
        .mockResolvedValueOnce({ rows: [{ id: mockEventId }] }) // insert personal event
        .mockResolvedValueOnce({ rows: [] }); // insert attendee

      const request = new NextRequest('http://localhost:3000/api/teams/calendar/recurring-meetings', {
        method: 'POST',
        body: JSON.stringify({
          team_slug: 'test-team',
          title: 'Weekly Practice',
          days_of_week: [1, 3],
          start_time: '15:00',
          end_time: '17:00',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          created_by: 'user-123'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meetingId).toBe(mockMeetingId);
    });
  });
});
