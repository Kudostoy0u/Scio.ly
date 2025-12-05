import { POST } from "@/app/api/teams/calendar/recurring-meetings/route";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the dependencies
vi.mock("@/lib/supabaseServer", () => ({
	getServerUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	dbPg: {
		select: vi.fn(),
		from: vi.fn(),
		where: vi.fn(),
		insert: vi.fn(),
		values: vi.fn(),
		limit: vi.fn(),
	},
}));

import { dbPg } from "@/lib/db";
import { getServerUser } from "@/lib/supabaseServer";

const mockGetServerUser = vi.mocked(getServerUser);
const mockDbPg = vi.mocked(dbPg);

describe("/api/teams/calendar/recurring-meetings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("POST", () => {
		it("should create recurring meeting successfully", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const mockUser = { id: mockUserId } as any;
			const mockGroupId = "group-123";
			const mockTeamUnitId = "unit-123";
			const mockMeetingId = "meeting-123";

			mockGetServerUser.mockResolvedValue(mockUser);

			// Mock team group lookup (select().from().where().limit())
			// Note: Route destructures first result: const [groupResult] = await dbPg...
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			// Mock team units lookup (select().from().where())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ id: mockTeamUnitId }]),
				}),
			} as any);

			// Mock membership check (select().from().where())
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi
						.fn()
						.mockResolvedValue([{ role: "captain", teamId: mockTeamUnitId }]),
				}),
			} as any);

			// Mock insert meeting (insert().values().returning())
			mockDbPg.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ id: mockMeetingId }]),
				}),
			} as any);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/recurring-meetings",
				{
					method: "POST",
					body: JSON.stringify({
						team_slug: "test-team",
						title: "Weekly Practice",
						days_of_week: [1, 3], // Monday, Wednesday
						start_time: "15:00",
						end_time: "17:00",
						start_date: "2024-01-01T00:00:00Z",
						end_date: "2024-12-31T00:00:00Z",
						created_by: "123e4567-e89b-12d3-a456-426614174000",
					}),
					headers: { "Content-Type": "application/json" },
				},
			);

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.meetingIds).toContain(mockMeetingId);
			expect(data.count).toBeGreaterThan(0);
		});

		it("should return 401 when user is not authenticated", async () => {
			mockGetServerUser.mockResolvedValue(null);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/recurring-meetings",
				{
					method: "POST",
					body: JSON.stringify({
						team_slug: "test-team",
						title: "Weekly Practice",
						days_of_week: [1, 3],
						start_time: "15:00",
						end_time: "17:00",
						start_date: "2024-01-01T00:00:00Z",
					}),
					headers: { "Content-Type": "application/json" },
				},
			);

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Unauthorized");
		});

		it("should return 400 when required fields are missing", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const mockUser = { id: mockUserId } as any;

			mockGetServerUser.mockResolvedValue(mockUser);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/recurring-meetings",
				{
					method: "POST",
					body: JSON.stringify({
						team_slug: "test-team",
						// Missing required fields
					}),
					headers: { "Content-Type": "application/json" },
				},
			);

			const response = await POST(request);
			const data = await response.json();
			expect(response.status).toBe(400);
			expect(data.error).toBe("Validation failed");
			expect(data.details).toBeDefined();
			expect(Array.isArray(data.details)).toBe(true);
			expect(data.details.length).toBeGreaterThan(0);
		});

		it("should return 404 when team is not found", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const mockUser = { id: mockUserId } as any;

			mockGetServerUser.mockResolvedValue(mockUser);
			// Mock team group lookup - no group found
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),
					}),
				}),
			} as any);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/recurring-meetings",
				{
					method: "POST",
					body: JSON.stringify({
						team_slug: "invalid-team",
						title: "Weekly Practice",
						days_of_week: [1, 3],
						start_time: "15:00",
						end_time: "17:00",
						start_date: "2024-01-01T00:00:00Z",
						end_date: "2024-12-31T00:00:00Z",
						created_by: "123e4567-e89b-12d3-a456-426614174000",
					}),
					headers: { "Content-Type": "application/json" },
				},
			);

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(404);
			expect(data.error).toBe("Team not found");
		});

		it("should create personal recurring meeting for non-captain members", async () => {
			const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
			const mockUser = { id: mockUserId } as any;
			const mockGroupId = "group-123";
			const mockTeamUnitId = "unit-123";
			const mockMeetingId = "meeting-123";

			mockGetServerUser.mockResolvedValue(mockUser);

			// Mock team group lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: mockGroupId }]),
					}),
				}),
			} as any);

			// Mock team units lookup
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ id: mockTeamUnitId }]),
				}),
			} as any);

			// Mock membership check - member role
			mockDbPg.select.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi
						.fn()
						.mockResolvedValue([{ role: "member", teamId: mockTeamUnitId }]),
				}),
			} as any);

			// Mock insert meeting
			mockDbPg.insert.mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ id: mockMeetingId }]),
				}),
			} as any);

			const request = new NextRequest(
				"http://localhost:3000/api/teams/calendar/recurring-meetings",
				{
					method: "POST",
					body: JSON.stringify({
						team_slug: "test-team",
						title: "Weekly Practice",
						days_of_week: [1, 3],
						start_time: "15:00",
						end_time: "17:00",
						start_date: "2024-01-01T00:00:00Z",
						end_date: "2024-12-31T00:00:00Z",
						created_by: "123e4567-e89b-12d3-a456-426614174000",
						meeting_type: "personal", // Personal meeting allows members
					}),
					headers: { "Content-Type": "application/json" },
				},
			);

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.meetingIds).toContain(mockMeetingId);
			expect(data.count).toBe(1);
		});
	});
});
