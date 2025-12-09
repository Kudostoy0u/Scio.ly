import { GET, POST } from "@/app/api/teams/calendar/events/route";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database functions
vi.mock("@/lib/db", () => ({
	dbPg: {
		select: vi.fn(),
		insert: vi.fn(),
	},
}));

vi.mock("@/lib/supabaseServer", () => ({
	getServerUser: vi.fn(),
}));

vi.mock("@/lib/utils/teams/resolver", () => ({
	resolveTeamSlugToUnits: vi.fn(),
}));

import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";
import { resolveTeamSlugToUnits } from "@/lib/utils/teams/resolver";

const mockDbPg = vi.mocked(dbPg) as typeof dbPg & {
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
};
const mockGetServerUser = vi.mocked(getServerUser);
const mockResolveTeamSlugToUnits = vi.mocked(resolveTeamSlugToUnits);

describe("/api/teams/calendar/events", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("POST /api/teams/calendar/events", () => {
		it("creates event successfully", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockResolveTeamSlugToUnits.mockResolvedValue({
				groupId: "123e4567-e89b-12d3-a456-426614174001",
				teamUnitIds: ["123e4567-e89b-12d3-a456-426614174002"],
			} as any);

			// Mock insert event (insert().values().returning())
			mockDbPg.insert = vi.fn().mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi
						.fn()
						.mockResolvedValue([
							{ id: "123e4567-e89b-12d3-a456-426614174003" },
						]),
				}),
			} as any);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/events",
				{
					method: "POST",
					body: JSON.stringify({
						title: "Test Event",
						description: "Test Description",
						start_time: "2024-01-15T14:00:00Z",
						end_time: "2024-01-15T16:00:00Z",
						location: "Test Location",
						event_type: "practice",
						is_all_day: false,
						is_recurring: false,
						team_id: "team-123",
						created_by: mockUserId,
					}),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.eventId).toBe("123e4567-e89b-12d3-a456-426614174003");
		});

		it("returns 401 for unauthenticated user", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/events",
				{
					method: "POST",
					body: JSON.stringify({
						title: "Test Event",
						start_time: "2024-01-15T14:00:00Z",
					}),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Unauthorized");
		});

		it("returns 400 for missing required fields", async () => {
			mockGetServerUser.mockResolvedValue({ id: "user-123" } as User);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/events",
				{
					method: "POST",
					body: JSON.stringify({
						description: "Test Description",
						// Missing title and start_time
					}),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Validation failed");
			expect(data.details).toBeDefined();
			expect(Array.isArray(data.details)).toBe(true);
			// Check that details contains validation errors (title or start_time)
			expect(data.details.length).toBeGreaterThan(0);
		});

		it("handles database errors", async () => {
			mockGetServerUser.mockResolvedValue({ id: "user-123" } as User);

			// Mock insert event to reject
			mockDbPg.insert = vi.fn().mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockRejectedValue(new Error("Database error")),
				}),
			} as any);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/events",
				{
					method: "POST",
					body: JSON.stringify({
						title: "Test Event",
						start_time: "2024-01-15T14:00:00Z",
					}),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(["An error occurred", "Failed to create event"]).toContain(
				data.error,
			);
		});
	});

	describe("GET /api/teams/calendar/events", () => {
		it("fetches events successfully", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);
			mockResolveTeamSlugToUnits.mockResolvedValue({
				groupId: "123e4567-e89b-12d3-a456-426614174001",
				teamUnitIds: ["123e4567-e89b-12d3-a456-426614174002"],
			} as any);

			// Mock events query (select().from().leftJoin().where().orderBy())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					leftJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockResolvedValue([
								{
									id: "event-1",
									title: "Team Practice",
									description: "Weekly practice",
									start_time: "2024-01-15T14:00:00Z",
									end_time: "2024-01-15T16:00:00Z",
									location: "Gym",
									event_type: "practice",
									is_all_day: false,
									is_recurring: false,
									recurrence_pattern: null,
									created_by: mockUserId,
									team_id: "123e4567-e89b-12d3-a456-426614174002",
									creator_email: "user@example.com",
									creator_name: "John Doe",
								},
							]),
						}),
					}),
				}),
			} as any);

			// Mock attendees query for first event (select().from().leftJoin().where())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					leftJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([
							{
								user_id: "123e4567-e89b-12d3-a456-426614174003",
								status: "attending",
								responded_at: "2024-01-15T10:00:00Z",
								notes: "Will be there",
								email: "member@example.com",
								name: "Jane Smith",
							},
						]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/events?teamId=team-123",
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.events).toHaveLength(1);
			expect(data.events[0].title).toBe("Team Practice");
			expect(data.events[0].attendees).toHaveLength(1);
		});

		it("fetches events with date range", async () => {
			mockGetServerUser.mockResolvedValue({
				id: "123e4567-e89b-12d3-a456-426614174000",
			} as {
				id: string;
			} as any);
			mockResolveTeamSlugToUnits.mockResolvedValue({
				groupId: "123e4567-e89b-12d3-a456-426614174001",
				teamUnitIds: ["123e4567-e89b-12d3-a456-426614174002"],
			} as any);

			// Mock events query (select().from().leftJoin().where().orderBy()) - empty
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					leftJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			} as any);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/events?teamId=team-123&startDate=2024-01-01&endDate=2024-01-31",
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.events).toHaveLength(0);
		});

		it("fetches personal events", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as User);

			// Mock events query (select().from().leftJoin().where().orderBy()) - empty
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					leftJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events?userId=${mockUserId}`,
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.events).toHaveLength(0);
		});

		it("returns 401 for unauthenticated user", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/events",
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Unauthorized");
		});

		it("handles database errors", async () => {
			mockGetServerUser.mockResolvedValue({
				id: "123e4567-e89b-12d3-a456-426614174000",
			} as {
				id: string;
			} as any);

			// Mock events query to reject
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					leftJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockRejectedValue(new Error("Database error")),
						}),
					}),
				}),
			} as any);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/events",
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(["An error occurred", "Failed to fetch events"]).toContain(
				data.error,
			);
		});
	});
});
