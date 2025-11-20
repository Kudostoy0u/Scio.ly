import { queryCockroachDB } from "@/lib/cockroachdb";
import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import { getTeamAccess, getUserDisplayInfo } from "@/lib/utils/team-auth-v2";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/teams/[teamId]/members/route";

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/team-auth-v2", () => ({
  getTeamAccess: vi.fn(),
  getUserDisplayInfo: vi.fn(),
}));

// Create a proper Drizzle ORM chain mock
// Drizzle chains are awaitable, so the final method in the chain should return a resolved promise
// dbPg.select() returns an object with .from(), which returns an object with .where() or .innerJoin()
const createDrizzleChain = (result: any[], options?: { hasInnerJoin?: boolean; hasLimit?: boolean }) => {
  const { hasInnerJoin = false, hasLimit = false } = options || {};
  
  if (hasInnerJoin) {
    // Chain: select().from().innerJoin().where()
    // The innerJoin() method takes parameters and returns an object with .where()
    const whereMock = vi.fn().mockResolvedValue(result);
    const innerJoinChain = { where: whereMock };
    const innerJoinMock = vi.fn().mockReturnValue(innerJoinChain);
    const fromChain = { innerJoin: innerJoinMock };
    const fromMock = vi.fn().mockReturnValue(fromChain);
    return { from: fromMock };
  }
  
  if (hasLimit) {
    // Chain: select().from().where().limit()
    const limitMock = vi.fn().mockResolvedValue(result);
    const whereChain = { limit: limitMock };
    const whereMock = vi.fn().mockReturnValue(whereChain);
    const fromChain = { where: whereMock };
    const fromMock = vi.fn().mockReturnValue(fromChain);
    return { from: fromMock };
  }
  
  // Simple chain: select().from().where()
  const whereMock = vi.fn().mockResolvedValue(result);
  const fromChain = { where: whereMock };
  const fromMock = vi.fn().mockReturnValue(fromChain);
  return { from: fromMock };
};

