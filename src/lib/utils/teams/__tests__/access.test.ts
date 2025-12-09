import {
	getTeamAccessCockroach,
	hasLeadershipAccessCockroach,
} from "@/lib/utils/teams/access";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Drizzle ORM
vi.mock("@/lib/db", () => ({
	dbPg: {
		select: vi.fn(),
	},
}));

import { dbPg } from "@/lib/db";

const mockDbPg = vi.mocked(dbPg);

describe("Team Authentication v2", () => {
	const mockUserId = "user-123";
	const mockGroupId = "group-456";
	const mockSubteamId = "subteam-789";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("getTeamAccessCockroach", () => {
		it("should grant access to team creator", async () => {
			// Mock team creator check
			const mockWhereCreator = vi
				.fn()
				.mockResolvedValue([{ createdBy: mockUserId }]);
			const mockFromCreator = vi
				.fn()
				.mockReturnValue({ where: mockWhereCreator });
			const mockSelectCreator = vi
				.fn()
				.mockReturnValue({ from: mockFromCreator });

			// Mock no subteam memberships
			const mockWhereMembership = vi.fn().mockResolvedValue([]);
			const mockInnerJoinMembership = vi
				.fn()
				.mockReturnValue({ where: mockWhereMembership });
			const mockFromMembership = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinMembership });
			const mockSelectMembership = vi
				.fn()
				.mockReturnValue({ from: mockFromMembership });

			// Mock no roster entries
			const mockWhereRoster = vi.fn().mockResolvedValue([]);
			const mockInnerJoinRoster = vi
				.fn()
				.mockReturnValue({ where: mockWhereRoster });
			const mockFromRoster = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinRoster });
			const mockSelectRoster = vi
				.fn()
				.mockReturnValue({ from: mockFromRoster });

			mockDbPg.select
				.mockReturnValueOnce(mockSelectCreator())
				.mockReturnValueOnce(mockSelectMembership())
				.mockReturnValueOnce(mockSelectRoster());

			const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

			expect(result).toEqual({
				hasAccess: true,
				isCreator: true,
				hasSubteamMembership: false,
				hasRosterEntries: false,
				subteamRole: undefined,
				subteamMemberships: [],
				rosterSubteams: [],
			});
		});

		it("should grant access to subteam member", async () => {
			// Mock not team creator
			const mockWhereCreator = vi.fn().mockResolvedValue([]);
			const mockFromCreator = vi
				.fn()
				.mockReturnValue({ where: mockWhereCreator });
			const mockSelectCreator = vi
				.fn()
				.mockReturnValue({ from: mockFromCreator });

			// Mock subteam membership
			const mockWhereMembership = vi.fn().mockResolvedValue([
				{
					subteamId: mockSubteamId,
					teamId: mockSubteamId,
					role: "captain",
				},
			]);
			const mockInnerJoinMembership = vi
				.fn()
				.mockReturnValue({ where: mockWhereMembership });
			const mockFromMembership = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinMembership });
			const mockSelectMembership = vi
				.fn()
				.mockReturnValue({ from: mockFromMembership });

			// Mock no roster entries
			const mockWhereRoster = vi.fn().mockResolvedValue([]);
			const mockInnerJoinRoster = vi
				.fn()
				.mockReturnValue({ where: mockWhereRoster });
			const mockFromRoster = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinRoster });
			const mockSelectRoster = vi
				.fn()
				.mockReturnValue({ from: mockFromRoster });

			mockDbPg.select
				.mockReturnValueOnce(mockSelectCreator())
				.mockReturnValueOnce(mockSelectMembership())
				.mockReturnValueOnce(mockSelectRoster());

			const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

			expect(result).toEqual({
				hasAccess: true,
				isCreator: false,
				hasSubteamMembership: true,
				hasRosterEntries: false,
				subteamRole: "captain",
				subteamMemberships: [
					{
						subteamId: mockSubteamId,
						teamId: mockSubteamId,
						role: "captain",
					},
				],
				rosterSubteams: [],
			});
		});

		it("should grant access to user with roster entries", async () => {
			// Mock not team creator, no subteam membership
			const mockWhereCreator = vi.fn().mockResolvedValue([]);
			const mockFromCreator = vi
				.fn()
				.mockReturnValue({ where: mockWhereCreator });
			const mockSelectCreator = vi
				.fn()
				.mockReturnValue({ from: mockFromCreator });

			// Mock no subteam membership
			const mockWhereMembership = vi.fn().mockResolvedValue([]);
			const mockInnerJoinMembership = vi
				.fn()
				.mockReturnValue({ where: mockWhereMembership });
			const mockFromMembership = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinMembership });
			const mockSelectMembership = vi
				.fn()
				.mockReturnValue({ from: mockFromMembership });

			// Mock roster entries
			const mockWhereRoster = vi.fn().mockResolvedValue([
				{
					subteamId: mockSubteamId,
					teamId: mockSubteamId,
					studentName: "John Doe",
				},
			]);
			const mockInnerJoinRoster = vi
				.fn()
				.mockReturnValue({ where: mockWhereRoster });
			const mockFromRoster = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinRoster });
			const mockSelectRoster = vi
				.fn()
				.mockReturnValue({ from: mockFromRoster });

			mockDbPg.select
				.mockReturnValueOnce(mockSelectCreator())
				.mockReturnValueOnce(mockSelectMembership())
				.mockReturnValueOnce(mockSelectRoster());

			const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

			expect(result).toEqual({
				hasAccess: true,
				isCreator: false,
				hasSubteamMembership: false,
				hasRosterEntries: true,
				subteamRole: undefined,
				subteamMemberships: [],
				rosterSubteams: [
					{
						subteamId: mockSubteamId,
						teamId: mockSubteamId,
						studentName: "John Doe",
					},
				],
			});
		});

		it("should deny access when user has no team relationship", async () => {
			// Mock no team creator, no subteam membership, no roster entries
			const mockWhereCreator = vi.fn().mockResolvedValue([]);
			const mockFromCreator = vi
				.fn()
				.mockReturnValue({ where: mockWhereCreator });
			const mockSelectCreator = vi
				.fn()
				.mockReturnValue({ from: mockFromCreator });

			const mockWhereMembership = vi.fn().mockResolvedValue([]);
			const mockInnerJoinMembership = vi
				.fn()
				.mockReturnValue({ where: mockWhereMembership });
			const mockFromMembership = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinMembership });
			const mockSelectMembership = vi
				.fn()
				.mockReturnValue({ from: mockFromMembership });

			const mockWhereRoster = vi.fn().mockResolvedValue([]);
			const mockInnerJoinRoster = vi
				.fn()
				.mockReturnValue({ where: mockWhereRoster });
			const mockFromRoster = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinRoster });
			const mockSelectRoster = vi
				.fn()
				.mockReturnValue({ from: mockFromRoster });

			mockDbPg.select
				.mockReturnValueOnce(mockSelectCreator())
				.mockReturnValueOnce(mockSelectMembership())
				.mockReturnValueOnce(mockSelectRoster());

			const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

			expect(result).toEqual({
				hasAccess: false,
				isCreator: false,
				hasSubteamMembership: false,
				hasRosterEntries: false,
				subteamRole: undefined,
				subteamMemberships: [],
				rosterSubteams: [],
			});
		});

		it("should handle multiple subteam memberships", async () => {
			const subteamId2 = "subteam-999";

			const mockWhereCreator = vi.fn().mockResolvedValue([]);
			const mockFromCreator = vi
				.fn()
				.mockReturnValue({ where: mockWhereCreator });
			const mockSelectCreator = vi
				.fn()
				.mockReturnValue({ from: mockFromCreator });

			const mockWhereMembership = vi.fn().mockResolvedValue([
				{
					subteamId: mockSubteamId,
					teamId: mockSubteamId,
					role: "captain",
				},
				{
					subteamId: subteamId2,
					teamId: subteamId2,
					role: "member",
				},
			]);
			const mockInnerJoinMembership = vi
				.fn()
				.mockReturnValue({ where: mockWhereMembership });
			const mockFromMembership = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinMembership });
			const mockSelectMembership = vi
				.fn()
				.mockReturnValue({ from: mockFromMembership });

			const mockWhereRoster = vi.fn().mockResolvedValue([]);
			const mockInnerJoinRoster = vi
				.fn()
				.mockReturnValue({ where: mockWhereRoster });
			const mockFromRoster = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinRoster });
			const mockSelectRoster = vi
				.fn()
				.mockReturnValue({ from: mockFromRoster });

			mockDbPg.select
				.mockReturnValueOnce(mockSelectCreator())
				.mockReturnValueOnce(mockSelectMembership())
				.mockReturnValueOnce(mockSelectRoster());

			const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

			expect(result.subteamMemberships).toHaveLength(2);
			expect(result.subteamMemberships[0]).toEqual({
				subteamId: mockSubteamId,
				teamId: mockSubteamId,
				role: "captain",
			});
			expect(result.subteamMemberships[1]).toEqual({
				subteamId: subteamId2,
				teamId: subteamId2,
				role: "member",
			});
		});
	});

	describe("hasLeadershipAccessCockroach", () => {
		it("should grant leadership to team creator", async () => {
			const mockWhereCreator = vi
				.fn()
				.mockResolvedValue([{ createdBy: mockUserId }]);
			const mockFromCreator = vi
				.fn()
				.mockReturnValue({ where: mockWhereCreator });
			const mockSelectCreator = vi
				.fn()
				.mockReturnValue({ from: mockFromCreator });

			const mockWhereMembership = vi.fn().mockResolvedValue([]);
			const mockInnerJoinMembership = vi
				.fn()
				.mockReturnValue({ where: mockWhereMembership });
			const mockFromMembership = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinMembership });
			const mockSelectMembership = vi
				.fn()
				.mockReturnValue({ from: mockFromMembership });

			const mockWhereRoster = vi.fn().mockResolvedValue([]);
			const mockInnerJoinRoster = vi
				.fn()
				.mockReturnValue({ where: mockWhereRoster });
			const mockFromRoster = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinRoster });
			const mockSelectRoster = vi
				.fn()
				.mockReturnValue({ from: mockFromRoster });

			mockDbPg.select
				.mockReturnValueOnce(mockSelectCreator())
				.mockReturnValueOnce(mockSelectMembership())
				.mockReturnValueOnce(mockSelectRoster());

			const result = await hasLeadershipAccessCockroach(
				mockUserId,
				mockGroupId,
			);

			expect(result).toBe(true);
		});

		it("should grant leadership to captain", async () => {
			const mockWhereCreator = vi.fn().mockResolvedValue([]);
			const mockFromCreator = vi
				.fn()
				.mockReturnValue({ where: mockWhereCreator });
			const mockSelectCreator = vi
				.fn()
				.mockReturnValue({ from: mockFromCreator });

			const mockWhereMembership = vi.fn().mockResolvedValue([
				{
					subteamId: mockSubteamId,
					teamId: mockSubteamId,
					role: "captain",
				},
			]);
			const mockInnerJoinMembership = vi
				.fn()
				.mockReturnValue({ where: mockWhereMembership });
			const mockFromMembership = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinMembership });
			const mockSelectMembership = vi
				.fn()
				.mockReturnValue({ from: mockFromMembership });

			const mockWhereRoster = vi.fn().mockResolvedValue([]);
			const mockInnerJoinRoster = vi
				.fn()
				.mockReturnValue({ where: mockWhereRoster });
			const mockFromRoster = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinRoster });
			const mockSelectRoster = vi
				.fn()
				.mockReturnValue({ from: mockFromRoster });

			mockDbPg.select
				.mockReturnValueOnce(mockSelectCreator())
				.mockReturnValueOnce(mockSelectMembership())
				.mockReturnValueOnce(mockSelectRoster());

			const result = await hasLeadershipAccessCockroach(
				mockUserId,
				mockGroupId,
			);

			expect(result).toBe(true);
		});

		it("should grant leadership to co-captain", async () => {
			const mockWhereCreator = vi.fn().mockResolvedValue([]);
			const mockFromCreator = vi
				.fn()
				.mockReturnValue({ where: mockWhereCreator });
			const mockSelectCreator = vi
				.fn()
				.mockReturnValue({ from: mockFromCreator });

			const mockWhereMembership = vi.fn().mockResolvedValue([
				{
					subteamId: mockSubteamId,
					teamId: mockSubteamId,
					role: "co_captain",
				},
			]);
			const mockInnerJoinMembership = vi
				.fn()
				.mockReturnValue({ where: mockWhereMembership });
			const mockFromMembership = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinMembership });
			const mockSelectMembership = vi
				.fn()
				.mockReturnValue({ from: mockFromMembership });

			const mockWhereRoster = vi.fn().mockResolvedValue([]);
			const mockInnerJoinRoster = vi
				.fn()
				.mockReturnValue({ where: mockWhereRoster });
			const mockFromRoster = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinRoster });
			const mockSelectRoster = vi
				.fn()
				.mockReturnValue({ from: mockFromRoster });

			mockDbPg.select
				.mockReturnValueOnce(mockSelectCreator())
				.mockReturnValueOnce(mockSelectMembership())
				.mockReturnValueOnce(mockSelectRoster());

			const result = await hasLeadershipAccessCockroach(
				mockUserId,
				mockGroupId,
			);

			expect(result).toBe(true);
		});

		it("should deny leadership to regular member", async () => {
			const mockWhereCreator = vi.fn().mockResolvedValue([]);
			const mockFromCreator = vi
				.fn()
				.mockReturnValue({ where: mockWhereCreator });
			const mockSelectCreator = vi
				.fn()
				.mockReturnValue({ from: mockFromCreator });

			const mockWhereMembership = vi.fn().mockResolvedValue([
				{
					subteamId: mockSubteamId,
					teamId: mockSubteamId,
					role: "member",
				},
			]);
			const mockInnerJoinMembership = vi
				.fn()
				.mockReturnValue({ where: mockWhereMembership });
			const mockFromMembership = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinMembership });
			const mockSelectMembership = vi
				.fn()
				.mockReturnValue({ from: mockFromMembership });

			const mockWhereRoster = vi.fn().mockResolvedValue([]);
			const mockInnerJoinRoster = vi
				.fn()
				.mockReturnValue({ where: mockWhereRoster });
			const mockFromRoster = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinRoster });
			const mockSelectRoster = vi
				.fn()
				.mockReturnValue({ from: mockFromRoster });

			mockDbPg.select
				.mockReturnValueOnce(mockSelectCreator())
				.mockReturnValueOnce(mockSelectMembership())
				.mockReturnValueOnce(mockSelectRoster());

			const result = await hasLeadershipAccessCockroach(
				mockUserId,
				mockGroupId,
			);

			expect(result).toBe(false);
		});

		it("should deny leadership when user has no team relationship", async () => {
			const mockWhereCreator = vi.fn().mockResolvedValue([]);
			const mockFromCreator = vi
				.fn()
				.mockReturnValue({ where: mockWhereCreator });
			const mockSelectCreator = vi
				.fn()
				.mockReturnValue({ from: mockFromCreator });

			const mockWhereMembership = vi.fn().mockResolvedValue([]);
			const mockInnerJoinMembership = vi
				.fn()
				.mockReturnValue({ where: mockWhereMembership });
			const mockFromMembership = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinMembership });
			const mockSelectMembership = vi
				.fn()
				.mockReturnValue({ from: mockFromMembership });

			const mockWhereRoster = vi.fn().mockResolvedValue([]);
			const mockInnerJoinRoster = vi
				.fn()
				.mockReturnValue({ where: mockWhereRoster });
			const mockFromRoster = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinRoster });
			const mockSelectRoster = vi
				.fn()
				.mockReturnValue({ from: mockFromRoster });

			mockDbPg.select
				.mockReturnValueOnce(mockSelectCreator())
				.mockReturnValueOnce(mockSelectMembership())
				.mockReturnValueOnce(mockSelectRoster());

			const result = await hasLeadershipAccessCockroach(
				mockUserId,
				mockGroupId,
			);

			expect(result).toBe(false);
		});
	});

	describe("Error Handling", () => {
		it("should handle database errors gracefully", async () => {
			const mockWhereCreator = vi
				.fn()
				.mockRejectedValue(new Error("Database connection failed"));
			const mockFromCreator = vi
				.fn()
				.mockReturnValue({ where: mockWhereCreator });
			const mockSelectCreator = vi
				.fn()
				.mockReturnValue({ from: mockFromCreator });

			mockDbPg.select.mockReturnValueOnce(mockSelectCreator());

			// The function should handle errors and return a default result
			const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

			expect(result).toEqual({
				hasAccess: false,
				isCreator: false,
				hasSubteamMembership: false,
				hasRosterEntries: false,
				subteamRole: undefined,
				subteamMemberships: [],
				rosterSubteams: [],
			});
		});

		it("should handle empty results gracefully", async () => {
			const mockWhereCreator = vi.fn().mockResolvedValue([]);
			const mockFromCreator = vi
				.fn()
				.mockReturnValue({ where: mockWhereCreator });
			const mockSelectCreator = vi
				.fn()
				.mockReturnValue({ from: mockFromCreator });

			const mockWhereMembership = vi.fn().mockResolvedValue([]);
			const mockInnerJoinMembership = vi
				.fn()
				.mockReturnValue({ where: mockWhereMembership });
			const mockFromMembership = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinMembership });
			const mockSelectMembership = vi
				.fn()
				.mockReturnValue({ from: mockFromMembership });

			const mockWhereRoster = vi.fn().mockResolvedValue([]);
			const mockInnerJoinRoster = vi
				.fn()
				.mockReturnValue({ where: mockWhereRoster });
			const mockFromRoster = vi
				.fn()
				.mockReturnValue({ innerJoin: mockInnerJoinRoster });
			const mockSelectRoster = vi
				.fn()
				.mockReturnValue({ from: mockFromRoster });

			mockDbPg.select
				.mockReturnValueOnce(mockSelectCreator())
				.mockReturnValueOnce(mockSelectMembership())
				.mockReturnValueOnce(mockSelectRoster());

			const result = await getTeamAccessCockroach(mockUserId, mockGroupId);

			expect(result.hasAccess).toBe(false);
		});
	});
});
