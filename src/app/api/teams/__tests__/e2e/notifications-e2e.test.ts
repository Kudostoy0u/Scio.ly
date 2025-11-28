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

  beforeAll(async () => {
    // Create test users
    testUsers.push(await createTestUser({ displayName: "Notification User" }));

    // Create test team
    const team = await createTestTeam(testUsers[0].id);
    testTeams.push(team);
  });

  afterAll(async () => {
    // Cleanup
    const userIds = testUsers.map((u) => u.id);
    const teamGroupIds = testTeams.map((t) => t.groupId);
    await cleanupTestData(userIds, teamGroupIds);
  });

  describe("Notification Creation", () => {
    it("should create a notification", async () => {
      const team = testTeams[0];
      const user = testUsers[0];

      const notification = createTeamNotification({
        userId: user.id,
        teamId: team.subteamId,
        notificationType: "invitation",
        title: "Test Notification",
        message: "You have been invited to join a team",
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
    it("should retrieve notifications for a user", async () => {
      const team = testTeams[0];
      const user = testUsers[0];

      // Create multiple notifications
      createTeamNotification({
        userId: user.id,
        teamId: team.subteamId,
        notificationType: "assignment",
        title: "New Assignment",
        message: "A new assignment has been created",
        isRead: false,
      });

      createTeamNotification({
        userId: user.id,
        teamId: team.subteamId,
        notificationType: "event",
        title: "Upcoming Event",
        message: "You have an event coming up",
        isRead: true,
      });

      const notifications = getNotificationsByUser(user.id);

      expect(notifications.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter unread notifications", async () => {
      const team = testTeams[0];
      const user = testUsers[0];

      // Create read and unread notifications
      createTeamNotification({
        userId: user.id,
        teamId: team.subteamId,
        notificationType: "message",
        title: "Unread Message",
        message: "This is unread",
        isRead: false,
      });

      const unreadNotifications = getNotificationsByUser(user.id);

      const unreadCount = unreadNotifications.filter((n) => !n.isRead).length;
      expect(unreadCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Marking Notifications as Read", () => {
    it("should mark a notification as read", async () => {
      const team = testTeams[0];
      const user = testUsers[0];

      // Create unread notification
      const notification = createTeamNotification({
        userId: user.id,
        teamId: team.subteamId,
        notificationType: "invitation",
        title: "Mark as Read Test",
        message: "This should be marked as read",
        isRead: false,
      });

      updateTeamNotification(notification.id, { isRead: true, readAt: new Date() });

      const updatedNotification = getTeamNotificationById(notification.id);

      expect(updatedNotification?.isRead).toBe(true);
      expect(updatedNotification?.readAt).toBeDefined();
    });
  });

  describe("Deleting Notifications", () => {
    it("should delete a notification", async () => {
      const team = testTeams[0];
      const user = testUsers[0];

      // Create notification
      const notification = createTeamNotification({
        userId: user.id,
        teamId: team.subteamId,
        notificationType: "invitation",
        title: "Delete Test",
        message: "This should be deleted",
        isRead: false,
      });

      deleteTeamNotification(notification.id);

      const deletedNotification = getTeamNotificationById(notification.id);

      expect(deletedNotification).toBeUndefined();
    });
  });
});
