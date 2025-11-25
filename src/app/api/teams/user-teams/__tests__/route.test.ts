import { GET } from "@/app/api/teams/user-teams/route";
import { cockroachDBTeamsService } from "@/lib/services/cockroachdb-teams";
import { getServerUser } from "@/lib/supabaseServer";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
  getServerUser: vi.fn(),
}));

vi.mock("@/lib/services/cockroachdb-teams", () => ({
  cockroachDBTeamsService: {
    getUserTeams: vi.fn(),
  },
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockService = vi.mocked(cockroachDBTeamsService);

describe("/api/teams/user-teams", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods to reduce noise
    vi.spyOn(console, "log").mockImplementation(() => {
      // Intentionally empty to suppress console output in tests
    });
    vi.spyOn(console, "error").mockImplementation(() => {
      // Intentionally empty to suppress console output in tests
    });

    // Set DATABASE_URL for tests
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/teams/user-teams", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetServerUser.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/teams/user-teams");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return user teams when user is authenticated", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });
      mockService.getUserTeams.mockResolvedValue([
        {
          id: "team-1",
          name: "Test School C",
          slug: "test-school-c-abc123",
          school: "Test School",
          division: "C",
          description: "Test team description",
          captainCode: "CAP123456",
          userCode: "USR123456",
          members: [
            {
              id: mockUserId,
              name: "John Doe",
              email: "john@example.com",
              role: "captain",
            },
          ],
          wasReactivated: false,
        },
        {
          id: "team-2",
          name: "Another School B",
          slug: "another-school-b-def456",
          school: "Another School",
          division: "B",
          description: "Another team description",
          captainCode: "CAP789012",
          userCode: "USR789012",
          members: [
            {
              id: mockUserId,
              name: "John Doe",
              email: "john@example.com",
              role: "member",
            },
          ],
          wasReactivated: false,
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/teams/user-teams");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.teams).toHaveLength(2);
      expect(body.teams[0]).toEqual({
        id: "team-1",
        name: "Test School C",
        slug: "test-school-c-abc123",
        school: "Test School",
        division: "C",
        description: "Test team description",
        captainCode: "CAP123456",
        userCode: "USR123456",
        members: [
          {
            id: mockUserId,
            name: "John Doe",
            email: "john@example.com",
            role: "captain",
          },
        ],
        wasReactivated: false,
      });
      expect(body.teams[1]).toEqual({
        id: "team-2",
        name: "Another School B",
        slug: "another-school-b-def456",
        school: "Another School",
        division: "B",
        description: "Another team description",
        captainCode: "CAP789012",
        userCode: "USR789012",
        members: [
          {
            id: mockUserId,
            name: "John Doe",
            email: "john@example.com",
            role: "member",
          },
        ],
        wasReactivated: false,
      });
    });

    it("should return empty array when user has no teams", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });
      mockService.getUserTeams.mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/teams/user-teams");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.teams).toHaveLength(0);
    });

    it("should handle database errors gracefully", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });
      mockService.getUserTeams.mockRejectedValue(new Error("Database connection failed"));

      const request = new NextRequest("http://localhost:3000/api/teams/user-teams");
      const response = await GET(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Internal server error");
    });

    it("should handle teams with different roles", async () => {
      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });
      mockService.getUserTeams.mockResolvedValue([
        {
          id: "team-1",
          name: "Test School C",
          slug: "test-school-c-abc123",
          school: "Test School",
          division: "C",
          description: "Test team description",
          captainCode: "CAP123456",
          userCode: "USR123456",
          members: [
            {
              id: mockUserId,
              name: "John Doe",
              email: "john@example.com",
              role: "captain",
            },
          ],
          wasReactivated: false,
        },
        {
          id: "team-2",
          name: "Another School C",
          slug: "another-school-c-def456",
          school: "Another School",
          division: "C",
          description: "Another team description",
          captainCode: "CAP789012",
          userCode: "USR789012",
          members: [
            {
              id: mockUserId,
              name: "John Doe",
              email: "john@example.com",
              role: "co_captain",
            },
          ],
          wasReactivated: false,
        },
        {
          id: "team-3",
          name: "Third School C",
          slug: "third-school-c-ghi789",
          school: "Third School",
          division: "C",
          description: "Third team description",
          captainCode: "CAP345678",
          userCode: "USR345678",
          members: [
            {
              id: mockUserId,
              name: "John Doe",
              email: "john@example.com",
              role: "member",
            },
          ],
          wasReactivated: false,
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/teams/user-teams");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.teams).toHaveLength(3);
      expect(body.teams[0].members[0].role).toBe("captain");
      expect(body.teams[1].members[0].role).toBe("co_captain");
      expect(body.teams[2].members[0].role).toBe("member");
    });

    it("should handle teams with multiple members", async () => {
      const otherUserId = "user-456";

      mockGetServerUser.mockResolvedValue({ id: mockUserId } as { id: string });
      mockService.getUserTeams.mockResolvedValue([
        {
          id: "team-1",
          name: "Test School C",
          slug: "test-school-c-abc123",
          school: "Test School",
          division: "C",
          description: "Test team description",
          captainCode: "CAP123456",
          userCode: "USR123456",
          members: [
            {
              id: mockUserId,
              name: "John Doe",
              email: "john@example.com",
              role: "captain",
            },
            {
              id: otherUserId,
              name: "Jane Smith",
              email: "jane@example.com",
              role: "member",
            },
          ],
          wasReactivated: false,
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/teams/user-teams");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.teams).toHaveLength(1);
      expect(body.teams[0].members).toHaveLength(2);
      expect(body.teams[0].members[0].role).toBe("captain");
      expect(body.teams[0].members[1].role).toBe("member");
    });
  });
});
