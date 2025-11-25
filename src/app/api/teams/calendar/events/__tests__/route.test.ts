import { GET, POST } from "@/app/api/teams/calendar/events/route";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the dependencies
vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  dbPg: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/utils/team-resolver", () => ({
  resolveTeamSlugToUnits: vi.fn(),
}));

import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import { resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";

const mockGetServerUser = vi.mocked(getServerUser);
const mockDbPg = vi.mocked(dbPg);
const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);

describe("/api/teams/calendar/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should resolve team slug to team unit IDs and fetch events", async () => {
      const mockUser = { id: "user-123" };
      const mockTeamInfo = {
        groupId: "group-123",
        teamUnitIds: ["unit-1", "unit-2"],
      };
      const mockEvents = [
        {
          id: "event-1",
          title: "Test Event",
          start_time: "2024-01-01T10:00:00Z",
          creator_name: "John Doe",
          creator_email: "john@example.com",
        },
      ];

      mockGetServerUser.mockResolvedValue(mockUser);
      mockResolveTeamSlugToUnits.mockResolvedValue(mockTeamInfo);

      // Mock events query (select().from().leftJoin().where().orderBy())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockEvents),
            }),
          }),
        }),
      });

      // Mock attendees query for first event (select().from().leftJoin().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/events?teamId=neuqua-c-mgk6zb75"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(mockResolveTeamSlugToUnits).toHaveBeenCalledWith("neuqua-c-mgk6zb75");
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events).toHaveLength(1);
    });

    it("should return 404 when team slug is not found", async () => {
      const mockUser = { id: "user-123" };

      mockGetServerUser.mockResolvedValue(mockUser);
      mockResolveTeamSlugToUnits.mockRejectedValue(new Error("Team group not found"));

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/events?teamId=invalid-slug"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Team not found");
    });

    it("should return empty events when no team units found", async () => {
      const mockUser = { id: "user-123" };
      const mockTeamInfo = {
        groupId: "group-123",
        teamUnitIds: [],
      };

      mockGetServerUser.mockResolvedValue(mockUser);
      mockResolveTeamSlugToUnits.mockResolvedValue(mockTeamInfo);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/events?teamId=neuqua-c-mgk6zb75"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events).toHaveLength(0);
    });

    it("should return 401 when user is not authenticated", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/events?teamId=neuqua-c-mgk6zb75"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("POST", () => {
    it("should resolve team slug to UUID when creating event", async () => {
      const mockUser = { id: "user-123" };
      const mockTeamInfo = {
        groupId: "group-123",
        teamUnitIds: ["unit-1", "unit-2"],
      };

      mockGetServerUser.mockResolvedValue(mockUser);
      mockResolveTeamSlugToUnits.mockResolvedValue(mockTeamInfo);

      // Mock insert event (insert().values().returning())
      mockDbPg.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "event-123" }]),
        }),
      });

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Event",
          start_time: "2024-01-01T10:00:00Z",
          team_id: "neuqua-c-mgk6zb75",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockResolveTeamSlugToUnits).toHaveBeenCalledWith("neuqua-c-mgk6zb75");
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eventId).toBe("event-123");
    });

    it("should handle UUID team_id without resolving", async () => {
      const mockUser = { id: "user-123" };
      const uuidTeamId = "123e4567-e89b-12d3-a456-426614174000";

      mockGetServerUser.mockResolvedValue(mockUser);

      // Mock insert event (insert().values().returning())
      mockDbPg.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "event-123" }]),
        }),
      });

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Event",
          start_time: "2024-01-01T10:00:00Z",
          team_id: uuidTeamId,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockResolveTeamSlugToUnits).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eventId).toBe("event-123");
    });
  });
});
