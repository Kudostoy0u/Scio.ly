import { DELETE, PUT } from "@/app/api/teams/calendar/events/[eventId]/route";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database functions
vi.mock("@/lib/db", () => ({
	dbPg: {
		select: vi.fn(),
		delete: vi.fn(),
		update: vi.fn(),
	},
}));

vi.mock("@/lib/supabaseServer", () => ({
	getServerUser: vi.fn(),
}));

import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";

const mockDbPg = vi.mocked(dbPg);
const mockGetServerUser = vi.mocked(getServerUser);

describe("/api/teams/calendar/events/[eventId]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("DELETE /api/teams/calendar/events/[eventId]", () => {
		it("deletes event successfully when user is creator", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const mockEventId = "123e4567-e89b-12d3-a456-426614174001";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock event lookup (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([
							{
								createdBy: mockUserId,
								teamId: "123e4567-e89b-12d3-a456-426614174002",
							},
						]),
					}),
				}),
			} as any);

			// Mock delete (delete().where())
			mockDbPg.delete = vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events/${mockEventId}`,
				{
					method: "DELETE",
				},
			);

			const response = await DELETE(request, {
				params: Promise.resolve({ eventId: mockEventId }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
		});

		it("deletes event successfully when user is captain", async () => {
			const mockCreatorId = "123e4567-e89b-12d3-a456-426614174000";
			const mockUserId = "123e4567-e89b-12d3-a456-426614174001";
			const mockEventId = "123e4567-e89b-12d3-a456-426614174002";
			const mockTeamId = "123e4567-e89b-12d3-a456-426614174003";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock event lookup (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi
							.fn()
							.mockResolvedValue([
								{ createdBy: mockCreatorId, teamId: mockTeamId },
							]),
					}),
				}),
			} as any);

			// Mock membership check (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ role: "captain" }]),
					}),
				}),
			} as any);

			// Mock delete (delete().where())
			mockDbPg.delete = vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events/${mockEventId}`,
				{
					method: "DELETE",
				},
			);

			const response = await DELETE(request, {
				params: Promise.resolve({ eventId: mockEventId }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
		});

		it("returns 404 for non-existent event", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const mockEventId = "123e4567-e89b-12d3-a456-426614174001";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock event lookup returns empty (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events/${mockEventId}`,
				{
					method: "DELETE",
				},
			);

			const response = await DELETE(request, {
				params: Promise.resolve({ eventId: mockEventId }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe("Event not found");
		});

		it("returns 403 for insufficient permissions", async () => {
			const mockCreatorId = "123e4567-e89b-12d3-a456-426614174000";
			const mockUserId = "123e4567-e89b-12d3-a456-426614174001";
			const mockEventId = "123e4567-e89b-12d3-a456-426614174002";
			const mockTeamId = "123e4567-e89b-12d3-a456-426614174003";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock event lookup (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi
							.fn()
							.mockResolvedValue([
								{ createdBy: mockCreatorId, teamId: mockTeamId },
							]),
					}),
				}),
			} as any);

			// Mock membership check returns empty (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events/${mockEventId}`,
				{
					method: "DELETE",
				},
			);

			const response = await DELETE(request, {
				params: Promise.resolve({ eventId: mockEventId }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(403);
			expect(data.error).toBe("Insufficient permissions");
		});

		it("returns 401 for unauthenticated user", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/events/event-123",
				{
					method: "DELETE",
				},
			);

			const response = await DELETE(request, {
				params: Promise.resolve({ eventId: "event-123" }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Unauthorized");
		});

		it("handles database errors", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const mockEventId = "123e4567-e89b-12d3-a456-426614174001";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock event lookup to reject (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockRejectedValue(new Error("Database error")),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events/${mockEventId}`,
				{
					method: "DELETE",
				},
			);

			const response = await DELETE(request, {
				params: Promise.resolve({ eventId: mockEventId }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(["An error occurred", "Failed to delete event"]).toContain(
				data.error,
			);
		});
	});

	describe("PUT /api/teams/calendar/events/[eventId]", () => {
		it("updates event successfully when user is creator", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const mockEventId = "123e4567-e89b-12d3-a456-426614174001";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock event lookup (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([
							{
								createdBy: mockUserId,
								teamId: "123e4567-e89b-12d3-a456-426614174002",
							},
						]),
					}),
				}),
			} as any);

			// Mock update (update().set().where())
			mockDbPg.update = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events/${mockEventId}`,
				{
					method: "PUT",
					body: JSON.stringify({
						title: "Updated Event",
						description: "Updated Description",
					}),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const response = await PUT(request, {
				params: Promise.resolve({ eventId: mockEventId }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
		});

		it("updates event successfully when user is captain", async () => {
			const mockCreatorId = "123e4567-e89b-12d3-a456-426614174000";
			const mockUserId = "123e4567-e89b-12d3-a456-426614174001";
			const mockEventId = "123e4567-e89b-12d3-a456-426614174002";
			const mockTeamId = "123e4567-e89b-12d3-a456-426614174003";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock event lookup (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi
							.fn()
							.mockResolvedValue([
								{ createdBy: mockCreatorId, teamId: mockTeamId },
							]),
					}),
				}),
			} as any);

			// Mock membership check (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ role: "captain" }]),
					}),
				}),
			} as any);

			// Mock update (update().set().where())
			mockDbPg.update = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events/${mockEventId}`,
				{
					method: "PUT",
					body: JSON.stringify({
						title: "Updated Event",
					}),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const response = await PUT(request, {
				params: Promise.resolve({ eventId: mockEventId }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
		});

		it("returns 404 for non-existent event", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const mockEventId = "123e4567-e89b-12d3-a456-426614174001";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock event lookup returns empty (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events/${mockEventId}`,
				{
					method: "PUT",
					body: JSON.stringify({
						title: "Updated Event",
					}),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const response = await PUT(request, {
				params: Promise.resolve({ eventId: mockEventId }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe("Event not found");
		});

		it("returns 403 for insufficient permissions", async () => {
			const mockCreatorId = "123e4567-e89b-12d3-a456-426614174000";
			const mockUserId = "123e4567-e89b-12d3-a456-426614174001";
			const mockEventId = "123e4567-e89b-12d3-a456-426614174002";
			const mockTeamId = "123e4567-e89b-12d3-a456-426614174003";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock event lookup (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi
							.fn()
							.mockResolvedValue([
								{ createdBy: mockCreatorId, teamId: mockTeamId },
							]),
					}),
				}),
			} as any);

			// Mock membership check returns empty (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events/${mockEventId}`,
				{
					method: "PUT",
					body: JSON.stringify({
						title: "Updated Event",
					}),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const response = await PUT(request, {
				params: Promise.resolve({ eventId: mockEventId }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(403);
			expect(data.error).toBe("Insufficient permissions");
		});

		it("returns 400 for no fields to update", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const mockEventId = "123e4567-e89b-12d3-a456-426614174001";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock event lookup (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([
							{
								createdBy: mockUserId,
								teamId: "123e4567-e89b-12d3-a456-426614174002",
							},
						]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events/${mockEventId}`,
				{
					method: "PUT",
					body: JSON.stringify({}),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const response = await PUT(request, {
				params: Promise.resolve({ eventId: mockEventId }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Validation failed");
			expect(data.details).toBeDefined();
		});

		it("handles recurrence pattern updates", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const mockEventId = "123e4567-e89b-12d3-a456-426614174001";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock event lookup (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([
							{
								createdBy: mockUserId,
								teamId: "123e4567-e89b-12d3-a456-426614174002",
							},
						]),
					}),
				}),
			} as any);

			// Mock update (update().set().where())
			mockDbPg.update = vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined),
				}),
			} as any);

			const recurrencePattern = { frequency: "weekly", days: [1, 3] };

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events/${mockEventId}`,
				{
					method: "PUT",
					body: JSON.stringify({
						recurrence_pattern: recurrencePattern,
					}),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const response = await PUT(request, {
				params: Promise.resolve({ eventId: mockEventId }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
		});

		it("handles database errors", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const mockEventId = "123e4567-e89b-12d3-a456-426614174001";
			mockGetServerUser.mockResolvedValue({ id: mockUserId } as any);

			// Mock event lookup to reject (select().from().where().limit())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockRejectedValue(new Error("Database error")),
					}),
				}),
			} as any);

			const request = new NextRequest(
				`http://localhost:3000/api/teams/calendar/events/${mockEventId}`,
				{
					method: "PUT",
					body: JSON.stringify({
						title: "Updated Event",
					}),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const response = await PUT(request, {
				params: Promise.resolve({ eventId: mockEventId }),
			} as any);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(["An error occurred", "Failed to update event"]).toContain(
				data.error,
			);
		});
	});
});
