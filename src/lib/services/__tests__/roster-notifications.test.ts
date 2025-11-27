import { RosterNotificationService } from "@/lib/services/roster-notifications";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/db/index", () => ({
  dbPg: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { dbPg } from "@/lib/db/index";

const mockDbPg = vi.mocked(dbPg);

describe("RosterNotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("notifyRosterNameAdded", () => {
    it("should create a notification when a roster name is added", async () => {
      const mockValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      });
      mockDbPg.insert = vi.fn().mockReturnValue({
        values: mockValues,
      });

      const userId = "user-123";
      const data = {
        studentName: "John Doe",
        eventName: "Anatomy & Physiology",
        action: "added" as const,
        teamSlug: "team-slug",
        subteamId: "subteam-123",
      };

      await RosterNotificationService.notifyRosterNameAdded(userId, data);

      expect(mockDbPg.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          teamId: data.subteamId,
          notificationType: "roster_name_added",
          title: "Roster Name Added",
          message: expect.stringContaining("John Doe"),
        })
      );
    });

    it("should handle errors gracefully", async () => {
      const mockValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue(new Error("Database error")),
      });
      mockDbPg.insert = vi.fn().mockReturnValue({
        values: mockValues,
      });

      const userId = "user-123";
      const data = {
        studentName: "John Doe",
        action: "added" as const,
        teamSlug: "team-slug",
        subteamId: "subteam-123",
      };

      await RosterNotificationService.notifyRosterNameAdded(userId, data);

      // Error should be caught and logged internally
      expect(mockDbPg.insert).toHaveBeenCalled();
    });
  });

  describe("notifyRosterNameLinked", () => {
    it("should create a notification when a roster name is linked", async () => {
      const mockValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      });
      mockDbPg.insert = vi.fn().mockReturnValue({
        values: mockValues,
      });

      const userId = "user-123";
      const data = {
        studentName: "John Doe",
        action: "linked" as const,
        linkedBy: "user-456",
        teamSlug: "team-slug",
        subteamId: "subteam-123",
      };

      await RosterNotificationService.notifyRosterNameLinked(userId, data);

      expect(mockDbPg.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          teamId: data.subteamId,
          notificationType: "roster_name_linked",
          title: "Roster Name Linked",
          message: expect.stringContaining("John Doe"),
        })
      );
    });
  });

  describe("notifyRosterInvitation", () => {
    it("should create a notification when a user is invited to link to a roster name", async () => {
      const mockValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      });
      mockDbPg.insert = vi.fn().mockReturnValue({
        values: mockValues,
      });

      const userId = "user-123";
      const data = {
        studentName: "John Doe",
        action: "invited" as const,
        inviterName: "captain@example.com",
        teamSlug: "team-slug",
        subteamId: "subteam-123",
      };

      await RosterNotificationService.notifyRosterInvitation(userId, data);

      expect(mockDbPg.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          teamId: data.subteamId,
          notificationType: "roster_invitation",
          title: "Roster Invitation",
          message: expect.stringContaining("John Doe"),
        })
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
          created_at: new Date("2024-01-01T00:00:00Z"),
          is_read: false,
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue(mockNotifications);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      mockDbPg.select = mockSelect;

      const result = await RosterNotificationService.getRosterNotifications(userId, 10);

      expect(mockDbPg.select).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("notif-1");
      expect(result[0].type).toBe("roster_name_linked");
    });

    it("should return empty array on error", async () => {
      const mockLimit = vi.fn().mockRejectedValue(new Error("Database error"));
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      mockDbPg.select = mockSelect;

      const result = await RosterNotificationService.getRosterNotifications("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("markRosterNotificationsAsRead", () => {
    it("should mark specific notifications as read", async () => {
      const mockWhere = vi.fn().mockResolvedValue([]);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

      mockDbPg.update = mockUpdate;

      const userId = "user-123";
      const notificationIds = ["notif-1", "notif-2"];

      await RosterNotificationService.markRosterNotificationsAsRead(userId, notificationIds);

      expect(mockDbPg.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({
        isRead: true,
        readAt: expect.any(Date),
      });
    });
  });

  describe("clearRosterNotifications", () => {
    it("should clear all roster notifications for a user", async () => {
      const mockWhere = vi.fn().mockResolvedValue([]);
      const mockDelete = vi.fn().mockReturnValue({ where: mockWhere });

      mockDbPg.delete = mockDelete;

      const userId = "user-123";

      await RosterNotificationService.clearRosterNotifications(userId);

      expect(mockDbPg.delete).toHaveBeenCalled();
    });
  });
});
