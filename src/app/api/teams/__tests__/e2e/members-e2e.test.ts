/**
 * E2E Tests for Team Members Management
 *
 * Tests the complete member management workflow including:
 * - Fetching team members
 * - Member roles and permissions
 * - Linked and unlinked roster entries
 * - Member display information
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type TestTeam,
	type TestUser,
	addTeamMember,
	assertUserIsMember,
	cleanupTestData,
	createRosterEntry,
	createTestTeam,
	createTestUser,
	getMembershipsByGroupId,
	getMembershipsByTeamId,
	getMembershipsByUser,
	getRosterEntries,
} from "../utils/test-helpers";

describe("Team Members E2E", () => {
	const testUsers: TestUser[] = [];
	const testTeams: TestTeam[] = [];

	beforeAll(() => {
		// Create test users
		testUsers.push(createTestUser({ displayName: "Captain User" }));
		testUsers.push(createTestUser({ displayName: "Member User" }));
		testUsers.push(createTestUser({ displayName: "Co-Captain User" }));

		// Create test team
		const team = createTestTeam(testUsers[0]?.id ?? "");
		testTeams.push(team);

		// Add members
		addTeamMember(team.subteamId, testUsers[1]?.id ?? "", "member");
		addTeamMember(team.subteamId, testUsers[2]?.id ?? "", "co_captain");
	});

	afterAll(() => {
		// Cleanup
		const userIds = testUsers.map((u) => u.id);
		const teamGroupIds = testTeams.map((t) => t.groupId);
		cleanupTestData(userIds, teamGroupIds);
	});

	describe("Member Retrieval", () => {
		it("should retrieve all team members with correct roles", async () => {
			const team = testTeams[0];
			if (!team) throw new Error("Test setup failed");

			// Get all memberships
			const memberships = getMembershipsByGroupId(team.groupId);

			expect(memberships.length).toBeGreaterThanOrEqual(3); // Captain + Member + Co-Captain

			// Verify roles
			const roles = memberships.map((m) => m.role);
			expect(roles).toContain("captain");
			expect(roles).toContain("member");
			expect(roles).toContain("co_captain");
		});

		it("should retrieve members for specific subteam", () => {
			const team = testTeams[0];
			if (!team) throw new Error("Test setup failed");

			// Get members for specific subteam
			const memberships = getMembershipsByTeamId(team.subteamId);

			expect(memberships.length).toBe(3); // Captain + Member + Co-Captain
		});
	});

	describe("Member Roles", () => {
		it("should have captain as team creator", () => {
			const team = testTeams[0];
			const captain = testUsers[0];
			if (!team || !captain) throw new Error("Test setup failed");

			assertUserIsMember(captain.id, team.subteamId, "captain");
		});

		it("should allow multiple roles in same team", () => {
			const team = testTeams[0];
			if (!team) throw new Error("Test setup failed");

			// Verify different roles exist
			const memberships = getMembershipsByTeamId(team.subteamId);

			const roles = new Set(memberships.map((m) => m.role));
			expect(roles.size).toBeGreaterThan(1);
		});
	});

	describe("Linked Roster Entries", () => {
		it("should link roster entries to team members", () => {
			const team = testTeams[0];
			const member = testUsers[1];
			if (!team || !member) throw new Error("Test setup failed");

			// Create linked roster entry
			createRosterEntry(
				team.subteamId,
				"Astronomy",
				0,
				"Member User",
				member.id,
			);

			// Verify link
			const [rosterEntry] = getRosterEntries(team.subteamId);

			expect(rosterEntry).toBeDefined();
			expect(rosterEntry?.userId).toBe(member.id);
			expect(rosterEntry?.studentName).toBe("Member User");
		});

		it("should handle unlinked roster entries", async () => {
			const team = testTeams[0];
			if (!team) throw new Error("Test setup failed");

			// Create unlinked roster entry
			createRosterEntry(team.subteamId, "Biology", 1, "Unlinked Student");

			// Verify entry exists without userId
			const rosterEntries = getRosterEntries(team.subteamId);

			const unlinkedEntry = rosterEntries.find(
				(e) => e.eventName === "Biology" && e.userId === null,
			);

			expect(unlinkedEntry).toBeDefined();
			expect(unlinkedEntry?.userId).toBeNull();
		});
	});

	describe("Member Display Information", () => {
		it("should retrieve member display names correctly", () => {
			const member = testUsers[1];
			if (!member) throw new Error("Test setup failed");

			// Get member with user profile
			const membership = getMembershipsByUser(member.id)[0];

			expect(membership).toBeDefined();
			expect(membership?.userId).toBe(member.id);
			expect(membership?.role).toBe("member");
		});
	});

	describe("Member Status", () => {
		it("should only retrieve active members", () => {
			const team = testTeams[0];
			if (!team) throw new Error("Test setup failed");

			// Get only active memberships
			const activeMemberships = getMembershipsByTeamId(team.subteamId);

			// All should be active
			for (const membership of activeMemberships) {
				expect(membership.status).toBe("active");
			}
		});
	});
});
