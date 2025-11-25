import { GET, POST } from "@/app/api/teams/[teamId]/invite/route";
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
};

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
  },
}));

vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/team-resolver", () => ({
  resolveTeamSlugToUnits: vi.fn(),
}));

vi.mock("@/lib/services/notification-sync", () => ({
  NotificationSyncService: {
    syncNotificationToSupabase: vi.fn(),
  },
}));

const mockDbPg = vi.mocked(dbPg);
const mockGetServerUser = vi.mocked(getServerUser);
const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);
const mockSyncNotificationToSupabase = vi.mocked(
  NotificationSyncService.syncNotificationToSupabase
);

describe("/api/teams/[teamId]/invite", () => {
  // Use proper UUID format for better type safety
  const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
  const mockInvitedUserId = "123e4567-e89b-12d3-a456-426614174001";
  const mockMembershipId = "123e4567-e89b-12d3-a456-426614174002";
  const mockTeamUnitId1 = "123e4567-e89b-12d3-a456-426614174003";
  const mockTeamUnitId2 = "123e4567-e89b-12d3-a456-426614174004";
  const mockNotificationId = "123e4567-e89b-12d3-a456-426614174005";

  const mockUser = {
    id: mockUserId,
    email: "test@example.com",
  };

  const mockTeamInfo = {
    teamUnitIds: [mockTeamUnitId1, mockTeamUnitId2],
  };

  const mockInvitedUser = {
    id: mockInvitedUserId,
    email: "invited@example.com",
    display_name: "Invited User",
    first_name: "Invited",
    last_name: "User",
    username: "inviteduser",
  };

  const mockMembership = {
    id: mockMembershipId,
    role: "captain",
    team_id: mockTeamUnitId1,
  };

  const mockTeamCodes = {
    user_code: "user123",
    captain_code: "captain123",
  };

  const mockTeamGroup = {
    school: "Test School",
    division: "C",
    slug: "test-school-c",
  };

  const mockNotification = {
    id: mockNotificationId,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up environment
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

    // Default mocks
    mockGetServerUser.mockResolvedValue(mockUser);
    mockResolveTeamSlugToUnits.mockResolvedValue(mockTeamInfo);
    mockSyncNotificationToSupabase.mockResolvedValue();

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
  });

  afterEach(() => {
    // Restore DATABASE_URL if it was deleted
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    }
  });

  describe("POST", () => {
    it("should create team invitation successfully", async () => {
      // Mock Drizzle ORM queries in sequence:
      // 1. Membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockMembership]),
            }),
          }) as unknown as DrizzleMockChain
      );
      // 2. User lookup
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
      // 3. Existing membership check
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
      // 4. Existing invitation check
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
      // 5. Get team codes
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockTeamCodes]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // 6. Get team group
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockTeamGroup]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // 7. Create notification
      mockDbPg.insert.mockImplementationOnce(
        () =>
          ({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockNotification]),
            }),
          }) as unknown as DrizzleMockChain
      );

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite", {
        method: "POST",
        body: JSON.stringify({
          username: "inviteduser",
          role: "member",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Invitation sent successfully");
      expect(data.joinCode).toBe("user123"); // member role should use user_code

      // Verify notification sync was called
      expect(mockSyncNotificationToSupabase).toHaveBeenCalledWith(mockNotificationId);
    });

    it("should return 401 if user is not authenticated", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite", {
        method: "POST",
        body: JSON.stringify({
          username: "inviteduser",
          role: "member",
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

    it("should return 500 if DATABASE_URL is missing", async () => {
      const originalEnv = process.env.DATABASE_URL;
      // biome-ignore lint/performance/noDelete: Need to remove env var for test
      delete process.env.DATABASE_URL;

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite", {
        method: "POST",
        body: JSON.stringify({
          username: "inviteduser",
          role: "member",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      // Restore environment
      if (originalEnv) {
        process.env.DATABASE_URL = originalEnv;
      } else {
        // biome-ignore lint/performance/noDelete: Need to remove env var for test cleanup
        delete process.env.DATABASE_URL;
      }

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database configuration error");
    });

    it("should return 404 if team is not found", async () => {
      mockResolveTeamSlugToUnits.mockRejectedValue(new Error("Team not found"));

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite", {
        method: "POST",
        body: JSON.stringify({
          username: "inviteduser",
          role: "member",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Team not found");
    });

    it("should return 403 if user is not a team member", async () => {
      // Mock membership check returning empty
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }) as unknown as DrizzleMockChain
      );

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite", {
        method: "POST",
        body: JSON.stringify({
          username: "inviteduser",
          role: "member",
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
      const memberMembership = { ...mockMembership, role: "member" };
      // Mock membership check returning member role
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([memberMembership]),
            }),
          }) as unknown as DrizzleMockChain
      );

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite", {
        method: "POST",
        body: JSON.stringify({
          username: "inviteduser",
          role: "member",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only captains can invite members");
    });

    it("should return 404 if invited user is not found", async () => {
      // Mock membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockMembership]),
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

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite", {
        method: "POST",
        body: JSON.stringify({
          username: "nonexistentuser",
          role: "member",
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

    it("should return 400 if user is already a team member", async () => {
      // Mock membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockMembership]),
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
      // Mock existing membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: "existing-membership" }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite", {
        method: "POST",
        body: JSON.stringify({
          username: "inviteduser",
          role: "member",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("User is already a team member");
    });

    it("should return 400 if invitation already sent", async () => {
      // Mock membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockMembership]),
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
      // Mock existing membership check
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
      // Mock existing invitation check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: "existing-invitation" }]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite", {
        method: "POST",
        body: JSON.stringify({
          username: "inviteduser",
          role: "member",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Invitation already sent");
    });

    it("should handle notification sync failure gracefully", async () => {
      // Mock membership check
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockMembership]),
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
      // Mock existing membership check
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
      // Mock get team codes
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockTeamCodes]),
              }),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock get team group
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockTeamGroup]),
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

      mockSyncNotificationToSupabase.mockRejectedValue(new Error("Sync failed"));

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite", {
        method: "POST",
        body: JSON.stringify({
          username: "inviteduser",
          role: "member",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      // Should still succeed even if notification sync fails
      expect(response.status).toBe(200);
      expect(data.message).toBe("Invitation sent successfully");
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
        {
          id: "user-2",
          email: "user2@example.com",
          display_name: "User Two",
          first_name: "User",
          last_name: "Two",
          username: "user2",
          photo_url: null,
        },
      ];

      // Mock membership check - user must be a captain/co-captain
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ ...mockMembership, role: "captain" }]),
            }),
          }) as unknown as DrizzleMockChain
      );
      // Mock user search results
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

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite?q=user");

      const response = await GET(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toEqual(mockSearchResults);
    });

    it("should return empty array for short queries", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite?q=a");

      const response = await GET(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toEqual([]);
    });

    it("should return 401 if user is not authenticated", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite?q=user");

      const response = await GET(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if user is not a team member", async () => {
      // Mock membership check returning empty
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }) as unknown as DrizzleMockChain
      );

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite?q=user");

      const response = await GET(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Not a team member");
    });

    it("should return 403 if user is not a captain", async () => {
      const memberMembership = { ...mockMembership, role: "member" };
      // Mock membership check returning member role
      mockDbPg.select.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([memberMembership]),
            }),
          }) as unknown as DrizzleMockChain
      );

      const request = new NextRequest("http://localhost:3000/api/teams/test-team/invite?q=user");

      const response = await GET(request, { params: Promise.resolve({ teamId: "test-team" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only captains can search users");
    });
  });
});