vi.mock("@/lib/db", () => ({
  dbPg: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/cockroachdb", () => ({
  queryCockroachDB: vi.fn(),
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockGetTeamAccess = vi.mocked(getTeamAccess);
const mockDbPg = vi.mocked(dbPg);
const mockGetUserDisplayInfo = vi.mocked(getUserDisplayInfo);
const mockQueryCockroachDb = vi.mocked(queryCockroachDB);

describe("/api/teams/[teamId]/members", () => {
  // Use proper UUID format for better type safety
  const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
  const mockTeamId = "team-slug-123";
  const mockGroupId = "123e4567-e89b-12d3-a456-426614174001";
  const mockSubteamId = "123e4567-e89b-12d3-a456-426614174002";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods to reduce noise
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Default mock for queryCockroachDB to return empty results
    mockQueryCockroachDb.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/teams/[teamId]/members", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 404 when team group is not found", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      // Mock team group lookup - empty result
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      // getTeamAccess won't be called if group is not found, but mock it anyway
      mockGetTeamAccess.mockResolvedValue({
        hasAccess: false,
        isCreator: false,
        hasMembership: false,
        hasRosterEntry: false,
        role: undefined,
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Team group not found");
    });

    it("should return 403 when user has no access", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      // Mock team group lookup
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });
      mockGetTeamAccess.mockResolvedValue({
        hasAccess: false,
        isCreator: false,
        hasSubteamMembership: false,
        hasRosterEntries: false,
        subteamRole: undefined,
        subteamMemberships: [],
        rosterSubteams: [],
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Not authorized to access this team");
    });

    it("should return team creator as member when user is creator", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      // Mock team group lookup: dbPg.select().from().where().limit()
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });
      mockGetTeamAccess.mockResolvedValue({
        hasAccess: true,
        isCreator: true,
        hasSubteamMembership: false,
        hasRosterEntries: false,
        subteamMemberships: [],
        rosterSubteams: [],
      });
      mockGetUserDisplayInfo.mockResolvedValue({
        name: "John Doe",
        email: "john@example.com",
        username: "johndoe",
      });
      // Mock subteam members query - no members (this query uses innerJoin)
      // When there are no members, userProfiles query is skipped (userIds is empty)
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      // Mock linked roster query - no linked roster (this query uses innerJoin)
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      // Mock unlinked roster query - no unlinked roster (this query uses innerJoin)
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      // Mock pending invites query - no pending invites (simple select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

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
      const otherUserId = "123e4567-e89b-12d3-a456-426614174003";

      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      // Mock team group lookup (needs .limit(1))
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });
      mockGetTeamAccess.mockResolvedValue({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamRole: "captain",
        subteamMemberships: [{ subteamId: mockSubteamId, teamId: mockSubteamId, role: "captain" }],
        rosterSubteams: [],
      });

      // Mock subteam members query (select().from().innerJoin().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                userId: otherUserId,
                role: "captain",
                joinedAt: new Date("2024-01-01"),
                teamUnitId: mockSubteamId,
                teamId: mockSubteamId,
                description: "Team A",
              },
            ]),
          }),
        }),
      });

      // Mock user profiles query (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: otherUserId,
              email: "jane@example.com",
              displayName: "Jane Smith",
              firstName: "Jane",
              lastName: "Smith",
              username: "janesmith",
            },
          ]),
        }),
      });

      // Mock linked roster query (select().from().innerJoin().where()) - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      // Mock unlinked roster query (select().from().innerJoin().where()) - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      // Mock pending invites query (select().from().where()) - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

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
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      // Mock team group lookup: dbPg.select().from().where().limit()
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });
      mockGetTeamAccess.mockResolvedValue({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamRole: "captain",
        subteamMemberships: [{ subteamId: mockSubteamId, teamId: mockSubteamId, role: "captain" }],
        rosterSubteams: [],
      });
      // Mock subteam members query - no members (uses innerJoin)
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      // Note: User profiles query is skipped when members.length === 0 (userIds.length === 0)
      // Mock linked roster query - empty (uses innerJoin)
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      // Mock unlinked roster query - empty (uses innerJoin)
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      // Mock pending invites query - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/teams/${mockTeamId}/members?subteamId=${mockSubteamId}`
      );
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      if (response.status !== 200) {
        const errorBody = await response.json();
        throw new Error(`Expected 200 but got ${response.status}: ${JSON.stringify(errorBody)}`);
      }
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members).toHaveLength(0);
    });

    it("should handle multiple subteam memberships correctly", async () => {
      const user1Id = "123e4567-e89b-12d3-a456-426614174003";
      const user2Id = "123e4567-e89b-12d3-a456-426614174004";
      const subteam1Id = "123e4567-e89b-12d3-a456-426614174005";
      const subteam2Id = "123e4567-e89b-12d3-a456-426614174006";

      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      // Mock team group lookup (needs .limit(1))
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });
      mockGetTeamAccess.mockResolvedValue({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamRole: "captain",
        subteamMemberships: [{ subteamId: mockSubteamId, teamId: mockSubteamId, role: "captain" }],
        rosterSubteams: [],
      });

      // Mock subteam members query (select().from().innerJoin().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
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
            ]),
          }),
        }),
      });

      // Mock user profiles query (select().from().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
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
          ]),
        }),
      });

      // Mock linked roster query (select().from().innerJoin().where()) - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      // Mock unlinked roster query (select().from().innerJoin().where()) - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      // Mock pending invites query (select().from().where()) - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members.length).toBeGreaterThanOrEqual(2);
      const captainMember = body.members.find((m: any) => m.role === "captain");
      const memberMember = body.members.find((m: any) => m.role === "member");
      expect(captainMember).toBeDefined();
      expect(memberMember).toBeDefined();
    });

    it("should include unlinked roster members in the response", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      // Mock team group lookup (needs .limit(1))
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });
      mockGetTeamAccess.mockResolvedValue({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamRole: "captain",
        subteamMemberships: [{ subteamId: mockSubteamId, teamId: mockSubteamId, role: "captain" }],
        rosterSubteams: [],
      });

      // Mock subteam members query (select().from().innerJoin().where()) - no linked members
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Note: User profiles query is skipped when members.length === 0 (userIds.length === 0)

      // Mock linked roster query (select().from().innerJoin().where()) - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Mock unlinked roster members query (select().from().innerJoin().where())
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                studentName: "Alice Johnson",
                teamUnitId: mockSubteamId,
                eventName: null,
                teamId: mockSubteamId,
                description: "Division B Team A",
              },
              {
                studentName: "Bob Smith",
                teamUnitId: mockSubteamId,
                eventName: null,
                teamId: mockSubteamId,
                description: "Division B Team A",
              },
            ]),
          }),
        }),
      });
      // Mock pending invites query (select().from().where()) - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members.length).toBeGreaterThanOrEqual(2);
      const unlinkedMembers = body.members.filter((m: any) => m.isUnlinked);
      expect(unlinkedMembers.length).toBeGreaterThanOrEqual(2);
      expect(unlinkedMembers[0].name).toBe("Alice Johnson");
      expect(unlinkedMembers[0].role).toBe("unlinked");
      expect(unlinkedMembers[0].isUnlinked).toBe(true);
    });

    it("should include both linked and unlinked members in the response", async () => {
      const linkedUserId = "123e4567-e89b-12d3-a456-426614174003";

      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      // Mock team group lookup (needs .limit(1))
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });
      mockGetTeamAccess.mockResolvedValue({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamRole: "captain",
        subteamMemberships: [{ subteamId: mockSubteamId, teamId: mockSubteamId, role: "captain" }],
        rosterSubteams: [],
      });

      // Mock subteam members query (select().from().innerJoin().where()) - one linked member
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                userId: linkedUserId,
                role: "captain",
                joinedAt: new Date("2024-01-01"),
                teamUnitId: mockSubteamId,
                teamId: mockSubteamId,
                description: "Team A",
              },
            ]),
          }),
        }),
      });

      // Mock user profiles query (select().from().where()) - one user profile
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: linkedUserId,
              email: "jane@example.com",
              displayName: "Jane Smith",
              firstName: "Jane",
              lastName: "Smith",
              username: "janesmith",
            },
          ]),
        }),
      });

      // Mock linked roster query (select().from().innerJoin().where()) - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Mock unlinked roster members query (select().from().innerJoin().where()) - one unlinked member
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                studentName: "Alice Johnson",
                teamUnitId: mockSubteamId,
                eventName: null,
                teamId: mockSubteamId,
                description: "Division B Team A",
              },
            ]),
          }),
        }),
      });
      // Mock pending invites query (select().from().where()) - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members.length).toBeGreaterThanOrEqual(2);

      // Find linked member
      const linkedMember = body.members.find((m: any) => m.id === linkedUserId);
      expect(linkedMember).toBeDefined();
      expect(linkedMember.name).toBe("Jane Smith");
      expect(linkedMember.email).toBe("jane@example.com");
      expect(linkedMember.role).toBe("captain");

      // Find unlinked member
      const unlinkedMember = body.members.find((m: any) => m.isUnlinked);
      expect(unlinkedMember).toBeDefined();
      expect(unlinkedMember.name).toBe("Alice Johnson");
      expect(unlinkedMember.role).toBe("unlinked");
      expect(unlinkedMember.isUnlinked).toBe(true);
    });

    it("should filter unlinked roster members by subteam when subteamId is provided", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      // Mock team group lookup (needs .limit(1))
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
          }),
        }),
      });
      mockGetTeamAccess.mockResolvedValue({
        hasAccess: true,
        isCreator: false,
        hasSubteamMembership: true,
        hasRosterEntries: false,
        subteamRole: "captain",
        subteamMemberships: [{ subteamId: mockSubteamId, teamId: mockSubteamId, role: "captain" }],
        rosterSubteams: [],
      });

      // Mock subteam members query (select().from().innerJoin().where()) - no linked members
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Note: User profiles query is skipped when members.length === 0 (userIds.length === 0)
      // Mock linked roster query (select().from().innerJoin().where()) - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Mock unlinked roster members query (select().from().innerJoin().where()) with subteam filter
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                studentName: "Alice Johnson",
                teamUnitId: mockSubteamId,
                eventName: null,
                teamId: mockSubteamId,
                description: "Division B Team A",
              },
            ]),
          }),
        }),
      });
      // Mock pending invites query (select().from().where()) - empty
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/teams/${mockTeamId}/members?subteamId=${mockSubteamId}`
      );
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.members.length).toBeGreaterThanOrEqual(1);
      const unlinkedMember = body.members.find((m: any) => m.isUnlinked);
      expect(unlinkedMember).toBeDefined();
      expect(unlinkedMember.name).toBe("Alice Johnson");
      expect(unlinkedMember.subteam.id).toBe(mockSubteamId);
    });

    it("should handle database errors gracefully", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      // Mock team group lookup to throw an error
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Database connection failed")),
        }),
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/members`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Internal server error");
    });
  });
});
