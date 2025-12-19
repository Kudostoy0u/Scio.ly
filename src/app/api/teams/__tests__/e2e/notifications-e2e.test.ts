/**
 * E2E Tests for Notifications Management
 *
 * Tests the complete notification workflow including:
 * - Fetching notifications
 * - Marking notifications as read
 * - Deleting notifications
 * - Unread count tracking
 * - Filtering by read status
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type TestTeam,
	type TestUser,
	cleanupTestData,
	createTeamNotification,
	createTestTeam,
	createTestUser,
	deleteTeamNotification,
	getNotificationsByUser,
	getTeamNotificationById,
	updateTeamNotification,
} from "../utils/test-helpers";

describe("Notifications Management E2E", () => {
	const testUsers: TestUser[] = [];
	const testTeams: TestTeam[] = [];

	beforeAll(() => {
		// Create test users
		testUsers.push(createTestUser({ displayName: "Notification User" }));

		// Create test team
		const team = createTestTeam(testUsers[0]?.id ?? "");
		testTeams.push(team);
	});

	afterAll(() => {
		// Cleanup
		const userIds = testUsers.map((u) => u.id);
		const teamGroupIds = testTeams.map((t) => t.teamId);
		cleanupTestData(userIds, teamGroupIds);
	});

	describe("Notification Creation", () => {
		it("should create a notification", () => {
			const team = testTeams[0];
			const user = testUsers[0];
			if (!team || !user) throw new Error("Test setup failed");

			const notification = createTeamNotification({
				userId: user.id,
				teamId: team.subteamId,
				type: "invitation",
				title: "Test Notification",
				content: "You have been invited to join a team",
				isRead: false,
			});

			expect(notification).toBeDefined();
			expect(notification.id).toBeDefined();

			const retrievedNotification = getTeamNotificationById(notification.id);

			expect(retrievedNotification).toBeDefined();
			expect(retrievedNotification?.userId).toBe(user.id);
			expect(retrievedNotification?.isRead).toBe(false);
		});
	});

	describe("Notification Retrieval", () => {
		it("should retrieve notifications for a user", () => {
			const team = testTeams[0];
			const user = testUsers[0];
			if (!team || !user) throw new Error("Test setup failed");

			// Create multiple notifications
			createTeamNotification({
				userId: user.id,
				teamId: team.subteamId,
				type: "assignment",
				title: "New Assignment",
				content: "A new assignment has been created",
				isRead: false,
			});

			createTeamNotification({
				userId: user.id,
				teamId: team.subteamId,
				type: "event",
				title: "Upcoming Event",
				content: "You have an event coming up",
				isRead: true,
			});

			const notifications = getNotificationsByUser(user.id);

			expect(notifications.length).toBeGreaterThanOrEqual(2);
		});

		it("should filter unread notifications", async () => {
			const team = testTeams[0];
			const user = testUsers[0];
			if (!team || !user) throw new Error("Test setup failed");

			// Create read and unread notifications
			createTeamNotification({
				userId: user.id,
				teamId: team.subteamId,
				type: "message",
				title: "Unread Message",
				content: "This is unread",
				isRead: false,
			});

			const unreadNotifications = getNotificationsByUser(user.id);

			const unreadCount = unreadNotifications.filter((n) => !n.isRead).length;
			expect(unreadCount).toBeGreaterThanOrEqual(1);
		});
	});

	describe("Marking Notifications as Read", () => {
		it("should mark a notification as read", () => {
			const team = testTeams[0];
			const user = testUsers[0];
			if (!team || !user) throw new Error("Test setup failed");

			// Create unread notification
			const notification = createTeamNotification({
				userId: user.id,
				teamId: team.subteamId,
				type: "invitation",
				title: "Mark as Read Test",
				content: "This should be marked as read",
				isRead: false,
			});

			updateTeamNotification(notification.id, {
				isRead: true,
			});

			const updatedNotification = getTeamNotificationById(notification.id);

			expect(updatedNotification?.isRead).toBe(true);
		});
	});

	describe("Deleting Notifications", () => {
		it("should delete a notification", () => {
			const team = testTeams[0];
			const user = testUsers[0];
			if (!team || !user) throw new Error("Test setup failed");

			// Create notification
			const notification = createTeamNotification({
				userId: user.id,
				teamId: team.subteamId,
				type: "invitation",
				title: "Delete Test",
				content: "This should be deleted",
				isRead: false,
			});

			deleteTeamNotification(notification.id);

			const deletedNotification = getTeamNotificationById(notification.id);

			expect(deletedNotification).toBeUndefined();
		});
	});
});
