import { GET, POST } from "@/app/api/teams/calendar/recurring-meetings/route";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database functions
vi.mock("@/lib/db", () => ({
  dbPg: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";

const mockDbPg = vi.mocked(dbPg);
const mockGetServerUser = vi.mocked(getServerUser);

describe("/api/teams/calendar/recurring-meetings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/teams/calendar/recurring-meetings", () => {
    const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
    const mockGroupId = "123e4567-e89b-12d3-a456-426614174001";
    const mockTeamId = "123e4567-e89b-12d3-a456-426614174002";
    const mockMeetingId = "123e4567-e89b-12d3-a456-426614174003";

    it("creates recurring meeting successfully for captain", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });

      // Mock selected team lookup (select().from().innerJoin().where().limit()) - when selected_team_id is provided
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ slug: "neuqua-c-mgk6zb75" }]),
            }),
          }),
        }),
      });

      // Mock team group lookup (select().from().where().limit())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });

      // Mock team units lookup (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: mockTeamId }]),
        }),
      });

      // Mock membership check (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ role: "captain", teamId: mockTeamId }]),
        }),
      });

      // Mock insert recurring meeting (insert().values().returning())
      mockDbPg.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: mockMeetingId }]),
        }),
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
            start_date: "2024-01-15T00:00:00Z", // ISO datetime string
            end_date: "2024-06-15T00:00:00Z", // ISO datetime string
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
    });

    it("creates recurring meeting successfully for co-captain", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });

      // Mock selected team lookup (select().from().innerJoin().where().limit()) - when selected_team_id is provided
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ slug: "neuqua-c-mgk6zb75" }]),
            }),
          }),
        }),
      });

      // Mock team group lookup (select().from().where().limit())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });

      // Mock team units lookup (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: mockTeamId }]),
        }),
      });

      // Mock membership check (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ role: "co_captain", teamId: mockTeamId }]),
        }),
      });

      // Mock insert recurring meeting (insert().values().returning())
      mockDbPg.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: mockMeetingId }]),
        }),
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
            start_date: "2024-01-15T00:00:00Z", // ISO datetime string
            end_date: "2024-06-15T00:00:00Z", // ISO datetime string
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
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as { id: string });

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
      expect(data.error).toBe("Validation failed");
      expect(data.details).toBeDefined();
    });

    it("returns 403 for non-captain users when creating team meeting", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });

      // Mock team group lookup (select().from().where().limit())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });

      // Mock team units lookup (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: mockTeamId }]),
        }),
      });

      // Mock membership check returns empty (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
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
            start_date: "2024-01-15T00:00:00Z", // ISO datetime string
            end_date: "2024-06-15T00:00:00Z", // ISO datetime string
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
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });

      // Mock team group lookup (select().from().where().limit())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });

      // Mock team units lookup (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: mockTeamId }]),
        }),
      });

      // Mock membership check (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ role: "member", teamId: mockTeamId }]),
        }),
      });

      // Mock insert recurring meeting (insert().values().returning())
      mockDbPg.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: mockMeetingId }]),
        }),
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
            start_date: "2024-01-15T00:00:00Z", // ISO datetime string
            end_date: "2024-06-15T00:00:00Z", // ISO datetime string
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
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });

      // Mock selected team lookup (select().from().innerJoin().where().limit())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ slug: "neuqua-c-mgk6zb75" }]),
            }),
          }),
        }),
      });

      // Mock team group lookup (select().from().where().limit())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });

      // Mock team units lookup (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: mockTeamId }]),
        }),
      });

      // Mock membership check (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ role: "captain", teamId: mockTeamId }]),
        }),
      });

      // Mock insert recurring meeting to reject (insert().values().returning())
      mockDbPg.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("Database connection failed")),
        }),
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
            start_date: "2024-01-15T00:00:00Z", // ISO datetime string
            end_date: "2024-06-15T00:00:00Z", // ISO datetime string
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
      const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
      const mockGroupId = "123e4567-e89b-12d3-a456-426614174001";
      const mockTeamId = "123e4567-e89b-12d3-a456-426614174002";
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });

      // Mock team group lookup (select().from().where().limit())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });

      // Mock team units lookup (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: mockTeamId }]),
        }),
      });

      // Mock membership check (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ role: "member" }]),
        }),
      });

      // Mock recurring meetings query (select().from().leftJoin().where().orderBy())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                {
                  id: "meeting-1",
                  team_id: mockTeamId,
                  created_by: "123e4567-e89b-12d3-a456-426614174003",
                  title: "Weekly Practice",
                  description: "Regular team practice",
                  location: "Gym",
                  days_of_week: [1, 3],
                  start_time: "15:00",
                  end_time: "17:00",
                  exceptions: [],
                  created_at: "2024-01-01T00:00:00Z",
                  creator_email: "captain@example.com",
                  creator_name: "Captain Name",
                },
              ]),
            }),
          }),
        }),
      });

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
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as { id: string });

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details).toBeDefined();
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
      const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
      const mockGroupId = "123e4567-e89b-12d3-a456-426614174001";
      const mockTeamId = "123e4567-e89b-12d3-a456-426614174002";
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });

      // Mock team group lookup (select().from().where().limit())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });

      // Mock team units lookup (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: mockTeamId }]),
        }),
      });

      // Mock membership check returns empty (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings?teamSlug=neuqua-c-mgk6zb75"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Not a member of this team");
    });

    it("handles database errors", async () => {
      const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
      const mockGroupId = "123e4567-e89b-12d3-a456-426614174001";
      const mockTeamId = "123e4567-e89b-12d3-a456-426614174002";
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });

      // Mock team group lookup (select().from().where().limit())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });

      // Mock team units lookup (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: mockTeamId }]),
        }),
      });

      // Mock membership check (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ role: "member" }]),
        }),
      });

      // Mock recurring meetings query to reject (select().from().leftJoin().where().orderBy())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockRejectedValue(new Error("Database error")),
            }),
          }),
        }),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/recurring-meetings?teamSlug=neuqua-c-mgk6zb75"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect([
        "An error occurred",
        "Database error",
        "Failed to fetch recurring meetings",
      ]).toContain(data.error);
    });

    it("parses JSON fields correctly", async () => {
      const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
      const mockGroupId = "123e4567-e89b-12d3-a456-426614174001";
      const mockTeamId = "123e4567-e89b-12d3-a456-426614174002";
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });

      // Mock team group lookup (select().from().where().limit())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });

      // Mock team units lookup (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: mockTeamId }]),
        }),
      });

      // Mock membership check (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ role: "member" }]),
        }),
      });

      // Mock recurring meetings query (select().from().leftJoin().where().orderBy())
      // Note: The route uses safeJsonParse which handles JSON strings, but Drizzle returns arrays/objects directly
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                {
                  id: "meeting-1",
                  team_id: mockTeamId,
                  created_by: "123e4567-e89b-12d3-a456-426614174003",
                  title: "Weekly Practice",
                  description: "Regular team practice",
                  location: "Gym",
                  days_of_week: [1, 3, 5], // Already parsed as array
                  start_time: "15:00",
                  end_time: "17:00",
                  exceptions: ["2024-01-15", "2024-01-22"], // Already parsed as array
                  created_at: "2024-01-01T00:00:00Z",
                  creator_email: "captain@example.com",
                  creator_name: "Captain Name",
                },
              ]),
            }),
          }),
        }),
      });

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
