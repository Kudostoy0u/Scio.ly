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

import { dbPg } from "@/lib/db";
import { newTeamNotifications } from "@/lib/db/schema/notifications";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type TestTeam,
  type TestUser,
  cleanupTestData,
  createTestTeam,
  createTestUser,
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

      // Create notification
      const [notification] = await dbPg
        .insert(newTeamNotifications)
        .values({
          userId: user.id,
          teamId: team.subteamId,
          notificationType: "invitation",
          title: "Test Notification",
          message: "You have been invited to join a team",
          isRead: false,
        })
        .returning({ id: newTeamNotifications.id });

      expect(notification).toBeDefined();
      expect(notification?.id).toBeDefined();

      // Verify notification exists
      const [retrievedNotification] = await dbPg
        .select()
        .from(newTeamNotifications)
        .where(eq(newTeamNotifications.id, notification.id));

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
      await dbPg.insert(newTeamNotifications).values({
        userId: user.id,
        teamId: team.subteamId,
        notificationType: "assignment",
        title: "New Assignment",
        message: "A new assignment has been created",
        isRead: false,
      });

      await dbPg.insert(newTeamNotifications).values({
        userId: user.id,
        teamId: team.subteamId,
        notificationType: "event",
        title: "Upcoming Event",
        message: "You have an event coming up",
        isRead: true,
      });

      // Retrieve notifications
      const notifications = await dbPg
        .select()
        .from(newTeamNotifications)
        .where(eq(newTeamNotifications.userId, user.id));

      expect(notifications.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter unread notifications", async () => {
      const team = testTeams[0];
      const user = testUsers[0];

      // Create read and unread notifications
      await dbPg.insert(newTeamNotifications).values({
        userId: user.id,
        teamId: team.subteamId,
        notificationType: "message",
        title: "Unread Message",
        message: "This is unread",
        isRead: false,
      });

      // Retrieve only unread notifications
      const unreadNotifications = await dbPg
        .select()
        .from(newTeamNotifications)
        .where(eq(newTeamNotifications.userId, user.id));

      const unreadCount = unreadNotifications.filter((n) => !n.isRead).length;
      expect(unreadCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Marking Notifications as Read", () => {
    it("should mark a notification as read", async () => {
      const team = testTeams[0];
      const user = testUsers[0];

      // Create unread notification
      const [notification] = await dbPg
        .insert(newTeamNotifications)
        .values({
          userId: user.id,
          teamId: team.subteamId,
          notificationType: "invitation",
          title: "Mark as Read Test",
          message: "This should be marked as read",
          isRead: false,
        })
        .returning({ id: newTeamNotifications.id });

      // Mark as read
      await dbPg
        .update(newTeamNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(newTeamNotifications.id, notification.id));

      // Verify it's marked as read
      const [updatedNotification] = await dbPg
        .select()
        .from(newTeamNotifications)
        .where(eq(newTeamNotifications.id, notification.id));

      expect(updatedNotification?.isRead).toBe(true);
      expect(updatedNotification?.readAt).toBeDefined();
    });
  });

  describe("Deleting Notifications", () => {
    it("should delete a notification", async () => {
      const team = testTeams[0];
      const user = testUsers[0];

      // Create notification
      const [notification] = await dbPg
        .insert(newTeamNotifications)
        .values({
          userId: user.id,
          teamId: team.subteamId,
          notificationType: "invitation",
          title: "Delete Test",
          message: "This should be deleted",
          isRead: false,
        })
        .returning({ id: newTeamNotifications.id });

      // Delete notification
      await dbPg.delete(newTeamNotifications).where(eq(newTeamNotifications.id, notification.id));

      // Verify deletion
      const [deletedNotification] = await dbPg
        .select()
        .from(newTeamNotifications)
        .where(eq(newTeamNotifications.id, notification.id));

      expect(deletedNotification).toBeUndefined();
    });
  });
});
