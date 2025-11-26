import { RosterNotificationService } from "@/lib/services/roster-notifications";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/cockroachdb", () => ({
  queryCockroachDB: vi.fn(),
}));

import { queryCockroachDB } from "@/lib/cockroachdb";

const mockQueryCockroachDb = vi.mocked(queryCockroachDB);

describe("RosterNotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("notifyRosterNameAdded", () => {
    it("should create a notification when a roster name is added", async () => {
      const userId = "user-123";
      const data = {
        studentName: "John Doe",
        eventName: "Anatomy & Physiology",
        action: "added" as const,
        teamSlug: "team-slug",
        subteamId: "subteam-123",
      };

      await RosterNotificationService.notifyRosterNameAdded(userId, data);

      expect(mockQueryCockroachDb).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO new_team_notifications"),
        expect.arrayContaining([
          userId,
          data.subteamId,
          "roster_name_added",
          "Roster Name Added",
          expect.stringContaining("John Doe"),
          expect.any(String),
        ])
      );
    });

    it("should handle errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Intentionally empty - suppress console.error for this test
      });
      mockQueryCockroachDb.mockRejectedValueOnce(new Error("Database error"));

      const userId = "user-123";
      const data = {
        studentName: "John Doe",
        action: "added" as const,
        teamSlug: "team-slug",
        subteamId: "subteam-123",
      };

      await RosterNotificationService.notifyRosterNameAdded(userId, data);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error creating roster name added notification:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("notifyRosterNameLinked", () => {
    it("should create a notification when a roster name is linked", async () => {
      const userId = "user-123";
      const data = {
        studentName: "John Doe",
        action: "linked" as const,
        linkedBy: "user-456",
        teamSlug: "team-slug",
        subteamId: "subteam-123",
      };

      await RosterNotificationService.notifyRosterNameLinked(userId, data);

      expect(mockQueryCockroachDb).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO new_team_notifications"),
        expect.arrayContaining([
          userId,
          data.subteamId,
          "roster_name_linked",
          "Roster Name Linked",
          expect.stringContaining("John Doe"),
          expect.any(String),
        ])
      );
    });
  });

  describe("notifyRosterInvitation", () => {
    it("should create a notification when a user is invited to link to a roster name", async () => {
      const userId = "user-123";
      const data = {
        studentName: "John Doe",
        action: "invited" as const,
        inviterName: "captain@example.com",
        teamSlug: "team-slug",
        subteamId: "subteam-123",
      };

      await RosterNotificationService.notifyRosterInvitation(userId, data);

      expect(mockQueryCockroachDb).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO new_team_notifications"),
        expect.arrayContaining([
          userId,
          data.subteamId,
          "roster_invitation",
          "Roster Invitation",
          expect.stringContaining("John Doe"),
          expect.any(String),
        ])
      );
    });
  });

  describe("getRosterNotifications", () => {
    it("should fetch roster notifications for a user", async () => {
      const userId = "user-123";
      const mockNotifications = [
        {
          id: "notif-1",
          notification_type: "roster_name_linked",
          title: "Roster Name Linked",
          message: '"John Doe" has been linked to your account',
          data: { student_name: "John Doe" },
          created_at: "2024-01-01T00:00:00Z",
          is_read: false,
        },
      ];

      mockQueryCockroachDb.mockResolvedValueOnce({
        rows: mockNotifications,
      });

      const result = await RosterNotificationService.getRosterNotifications(userId, 10);

      expect(mockQueryCockroachDb).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT id, notification_type, title, message, data, created_at, is_read"
        ),
        [userId, 10]
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("notif-1");
      expect(result[0].type).toBe("roster_name_linked");
    });

    it("should return empty array on error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
        // Intentionally empty - suppress console.error for this test
      });
      mockQueryCockroachDb.mockRejectedValueOnce(new Error("Database error"));

      const result = await RosterNotificationService.getRosterNotifications("user-123");

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching roster notifications:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("markRosterNotificationsAsRead", () => {
    it("should mark specific notifications as read", async () => {
      const userId = "user-123";
      const notificationIds = ["notif-1", "notif-2"];

      await RosterNotificationService.markRosterNotificationsAsRead(userId, notificationIds);

      expect(mockQueryCockroachDb).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE new_team_notifications"),
        [userId, notificationIds]
      );
    });
  });

  describe("clearRosterNotifications", () => {
    it("should clear all roster notifications for a user", async () => {
      const userId = "user-123";

      await RosterNotificationService.clearRosterNotifications(userId);

      expect(mockQueryCockroachDb).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM new_team_notifications"),
        [userId]
      );
    });
  });
});
