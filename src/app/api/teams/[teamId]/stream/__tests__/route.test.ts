import { DELETE, GET, POST, PUT } from "@/app/api/teams/[teamId]/stream/route";
import { getServerUser } from "@/lib/supabaseServer";
import {
	checkTeamGroupAccessCockroach,
} from "@/lib/utils/team-auth";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
	getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/team-auth", () => ({
	checkTeamGroupAccessCockroach: vi.fn(),
	checkTeamGroupLeadershipCockroach: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	dbPg: {
		select: vi.fn(),
		from: vi.fn(),
		where: vi.fn(),
		innerJoin: vi.fn(),
		leftJoin: vi.fn(),
		orderBy: vi.fn(),
		limit: vi.fn(),
		insert: vi.fn(),
		values: vi.fn(),
		returning: vi.fn(),
		update: vi.fn(),
		set: vi.fn(),
		delete: vi.fn(),
	},
}));

import { dbPg } from "@/lib/db";

// Regex patterns for test validation
const CONTENT_REGEX = /content/i;

const mockGetServerUser = vi.mocked(getServerUser);
const mockCheckTeamGroupAccessCockroach = vi.mocked(
	checkTeamGroupAccessCockroach,
);
const mockDbPg = vi.mocked(dbPg);

describe("/api/teams/[teamId]/stream", () => {
	// Use proper UUID format for better type safety and realistic testing
	const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
	const mockTeamId = "team-slug-123";
	const mockGroupId = "123e4567-e89b-12d3-a456-426614174001";
	const mockSubteamId = "123e4567-e89b-12d3-a456-426614174002";
	const mockPostId = "123e4567-e89b-12d3-a456-426614174003";

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

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("GET /api/teams/[teamId]/stream", () => {
		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});

		it("should return 400 when subteamId is missing", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Subteam ID is required");
		});

		it("should return 403 when user has no access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);
			// Mock team group lookup using Drizzle ORM
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
		} as any);
			mockCheckTeamGroupAccessCockroach.mockResolvedValue({
				isAuthorized: false,
				hasMembership: false,
				hasRosterEntry: false,
				role: undefined,
		});

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream?subteamId=${mockSubteamId}`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe("Not authorized to access this team");
		});

		it("should return stream posts when user has access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			const mockPost = {
				id: mockPostId,
				content: "Test post content",
				show_tournament_timer: false,
				tournament_id: null,
				tournament_title: null,
				tournament_start_time: null,
				author_name: "Test User",
				author_email: "test@example.com",
				created_at: new Date("2024-01-01T00:00:00Z"),
				attachment_url: null,
				attachment_title: null,
			};

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
		} as any);

			// Mock stream posts query (select().from().innerJoin().leftJoin().where().orderBy().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						leftJoin: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								orderBy: vi.fn().mockReturnValue({
									limit: vi.fn().mockResolvedValue([mockPost]),
								}),
							}),
						}),
					}),
				}),
		} as any);

			// Mock comments query for the post (select().from().innerJoin().where().orderBy())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
		} as any);

			mockCheckTeamGroupAccessCockroach.mockResolvedValue({
				isAuthorized: true,
				hasMembership: true,
				hasRosterEntry: false,
				role: "captain",
		});

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream?subteamId=${mockSubteamId}`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.posts).toHaveLength(1);
			expect(body.posts[0].id).toBe(mockPostId);
			expect(body.posts[0].content).toBe("Test post content");
			expect(body.posts[0].comments).toEqual([]);
		});

		it("should filter by subteam when subteamId is provided", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
		} as any);

			// Mock empty stream posts query
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						leftJoin: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								orderBy: vi.fn().mockReturnValue({
									limit: vi.fn().mockResolvedValue([]),
								}),
							}),
						}),
					}),
				}),
		} as any);

			mockCheckTeamGroupAccessCockroach.mockResolvedValue({
				isAuthorized: true,
				hasMembership: true,
				hasRosterEntry: false,
				role: "captain",
		});

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream?subteamId=${mockSubteamId}`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.posts).toHaveLength(0);
		});
		});

	describe("POST /api/teams/[teamId]/stream", () => {
		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream`,
				{
					method: "POST",
					body: JSON.stringify({
						content: "Test post content",
						subteamId: mockSubteamId,
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
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			// Mock membership check - user is a member but not captain/co-captain
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([{ role: "member" }]),
						}),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream`,
				{
					method: "POST",
					body: JSON.stringify({
						content: "Test post content",
						subteamId: mockSubteamId,
					}),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe(
				"Only captains and co-captains can post to the stream",
			);
		});

		it("should create post when user has leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			// Mock membership check - user is a captain
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([{ role: "captain" }]),
						}),
					}),
				}),
			} as any);

			// Mock subteam validation
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockSubteamId }]),
					}),
				}),
			} as any);

			// Mock post creation
			mockDbPg.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ id: mockPostId }]),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream`,
				{
					method: "POST",
					body: JSON.stringify({
						content: "Test post content",
						subteamId: mockSubteamId,
					}),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.message).toBe("Post created successfully");
			expect(body.postId).toBe(mockPostId);
		});

		it("should handle missing required fields", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream`,
				{
					method: "POST",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						// Missing content
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
				expect.arrayContaining([expect.stringMatching(CONTENT_REGEX)]),
			);
		});
		});

	describe("PUT /api/teams/[teamId]/stream", () => {
		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream`,
				{
					method: "PUT",
					body: JSON.stringify({
						postId: mockPostId,
						content: "Updated post content",
					}),
				},
			);
			const response = await PUT(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});

		it("should return 403 when user has no leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			// Mock membership check - user is a member but not captain/co-captain
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([{ role: "member" }]),
						}),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream`,
				{
					method: "PUT",
					body: JSON.stringify({
						postId: mockPostId,
						content: "Updated post content",
					}),
				},
			);
			const response = await PUT(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe("Only captains and co-captains can edit posts");
		});

		it("should update post when user has leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			// Mock membership check - user is a captain
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([{ role: "captain" }]),
						}),
					}),
				}),
			} as any);

			// Mock post verification
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([{ id: mockPostId }]),
						}),
					}),
				}),
			} as any);

			// Mock update query
			mockDbPg.update.mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream`,
				{
					method: "PUT",
					body: JSON.stringify({
						postId: mockPostId,
						content: "Updated post content",
					}),
				},
			);
			const response = await PUT(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.message).toBe("Post updated successfully");
		});
		});

	describe("DELETE /api/teams/[teamId]/stream", () => {
		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream?postId=${mockPostId}`,
				{
					method: "DELETE",
				},
			);
			const response = await DELETE(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});

		it("should return 400 when postId is missing", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream`,
				{
					method: "DELETE",
				},
			);
			const response = await DELETE(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Post ID is required");
		});

		it("should return 403 when user has no leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			// Mock membership check - user is a member but not captain/co-captain
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([{ role: "member" }]),
						}),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream?postId=${mockPostId}`,
				{
					method: "DELETE",
				},
			);
			const response = await DELETE(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe("Only captains and co-captains can delete posts");
		});

		it("should delete post when user has leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			// Mock membership check - user is a captain
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([{ role: "captain" }]),
						}),
					}),
				}),
			} as any);

			// Mock post verification
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([{ id: mockPostId }]),
						}),
					}),
				}),
			} as any);

			// Mock delete query
			mockDbPg.delete.mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/stream?postId=${mockPostId}`,
				{
					method: "DELETE",
				},
			);
			const response = await DELETE(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
		});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.message).toBe("Post deleted successfully");
		});
	});
});
});
