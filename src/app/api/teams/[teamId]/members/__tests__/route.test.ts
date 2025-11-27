/**
 * Tests for GET /api/teams/[teamId]/members
 */

// Import mocks first to ensure they're set up before route handler
import "./mocks";

import { GET } from "@/app/api/teams/[teamId]/members/route";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  linkedUserId,
  mockSubteamId,
  mockSubteamMember,
  mockTeamAccessCreator,
  mockTeamAccessNoAccess,
  mockTeamAccessSubteamMember,
  mockTeamGroup,
  mockTeamId,
  mockUnlinkedRosterMember,
  mockUser,
  mockUserId,
  mockUserProfile,
  mockUserProfileData,
  otherUserId,
  subteam1Id,
  subteam2Id,
  user1Id,
  user2Id,
} from "./fixtures";
import { createDrizzleChain, createParams, createRequest, setupConsoleMocks } from "./helpers";
import {
  mockDbPg,
  mockGetServerUser,
  mockGetTeamAccess,
  mockGetUserDisplayInfo,
  mockQueryCockroachDb,
} from "./mocks";

describe("/api/teams/[teamId]/members", () => {
  beforeEach(() => {
    // Reset only the mocks we need, not all mocks
    mockGetServerUser.mockReset();
    mockGetTeamAccess.mockReset();
    mockGetUserDisplayInfo.mockReset();
    mockDbPg.select.mockReset();
    mockQueryCockroachDb.mockReset();
    
    setupConsoleMocks();
    mockQueryCockroachDb.mockResolvedValue({ rows: [] });
    // Set up default mock for getServerUser - tests can override this
    // Use mockResolvedValue to ensure it overrides the global mock
    mockGetServerUser.mockResolvedValue(mockUser as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/teams/[teamId]/members", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetServerUser.mockReset();
      mockGetServerUser.mockResolvedValue(null);

      const request = createRequest(mockTeamId);
      const response = await GET(request, createParams(mockTeamId));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 404 when team group is not found", async () => {
      // First query: team group lookup (returns empty)
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasLimit: true }));
      // getTeamAccess is called with user.id and groupId (which is undefined since group not found)
      // But the route should return 404 before calling getTeamAccess
      // Actually, let me check the route - it might call getTeamAccess even if group not found
      mockGetTeamAccess.mockResolvedValue(mockTeamAccessNoAccess);

      const request = createRequest(mockTeamId);
      const response = await GET(request, createParams(mockTeamId));

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Team group not found");
    });

    it("should return 403 when user has no access", async () => {
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([mockTeamGroup], { hasLimit: true }));
      mockGetTeamAccess.mockResolvedValue(mockTeamAccessNoAccess);

      const request = createRequest(mockTeamId);
      const response = await GET(request, createParams(mockTeamId));

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Not authorized to access this team");
    });

    it("should return team creator as member when user is creator", async () => {
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([mockTeamGroup], { hasLimit: true }));
      mockGetTeamAccess.mockResolvedValue(mockTeamAccessCreator);
      mockGetUserDisplayInfo.mockResolvedValue(mockUserProfile);
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([]));

      const request = createRequest(mockTeamId);
      const response = await GET(request, createParams(mockTeamId));

      if (response.status !== 200) {
        const errorBody = await response.json();
        throw new Error(`Expected 200 but got ${response.status}: ${JSON.stringify(errorBody)}`);
      }
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members).toHaveLength(1);
      expect(body.members[0].id).toBe(mockUserId);
      expect(body.members[0].name).toBe("John Doe");
      expect(body.members[0].email).toBe("john@example.com");
      expect(body.members[0].username).toBe("johndoe");
      expect(body.members[0].isCreator).toBe(true);
    });

    it("should return subteam members when user has subteam membership", async () => {
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([mockTeamGroup], { hasLimit: true }));
      mockGetTeamAccess.mockResolvedValue(mockTeamAccessSubteamMember);
      mockDbPg.select.mockReturnValueOnce(
        createDrizzleChain([mockSubteamMember], { hasInnerJoin: true })
      );
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([mockUserProfileData]));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([]));

      const request = createRequest(mockTeamId);
      const response = await GET(request, createParams(mockTeamId));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members).toHaveLength(1);
      expect(body.members[0].id).toBe(otherUserId);
      expect(body.members[0].name).toBe("Jane Smith");
      expect(body.members[0].email).toBe("jane@example.com");
      expect(body.members[0].username).toBe("janesmith");
      expect(body.members[0].role).toBe("captain");
    });

    it("should filter by subteam when subteamId is provided", async () => {
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([mockTeamGroup], { hasLimit: true }));
      mockGetTeamAccess.mockResolvedValue(mockTeamAccessSubteamMember);
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([]));

      const request = createRequest(mockTeamId, `subteamId=${mockSubteamId}`);
      const response = await GET(request, createParams(mockTeamId));

      if (response.status !== 200) {
        const errorBody = await response.json();
        throw new Error(`Expected 200 but got ${response.status}: ${JSON.stringify(errorBody)}`);
      }
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members).toHaveLength(0);
    });

    it("should handle multiple subteam memberships correctly", async () => {
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([mockTeamGroup], { hasLimit: true }));
      mockGetTeamAccess.mockResolvedValue(mockTeamAccessSubteamMember);
      mockDbPg.select.mockReturnValueOnce(
        createDrizzleChain(
          [
            {
              userId: user1Id,
              role: "captain",
              joinedAt: new Date("2024-01-01"),
              teamUnitId: subteam1Id,
              teamId: subteam1Id,
              description: "Team A",
            },
            {
              userId: user2Id,
              role: "member",
              joinedAt: new Date("2024-01-02"),
              teamUnitId: subteam2Id,
              teamId: subteam2Id,
              description: "Team B",
            },
          ],
          { hasInnerJoin: true }
        )
      );
      mockDbPg.select.mockReturnValueOnce(
        createDrizzleChain([
          {
            id: user1Id,
            email: "user1@example.com",
            displayName: "User One",
            firstName: "User",
            lastName: "One",
            username: "user1",
          },
          {
            id: user2Id,
            email: "user2@example.com",
            displayName: "User Two",
            firstName: "User",
            lastName: "Two",
            username: "user2",
          },
        ])
      );
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([]));

      const request = createRequest(mockTeamId);
      const response = await GET(request, createParams(mockTeamId));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members.length).toBeGreaterThanOrEqual(2);
      // biome-ignore lint/suspicious/noExplicitAny: Test mock data structure
      const captainMember = body.members.find((m: any) => m.role === "captain");
      // biome-ignore lint/suspicious/noExplicitAny: Test mock data structure
      const memberMember = body.members.find((m: any) => m.role === "member");
      expect(captainMember).toBeDefined();
      expect(memberMember).toBeDefined();
    });

    it("should include unlinked roster members in the response", async () => {
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([mockTeamGroup], { hasLimit: true }));
      mockGetTeamAccess.mockResolvedValue(mockTeamAccessSubteamMember);
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(
        createDrizzleChain(
          [
            mockUnlinkedRosterMember,
            {
              studentName: "Bob Smith",
              teamUnitId: mockSubteamId,
              eventName: null,
              teamId: mockSubteamId,
              description: "Division B Team A",
            },
          ],
          { hasInnerJoin: true }
        )
      );
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([]));

      const request = createRequest(mockTeamId);
      const response = await GET(request, createParams(mockTeamId));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members.length).toBeGreaterThanOrEqual(2);
      // biome-ignore lint/suspicious/noExplicitAny: Test mock data structure
      const unlinkedMembers = body.members.filter((m: any) => m.isUnlinked);
      expect(unlinkedMembers.length).toBeGreaterThanOrEqual(2);
      expect(unlinkedMembers[0].name).toBe("Alice Johnson");
      expect(unlinkedMembers[0].role).toBe("unlinked");
      expect(unlinkedMembers[0].isUnlinked).toBe(true);
    });

    it("should include both linked and unlinked members in the response", async () => {
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([mockTeamGroup], { hasLimit: true }));
      mockGetTeamAccess.mockResolvedValue(mockTeamAccessSubteamMember);
      mockDbPg.select.mockReturnValueOnce(
        createDrizzleChain(
          [
            {
              userId: linkedUserId,
              role: "captain",
              joinedAt: new Date("2024-01-01"),
              teamUnitId: mockSubteamId,
              teamId: mockSubteamId,
              description: "Team A",
            },
          ],
          { hasInnerJoin: true }
        )
      );
      mockDbPg.select.mockReturnValueOnce(
        createDrizzleChain([
          {
            id: linkedUserId,
            email: "jane@example.com",
            displayName: "Jane Smith",
            firstName: "Jane",
            lastName: "Smith",
            username: "janesmith",
          },
        ])
      );
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(
        createDrizzleChain([mockUnlinkedRosterMember], { hasInnerJoin: true })
      );
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([]));

      const request = createRequest(mockTeamId);
      const response = await GET(request, createParams(mockTeamId));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members.length).toBeGreaterThanOrEqual(2);

      const linkedMember = body.members.find((m: { id?: string }) => m.id === linkedUserId);
      expect(linkedMember).toBeDefined();
      expect(linkedMember.name).toBe("Jane Smith");
      expect(linkedMember.email).toBe("jane@example.com");
      expect(linkedMember.role).toBe("captain");

      const unlinkedMember = body.members.find((m: { isUnlinked?: boolean }) => m.isUnlinked);
      expect(unlinkedMember).toBeDefined();
      expect(unlinkedMember.name).toBe("Alice Johnson");
      expect(unlinkedMember.role).toBe("unlinked");
      expect(unlinkedMember.isUnlinked).toBe(true);
    });

    it("should filter unlinked roster members by subteam when subteamId is provided", async () => {
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([mockTeamGroup], { hasLimit: true }));
      mockGetTeamAccess.mockResolvedValue(mockTeamAccessSubteamMember);
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([], { hasInnerJoin: true }));
      mockDbPg.select.mockReturnValueOnce(
        createDrizzleChain([mockUnlinkedRosterMember], { hasInnerJoin: true })
      );
      mockDbPg.select.mockReturnValueOnce(createDrizzleChain([]));

      const request = createRequest(mockTeamId, `subteamId=${mockSubteamId}`);
      const response = await GET(request, createParams(mockTeamId));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members.length).toBeGreaterThanOrEqual(1);
      const unlinkedMember = body.members.find((m: { isUnlinked?: boolean }) => m.isUnlinked);
      expect(unlinkedMember).toBeDefined();
      expect(unlinkedMember.name).toBe("Alice Johnson");
      expect(unlinkedMember.subteam.id).toBe(mockSubteamId);
    });

    it("should handle database errors gracefully", async () => {
      const errorChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Database connection failed")),
        }),
      };
      mockDbPg.select.mockReturnValueOnce(errorChain);

      const request = createRequest(mockTeamId);
      const response = await GET(request, createParams(mockTeamId));

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Internal server error");
    });
  });
});
