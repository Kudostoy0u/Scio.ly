import { GET, POST } from "@/app/api/teams/[teamId]/assignments/route";
import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import { hasLeadershipAccess } from "@/lib/utils/teams/access";
import {
	getUserTeamMemberships,
	resolveTeamSlugToUnits,
} from "@/lib/utils/teams/resolver";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
	getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/teams/access", () => ({
	hasLeadershipAccess: vi.fn(),
}));

vi.mock("@/lib/utils/teams/resolver", () => ({
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
const mockHasLeadershipAccess = vi.mocked(hasLeadershipAccess);
const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);
const mockGetUserTeamMemberships = vi.mocked(getUserTeamMemberships);
const mockDbPg = vi.mocked(dbPg) as typeof dbPg & {
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
};

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
			Reflect.deleteProperty(process.env, "DATABASE_URL");

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/assignments`,
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
				`http://localhost:3000/api/teams/${mockTeamId}/assignments`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});

		it("should return assignments when user has access", async () => {
			const assignmentId = "123e4567-e89b-12d3-a456-426614174003";

			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockResolveTeamSlugToUnits.mockResolvedValue({
				teamId: mockGroupId,
				subteamIds: [mockSubteamId],
			});
			mockGetUserTeamMemberships.mockResolvedValue([
				{ id: "membership-1", team_id: mockSubteamId, role: "member" },
			]);

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
			} as any);

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
				} as any)
				.mockReturnValueOnce({
					// rosterResult query
					from: vi.fn().mockReturnValue({
						leftJoin: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								orderBy: vi.fn().mockResolvedValue([]), // No roster entries
							}),
						}),
					}),
				} as any)
				.mockReturnValueOnce({
					// submissionCountResult query
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([{ submittedCount: 0 }]),
					}),
				} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/assignments`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.assignments).toHaveLength(1);
			expect(body.assignments[0].id).toBe(assignmentId);
			expect(body.assignments[0].title).toBe("Test Assignment");
		});

		it("should return empty array when no assignments exist", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockResolveTeamSlugToUnits.mockResolvedValue({
				teamId: mockGroupId,
				subteamIds: [mockSubteamId],
			});
			mockGetUserTeamMemberships.mockResolvedValue([
				{ id: "membership-1", team_id: mockSubteamId, role: "member" },
			]);

			// Mock empty assignments result
			mockDbPg.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/assignments`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.assignments).toHaveLength(0);
		});
	});

	describe("POST /api/teams/[teamId]/assignments", () => {
		it("should return 500 when DATABASE_URL is missing", async () => {
			const originalEnv = process.env.DATABASE_URL;
			Reflect.deleteProperty(process.env, "DATABASE_URL");

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/assignments`,
				{
					method: "POST",
					body: JSON.stringify({
						title: "Test Assignment",
						description: "Test description",
						dueDate: "2024-12-31",
						targetTeamId: mockSubteamId,
					}),
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
				`http://localhost:3000/api/teams/${mockTeamId}/assignments`,
				{
					method: "POST",
					body: JSON.stringify({
						title: "Test Assignment",
						description: "Test description",
						dueDate: "2024-12-31",
						targetTeamId: mockSubteamId,
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

		it("should return 403 when user has no leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockResolveTeamSlugToUnits.mockResolvedValue({
				teamId: mockGroupId,
				subteamIds: [mockSubteamId],
			});
			mockHasLeadershipAccess.mockResolvedValue(false);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/assignments`,
				{
					method: "POST",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						title: "Test Assignment",
						description: "Test description",
						dueDate: "2024-12-31T00:00:00Z",
					}),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe(
				"Only captains and co-captains can create assignments",
			);
		});

		it("should handle missing required fields", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/assignments`,
				{
					method: "POST",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						description: "Test description",
						dueDate: "2024-12-31T00:00:00Z",
					}),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Validation failed");
			expect(body.details).toBeDefined();
			expect(body.details).toEqual(
				expect.arrayContaining([expect.stringContaining("title")]),
			);
		});
	});
});
