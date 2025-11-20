import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/teams/calendar/events/route";

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

vi.mock("@/lib/utils/team-resolver", () => ({
  resolveTeamSlugToUnits: vi.fn(),
}));

import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import { resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";

const mockDbPg = vi.mocked(dbPg);
const mockGetServerUser = vi.mocked(getServerUser);
const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);

describe("/api/teams/calendar/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/teams/calendar/events", () => {
    it("creates event successfully", async () => {
      const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockResolveTeamSlugToUnits.mockResolvedValue({
        groupId: "123e4567-e89b-12d3-a456-426614174001",
        teamUnitIds: ["123e4567-e89b-12d3-a456-426614174002"],
      });
      
      // Mock insert event (insert().values().returning())
      mockDbPg.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "123e4567-e89b-12d3-a456-426614174003" }]),
        }),
      });

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Event",
          description: "Test Description",
          start_time: "2024-01-15T14:00:00Z",
          end_time: "2024-01-15T16:00:00Z",
          location: "Test Location",
          event_type: "practice",
          is_all_day: false,
          is_recurring: false,
          team_id: "team-123",
          created_by: mockUserId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eventId).toBe("123e4567-e89b-12d3-a456-426614174003");
    });

    it("returns 401 for unauthenticated user", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Event",
          start_time: "2024-01-15T14:00:00Z",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 for missing required fields", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          description: "Test Description",
          // Missing title and start_time
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details).toBeDefined();
      expect(Array.isArray(data.details)).toBe(true);
      expect(data.details.some((detail: string) => /title.*required/i.test(detail))).toBe(true);
    });

    it("handles database errors", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      
      // Mock insert event to reject
      mockDbPg.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      });

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Event",
          start_time: "2024-01-15T14:00:00Z",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(["An error occurred", "Failed to create event"]).toContain(data.error);
    });
  });

  describe("GET /api/teams/calendar/events", () => {
    it("fetches events successfully", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockResolveTeamSlugToUnits.mockResolvedValue({
        teamUnitIds: ["team-123"],
        teamGroupId: "group-123",
      });
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [
            {
              id: "event-1",
              title: "Team Practice",
              description: "Weekly practice",
              start_time: "2024-01-15T14:00:00Z",
              end_time: "2024-01-15T16:00:00Z",
              location: "Gym",
              event_type: "practice",
              is_all_day: false,
              is_recurring: false,
              recurrence_pattern: null,
              created_by: "user-123",
              team_id: "team-123",
              creator_email: "user@example.com",
              creator_name: "John Doe",
            },
          ],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: "user-456",
              status: "attending",
              responded_at: "2024-01-15T10:00:00Z",
              notes: "Will be there",
              email: "member@example.com",
              name: "Jane Smith",
            },
          ],
        } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/events?teamId=team-123"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events).toHaveLength(1);
      expect(data.events[0].title).toBe("Team Practice");
      expect(data.events[0].attendees).toHaveLength(1);
    });

    it("fetches events with date range", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockResolveTeamSlugToUnits.mockResolvedValue({
        teamUnitIds: ["team-123"],
        teamGroupId: "group-123",
      });
      mockQueryCockroachDb.mockResolvedValue({ rows: [] } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/events?teamId=team-123&startDate=2024-01-01&endDate=2024-01-31"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryCockroachDb).toHaveBeenCalledWith(
        expect.stringContaining("WHERE 1=1"),
        expect.arrayContaining(["team-123", "2024-01-01", "2024-01-31"])
      );
    });

    it("fetches personal events", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb.mockResolvedValue({ rows: [] } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/events?userId=user-123"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryCockroachDb).toHaveBeenCalledWith(
        expect.stringContaining("WHERE 1=1"),
        expect.arrayContaining(["user-123"])
      );
    });

    it("returns 401 for unauthenticated user", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("handles database errors", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch events");
    });
  });
});
