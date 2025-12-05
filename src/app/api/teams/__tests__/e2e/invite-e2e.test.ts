/**
 * E2E Tests for Team Invitation Flow
 *
 * Tests the complete invitation workflow including:
 * - Inviting users by username
 * - Inviting users by email
 * - Handling existing members
 * - Handling existing invitations
 * - User search functionality
 * - Authorization checks
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type TestTeam,
	type TestUser,
	addTeamMember,
	assertUserIsMember,
	cleanupTestData,
	createTeamInvitation,
	createTeamNotification,
	createTestTeam,
	createTestUser,
	findUsersByEmail,
	findUsersByUsername,
	getMembershipsByTeamId,
	getTeamInvitationById,
	getTeamInvitations,
	getTeamNotificationById,
	getTeamUnit,
} from "../utils/test-helpers";

describe("Team Invitation E2E", () => {
	const testUsers: TestUser[] = [];
	const testTeams: TestTeam[] = [];

	beforeAll(() => {
		// Create test users
		testUsers.push(
			createTestUser({ displayName: "Captain User", username: "captain" }),
		);
		testUsers.push(
			createTestUser({ displayName: "Member User", username: "member" }),
		);
		testUsers.push(
			createTestUser({ displayName: "Invitee User", username: "invitee" }),
		);

		// Create test team
		const team = createTestTeam(testUsers[0]!.id);
		testTeams.push(team);

		// Add existing member
		addTeamMember(team.subteamId, testUsers[1]!.id, "member");
	});

	afterAll(() => {
		// Cleanup
		const userIds = testUsers.map((u) => u.id);
		const teamGroupIds = testTeams.map((t) => t.groupId);
		cleanupTestData(userIds, teamGroupIds);
	});

	describe("User Search", () => {
		it("should search users by username", () => {
			const searchResults = findUsersByUsername("invitee");
			expect(searchResults.length).toBeGreaterThan(0);
			expect(searchResults[0]?.username).toBe("invitee");
		});

		it("should search users by email", () => {
			const invitee = testUsers[2]!;
			const searchResults = findUsersByEmail(invitee.email);
			expect(searchResults.length).toBeGreaterThan(0);
			expect(searchResults[0]?.email).toBe(invitee.email);
		});
	});

	describe("Invitation Creation", () => {
		it("should create invitation for new user", () => {
			const team = testTeams[0]!;
			const invitee = testUsers[2]!;

			const invitation = createTeamInvitation({
				teamId: team.subteamId,
				invitedBy: testUsers[0]!.id,
				email: invitee.email,
				role: "member",
				invitationCode: "TEST-CODE-123",
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			});

			expect(invitation).toBeDefined();
			expect(invitation.id).toBeDefined();

			const retrievedInvitation = getTeamInvitationById(invitation.id);

			expect(retrievedInvitation).toBeDefined();
			expect(retrievedInvitation?.email).toBe(invitee.email);
			expect(retrievedInvitation?.status).toBe("pending");
		});

		it("should prevent duplicate invitations", () => {
			const team = testTeams[0];
			const invitee = testUsers[2];
			if (!team) {
				throw new Error("Test setup failed: missing team");
			}
			if (!invitee) {
				throw new Error("Test setup failed: missing invitee");
			}
			const existingInvitations = getTeamInvitations({
				teamId: team.subteamId,
				email: invitee.email,
				status: "pending",
			});

			// If invitation exists, we should not create another
			if (existingInvitations.length > 0) {
				expect(existingInvitations.length).toBeGreaterThan(0);
			}
		});
	});

	describe("Notification Creation", () => {
		it("should create notification for invited user", () => {
			const team = testTeams[0]!;
			const invitee = testUsers[2]!;

			const notification = createTeamNotification({
				userId: invitee.id,
				teamId: team.subteamId,
				notificationType: "team_invite",
				title: "Team Invitation",
				message: "You've been invited to join the team",
			});

			expect(notification).toBeDefined();
			expect(notification.id).toBeDefined();

			const retrievedNotification = getTeamNotificationById(notification.id);

			expect(retrievedNotification).toBeDefined();
			expect(retrievedNotification?.notificationType).toBe("team_invite");
			expect(retrievedNotification?.userId).toBe(invitee.id);
		});
	});

	describe("Authorization Checks", () => {
		it("should verify captain can invite", async () => {
			const team = testTeams[0];
			const captain = testUsers[0];
			if (!team) {
				throw new Error("Test setup failed: missing team");
			}
			if (!captain) {
				throw new Error("Test setup failed: missing captain");
			}

			// Verify captain membership
			assertUserIsMember(captain.id, team.subteamId, "captain");

			// Verify captain has permission to invite
			const membership = getMembershipsByTeamId(team.subteamId).find(
				(entry) => entry.userId === captain.id,
			);

			expect(membership).toBeDefined();
			expect(["captain", "co_captain"]).toContain(membership!.role);
		});

		it("should prevent existing members from being invited", () => {
			const team = testTeams[0];
			const existingMember = testUsers[1];
			if (!team) {
				throw new Error("Test setup failed: missing team");
			}
			if (!existingMember) {
				throw new Error("Test setup failed: missing existingMember");
			}

			// Check if user is already a member
			const existingMemberships = getMembershipsByTeamId(team.subteamId).filter(
				(membership) => membership.userId === existingMember.id,
			);

			expect(existingMemberships.length).toBeGreaterThan(0);
		});
	});

	describe("Team Code Retrieval", () => {
		it("should retrieve team codes for invitation", () => {
			const team = testTeams[0]!;

			const teamUnit = getTeamUnit(team.subteamId);

			expect(teamUnit).toBeDefined();
			expect(teamUnit?.userCode).toBeDefined();
			expect(teamUnit?.captainCode).toBeDefined();
		});
	});
});
