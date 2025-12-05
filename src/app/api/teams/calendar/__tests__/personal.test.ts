import { GET } from "@/app/api/teams/calendar/personal/route";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database functions
vi.mock("@/lib/db", () => ({
	dbPg: {
		select: vi.fn(),
	},
}));

vi.mock("@/lib/supabaseServer", () => ({
	getServerUser: vi.fn(),
}));

import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";

const mockDbPg = vi.mocked(dbPg);
const mockGetServerUser = vi.mocked(getServerUser);

describe("/api/teams/calendar/personal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("GET /api/teams/calendar/personal", () => {
		it("fetches personal events successfully", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock Drizzle ORM query (select().from().where().orderBy())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue([
							{
								id: "personal-1",
								title: "Personal Study",
								description: "Study for upcoming exam",
								start_time: "2024-01-15T10:00:00Z",
								end_time: "2024-01-15T12:00:00Z",
								location: "Library",
								event_type: "personal",
								is_all_day: false,
								is_recurring: false,
								recurrence_pattern: null,
								created_by: mockUserId,
								team_id: null,
							},
							{
								id: "personal-2",
								title: "Doctor Appointment",
								description: "Annual checkup",
								start_time: "2024-01-16T14:00:00Z",
								end_time: "2024-01-16T15:00:00Z",
								location: "Medical Center",
								event_type: "personal",
								is_all_day: false,
								is_recurring: false,
								recurrence_pattern: null,
								created_by: mockUserId,
								team_id: null,
							},
						]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/personal?userId=${mockUserId}`,
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.events).toHaveLength(2);
			expect(data.events[0].title).toBe("Personal Study");
			expect(data.events[1].title).toBe("Doctor Appointment");
		});

		it("fetches personal events with date range", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock Drizzle ORM query (select().from().where().orderBy())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/personal?userId=${mockUserId}&startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z`,
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
				"http://localhost:3000/api/teams/calendar/personal?userId=user-123",
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Unauthorized");
		});

		it("returns 403 for accessing another user's personal events", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const otherUserId = "123e4567-e89b-12d3-a456-426614174001";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/personal?userId=${otherUserId}`,
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(403);
			expect(data.error).toBe("Unauthorized");
		});

		it("handles empty personal events", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock Drizzle ORM query (select().from().where().orderBy())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/personal?userId=${mockUserId}`,
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.events).toHaveLength(0);
		});

		it("handles database errors", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock Drizzle ORM query to reject (select().from().where().orderBy())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockRejectedValue(new Error("Database error")),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/personal?userId=${mockUserId}`,
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect([
				"An error occurred",
				"Failed to fetch personal events",
			]).toContain(data.error);
		});

		it("filters events by start date", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock Drizzle ORM query (select().from().where().orderBy())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/personal?userId=${mockUserId}&startDate=2024-01-15T00:00:00Z`,
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.events).toHaveLength(0);
		});

		it("filters events by end date", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock Drizzle ORM query (select().from().where().orderBy())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/personal?userId=${mockUserId}&endDate=2024-01-31T23:59:59Z`,
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.events).toHaveLength(0);
		});

		it("orders events by start time", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock Drizzle ORM query (select().from().where().orderBy())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/personal?userId=${mockUserId}`,
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.events).toHaveLength(0);
		});
	});
});
