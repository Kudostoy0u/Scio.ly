import { DELETE, GET, POST } from "@/app/api/teams/[teamId]/timers/route";
import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import {
	type TeamAccessResult,
	getTeamAccess,
	hasLeadershipAccess,
} from "@/lib/utils/teams/access";
import { resolveTeamSlugToUnits } from "@/lib/utils/teams/resolver";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Regex patterns for test validation
const SUBTEAM_ID_REQUIRED_REGEX = /subteam id.*required/i;

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
	getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/teams/access", () => ({
	getTeamAccess: vi.fn(),
	hasLeadershipAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	dbPg: {
		select: vi.fn(),
		from: vi.fn(),
		leftJoin: vi.fn(),
		where: vi.fn(),
		orderBy: vi.fn(),
		limit: vi.fn(),
		insert: vi.fn(),
		values: vi.fn(),
		returning: vi.fn(),
		delete: vi.fn(),
	},
}));

vi.mock("@/lib/utils/teams/resolver", () => ({
	resolveTeamSlugToUnits: vi.fn(),
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockGetTeamAccess = vi.mocked(getTeamAccess);
const mockHasLeadershipAccess = vi.mocked(hasLeadershipAccess);
const mockDbPg = vi.mocked(dbPg) as typeof dbPg & {
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
};
const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);

describe("/api/teams/[teamId]/timers", () => {
	const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
	const mockTeamId = "team-456";
	const mockGroupId = "123e4567-e89b-12d3-a456-426614174001";
	const mockSubteamId = "123e4567-e89b-12d3-a456-426614174002";
	const mockEventId = "123e4567-e89b-12d3-a456-426614174003";
	const mockTimerId = "123e4567-e89b-12d3-a456-426614174004";

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock console methods to reduce noise
		vi.spyOn(console, "log").mockImplementation(() => {
			// Suppress console.log in tests
		});
		vi.spyOn(console, "error").mockImplementation(() => {
			// Suppress console.error in tests
		});

		// Default mock for resolveTeamSlugToUnits
		mockResolveTeamSlugToUnits.mockResolvedValue({
			teamId: mockGroupId,
			subteamIds: [mockSubteamId],
		});

		// Reset dbPg mocks
		mockDbPg.select.mockReturnValue({
			from: vi.fn(),
			where: vi.fn(),
			limit: vi.fn(),
			orderBy: vi.fn(),
			leftJoin: vi.fn(),
		} as unknown);
		mockDbPg.insert.mockReturnValue({
			values: vi.fn(),
			returning: vi.fn(),
		} as unknown);
		mockDbPg.delete.mockReturnValue({
			where: vi.fn(),
			returning: vi.fn(),
		} as unknown);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("GET /api/teams/[teamId]/timers", () => {
		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/timers`,
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
				`http://localhost:3000/api/teams/${mockTeamId}/timers`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Validation failed");
			expect(body.details).toBeDefined();
			expect(Array.isArray(body.details)).toBe(true);
			expect(
				body.details.some((detail: string) =>
					SUBTEAM_ID_REQUIRED_REGEX.test(detail),
				),
			).toBe(true);
		});

		it("should return 403 when user has no access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockGetTeamAccess.mockResolvedValue({
				hasAccess: false,
				isCreator: false,
				hasRosterEntries: false,
				memberships: [],
			} as TeamAccessResult);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/timers?subteamId=${mockSubteamId}`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe("Not authorized to view this team");
		});

		it("should return timers when user has access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockGetTeamAccess.mockResolvedValue({
				hasAccess: true,
				isCreator: false,
				hasRosterEntries: false,
				memberships: [],
			});

			// Mock Drizzle ORM chain for timers query
			const mockTimersResult = [
				{
					id: mockEventId,
					title: "Anatomy Event",
					start_time: "2024-01-01T10:00:00Z",
					location: "Room 101",
					event_type: "meeting",
					added_at: "2024-01-01T09:00:00Z",
				},
			];

			mockDbPg.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					leftJoin: vi.fn().mockReturnValue({
						leftJoin: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								orderBy: vi.fn().mockResolvedValue(mockTimersResult),
							}),
						}),
					}),
				}),
			});

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/timers?subteamId=${mockSubteamId}`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.timers).toHaveLength(1);
			expect(body.timers[0].id).toBe(mockEventId);
			expect(body.timers[0].title).toBe("Anatomy Event");
		});

		it("should return empty array when no timers exist", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockGetTeamAccess.mockResolvedValue({
				hasAccess: true,
				isCreator: false,
				hasRosterEntries: false,
				memberships: [],
			});

			// Mock empty timers query
			mockDbPg.select.mockReturnValue({
				from: vi.fn().mockReturnValue({
					leftJoin: vi.fn().mockReturnValue({
						leftJoin: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								orderBy: vi.fn().mockResolvedValue([]),
							}),
						}),
					}),
				}),
			});

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/timers?subteamId=${mockSubteamId}`,
			);
			const response = await GET(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.timers).toHaveLength(0);
		});
	});

	describe("POST /api/teams/[teamId]/timers", () => {
		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/timers`,
				{
					method: "POST",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						eventId: mockEventId,
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
			mockHasLeadershipAccess.mockResolvedValue(false);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/timers`,
				{
					method: "POST",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						eventId: mockEventId,
					}),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe(
				"Only captains and co-captains can manage timers",
			);
		});

		it("should create timer when user has leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockHasLeadershipAccess.mockResolvedValue(true);

			// Mock Drizzle ORM queries in sequence:
			// 1. Subteam lookup
			mockDbPg.select.mockImplementationOnce(
				() =>
					({
						from: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								limit: vi.fn().mockResolvedValue([{ groupId: mockGroupId }]),
							}),
						}),
					}) as unknown,
			);

			// 2. Group team units
			mockDbPg.select.mockImplementationOnce(
				() =>
					({
						from: vi.fn().mockReturnValue({
							where: vi.fn().mockResolvedValue([{ id: mockSubteamId }]),
						}),
					}) as unknown,
			);

			// 3. Event existence check
			mockDbPg.select.mockImplementationOnce(
				() =>
					({
						from: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								limit: vi.fn().mockResolvedValue([{ id: mockEventId }]),
							}),
						}),
					}) as unknown,
			);

			// 4. Existing timer check
			mockDbPg.select.mockImplementationOnce(
				() =>
					({
						from: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								limit: vi.fn().mockResolvedValue([]),
							}),
						}),
					}) as unknown,
			);

			// 5. Timer creation
			mockDbPg.insert.mockReturnValueOnce({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ id: mockTimerId }]),
				}),
			});

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/timers`,
				{
					method: "POST",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						eventId: mockEventId,
					}),
				},
			);
			const response = await POST(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.message).toBe("Timer added successfully");
			expect(body.timerId).toBe(mockTimerId);
		});

		it("should handle missing required fields", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockHasLeadershipAccess.mockResolvedValue(true);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/timers`,
				{
					method: "POST",
					body: JSON.stringify({
						subteamId: mockSubteamId,
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
			expect(Array.isArray(body.details)).toBe(true);
			expect(body.details.length).toBeGreaterThan(0);
			// Check that details contain validation error messages
			const hasValidationError = body.details.some(
				(detail: string) => typeof detail === "string" && detail.length > 0,
			);
			expect(hasValidationError).toBe(true);
		});
	});

	describe("DELETE /api/teams/[teamId]/timers", () => {
		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/timers`,
				{
					method: "DELETE",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						eventId: mockEventId,
					}),
				},
			);
			const response = await DELETE(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});

		it("should return 403 when user has no leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockHasLeadershipAccess.mockResolvedValue(false);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/timers`,
				{
					method: "DELETE",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						eventId: mockEventId,
					}),
				},
			);
			const response = await DELETE(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.error).toBe(
				"Only captains and co-captains can manage timers",
			);
		});

		it("should delete timer when user has leadership access", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockHasLeadershipAccess.mockResolvedValue(true);

			// Mock Drizzle ORM delete query
			mockDbPg.delete.mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ id: mockTimerId }]),
				}),
			});

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/timers`,
				{
					method: "DELETE",
					body: JSON.stringify({
						subteamId: mockSubteamId,
						eventId: mockEventId,
					}),
				},
			);
			const response = await DELETE(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.message).toBe("Timer removed successfully");
		});

		it("should handle missing required fields", async () => {
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockHasLeadershipAccess.mockResolvedValue(true);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/${mockTeamId}/timers`,
				{
					method: "DELETE",
					body: JSON.stringify({}),
				},
			);
			const response = await DELETE(request, {
				params: Promise.resolve({ teamId: mockTeamId }),
			});

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Validation failed");
			expect(body.details).toBeDefined();
			expect(Array.isArray(body.details)).toBe(true);
			expect(body.details.length).toBeGreaterThan(0);
			// Check that details contain validation error messages
			const hasValidationError = body.details.some(
				(detail: string) => typeof detail === "string" && detail.length > 0,
			);
			expect(hasValidationError).toBe(true);
		});
	});
});
