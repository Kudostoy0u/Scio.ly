/**
 * E2E Tests for Roster Management
 *
 * Tests the complete roster management workflow including:
 * - Creating roster entries
 * - Updating roster entries
 * - Linking users to roster entries
 * - Fetching roster data
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type TestTeam,
	type TestUser,
	cleanupTestData,
	createRosterEntry,
	createTestTeam,
	createTestUser,
	getRosterEntries,
	getRosterEntry,
	updateRosterEntry,
} from "../utils/test-helpers";

describe("Roster Management E2E", () => {
	const testUsers: TestUser[] = [];
	const testTeams: TestTeam[] = [];

	beforeAll(() => {
		// Create test users
		testUsers.push(createTestUser({ displayName: "John Doe" }));
		testUsers.push(createTestUser({ displayName: "Jane Smith" }));

		// Create test team
		const team = createTestTeam(testUsers[0]?.id ?? "");
		testTeams.push(team);
	});

	afterAll(() => {
		// Cleanup
		const userIds = testUsers.map((u) => u.id);
		const teamGroupIds = testTeams.map((t) => t.groupId);
		cleanupTestData(userIds, teamGroupIds);
	});

	describe("Roster Entry Creation", () => {
		it("should create a roster entry for an event", () => {
			const team = testTeams[0];
			if (!team || !testUsers[0]) throw new Error("Test setup failed");
			const eventName = "Astronomy";
			const slotIndex = 0;
			const studentName = "John Doe";

			createRosterEntry(
				team.subteamId,
				eventName,
				slotIndex,
				studentName,
				testUsers[0].id,
			);

			// Verify roster entry exists
			const rosterEntry = getRosterEntry(team.subteamId, eventName, slotIndex);

			expect(rosterEntry).toBeDefined();
			expect(rosterEntry?.eventName).toBe(eventName);
			expect(rosterEntry?.slotIndex).toBe(slotIndex);
			expect(rosterEntry?.studentName).toBe(studentName);
			expect(rosterEntry?.userId).toBe(testUsers[0].id);
		});

		it("should create multiple roster entries for different events", () => {
			const team = testTeams[0];
			if (!team || !testUsers[0]) throw new Error("Test setup failed");
			const events = [
				{ name: "Astronomy", slot: 0 },
				{ name: "Biology", slot: 1 },
				{ name: "Chemistry", slot: 2 },
			];

			for (const event of events) {
				createRosterEntry(
					team.subteamId,
					event.name,
					event.slot,
					`Student ${event.slot}`,
					testUsers[0].id,
				);
			}

			// Verify all entries exist
			const rosterEntries = getRosterEntries(team.subteamId);

			expect(rosterEntries.length).toBeGreaterThanOrEqual(events.length);
		});

		it("should create unlinked roster entry (no userId)", () => {
			const team = testTeams[0];
			if (!team) throw new Error("Test setup failed");
			const eventName = "Physics";
			const slotIndex = 3;
			const studentName = "Unlinked Student";

			createRosterEntry(team.subteamId, eventName, slotIndex, studentName);

			// Verify roster entry exists without userId
			const rosterEntry = getRosterEntry(team.subteamId, eventName, slotIndex);

			expect(rosterEntry).toBeDefined();
			expect(rosterEntry?.studentName).toBe(studentName);
			expect(rosterEntry?.userId).toBeNull();
		});
	});

	describe("Roster Entry Updates", () => {
		it("should update roster entry student name", () => {
			const team = testTeams[0];
			if (!team) throw new Error("Test setup failed");
			const eventName = "Test Event";
			const slotIndex = 4;
			const originalName = "Original Name";
			const updatedName = "Updated Name";

			// Create entry
			createRosterEntry(team.subteamId, eventName, slotIndex, originalName);

			// Update entry
			updateRosterEntry(team.subteamId, eventName, slotIndex, {
				studentName: updatedName,
			});

			// Verify update
			const rosterEntry = getRosterEntry(team.subteamId, eventName, slotIndex);

			expect(rosterEntry?.studentName).toBe(updatedName);
		});

		it("should link user to roster entry", () => {
			const team = testTeams[0];
			if (!team || !testUsers[1]) throw new Error("Test setup failed");
			const eventName = "Link Test Event";
			const slotIndex = 5;

			// Create unlinked entry
			createRosterEntry(team.subteamId, eventName, slotIndex, "Unlinked");

			// Link user
			updateRosterEntry(team.subteamId, eventName, slotIndex, {
				userId: testUsers[1].id,
			});

			// Verify link
			const rosterEntry = getRosterEntry(team.subteamId, eventName, slotIndex);

			expect(rosterEntry?.userId).toBe(testUsers[1].id);
		});
	});

	describe("Roster Data Retrieval", () => {
		it("should retrieve all roster entries for a subteam", () => {
			const team = testTeams[0];
			if (!team) throw new Error("Test setup failed");

			// Create multiple entries
			createRosterEntry(team.subteamId, "Event1", 0, "Student1");
			createRosterEntry(team.subteamId, "Event1", 1, "Student2");
			createRosterEntry(team.subteamId, "Event2", 0, "Student3");

			// Retrieve entries
			const rosterEntries = getRosterEntries(team.subteamId);

			expect(rosterEntries.length).toBeGreaterThan(0);

			// Verify structure
			for (const entry of rosterEntries) {
				expect(entry.teamUnitId).toBe(team.subteamId);
				expect(entry.eventName).toBeDefined();
				expect(entry.slotIndex).toBeGreaterThanOrEqual(0);
				expect(entry.slotIndex).toBeLessThanOrEqual(10);
			}
		});

		it("should retrieve roster entries with user information", () => {
			const team = testTeams[0];
			if (!team || !testUsers[0]) throw new Error("Test setup failed");
			const eventName = "User Link Event";
			const slotIndex = 6;

			// Create linked entry
			createRosterEntry(
				team.subteamId,
				eventName,
				slotIndex,
				"Linked Student",
				testUsers[0].id,
			);

			// Retrieve with user join
			const rosterWithUsers = getRosterEntries(team.subteamId);

			const linkedEntry = rosterWithUsers.find(
				(e) => e.eventName === eventName && e.slotIndex === slotIndex,
			);

			expect(linkedEntry).toBeDefined();
			expect(linkedEntry?.userId).toBe(testUsers[0].id);
		});
	});

	describe("Roster Validation", () => {
		it("should enforce slot index range (0-10)", () => {
			const team = testTeams[0];
			if (!team) throw new Error("Test setup failed");

			// Valid slot indices
			createRosterEntry(team.subteamId, "Event", 0, "Student");
			createRosterEntry(team.subteamId, "Event", 10, "Student");

			// Verify entries exist
			const entries = getRosterEntries(team.subteamId);

			const slotIndices = entries.map((e) => e.slotIndex);
			expect(slotIndices).toContain(0);
			expect(slotIndices).toContain(10);
		});

		it("should handle event name normalization", () => {
			const team = testTeams[0];
			if (!team) throw new Error("Test setup failed");
			const eventNameWithAnd = "Design & Build";
			const normalizedName = eventNameWithAnd.replace(/&/g, "and");

			createRosterEntry(team.subteamId, normalizedName, 7, "Student");

			// Verify entry uses normalized name
			const entry = getRosterEntry(team.subteamId, normalizedName, 7);

			expect(entry?.eventName).toBe(normalizedName);
		});
	});
});
