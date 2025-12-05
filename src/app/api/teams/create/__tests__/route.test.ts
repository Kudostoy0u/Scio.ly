import { POST } from "@/app/api/teams/create/route";
import { cockroachDBTeamsService } from "@/lib/services/cockroachdb-teams";
import { getServerUser } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

// Mock dependencies
vi.mock("@/lib/supabaseServer", () => ({
	getServerUser: vi.fn(),
	createSupabaseServerClient: vi.fn(),
}));


vi.mock("@/lib/services/cockroachdb-teams", () => ({
	cockroachDBTeamsService: {
		createTeamGroup: vi.fn(),
		createTeamUnit: vi.fn(),
		createTeamMembership: vi.fn(),
		getTeamMembers: vi.fn(),
	},
}));

const mockGetServerUser = vi.mocked(getServerUser);
const mockCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const mockService = vi.mocked(cockroachDBTeamsService);

describe("/api/teams/create", () => {
	const mockUserId = "user-123";
	const mockUser: User = {
		id: mockUserId,
		app_metadata: {},
		user_metadata: {},
		aud: "authenticated",
		created_at: "2023-01-01T00:00:00.000Z",
	} as User;
	// const mockTeamId = 'team-456';
	const mockGroupId = "group-789";

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock console methods to reduce noise
		vi.spyOn(console, "log").mockImplementation(() => {
			// Intentionally empty to suppress console output in tests
		});
		vi.spyOn(console, "error").mockImplementation(() => {
			// Intentionally empty to suppress console output in tests
		});

		// Mock Supabase client
		const mockSupabaseClient = {
			from: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						maybeSingle: vi.fn().mockResolvedValue({ data: null }),
						single: vi.fn().mockResolvedValue({ data: null }),
					}),
				}),
				upsert: vi.fn().mockResolvedValue({ error: null }),
			}),
		};
		mockCreateSupabaseServerClient.mockResolvedValue(
			mockSupabaseClient as any,
		);

		// Set DATABASE_URL for tests
		process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("POST /api/teams/create", () => {
		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/create",
				{
					method: "POST",
					body: JSON.stringify({
						school: "Test School",
						division: "C",
						description: "Test team description",
					}),
				},
			);
			const response = await POST(request);

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});

		it("should return 400 when school is missing", async () => {
			mockGetServerUser.mockResolvedValue(mockUser);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/create",
				{
					method: "POST",
					body: JSON.stringify({
						division: "C",
					}),
				},
			);
			const response = await POST(request);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("School and division are required");
		});

		it("should return 400 when division is missing", async () => {
			mockGetServerUser.mockResolvedValue(mockUser);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/create",
				{
					method: "POST",
					body: JSON.stringify({
						school: "Test School",
					}),
				},
			);
			const response = await POST(request);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("School and division are required");
		});

		it("should accept request without description (description is optional)", async () => {
			mockGetServerUser.mockResolvedValue(mockUser);

			// Mock service methods
			mockService.createTeamGroup.mockResolvedValue({ id: mockGroupId } as any);
			mockService.createTeamUnit.mockResolvedValue({ id: "unit-123" } as any);
			mockService.createTeamMembership.mockResolvedValue({
				id: "membership-123",
			} as any);
			mockService.getTeamMembers.mockResolvedValue([]);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/create",
				{
					method: "POST",
					body: JSON.stringify({
						school: "Test School",
						division: "C",
						// description is optional
					}),
				},
			);
			const response = await POST(request);

			// Should not return 400 since description is optional
			expect(response.status).not.toBe(400);
		});

		it("should return 400 when division is invalid", async () => {
			mockGetServerUser.mockResolvedValue(mockUser);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/create",
				{
					method: "POST",
					body: JSON.stringify({
						school: "Test School",
						division: "A",
						description: "Test team description",
					}),
				},
			);
			const response = await POST(request);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Division must be B or C");
		});

		it("should create team when all required fields are provided", async () => {
			const mockTeamId = "team-123";
			mockGetServerUser.mockResolvedValue({
				id: mockUserId,
				email: "test@example.com",
			} as any);

			// Mock service methods
			mockService.createTeamGroup.mockResolvedValue({
				id: mockGroupId,
				slug: "test-school-c-abc123",
				school: "Test School",
				division: "C",
			} as any);

			mockService.createTeamUnit.mockResolvedValue({
				id: mockTeamId,
				name: "Team A",
				description: "Team A",
				captain_code: "CAP123456",
				user_code: "USR123456",
				created_at: new Date(),
				updated_at: new Date(),
			} as any);

			mockService.getTeamMembers.mockResolvedValue([
				{
					user_id: mockUserId,
					role: "captain",
				},
			] as any);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/create",
				{
					method: "POST",
					body: JSON.stringify({
						school: "Test School",
						division: "C",
					}),
				},
			);
			const response = await POST(request);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.id).toBe(mockTeamId);
			expect(body.school).toBe("Test School");
			expect(body.division).toBe("C");
		});

		it("should create team for division B", async () => {
			const mockTeamId = "team-123";
			mockGetServerUser.mockResolvedValue({
				id: mockUserId,
				email: "test@example.com",
			} as any);

			// Mock service methods
			mockService.createTeamGroup.mockResolvedValue({
				id: mockGroupId,
				slug: "test-school-b-abc123",
				school: "Test School",
				division: "B",
			} as any);

			mockService.createTeamUnit.mockResolvedValue({
				id: mockTeamId,
				name: "Team A",
				description: "Team A",
				captain_code: "CAP123456",
				user_code: "USR123456",
				created_at: new Date(),
				updated_at: new Date(),
			} as any);

			mockService.getTeamMembers.mockResolvedValue([
				{
					user_id: mockUserId,
					role: "captain",
				},
			] as any);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/create",
				{
					method: "POST",
					body: JSON.stringify({
						school: "Test School",
						division: "B",
					}),
				},
			);
			const response = await POST(request);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.division).toBe("B");
		});

		it("should handle team creation errors gracefully", async () => {
			mockGetServerUser.mockResolvedValue(mockUser);
			mockService.createTeamGroup.mockRejectedValue(
				new Error("Database connection failed"),
			);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/create",
				{
					method: "POST",
					body: JSON.stringify({
						school: "Test School",
						division: "C",
					}),
				},
			);
			const response = await POST(request);

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe("Internal server error");
		});

		it("should handle invalid JSON in request body", async () => {
			mockGetServerUser.mockResolvedValue(mockUser);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/create",
				{
					method: "POST",
					body: "invalid json",
				},
			);

			// The route should return 400 for invalid JSON (improved error handling)
			const response = await POST(request);
			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Invalid JSON in request body");
		});

		it("should handle empty request body", async () => {
			mockGetServerUser.mockResolvedValue(mockUser);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/create",
				{
					method: "POST",
					body: "",
				},
			);
			const response = await POST(request);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Request body is required");
		});
	});
});
