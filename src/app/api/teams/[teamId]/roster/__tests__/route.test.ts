import { GET, POST } from "@/app/api/teams/[teamId]/roster/route";
import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import {
	getTeamAccessCockroach,
	hasLeadershipAccessCockroach,
} from "@/lib/utils/teams/access";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
	getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/teams/access", () => ({
	getTeamAccessCockroach: vi.fn(),
	hasLeadershipAccessCockroach: vi.fn(),
}));

vi.mock("@/lib/cockroachdb", () => ({
	queryCockroachDB: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	dbPg: {
		select: vi.fn(),
		insert: vi.fn(),
	},
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockGetTeamAccessCockroach = vi.mocked(getTeamAccessCockroach);
const mockHasLeadershipAccessCockroach = vi.mocked(
	hasLeadershipAccessCockroach,
);
const mockDbPg = vi.mocked(dbPg);

describe("/api/teams/[teamId]/roster", () => {
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

	describe("GET /api/teams/[teamId]/roster", () => {
		it("should return 500 when DATABASE_URL is missing", async () => {
			const originalEnv = process.env.DATABASE_URL;
			Reflect.deleteProperty(process.env, "DATABASE_URL");

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster?subteamId=${mockSubteamId}`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe("Database configuration error");

			// Restore environment
			if (originalEnv) {
				process.env.DATABASE_URL = originalEnv;
			} else {
				Reflect.deleteProperty(process.env, "DATABASE_URL");
			}
		});

		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});

		it("should return 400 when subteamId is missing", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Validation failed");
			expect(body.details).toBeDefined();
			expect(body.details).toEqual(
				expect.arrayContaining([
					expect.stringContaining("Subteam ID is required"),
				]),
			);
		});

		it("should return 403 when user has no access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			// Mock team group lookup using Drizzle ORM (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);
			mockGetTeamAccessCockroach.mockResolvedValue({
				hasAccess: false,
				isCreator: false,
				hasSubteamMembership: false,
				hasRosterEntries: false,
				subteamMemberships: [],
				rosterSubteams: [],
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster?subteamId=${mockSubteamId}`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe("Not authorized to access this team");
		});

		it("should return roster data when user has access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock team group lookup using Drizzle ORM (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			mockGetTeamAccessCockroach.mockResolvedValue({
				hasAccess: true,
				isCreator: false,
				hasSubteamMembership: true,
				hasRosterEntries: false,
				subteamRole: "captain",
				subteamMemberships: [],
				rosterSubteams: [],
			} as any);

			// Mock roster data query using Drizzle ORM (select().from().leftJoin().where().orderBy())
			// orderBy can be called with multiple arguments, so we need to handle chaining
			const rosterOrderByMock = vi.fn().mockResolvedValue([
				{
					student_name: "John Doe",
					event_name: "Anatomy",
					slot_index: 0,
					user_id: "123e4567-e89b-12d3-a456-426614174003",
				},
			]);
			const rosterWhereChain = {
				orderBy: rosterOrderByMock,
			};
			const rosterLeftJoinChain = {
				where: vi.fn().mockReturnValue(rosterWhereChain),
			};
			const rosterFromChain = {
				leftJoin: vi.fn().mockReturnValue(rosterLeftJoinChain),
				innerJoin: vi.fn().mockReturnValue(rosterLeftJoinChain), // Support both for flexibility
			};
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue(rosterFromChain),
			} as any);

			// Mock removed events query using Drizzle ORM (select().from().where().orderBy())
			// orderBy uses desc() which is a function call, so it should resolve directly
			const removedEventsOrderByMock = vi.fn().mockResolvedValue([]);
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: removedEventsOrderByMock,
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster?subteamId=${mockSubteamId}`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			if (response.status !== 200) {
				const errorBody = await response.json();
				throw new Error(
					`Expected 200 but got ${response.status}: ${JSON.stringify(errorBody)}`,
				);
			}
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.roster).toBeDefined();
			expect(typeof body.roster).toBe("object");
			expect(body.removedEvents).toBeDefined();
			expect(Array.isArray(body.removedEvents)).toBe(true);
		});

		it("should filter by subteam when subteamId is provided", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			mockGetTeamAccessCockroach.mockResolvedValue({
				hasAccess: true,
				isCreator: false,
				hasSubteamMembership: true,
				hasRosterEntries: false,
				subteamRole: "captain",
				subteamMemberships: [],
				rosterSubteams: [],
			} as any);

			// Mock empty roster data query (select().from().leftJoin().where().orderBy())
			// orderBy can be called with multiple arguments
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					leftJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			} as any);

			// Mock removed events query (select().from().where().orderBy())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster?subteamId=${mockSubteamId}`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.roster).toBeDefined();
			expect(Object.keys(body.roster)).toHaveLength(0);
		});

		it("should return empty array when no roster data exists", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			mockGetTeamAccessCockroach.mockResolvedValue({
				hasAccess: true,
				isCreator: false,
				hasSubteamMembership: true,
				hasRosterEntries: false,
				subteamRole: "captain",
				subteamMemberships: [],
				rosterSubteams: [],
			} as any);

			// Mock empty roster data query (select().from().leftJoin().where().orderBy())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					leftJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			} as any);

			// Mock removed events query (select().from().where().orderBy())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster?subteamId=${mockSubteamId}`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.roster).toBeDefined();
			expect(Object.keys(body.roster)).toHaveLength(0);
		});
	});

	describe("POST /api/teams/[teamId]/roster", () => {
		it("should return 500 when DATABASE_URL is missing", async () => {
			const originalEnv = process.env.DATABASE_URL;
			Reflect.deleteProperty(process.env, "DATABASE_URL");

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster`,
				{
					method: "POST",
					body: JSON.stringify({ roster: [] }),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe("Database configuration error");

			// Restore environment
			if (originalEnv) {
				process.env.DATABASE_URL = originalEnv;
			} else {
				Reflect.deleteProperty(process.env, "DATABASE_URL");
			}
		});

		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster`,
				{
					method: "POST",
					body: JSON.stringify({ roster: [] }),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});

		it("should return 403 when user has no leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			mockGetTeamAccessCockroach.mockResolvedValue({
				hasAccess: true,
				isCreator: false,
				hasSubteamMembership: true,
				hasRosterEntries: false,
				subteamRole: "member",
				subteamMemberships: [],
				rosterSubteams: [],
			} as any);

			mockHasLeadershipAccessCockroach.mockResolvedValue(false);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster`,
				{
					method: "POST",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						eventName: "Anatomy",
						slotIndex: 0,
						studentName: "John Doe",
					}),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe(
				"Only captains and co-captains can manage roster",
			);
		});

		it("should update roster when user has leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			mockGetTeamAccessCockroach.mockResolvedValue({
				hasAccess: true,
				isCreator: false,
				hasSubteamMembership: true,
				hasRosterEntries: false,
				subteamRole: "captain",
				subteamMemberships: [],
				rosterSubteams: [],
			} as any);

			mockHasLeadershipAccessCockroach.mockResolvedValue(true);

			// Mock subteam validation
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockSubteamId }]),
					}),
				}),
			} as any);

			// Mock team members query for auto-linking (select().from().innerJoin().innerJoin().where())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						innerJoin: vi.fn().mockReturnValue({
							where: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			} as any);

			// Mock roster upsert (insert().values().onConflictDoUpdate())
			const mockInsert = {
				values: vi.fn().mockReturnValue({
					onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
				}),
			};
			mockDbPg.insert = vi.fn().mockReturnValue(mockInsert);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster`,
				{
					method: "POST",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						eventName: "Anatomy",
						slotIndex: 0,
						studentName: "John Doe",
					}),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.message).toBe("Roster data saved successfully");
		});

		it("should handle empty student name (optional field)", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			mockGetTeamAccessCockroach.mockResolvedValue({
				hasAccess: true,
				isCreator: false,
				hasSubteamMembership: true,
				hasRosterEntries: false,
				subteamRole: "captain",
				subteamMemberships: [],
				rosterSubteams: [],
			} as any);

			mockHasLeadershipAccessCockroach.mockResolvedValue(true);

			// Mock subteam validation
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockSubteamId }]),
					}),
				}),
			} as any);

			// Mock team members query (empty since no studentName)
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						innerJoin: vi.fn().mockReturnValue({
							where: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			} as any);

			// Mock roster upsert (studentName can be null)
			mockDbPg.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster`,
				{
					method: "POST",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						eventName: "Anatomy",
						slotIndex: 0,
						// studentName is optional
					}),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.message).toBe("Roster data saved successfully");
		});

		it("should handle database errors gracefully", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			mockGetTeamAccessCockroach.mockResolvedValue({
				hasAccess: true,
				isCreator: false,
				hasSubteamMembership: true,
				hasRosterEntries: false,
				subteamRole: "captain",
				subteamMemberships: [],
				rosterSubteams: [],
			} as any);

			mockHasLeadershipAccessCockroach.mockResolvedValue(true);

			// Mock database error on subteam validation
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi
							.fn()
							.mockRejectedValue(new Error("Database connection failed")),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/roster`,
				{
					method: "POST",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						eventName: "Anatomy",
						slotIndex: 0,
					}),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(500);
			const body = await response.json();
			// Error handler may return "An error occurred" or "Internal server error"
			expect(["An error occurred", "Internal server error"]).toContain(
				body.error,
			);
		});
	});
});
