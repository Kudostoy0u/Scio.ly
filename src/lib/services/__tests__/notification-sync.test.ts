import { queryCockroachDB } from "@/lib/cockroachdb";
import { NotificationSyncService } from "@/lib/services/notification-sync";
import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/cockroachdb");
vi.mock("@supabase/supabase-js");

const mockQueryCockroachDb = vi.mocked(queryCockroachDB);
const mockCreateClient = vi.mocked(createClient);

describe("NotificationSyncService", () => {
  const mockUpsert = vi.fn();
  // const _mockUpdate = vi.fn();
  const mockEq = vi.fn();

  // Create a chainable mock for eq
  const createEqMock = () => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  const mockSupabaseClient = {
    from: vi.fn().mockReturnValue({
      upsert: mockUpsert,
      update: vi.fn().mockReturnValue(createEqMock()),
      eq: mockEq,
    }),
  };

  const mockNotification = {
    id: "notification-123",
    notification_type: "team_invitation",
    title: "Team Invitation",
    message: "You've been invited to join a team",
    data: { invitation_id: "invitation-123" },
    is_read: false,
    created_at: "2024-01-01T00:00:00Z",
    read_at: null,
    user_id: "user-123",
    team_id: "team-123",
    team_name: "Test Team",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up environment
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "test-service-key";

    // Mock Supabase client
    mockCreateClient.mockReturnValue(mockSupabaseClient as ReturnType<typeof createClient>);

    // Default mocks
    mockQueryCockroachDb.mockResolvedValue({ rows: [] });
    mockUpsert.mockResolvedValue({ error: null });
    mockEq.mockReturnValue(createEqMock());
  });

  afterEach(() => {
    // Restore environment variables if they were set
    if (process.env.NEXT_PUBLIC_SUPABASE_URL === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (process.env.SUPABASE_SERVICE_KEY === undefined) {
      delete process.env.SUPABASE_SERVICE_KEY;
    }
    // Reset to test values
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "test-service-key";
  });

  describe("syncNotificationToSupabase", () => {
    it("should sync notification successfully", async () => {
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: [mockNotification] });
      mockUpsert.mockResolvedValueOnce({ error: null });

      await NotificationSyncService.syncNotificationToSupabase("notification-123");

      expect(mockQueryCockroachDb).toHaveBeenCalledWith(expect.stringContaining("SELECT"), [
        "notification-123",
      ]);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("notifications");
      expect(mockUpsert).toHaveBeenCalledWith({
        id: mockNotification.id,
        user_id: mockNotification.user_id,
        notification_type: mockNotification.notification_type,
        title: mockNotification.title,
        message: mockNotification.message,
        data: mockNotification.data,
        is_read: mockNotification.is_read,
        created_at: mockNotification.created_at,
        read_at: mockNotification.read_at,
        team_id: mockNotification.team_id,
        team_name: mockNotification.team_name,
      });
    });

    it("should handle notification not found", async () => {
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: [] });

      await NotificationSyncService.syncNotificationToSupabase("nonexistent-notification");

      expect(mockQueryCockroachDb).toHaveBeenCalledWith(expect.stringContaining("SELECT"), [
        "nonexistent-notification",
      ]);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it("should throw error if Supabase service key is missing", async () => {
      delete process.env.SUPABASE_SERVICE_KEY;
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: [mockNotification] });

      await expect(
        NotificationSyncService.syncNotificationToSupabase("notification-123")
      ).rejects.toThrow("Supabase server client not available. SUPABASE_SERVICE_KEY is required.");
    });

    it("should throw error if Supabase upsert fails", async () => {
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: [mockNotification] });
      mockUpsert.mockResolvedValueOnce({
        error: { message: "Upsert failed" },
      });

      await expect(
        NotificationSyncService.syncNotificationToSupabase("notification-123")
      ).rejects.toThrow();
    });

    it("should throw error if database query fails", async () => {
      mockQueryCockroachDb.mockRejectedValue(new Error("Database error"));

      await expect(
        NotificationSyncService.syncNotificationToSupabase("notification-123")
      ).rejects.toThrow("Database error");
    });
  });

  describe("syncUserNotificationsToSupabase", () => {
    const mockNotifications = [
      mockNotification,
      {
        ...mockNotification,
        id: "notification-456",
        title: "Another Notification",
      },
    ];

    it("should sync all user notifications successfully", async () => {
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: mockNotifications });
      mockUpsert.mockResolvedValueOnce({ error: null });

      await NotificationSyncService.syncUserNotificationsToSupabase("user-123");

      expect(mockQueryCockroachDb).toHaveBeenCalledWith(expect.stringContaining("SELECT"), [
        "user-123",
      ]);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("notifications");
      expect(mockUpsert).toHaveBeenCalledWith(
        mockNotifications.map((notification) => ({
          id: notification.id,
          user_id: notification.user_id,
          notification_type: notification.notification_type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          is_read: notification.is_read,
          created_at: notification.created_at,
          read_at: notification.read_at,
          team_id: notification.team_id,
          team_name: notification.team_name,
        }))
      );
    });

    it("should handle no notifications found", async () => {
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: [] });

      await NotificationSyncService.syncUserNotificationsToSupabase("user-123");

      expect(mockQueryCockroachDb).toHaveBeenCalledWith(expect.stringContaining("SELECT"), [
        "user-123",
      ]);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it("should throw error if Supabase service key is missing", async () => {
      delete process.env.SUPABASE_SERVICE_KEY;
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: mockNotifications });

      await expect(
        NotificationSyncService.syncUserNotificationsToSupabase("user-123")
      ).rejects.toThrow("Supabase server client not available. SUPABASE_SERVICE_KEY is required.");
    });

    it("should throw error if Supabase upsert fails", async () => {
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: mockNotifications });
      mockUpsert.mockResolvedValueOnce({
        error: { message: "Upsert failed" },
      });

      await expect(
        NotificationSyncService.syncUserNotificationsToSupabase("user-123")
      ).rejects.toThrow();
    });
  });

  describe("markNotificationAsRead", () => {
    it("should mark notification as read successfully", async () => {
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: [] }); // update in CockroachDB

      // Mock the chain: from().update().eq().eq()
      const mockEqChain = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateChain = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockEqChain,
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: mockUpdateChain,
      });

      await NotificationSyncService.markNotificationAsRead("notification-123", "user-123");

      expect(mockQueryCockroachDb).toHaveBeenCalledWith(expect.stringContaining("UPDATE"), [
        expect.any(String),
        "notification-123",
        "user-123",
      ]);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("notifications");
    });

    it("should throw error if Supabase service key is missing", async () => {
      delete process.env.SUPABASE_SERVICE_KEY;

      await expect(
        NotificationSyncService.markNotificationAsRead("notification-123", "user-123")
      ).rejects.toThrow("Supabase server client not available. SUPABASE_SERVICE_KEY is required.");
    });

    it("should throw error if Supabase update fails", async () => {
      mockQueryCockroachDb.mockResolvedValueOnce({ rows: [] });

      // Mock the chain: from().update().eq().eq()
      const mockEqChain = vi.fn().mockResolvedValue({
        error: { message: "Update failed" },
      });
      const mockUpdateChain = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockEqChain,
        }),
      });

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: mockUpdateChain,
      });

      await expect(
        NotificationSyncService.markNotificationAsRead("notification-123", "user-123")
      ).rejects.toThrow();
    });

    it("should throw error if database update fails", async () => {
      mockQueryCockroachDb.mockRejectedValue(new Error("Database error"));

      await expect(
        NotificationSyncService.markNotificationAsRead("notification-123", "user-123")
      ).rejects.toThrow("Database error");
    });
  });
});
