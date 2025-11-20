import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/teams/calendar/recurring-meetings/route";

// Mock the database functions
vi.mock("@/lib/cockroachdb", () => ({
  queryCockroachDB: vi.fn(),
}));

vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

import { queryCockroachDB } from "@/lib/cockroachdb";
import { getServerUser } from "@/lib/supabaseServer";

const mockQueryCockroachDb = vi.mocked(queryCockroachDB);
const mockGetServerUser = vi.mocked(getServerUser);

describe("/api/teams/calendar/recurring-meetings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/teams/calendar/recurring-meetings", () => {
    const mockUserId = "user-123";
    const mockGroupId = "group-123";
    const mockTeamId = "team-123";
    const mockMeetingId = "meeting-123";

    it("creates recurring meeting successfully for captain", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      // Use mockImplementation to handle dynamic queries with proper matching
      mockQueryCockroachDb
        .mockImplementation((query: string, params?: unknown[]) => {
          if (typeof query === "string") {
            // Team group lookup by slug
            if (query.includes("SELECT id FROM new_team_groups WHERE slug")) {
              return Promise.resolve({ rows: [{ id: mockGroupId }] });
            }
            // Team units lookup by group_id
            if (query.includes("SELECT id FROM new_team_units WHERE group_id")) {
              return Promise.resolve({ rows: [{ id: mockTeamId }] });
            }
            // Membership check - must return membership for team meeting authorization
            if (query.includes("SELECT role, team_id FROM new_team_memberships") && query.includes("team_id IN")) {
              return Promise.resolve({ rows: [{ role: "captain", team_id: mockTeamId }] });
            }
            // INSERT recurring meeting
            if (query.includes("INSERT INTO new_team_recurring_meetings")) {
              return Promise.resolve({ rows: [{ id: mockMeetingId }] });
            }
          }
          return Promise.resolve({ rows: [] });
        });

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings",
        {
          method: "POST",
          body: JSON.stringify({
            team_slug: "neuqua-c-mgk6zb75",
            title: "Weekly Practice",
            description: "Regular team practice",
            location: "Gym",
            days_of_week: [1, 3], // Monday and Wednesday
            start_time: "15:00",
            end_time: "17:00",
            start_date: "2024-01-15",
            end_date: "2024-06-15",
            exceptions: ["2024-01-15"],
            created_by: mockUserId,
            meeting_type: "team",
            selected_team_id: mockTeamId, // Required for team meetings
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meetingIds).toContain(mockMeetingId);
      expect(data.count).toBe(1);
      
      // Verify the INSERT was called with correct parameters
      const insertCalls = (mockQueryCockroachDb as any).mock.calls.filter(
        (call: unknown[]) => typeof call[0] === "string" && call[0].includes("INSERT INTO new_team_recurring_meetings")
      );
      expect(insertCalls.length).toBeGreaterThan(0);
      expect(insertCalls[0]?.[1]).toEqual(
        expect.arrayContaining([
          mockTeamId,
          expect.any(String), // created_by (user.id or created_by from body)
          "Weekly Practice",
          "Regular team practice",
          "Gym",
          JSON.stringify([1, 3]),
          "15:00",
          "17:00",
          "2024-01-15",
          expect.any(String), // end_date
          JSON.stringify(["2024-01-15"]),
        ])
      );
    });

    it("creates recurring meeting successfully for co-captain", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockQueryCockroachDb
        .mockImplementation((query: string, params?: unknown[]) => {
          if (typeof query === "string") {
            if (query.includes("SELECT id FROM new_team_groups WHERE slug")) {
              return Promise.resolve({ rows: [{ id: mockGroupId }] });
            }
            if (query.includes("SELECT id FROM new_team_units WHERE group_id")) {
              return Promise.resolve({ rows: [{ id: mockTeamId }] });
            }
            if (query.includes("SELECT role, team_id FROM new_team_memberships") && query.includes("team_id IN")) {
              return Promise.resolve({ rows: [{ role: "co_captain", team_id: mockTeamId }] });
            }
            if (query.includes("INSERT INTO new_team_recurring_meetings")) {
              return Promise.resolve({ rows: [{ id: mockMeetingId }] });
            }
          }
          return Promise.resolve({ rows: [] });
        });

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings",
        {
          method: "POST",
          body: JSON.stringify({
            team_slug: "neuqua-c-mgk6zb75",
            title: "Weekly Practice",
            days_of_week: [1, 3],
            start_time: "15:00",
            end_time: "17:00",
            start_date: "2024-01-15",
            end_date: "2024-06-15",
            meeting_type: "team",
            selected_team_id: mockTeamId, // Required for team meetings
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meetingIds).toContain(mockMeetingId);
    });

    it("returns 401 for unauthenticated user", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings",
        {
          method: "POST",
          body: JSON.stringify({
            team_id: "team-123",
            title: "Weekly Practice",
            days_of_week: [1, 3],
            start_time: "15:00",
            end_time: "17:00",
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 for missing required fields", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings",
        {
          method: "POST",
          body: JSON.stringify({
            team_slug: "neuqua-c-mgk6zb75",
            title: "Weekly Practice",
            // Missing days_of_week, start_time, end_time, start_date
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Team slug, title, days of week, start date, and end date are required"
      );
    });

    it("returns 403 for non-captain users when creating team meeting", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ id: mockGroupId }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: mockTeamId }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // No membership found

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings",
        {
          method: "POST",
          body: JSON.stringify({
            team_slug: "neuqua-c-mgk6zb75",
            title: "Weekly Practice",
            days_of_week: [1, 3],
            start_time: "15:00",
            end_time: "17:00",
            start_date: "2024-01-15",
            end_date: "2024-06-15",
            meeting_type: "team", // Team meeting requires membership
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Not a team member");
    });

    it("allows member to create personal recurring meeting", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ id: mockGroupId }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: mockTeamId }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: "member", team_id: mockTeamId }], // Membership check
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: mockMeetingId }], // Insert recurring meeting
        } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings",
        {
          method: "POST",
          body: JSON.stringify({
            team_slug: "neuqua-c-mgk6zb75",
            title: "Weekly Practice",
            days_of_week: [1, 3],
            start_time: "15:00",
            end_time: "17:00",
            start_date: "2024-01-15",
            end_date: "2024-06-15",
            meeting_type: "personal", // Personal meeting doesn't require team membership
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meetingIds).toContain(mockMeetingId);
      expect(data.count).toBe(1);
    });

    it("handles database errors gracefully", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      let callCount = 0;
      mockQueryCockroachDb
        .mockImplementation((query: string, params?: unknown[]) => {
          callCount++;
          if (typeof query === "string") {
            if (query.includes("SELECT id FROM new_team_groups WHERE slug")) {
              return Promise.resolve({ rows: [{ id: mockGroupId }] });
            }
            if (query.includes("SELECT id FROM new_team_units WHERE group_id")) {
              return Promise.resolve({ rows: [{ id: mockTeamId }] });
            }
            if (query.includes("SELECT role, team_id FROM new_team_memberships") && query.includes("team_id IN")) {
              return Promise.resolve({ rows: [{ role: "captain", team_id: mockTeamId }] });
            }
            // Fail on INSERT
            if (query.includes("INSERT INTO new_team_recurring_meetings")) {
              return Promise.reject(new Error("Database connection failed"));
            }
          }
          return Promise.resolve({ rows: [] });
        });

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings",
        {
          method: "POST",
          body: JSON.stringify({
            team_slug: "neuqua-c-mgk6zb75",
            title: "Weekly Practice",
            days_of_week: [1, 3],
            start_time: "15:00",
            end_time: "17:00",
            start_date: "2024-01-15",
            end_date: "2024-06-15",
            meeting_type: "team",
            selected_team_id: mockTeamId, // Required for team meetings
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
      expect(data.details).toBe("Database connection failed");
    });
  });

  describe("GET /api/teams/calendar/recurring-meetings", () => {
    it("fetches recurring meetings successfully", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ id: "group-123" }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: "team-123" }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: "member" }], // Membership check
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: "meeting-1",
              team_id: "team-123",
              created_by: "user-456",
              title: "Weekly Practice",
              description: "Regular team practice",
              location: "Gym",
              days_of_week: "[1,3]",
              start_time: "15:00",
              end_time: "17:00",
              exceptions: "[]",
              created_at: "2024-01-01T00:00:00Z",
              creator_email: "captain@example.com",
              creator_name: "Captain Name",
            },
          ],
        } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings?teamSlug=neuqua-c-mgk6zb75"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meetings).toHaveLength(1);
      expect(data.meetings[0].title).toBe("Weekly Practice");
      expect(data.meetings[0].days_of_week).toEqual([1, 3]);
      expect(data.meetings[0].exceptions).toEqual([]);
    });

    it("returns 400 for missing team ID", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Team slug is required");
    });

    it("returns 401 for unauthenticated user", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings?teamSlug=neuqua-c-mgk6zb75"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 403 for non-team members", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ id: "group-123" }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: "team-123" }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // No membership found

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings?teamSlug=neuqua-c-mgk6zb75"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Not a member of this team");
    });

    it("handles database errors", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ id: "group-123" }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: "team-123" }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: "member" }], // Membership check
        } as any)
        .mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings?teamSlug=neuqua-c-mgk6zb75"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      // Error message may be "Database error" or "Failed to fetch recurring meetings" depending on error type
      expect(["Database error", "Failed to fetch recurring meetings"]).toContain(data.error);
    });

    it("parses JSON fields correctly", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ id: "group-123" }], // Team group lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ id: "team-123" }], // Team units lookup
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: "member" }], // Membership check
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: "meeting-1",
              team_id: "team-123",
              created_by: "user-456",
              title: "Weekly Practice",
              description: "Regular team practice",
              location: "Gym",
              days_of_week: "[1,3,5]",
              start_time: "15:00",
              end_time: "17:00",
              exceptions: '["2024-01-15","2024-01-22"]',
              created_at: "2024-01-01T00:00:00Z",
              creator_email: "captain@example.com",
              creator_name: "Captain Name",
            },
          ],
        } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings?teamSlug=neuqua-c-mgk6zb75"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meetings[0].days_of_week).toEqual([1, 3, 5]);
      expect(data.meetings[0].exceptions).toEqual(["2024-01-15", "2024-01-22"]);
    });
  });
});
