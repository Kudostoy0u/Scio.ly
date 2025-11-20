import { queryCockroachDB } from "@/lib/cockroachdb";
import { getServerUser } from "@/lib/supabaseServer";
import {
  checkTeamGroupAccessCockroach,
  checkTeamGroupLeadershipCockroach,
} from "@/lib/utils/team-auth";
import { resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "@/app/api/teams/[teamId]/timers/route";

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/team-auth", () => ({
  checkTeamGroupAccessCockroach: vi.fn(),
  checkTeamGroupLeadershipCockroach: vi.fn(),
}));

vi.mock("@/lib/cockroachdb", () => ({
  queryCockroachDB: vi.fn(),
}));

vi.mock("@/lib/utils/team-resolver", () => ({
  resolveTeamSlugToUnits: vi.fn(),
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockCheckTeamGroupAccessCockroach = vi.mocked(checkTeamGroupAccessCockroach);
const mockCheckTeamGroupLeadershipCockroach = vi.mocked(checkTeamGroupLeadershipCockroach);
const mockQueryCockroachDb = vi.mocked(queryCockroachDB);
const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);

describe("/api/teams/[teamId]/timers", () => {
  const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
  const mockTeamId = "team-456";
  const mockGroupId = "123e4567-e89b-12d3-a456-426614174001";
  const mockSubteamId = "123e4567-e89b-12d3-a456-426614174002";
  const mockEventId = "123e4567-e89b-12d3-a456-426614174003";
  const mockTimerId = "123e4567-e89b-12d3-a456-426614174004";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods to reduce noise
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Default mock for resolveTeamSlugToUnits
    mockResolveTeamSlugToUnits.mockResolvedValue({
      groupId: mockGroupId,
      teamUnitIds: [mockSubteamId],
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/teams/[teamId]/timers", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 400 when subteamId is missing", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Subteam ID is required");
    });

    it("should return 403 when user has no access", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupAccessCockroach.mockResolvedValue({
        isAuthorized: false,
        hasMembership: false,
        hasRosterEntry: false,
        role: undefined,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/teams/${mockTeamId}/timers?subteamId=${mockSubteamId}`
      );
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Not authorized to view this team");
    });

    it("should return timers when user has access", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupAccessCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: "captain",
      });

      // Mock timers query - matches the actual SQL query structure
      mockQueryCockroachDb.mockResolvedValue({
        rows: [
          {
            id: mockEventId,
            title: "Anatomy Event",
            start_time: "2024-01-01T10:00:00Z",
            location: "Room 101",
            event_type: "meeting",
            added_at: "2024-01-01T09:00:00Z",
          },
        ],
      });

      const request = new NextRequest(
        `http://localhost:3000/api/teams/${mockTeamId}/timers?subteamId=${mockSubteamId}`
      );
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.timers).toHaveLength(1);
      expect(body.timers[0].id).toBe(mockEventId);
      expect(body.timers[0].title).toBe("Anatomy Event");
    });

    it("should return empty array when no timers exist", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupAccessCockroach.mockResolvedValue({
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: "captain",
      });

      // Mock empty timers query
      mockQueryCockroachDb.mockResolvedValue({
        rows: [],
      });

      const request = new NextRequest(
        `http://localhost:3000/api/teams/${mockTeamId}/timers?subteamId=${mockSubteamId}`
      );
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.timers).toHaveLength(0);
    });
  });

  describe("POST /api/teams/[teamId]/timers", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: "POST",
        body: JSON.stringify({
          subteamId: mockSubteamId,
          eventId: mockEventId,
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 403 when user has no leadership access", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        hasLeadership: false,
        isAuthorized: false,
        hasMembership: false,
        hasRosterEntry: false,
        role: "member",
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: "POST",
        body: JSON.stringify({
          subteamId: mockSubteamId,
          eventId: mockEventId,
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Only captains and co-captains can manage timers");
    });

    it("should create timer when user has leadership access", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        hasLeadership: true,
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: "captain",
      });

      // Mock event existence check
      mockQueryCockroachDb.mockResolvedValueOnce({
        rows: [{ id: mockEventId }],
      });

      // Mock timer creation
      mockQueryCockroachDb.mockResolvedValueOnce({
        rows: [{ id: mockTimerId }],
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: "POST",
        body: JSON.stringify({
          subteamId: mockSubteamId,
          eventId: mockEventId,
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Timer added successfully");
      expect(body.timerId).toBe(mockTimerId);
    });

    it("should handle missing required fields", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        hasLeadership: true,
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: "captain",
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: "POST",
        body: JSON.stringify({
          subteamId: mockSubteamId,
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Subteam ID and event ID are required");
    });
  });

  describe("DELETE /api/teams/[teamId]/timers", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: "DELETE",
        body: JSON.stringify({
          subteamId: mockSubteamId,
          eventId: mockEventId,
        }),
      });
      const response = await DELETE(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 403 when user has no leadership access", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        hasLeadership: false,
        isAuthorized: false,
        hasMembership: false,
        hasRosterEntry: false,
        role: "member",
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: "DELETE",
        body: JSON.stringify({
          subteamId: mockSubteamId,
          eventId: mockEventId,
        }),
      });
      const response = await DELETE(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Only captains and co-captains can manage timers");
    });

    it("should delete timer when user has leadership access", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        hasLeadership: true,
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: "captain",
      });

      // Mock timer deletion
      mockQueryCockroachDb.mockResolvedValue({
        rows: [{ id: mockTimerId }],
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: "DELETE",
        body: JSON.stringify({
          subteamId: mockSubteamId,
          eventId: mockEventId,
        }),
      });
      const response = await DELETE(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Timer removed successfully");
    });

    it("should handle missing required fields", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockCheckTeamGroupLeadershipCockroach.mockResolvedValue({
        hasLeadership: true,
        isAuthorized: true,
        hasMembership: true,
        hasRosterEntry: false,
        role: "captain",
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/timers`, {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      const response = await DELETE(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Subteam ID and event ID are required");
    });
  });
});
