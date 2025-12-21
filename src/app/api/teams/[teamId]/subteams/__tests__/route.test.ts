import { GET, POST } from "@/app/api/teams/[teamId]/subteams/route";
import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import { getTeamAccess } from "@/lib/utils/teams/access";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
	getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/teams/access", () => ({
	getTeamAccess: vi.fn(),
}));

// Create a proper Drizzle ORM chain mock
// Handles both: select().from().where() -> result
// and: select().from().where().orderBy() -> result
const createDrizzleChain = (result: unknown[], hasOrderBy = false): unknown => {
	const chain = {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn(),
		orderBy: vi.fn().mockResolvedValue(result),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue(result),
	};

	// If orderBy will be called, where returns chain; otherwise where resolves directly
	if (hasOrderBy) {
		chain.where.mockReturnValue(chain);
	} else {
		chain.where.mockResolvedValue(result);
	}

	return chain;
};

vi.mock("@/lib/db", () => ({
	dbPg: {
		select: vi.fn(),
		insert: vi.fn(),
	},
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockGetTeamAccess = vi.mocked(getTeamAccess);
const mockDbPg = vi.mocked(dbPg) as typeof dbPg & {
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
};

describe("/api/teams/[teamId]/subteams", () => {
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

		// Set DATABASE_URL for tests
		process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("GET /api/teams/[teamId]/subteams", () => {
		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/subteams`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});

		it("should return 404 when team group is not found", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock the database chain to return empty result for team group lookup
			mockDbPg.select.mockReturnValue(createDrizzleChain([]));

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/subteams`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.error).toBe("Team group not found");
		});

		it("should return 403 when user has no access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock team group lookup (no orderBy, so where resolves directly)
			mockDbPg.select.mockReturnValueOnce(
				createDrizzleChain([{ id: mockGroupId }], false),
			);

			mockGetTeamAccess.mockResolvedValue({
				hasAccess: false,
				isCreator: false,
				hasRosterEntries: false,
				memberships: [],
			});

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/subteams`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe("Not authorized to access this team");
		});

		it("should return subteams when user has access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock team group lookup (no orderBy)
			mockDbPg.select.mockReturnValueOnce(
				createDrizzleChain([{ id: mockGroupId }], false),
			);

			mockGetTeamAccess.mockResolvedValue({
				hasAccess: true,
				isCreator: false,
				hasRosterEntries: false,
				memberships: [],
			});

			// Mock subteams query (has orderBy, so where returns chain)
			mockDbPg.select.mockReturnValueOnce(
				createDrizzleChain(
					[
						{
							id: mockSubteamId,
							teamId: "A",
							description: "Team A",
							createdAt: new Date("2024-01-01"),
						},
					],
					true,
				),
			);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/subteams`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.subteams).toHaveLength(1);
			expect(body.subteams[0].id).toBe(mockSubteamId);
			expect(body.subteams[0].name).toBe("Team A");
		});
	});

	describe("POST /api/teams/[teamId]/subteams", () => {
		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/subteams`,
				{
					method: "POST",
					body: JSON.stringify({
						name: "Team A",
						description: "Team A description",
					}),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});

		it("should return 400 when name is missing", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/subteams`,
				{
					method: "POST",
					body: JSON.stringify({ description: "Team A description" }),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Name is required");
		});

		it("should return 404 when team group is not found", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock the database chain to return empty result for team group lookup
			mockDbPg.select.mockReturnValue(createDrizzleChain([]));

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/subteams`,
				{
					method: "POST",
					body: JSON.stringify({
						name: "Team A",
						description: "Team A description",
					}),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.error).toBe("Team group not found");
		});

		it("should return 403 when user has no leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce(
				createDrizzleChain([{ id: mockGroupId }]),
			);

			mockGetTeamAccess.mockResolvedValue({
				hasAccess: true,
				isCreator: false,
				hasRosterEntries: false,
				role: "member",
				memberships: [{ teamId: mockTeamId, role: "member" }],
			});

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/subteams`,
				{
					method: "POST",
					body: JSON.stringify({ name: "Team A" }),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe(
				"Only captains and co-captains can create subteams",
			);
		});

		it("should create subteam when user has leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce(
				createDrizzleChain([{ id: mockGroupId }]),
			);

			mockGetTeamAccess.mockResolvedValue({
				hasAccess: true,
				isCreator: true, // Creator has leadership
				hasRosterEntries: false,
				role: "captain",
				memberships: [],
			});

			// Mock existing subteams query (to determine next team ID)
			mockDbPg.select.mockReturnValueOnce(createDrizzleChain([])); // No existing subteams

			// Mock subteam creation
			const mockInsert = {
				values: vi.fn().mockReturnThis(),
				returning: vi.fn().mockResolvedValue([
					{
						id: mockSubteamId,
						teamId: "A",
						description: "Team A",
						createdAt: new Date("2024-01-01"),
					},
				]),
			};
			mockDbPg.insert.mockReturnValue(mockInsert as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/subteams`,
				{
					method: "POST",
					body: JSON.stringify({ name: "Team A" }),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.subteam).toBeDefined();
			expect(body.subteam.id).toBe(mockSubteamId);
			expect(body.subteam.name).toBe("Team A");
		});
	});
});
