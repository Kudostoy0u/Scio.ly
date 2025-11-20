import { queryCockroachDB } from "@/lib/cockroachdb";
import { NotificationSyncService } from "@/lib/services/notification-sync";
import { getServerUser } from "@/lib/supabaseServer";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/teams/[teamId]/roster/invite/route";

// Mock dependencies
vi.mock("@/lib/cockroachdb");
vi.mock("@/lib/supabaseServer");
vi.mock("@/lib/services/notification-sync");

const mockQueryCockroachDb = vi.mocked(queryCockroachDB);
const mockGetServerUser = vi.mocked(getServerUser);
const mockNotificationSyncService = vi.mocked(NotificationSyncService);

describe("/api/teams/[teamId]/roster/invite", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
  };

  const mockInvitedUser = {
    id: "invited-user-123",
    email: "invited@example.com",
    display_name: "Invited User",
    first_name: "Invited",
    last_name: "User",
    username: "inviteduser",
  };

  const mockMembership = {
    role: "captain",
  };

  const mockGroup = {
    id: "group-123",
  };

  const mockSubteam = {
    id: "123e4567-e89b-12d3-a456-426614174000",
  };

  const mockTeamInfo = {
    school: "Test School",
    division: "B",
  };

  const mockInvitation = {
    id: "invitation-123",
    team_id: "123e4567-e89b-12d3-a456-426614174000",
    student_name: "Test Student",
    invited_user_id: "invited-user-123",
    invited_by: "user-123",
    message: 'You\'ve been invited to link your account to the roster entry "Test Student"',
    status: "pending",
    created_at: "2024-01-01T00:00:00.000Z",
    expires_at: "2024-01-01T00:00:00.000Z",
  };

  const mockNotification = {
    id: "notification-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up environment
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

    // Default mocks
    mockGetServerUser.mockResolvedValue(mockUser);
    mockQueryCockroachDb.mockResolvedValue({ rows: [] });
    mockNotificationSyncService.syncNotificationToSupabase.mockResolvedValue();
  });

  afterEach(() => {
    process.env.DATABASE_URL = undefined;
  });

  describe("POST", () => {
    it("should create roster link invitation successfully", async () => {
      // Set up the mock sequence properly
      mockQueryCockroachDb
        .mockResolvedValueOnce({ rows: [mockGroup] }) // group lookup
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: [mockSubteam] }) // subteam validation
        .mockResolvedValueOnce({ rows: [mockInvitedUser] }) // user lookup
        .mockResolvedValueOnce({ rows: [] }) // existing invitation check
        .mockResolvedValueOnce({ rows: [mockInvitation] }) // create invitation
        .mockResolvedValueOnce({ rows: [mockTeamInfo] }) // team info
        .mockResolvedValueOnce({ rows: [mockNotification] }); // create notification

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/roster/invite", {
        method: "POST",
        body: JSON.stringify({
          subteamId: "123e4567-e89b-12d3-a456-426614174000",
          studentName: "Test Student",
          username: "inviteduser",
          message: "Custom message",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Roster link invitation sent successfully");
      expect(data.invitation).toEqual(mockInvitation);

      // Verify notification sync was called
      expect(mockNotificationSyncService.syncNotificationToSupabase).toHaveBeenCalledWith(
        "notification-123"
      );
    });

    it("should return 401 if user is not authenticated", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/roster/invite", {
        method: "POST",
        body: JSON.stringify({
          subteamId: "123e4567-e89b-12d3-a456-426614174000",
          studentName: "Test Student",
          username: "inviteduser",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if required fields are missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/test-team/roster/invite", {
        method: "POST",
        body: JSON.stringify({
          subteamId: "subteam-123",
          // missing studentName and username
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Subteam ID, student name, and username are required");
    });

    it("should return 400 if subteam ID is invalid UUID", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/test-team/roster/invite", {
        method: "POST",
        body: JSON.stringify({
          subteamId: "invalid-uuid",
          studentName: "Test Student",
          username: "inviteduser",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid subteam ID format. Must be a valid UUID.");
    });

    it("should return 404 if team group is not found", async () => {
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: [] }); // no group found

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/roster/invite", {
        method: "POST",
        body: JSON.stringify({
          subteamId: "123e4567-e89b-12d3-a456-426614174000",
          studentName: "Test Student",
          username: "inviteduser",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Team group not found");
    });

    it("should return 403 if user is not a team member", async () => {
      mockQueryCockroachDb
        .mockResolvedValueOnce({ rows: [mockGroup] }) // group lookup
        .mockResolvedValueOnce({ rows: [] }); // no membership

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/roster/invite", {
        method: "POST",
        body: JSON.stringify({
          subteamId: "123e4567-e89b-12d3-a456-426614174000",
          studentName: "Test Student",
          username: "inviteduser",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Not a team member");
    });

    it("should return 403 if user is not a captain", async () => {
      const memberMembership = { role: "member" };
      mockQueryCockroachDb
        .mockResolvedValueOnce({ rows: [mockGroup] }) // group lookup
        .mockResolvedValueOnce({ rows: [memberMembership] }); // member role

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/roster/invite", {
        method: "POST",
        body: JSON.stringify({
          subteamId: "123e4567-e89b-12d3-a456-426614174000",
          studentName: "Test Student",
          username: "inviteduser",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only captains can send roster invitations");
    });

    it("should return 404 if subteam is not found", async () => {
      mockQueryCockroachDb
        .mockResolvedValueOnce({ rows: [mockGroup] }) // group lookup
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: [] }); // no subteam found

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/roster/invite", {
        method: "POST",
        body: JSON.stringify({
          subteamId: "123e4567-e89b-12d3-a456-426614174000",
          studentName: "Test Student",
          username: "inviteduser",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Subteam not found");
    });

    it("should return 404 if invited user is not found", async () => {
      mockQueryCockroachDb.mockReset();
      mockQueryCockroachDb
        .mockResolvedValueOnce({ rows: [mockGroup] }) // group lookup
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: [mockSubteam] }) // subteam validation
        .mockResolvedValueOnce({ rows: [] }); // no user found

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/roster/invite", {
        method: "POST",
        body: JSON.stringify({
          subteamId: "123e4567-e89b-12d3-a456-426614174000",
          studentName: "Test Student",
          username: "nonexistentuser",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return 400 if invitation already sent", async () => {
      const existingInvitation = { id: "existing-invitation", status: "pending" };
      mockQueryCockroachDb.mockReset();
      mockQueryCockroachDb
        .mockResolvedValueOnce({ rows: [mockGroup] }) // group lookup
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: [mockSubteam] }) // subteam validation
        .mockResolvedValueOnce({ rows: [mockInvitedUser] }) // user lookup
        .mockResolvedValueOnce({ rows: [existingInvitation] }); // existing invitation

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/roster/invite", {
        method: "POST",
        body: JSON.stringify({
          subteamId: "123e4567-e89b-12d3-a456-426614174000",
          studentName: "Test Student",
          username: "inviteduser",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Roster link invitation already sent");
    });

    it("should update existing declined invitation", async () => {
      const existingInvitation = { id: "existing-invitation", status: "declined" };
      mockQueryCockroachDb.mockReset();
      mockQueryCockroachDb
        .mockResolvedValueOnce({ rows: [mockGroup] }) // group lookup
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: [mockSubteam] }) // subteam validation
        .mockResolvedValueOnce({ rows: [mockInvitedUser] }) // user lookup
        .mockResolvedValueOnce({ rows: [existingInvitation] }) // existing invitation
        .mockResolvedValueOnce({ rows: [mockInvitation] }) // update invitation
        .mockResolvedValueOnce({ rows: [mockTeamInfo] }) // team info
        .mockResolvedValueOnce({ rows: [mockNotification] }); // create notification

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/roster/invite", {
        method: "POST",
        body: JSON.stringify({
          subteamId: "123e4567-e89b-12d3-a456-426614174000",
          studentName: "Test Student",
          username: "inviteduser",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Roster link invitation sent successfully");
    });

    it("should handle notification sync failure gracefully", async () => {
      mockQueryCockroachDb
        .mockResolvedValueOnce({ rows: [mockGroup] }) // group lookup
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: [mockSubteam] }) // subteam validation
        .mockResolvedValueOnce({ rows: [mockInvitedUser] }) // user lookup
        .mockResolvedValueOnce({ rows: [] }) // existing invitation check
        .mockResolvedValueOnce({ rows: [mockInvitation] }) // create invitation
        .mockResolvedValueOnce({ rows: [mockTeamInfo] }) // team info
        .mockResolvedValueOnce({ rows: [mockNotification] }); // create notification

      mockNotificationSyncService.syncNotificationToSupabase.mockRejectedValue(
        new Error("Sync failed")
      );

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/roster/invite", {
        method: "POST",
        body: JSON.stringify({
          subteamId: "123e4567-e89b-12d3-a456-426614174000",
          studentName: "Test Student",
          username: "inviteduser",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      // Should still succeed even if notification sync fails
      expect(response.status).toBe(200);
      expect(data.message).toBe("Roster link invitation sent successfully");
    });
  });

  describe("GET", () => {
    it("should search users successfully", async () => {
      const mockSearchResults = [
        {
          id: "user-1",
          email: "user1@example.com",
          display_name: "User One",
          first_name: "User",
          last_name: "One",
          username: "user1",
          photo_url: null,
        },
      ];

      // Reset and set up specific mocks for this test
      mockQueryCockroachDb.mockReset();
      mockQueryCockroachDb
        .mockResolvedValueOnce({ rows: [mockGroup] }) // group lookup
        .mockResolvedValueOnce({ rows: [mockMembership] }) // membership check
        .mockResolvedValueOnce({ rows: mockSearchResults }); // search results

      const request = new NextRequest(
        "http://localhost:3000/api/teams/test-team/roster/invite?q=user"
      );

      const response = await GET(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toEqual(mockSearchResults);
    });

    it("should return empty array for short queries", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/teams/test-team/roster/invite?q=a"
      );

      const response = await GET(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toEqual([]);
    });

    it("should return 401 if user is not authenticated", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/teams/test-team/roster/invite?q=user"
      );

      const response = await GET(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if team group is not found", async () => {
      mockQueryCockroachDb.mockReset();
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: [] }); // no group found

      const request = new NextRequest(
        "http://localhost:3000/api/teams/test-team/roster/invite?q=user"
      );

      const response = await GET(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Team group not found");
    });

    it("should return 403 if user is not a team member", async () => {
      mockQueryCockroachDb.mockReset();
      mockQueryCockroachDb
        .mockResolvedValueOnce({ rows: [mockGroup] }) // group lookup
        .mockResolvedValueOnce({ rows: [] }); // no membership

      const request = new NextRequest(
        "http://localhost:3000/api/teams/test-team/roster/invite?q=user"
      );

      const response = await GET(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Not a team member");
    });

    it("should return 403 if user is not a captain", async () => {
      const memberMembership = { role: "member" };
      mockQueryCockroachDb
        .mockResolvedValueOnce({ rows: [mockGroup] }) // group lookup
        .mockResolvedValueOnce({ rows: [memberMembership] }); // member role

      const request = new NextRequest(
        "http://localhost:3000/api/teams/test-team/roster/invite?q=user"
      );

      const response = await GET(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only captains can search users");
    });
  });
});
