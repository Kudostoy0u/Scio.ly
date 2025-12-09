/**
 * GET endpoint tests for roster invite route
 */

// Import mocks first to ensure they're set up before route handler
import "./mocks";

// Note: This test references a route that doesn't exist. Using placeholder function for now.
import type { NextRequest } from "next/server";
const GET = async (
	_request: NextRequest,
	_params: { params: Promise<{ teamId: string }> },
) => new Response("Not implemented", { status: 501 });
import type { User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockGroup, mockMembership, mockSearchResults } from "./fixtures";
import {
	createGetRequest,
	createMockDrizzleChain,
	createMockDrizzleChainWithJoin,
	createParams,
} from "./helpers";
import { mockDbPg, mockGetServerUser } from "./mocks";

describe("GET /api/teams/[teamId]/roster/invite", () => {
	beforeEach(() => {
		// Reset only the mocks we need, not all mocks
		mockGetServerUser.mockReset();
		mockDbPg.select.mockReset();

		process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
		mockGetServerUser.mockResolvedValue({
			id: "user-123",
			email: "test@example.com",
		} as User);

		mockDbPg.select.mockReturnValue({
			from: vi.fn(),
			innerJoin: vi.fn(),
			where: vi.fn(),
			limit: vi.fn(),
		} as any);
	});

	afterEach(() => {
		Reflect.deleteProperty(process.env, "DATABASE_URL");
	});

	it("should search users successfully", async () => {
		mockDbPg.select
			.mockImplementationOnce(() =>
				createMockDrizzleChain({ id: mockGroup.id }),
			)
			.mockImplementationOnce(() =>
				createMockDrizzleChainWithJoin({ role: mockMembership.role }),
			)
			.mockImplementationOnce(() => createMockDrizzleChain(mockSearchResults));

		const request = createGetRequest("test-team", "q=user");

		const response = await GET(request, createParams("test-team"));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.users).toEqual(mockSearchResults);
	});

	it("should return empty array for short queries", async () => {
		const request = createGetRequest("test-team", "q=a");

		const response = await GET(request, createParams("test-team"));
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.users).toEqual([]);
	});

	it("should return 401 if user is not authenticated", async () => {
		mockGetServerUser.mockResolvedValue(null);

		const request = createGetRequest("test-team", "q=user");

		const response = await GET(request, createParams("test-team"));
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.error).toBe("Unauthorized");
	});

	it("should return 404 if team group is not found", async () => {
		mockDbPg.select.mockImplementationOnce(() => createMockDrizzleChain([]));

		const request = createGetRequest("test-team", "q=user");

		const response = await GET(request, createParams("test-team"));
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.error).toBe("Team group not found");
	});

	it("should return 403 if user is not a team member", async () => {
		mockDbPg.select
			.mockImplementationOnce(() =>
				createMockDrizzleChain({ id: mockGroup.id }),
			)
			.mockImplementationOnce(() => createMockDrizzleChainWithJoin([]));

		const request = createGetRequest("test-team", "q=user");

		const response = await GET(request, createParams("test-team"));
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe("Not a team member");
	});

	it("should return 403 if user is not a captain", async () => {
		const memberMembership = { role: "member" };
		mockDbPg.select
			.mockImplementationOnce(() =>
				createMockDrizzleChain({ id: mockGroup.id }),
			)
			.mockImplementationOnce(() =>
				createMockDrizzleChainWithJoin(memberMembership),
			);

		const request = createGetRequest("test-team", "q=user");

		const response = await GET(request, createParams("test-team"));
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe("Only captains can search users");
	});
});
