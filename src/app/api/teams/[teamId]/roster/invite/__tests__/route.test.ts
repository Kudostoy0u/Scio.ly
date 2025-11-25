import { GET, POST } from "@/app/api/teams/[teamId]/roster/invite/route";
import { dbPg } from "@/lib/db";
import { NotificationSyncService } from "@/lib/services/notification-sync";
import { getServerUser } from "@/lib/supabaseServer";
import { resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Type for Drizzle mock chain
type DrizzleMockChain = {
  from: ReturnType<typeof vi.fn>;
  where?: ReturnType<typeof vi.fn>;
  limit?: ReturnType<typeof vi.fn>;
  values?: ReturnType<typeof vi.fn>;
  returning?: ReturnType<typeof vi.fn>;
  set?: ReturnType<typeof vi.fn>;
  innerJoin?: ReturnType<typeof vi.fn>;
};

// Regex patterns for test validation
const SUBTEAM_ID_REGEX = /subteam id.*invalid|uuid/i;
const INVITATION_SENT_REGEX = /roster link invitation already sent/i;

// Mock dependencies
vi.mock("@/lib/db", () => ({
  dbPg: {
    select: vi.fn(),
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

vi.mock("@/lib/services/notification-sync", () => ({
  NotificationSyncService: {
    syncNotificationToSupabase: vi.fn(),
  },
}));

vi.mock("@/lib/utils/team-resolver", () => ({
  resolveTeamSlugToUnits: vi.fn(),
}));

const mockDbPg = vi.mocked(dbPg);
const mockGetServerUser = vi.mocked(getServerUser);
const mockNotificationSyncService = vi.mocked(NotificationSyncService);
const _mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);

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
    mockNotificationSyncService.syncNotificationToSupabase.mockResolvedValue();

    // Default Drizzle ORM mocks
    mockDbPg.select.mockReturnValue({
      from: vi.fn(),
      innerJoin: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
    } as unknown as DrizzleMockChain);
    mockDbPg.insert.mockReturnValue({
      values: vi.fn(),
      returning: vi.fn(),
    } as unknown as DrizzleMockChain);
    mockDbPg.update.mockReturnValue({
      set: vi.fn(),
      where: vi.fn(),
      returning: vi.fn(),
    } as unknown as DrizzleMockChain);
  });

  afterEach(() => {
    // biome-ignore lint/performance/noDelete: Need to remove env var for test cleanup
    delete process.env.DATABASE_URL;
  });

  describe("POST", () => {
    it("should create roster link invitation successfully", async () => {
      // Mock Drizzle ORM queries in sequence:
      // 1. Group lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockGroup.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

      // 2. Membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ role: mockMembership.role }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

      // 3. Subteam validation
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockSubteam.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

      // 4. User lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockInvitedUser]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

      // 5. Existing invitation check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

      // 6. Create invitation
      mockDbPg.insert.mockImplementationOnce(
        () =>
          ({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockInvitation]),
            }),
          }) as unknown as DrizzleMockChain
      );

      // 7. Get team info (for notification)
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([mockTeamInfo]),
                }),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

      // 8. Create notification
      mockDbPg.insert.mockImplementationOnce(
        () =>
          ({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockNotification]),
            }),
          }) as unknown as DrizzleMockChain
      );

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
      expect(data.error).toBe("Validation failed");
      expect(data.details).toBeDefined();
      expect(Array.isArray(data.details)).toBe(true);
      expect(data.details.length).toBeGreaterThan(0);
      // Check that details contain validation error messages
      const hasValidationError = data.details.some(
        (detail: string) => typeof detail === "string" && detail.length > 0
      );
      expect(hasValidationError).toBe(true);
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
      expect(data.error).toBe("Validation failed");
      expect(Array.isArray(data.details)).toBe(true);
      expect(data.details.some((detail: string) => SUBTEAM_ID_REGEX.test(detail))).toBe(true);
    });

    it("should return 404 if team group is not found", async () => {
      // Mock group lookup returning empty
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }) as unknown as DrizzleMockChain
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

      expect(response.status).toBe(404);
      expect(data.error).toBe("Team group not found");
    });

    it("should return 403 if user is not a team member", async () => {
      // Mock group lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockGroup.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock membership check returning empty
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          }) as unknown as DrizzleMockChain
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

      expect(response.status).toBe(403);
      expect(data.error).toBe("Not a team member");
    });

    it("should return 403 if user is not a captain", async () => {
      const memberMembership = { role: "member" };
      // Mock group lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockGroup.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock membership check returning member role
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([memberMembership]),
              }),
            }),
          }) as unknown as DrizzleMockChain
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

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only captains can send roster invitations");
    });

    it("should return 404 if subteam is not found", async () => {
      // Mock group lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockGroup.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ role: mockMembership.role }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock subteam validation returning empty
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }) as unknown as DrizzleMockChain
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

      expect(response.status).toBe(404);
      expect(data.error).toBe("Subteam not found");
    });

    it("should return 404 if invited user is not found", async () => {
      // Mock group lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockGroup.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ role: mockMembership.role }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock subteam validation
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockSubteam.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock user lookup returning empty
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

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
      // Mock group lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockGroup.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ role: mockMembership.role }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock subteam validation
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockSubteam.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock user lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockInvitedUser]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock existing invitation check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([existingInvitation]),
              }),
            }),
          }) as unknown as DrizzleMockChain
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

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details).toBeDefined();
      expect(Array.isArray(data.details)).toBe(true);
      expect(data.details.some((detail: string) => INVITATION_SENT_REGEX.test(detail))).toBe(true);
    });

    it("should update existing declined invitation", async () => {
      const existingInvitation = { id: "existing-invitation", status: "declined" };
      // Mock group lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockGroup.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ role: mockMembership.role }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock subteam validation
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockSubteam.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock user lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockInvitedUser]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock existing invitation check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([existingInvitation]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock update invitation
      mockDbPg.update.mockImplementationOnce(
        () =>
          ({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([mockInvitation]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock get team info (for notification)
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([mockTeamInfo]),
                }),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock create notification
      mockDbPg.insert.mockImplementationOnce(
        () =>
          ({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockNotification]),
            }),
          }) as unknown as DrizzleMockChain
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

      expect(response.status).toBe(200);
      expect(data.message).toBe("Roster link invitation sent successfully");
    });

    it("should handle notification sync failure gracefully", async () => {
      // Mock group lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockGroup.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ role: mockMembership.role }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock subteam validation
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockSubteam.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock user lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockInvitedUser]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock existing invitation check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock create invitation
      mockDbPg.insert.mockImplementationOnce(
        () =>
          ({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockInvitation]),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock get team info (for notification)
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([mockTeamInfo]),
                }),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock create notification
      mockDbPg.insert.mockImplementationOnce(
        () =>
          ({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockNotification]),
            }),
          }) as unknown as DrizzleMockChain
      );

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

      // Mock group lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockGroup.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ role: mockMembership.role }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock user search
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockSearchResults),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

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
      // Mock group lookup returning empty
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

      const request = new NextRequest(
        "http://localhost:3000/api/teams/test-team/roster/invite?q=user"
      );

      const response = await GET(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Team group not found");
    });

    it("should return 403 if user is not a team member", async () => {
      // Mock group lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockGroup.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock membership check returning empty
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

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
      // Mock group lookup
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: mockGroup.id }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock membership check returning member role
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([memberMembership]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

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
