import { GET, POST } from "@/app/api/teams/[teamId]/assignments/route";
import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import { hasLeadershipAccessCockroach } from "@/lib/utils/team-auth-v2";
import { getUserTeamMemberships, resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/team-auth-v2", () => ({
  hasLeadershipAccessCockroach: vi.fn(),
}));

vi.mock("@/lib/utils/team-resolver", () => ({
  resolveTeamSlugToUnits: vi.fn(),
  getUserTeamMemberships: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  dbPg: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
  },
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockHasLeadershipAccessCockroach = vi.mocked(hasLeadershipAccessCockroach);
const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);
const mockGetUserTeamMemberships = vi.mocked(getUserTeamMemberships);
const mockDbPg = vi.mocked(dbPg);

describe("/api/teams/[teamId]/assignments", () => {
  // Use proper UUID format for better type safety
  const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
  const mockTeamId = "team-slug-123";
  const mockGroupId = "123e4567-e89b-12d3-a456-426614174001";
  const mockSubteamId = "123e4567-e89b-12d3-a456-426614174002";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods to reduce noise
    vi.spyOn(console, "log").mockImplementation(() => {
      // Suppress console.log in tests
    });
    vi.spyOn(console, "error").mockImplementation(() => {
      // Suppress console.error in tests
    });

    // Set DATABASE_URL for tests that need it
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/teams/[teamId]/assignments", () => {
    it("should return 500 when DATABASE_URL is missing", async () => {
      const originalEnv = process.env.DATABASE_URL;
      // biome-ignore lint/performance/noDelete: Need to remove env var for test
      delete process.env.DATABASE_URL;

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Database configuration error");

      // Restore environment
      if (originalEnv) {
        process.env.DATABASE_URL = originalEnv;
      } else {
        // biome-ignore lint/performance/noDelete: Need to remove env var for test cleanup
        delete process.env.DATABASE_URL;
      }
    });

    it("should return 401 when user is not authenticated", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return assignments when user has access", async () => {
      const assignmentId = "123e4567-e89b-12d3-a456-426614174003";

      // biome-ignore lint/suspicious/noExplicitAny: Mock user object for testing
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockResolveTeamSlugToUnits.mockResolvedValue({
        groupId: mockGroupId,
        teamUnitIds: [mockSubteamId],
      });
      mockGetUserTeamMemberships.mockResolvedValue([{ team_id: mockSubteamId, role: "member" }]);

      // Mock Drizzle ORM chain for assignments query (first call)
      const mockAssignmentsResult = [
        {
          id: assignmentId,
          title: "Test Assignment",
          description: "Test description",
          assignmentType: "homework",
          dueDate: new Date("2024-12-31"),
          points: 100,
          isRequired: true,
          maxAttempts: 1,
          timeLimitMinutes: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          creatorEmail: "creator@test.com",
          creatorName: "Test Creator",
        },
      ];

      // Mock the assignments query (first select call)
      mockDbPg.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockAssignmentsResult),
            }),
          }),
        }),
      });

      // Mock queries for each assignment in Promise.all:
      // 1. submissionResult query
      // 2. rosterResult query
      // 3. submissionCountResult query
      // These are called in sequence for each assignment
      mockDbPg.select
        .mockReturnValueOnce({
          // submissionResult query
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]), // No submissions
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // rosterResult query
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([]), // No roster entries
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // submissionCountResult query
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ submittedCount: 0 }]),
          }),
        });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.assignments).toHaveLength(1);
      expect(body.assignments[0].id).toBe(assignmentId);
      expect(body.assignments[0].title).toBe("Test Assignment");
    });

    it("should return empty array when no assignments exist", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Mock user object for testing
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockResolveTeamSlugToUnits.mockResolvedValue({
        groupId: mockGroupId,
        teamUnitIds: [mockSubteamId],
      });
      mockGetUserTeamMemberships.mockResolvedValue([{ team_id: mockSubteamId, role: "member" }]);

      // Mock empty assignments result
      mockDbPg.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`);
      const response = await GET(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.assignments).toHaveLength(0);
    });
  });

  describe("POST /api/teams/[teamId]/assignments", () => {
    it("should return 500 when DATABASE_URL is missing", async () => {
      const originalEnv = process.env.DATABASE_URL;
      // biome-ignore lint/performance/noDelete: Need to remove env var for test
      delete process.env.DATABASE_URL;

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          title: "Test Assignment",
          description: "Test description",
          dueDate: "2024-12-31",
          targetTeamId: mockSubteamId,
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Database configuration error");

      // Restore environment
      if (originalEnv) {
        process.env.DATABASE_URL = originalEnv;
      } else {
        // biome-ignore lint/performance/noDelete: Need to remove env var for test cleanup
        delete process.env.DATABASE_URL;
      }
    });

    it("should return 401 when user is not authenticated", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          title: "Test Assignment",
          description: "Test description",
          dueDate: "2024-12-31",
          targetTeamId: mockSubteamId,
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 403 when user has no leadership access", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Mock user object for testing
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
      mockResolveTeamSlugToUnits.mockResolvedValue({
        groupId: mockGroupId,
        teamUnitIds: [mockSubteamId],
      });
      mockHasLeadershipAccessCockroach.mockResolvedValue(false);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          subteamId: mockSubteamId,
          title: "Test Assignment",
          description: "Test description",
          dueDate: "2024-12-31T00:00:00Z",
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Only captains and co-captains can create assignments");
    });

    it("should handle missing required fields", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: Mock user object for testing
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

      const request = new NextRequest(`http://localhost:3000/api/teams/${mockTeamId}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          subteamId: mockSubteamId,
          description: "Test description",
          dueDate: "2024-12-31T00:00:00Z",
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ teamId: mockTeamId }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
      expect(body.details).toBeDefined();
      expect(body.details).toEqual(expect.arrayContaining([expect.stringContaining("title")]));
    });
  });
});
