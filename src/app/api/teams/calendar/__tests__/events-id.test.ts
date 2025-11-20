import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PUT } from "@/app/api/teams/calendar/events/[eventId]/route";

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

describe("/api/teams/calendar/events/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("DELETE /api/teams/calendar/events/[eventId]", () => {
    it("deletes event successfully when user is creator", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ created_by: "user-123", team_id: "team-123" }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events/event-123", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ eventId: "event-123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryCockroachDb).toHaveBeenCalledWith(
        "DELETE FROM new_team_events WHERE id = $1",
        ["event-123"]
      );
    });

    it("deletes event successfully when user is captain", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-456" } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ created_by: "user-123", team_id: "team-123" }],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: "captain" }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events/event-123", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ eventId: "event-123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns 404 for non-existent event", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/events/non-existent",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ eventId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Event not found");
    });

    it("returns 403 for insufficient permissions", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-456" } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ created_by: "user-123", team_id: "team-123" }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events/event-123", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ eventId: "event-123" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Insufficient permissions");
    });

    it("returns 401 for unauthenticated user", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events/event-123", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ eventId: "event-123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("handles database errors", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events/event-123", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ eventId: "event-123" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to delete event");
    });
  });

  describe("PUT /api/teams/calendar/events/[eventId]", () => {
    it("updates event successfully when user is creator", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ created_by: "user-123", team_id: "team-123" }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events/event-123", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Event",
          description: "Updated Description",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await PUT(request, { params: Promise.resolve({ eventId: "event-123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryCockroachDb).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE new_team_events SET"),
        expect.arrayContaining(["Updated Event", "Updated Description", "event-123"])
      );
    });

    it("updates event successfully when user is captain", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-456" } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ created_by: "user-123", team_id: "team-123" }],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ role: "captain" }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events/event-123", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Event",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await PUT(request, { params: Promise.resolve({ eventId: "event-123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns 404 for non-existent event", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/calendar/events/non-existent",
        {
          method: "PUT",
          body: JSON.stringify({
            title: "Updated Event",
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const response = await PUT(request, { params: Promise.resolve({ eventId: "non-existent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Event not found");
    });

    it("returns 403 for insufficient permissions", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-456" } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ created_by: "user-123", team_id: "team-123" }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events/event-123", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Event",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await PUT(request, { params: Promise.resolve({ eventId: "event-123" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Insufficient permissions");
    });

    it("returns 400 for no fields to update", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb.mockResolvedValueOnce({
        rows: [{ created_by: "user-123", team_id: "team-123" }],
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events/event-123", {
        method: "PUT",
        body: JSON.stringify({}),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await PUT(request, { params: Promise.resolve({ eventId: "event-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No fields to update");
    });

    it("handles recurrence pattern updates", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ created_by: "user-123", team_id: "team-123" }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const recurrencePattern = { frequency: "weekly", days: [1, 3] };

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events/event-123", {
        method: "PUT",
        body: JSON.stringify({
          recurrence_pattern: recurrencePattern,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await PUT(request, { params: Promise.resolve({ eventId: "event-123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockQueryCockroachDb).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE new_team_events SET"),
        expect.arrayContaining([JSON.stringify(recurrencePattern), "event-123"])
      );
    });

    it("handles database errors", async () => {
      mockGetServerUser.mockResolvedValue({ id: "user-123" } as any);
      mockQueryCockroachDb
        .mockResolvedValueOnce({
          rows: [{ created_by: "user-123", team_id: "team-123" }],
        } as any)
        .mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/teams/calendar/events/event-123", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Event",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await PUT(request, { params: Promise.resolve({ eventId: "event-123" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to update event");
    });
  });
});
