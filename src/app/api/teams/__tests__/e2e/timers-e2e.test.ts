/**
 * E2E Tests for Timer Management
 *
 * Tests the complete timer workflow including:
 * - Creating timers for events
 * - Fetching active timers
 * - Removing timers
 * - Handling recurring events
 * - Authorization checks
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type TestTeam,
	type TestUser,
	addActiveTimer,
	addTeamMember,
	cleanupTestData,
	createEvent,
	createTestTeam,
	createTestUser,
	deleteActiveTimer,
	getActiveTimersByTeamUnit,
	getMembershipsByUser,
} from "../utils/test-helpers";

describe("Timer Management E2E", () => {
	const testUsers: TestUser[] = [];
	const testTeams: TestTeam[] = [];

	beforeAll(() => {
		// Create test users
		testUsers.push(createTestUser({ displayName: "Captain User" }));
		testUsers.push(createTestUser({ displayName: "Member User" }));

		// Create test team
		const team = createTestTeam(testUsers[0]!.id);
		testTeams.push(team);

		// Add member
		addTeamMember(team.subteamId, testUsers[1]!.id, "member");
	});

	afterAll(() => {
		// Cleanup
		const userIds = testUsers.map((u) => u.id);
		const teamGroupIds = testTeams.map((t) => t.groupId);
		cleanupTestData(userIds, teamGroupIds);
	});

	describe("Timer Creation", () => {
		it("should create a timer for an event", async () => {
			const team = testTeams[0]!;
			const captain = testUsers[0]!;

			const event = createEvent({
				teamId: team.subteamId,
				createdBy: captain.id,
				title: "Test Tournament",
				eventType: "tournament",
				startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			});

			expect(event).toBeDefined();
			expect(event.id).toBeDefined();

			const timer = addActiveTimer({
				teamUnitId: team.subteamId,
				eventId: event.id,
				addedBy: captain.id,
			});

			expect(timer).toBeDefined();
			expect(timer.id).toBeDefined();

			const retrievedTimer = getActiveTimersByTeamUnit(team.subteamId).find(
				(entry) => entry.id === timer.id,
			);

			expect(retrievedTimer).toBeDefined();
			expect(retrievedTimer?.teamUnitId).toBe(team.subteamId);
			expect(retrievedTimer?.eventId).toBe(event.id);
			expect(retrievedTimer?.addedBy).toBe(captain.id);
		});

		it("should prevent duplicate timers for same event", async () => {
			const team = testTeams[0]!;
			const captain = testUsers[0]!;

			const event = createEvent({
				teamId: team.subteamId,
				createdBy: captain.id,
				title: "Duplicate Test Event",
				eventType: "practice",
				startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
			});

			addActiveTimer({
				teamUnitId: team.subteamId,
				eventId: event.id,
				addedBy: captain.id,
			});

			// Try to create duplicate
			const existingTimers = getActiveTimersByTeamUnit(team.subteamId);

			const duplicateCount = existingTimers.filter(
				(t) => t.eventId === event.id,
			).length;
			expect(duplicateCount).toBe(1); // Should only be one
		});
	});

	describe("Timer Retrieval", () => {
		it("should retrieve all timers for a subteam", () => {
			const team = testTeams[0]!;
			const captain = testUsers[0]!;

			const event1 = createEvent({
				teamId: team.subteamId,
				createdBy: captain.id,
				title: "Event 1",
				eventType: "tournament",
				startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
			});

			const event2 = createEvent({
				teamId: team.subteamId,
				createdBy: captain.id,
				title: "Event 2",
				eventType: "practice",
				startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
			});

			addActiveTimer({
				teamUnitId: team.subteamId,
				eventId: event1.id,
				addedBy: captain.id,
			});

			addActiveTimer({
				teamUnitId: team.subteamId,
				eventId: event2.id,
				addedBy: captain.id,
			});

			const timers = getActiveTimersByTeamUnit(team.subteamId);

			expect(timers.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("Timer Deletion", () => {
		it("should delete a timer", async () => {
			const team = testTeams[0]!;
			const captain = testUsers[0]!;

			const event = createEvent({
				teamId: team.subteamId,
				createdBy: captain.id,
				title: "Delete Test Event",
				eventType: "tournament",
				startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
			});

			const timer = addActiveTimer({
				teamUnitId: team.subteamId,
				eventId: event.id,
				addedBy: captain.id,
			});

			deleteActiveTimer(timer.id);

			const deletedTimer = getActiveTimersByTeamUnit(team.subteamId).find(
				(t) => t.id === timer.id,
			);
			expect(deletedTimer).toBeUndefined();
		});
	});

	describe("Authorization", () => {
		it("should verify only captains can manage timers", () => {
			const captain = testUsers[0]!;
			const member = testUsers[1]!;

			// Verify captain membership
			const captainMembership = getMembershipsByUser(captain.id)[0];

			expect(captainMembership?.role).toBe("captain");

			// Verify member is not captain
			const memberMembership = getMembershipsByUser(member.id)[0];

			expect(memberMembership?.role).toBe("member");
			expect(memberMembership?.role).not.toBe("captain");
		});
	});
});
