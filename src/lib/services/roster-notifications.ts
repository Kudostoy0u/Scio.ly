import { dbPg } from "@/lib/db/index";
import { newTeamNotifications } from "@/lib/db/schema/notifications";
import logger from "@/lib/utils/logger";
import { and, desc, eq, inArray } from "drizzle-orm";

/**
 * Data structure for roster notification information
 * Contains all necessary details for creating roster-related notifications
 */
export interface RosterNotificationData {
  /** Name of the student being added/removed/linked */
  studentName: string;
  /** Optional event name for context */
  eventName?: string;
  /** Type of roster action performed */
  action: "added" | "removed" | "linked" | "unlinked" | "invited";
  /** User who performed the linking action */
  linkedBy?: string;
  /** Name of the user who sent the invitation */
  inviterName?: string;
  /** Team slug for identification */
  teamSlug: string;
  /** Subteam ID for the specific team unit */
  subteamId: string;
}

/**
 * Service class for managing roster-related notifications
 * Handles creation, retrieval, and management of notifications for roster changes
 *
 * @example
 * ```typescript
 * // Create a notification when a student is added to roster
 * await RosterNotificationService.notifyRosterNameAdded('user-123', {
 *   studentName: 'John Doe',
 *   eventName: 'Anatomy & Physiology',
 *   action: 'added',
 *   teamSlug: 'team-alpha',
 *   subteamId: 'subteam-456'
 * });
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Service class with related notification methods
export class RosterNotificationService {
  /**
   * Create a notification when a roster name is added
   * Inserts a notification record into the database for roster name additions
   *
   * @param {string} userId - The user ID to receive the notification
   * @param {RosterNotificationData} data - Roster notification data
   * @returns {Promise<void>} Promise that resolves when notification is created
   * @throws {Error} When database operation fails
   * @example
   * ```typescript
   * await RosterNotificationService.notifyRosterNameAdded('user-123', {
   *   studentName: 'Jane Smith',
   *   eventName: 'Dynamic Planet',
   *   action: 'added',
   *   teamSlug: 'team-beta',
   *   subteamId: 'subteam-789'
   * });
   * ```
   */
  static async notifyRosterNameAdded(userId: string, data: RosterNotificationData): Promise<void> {
    try {
      await dbPg.insert(newTeamNotifications).values({
        userId,
        teamId: data.subteamId,
        notificationType: "roster_name_added",
        title: "Roster Name Added",
        message: `"${data.studentName}" has been added to the roster${data.eventName ? ` for ${data.eventName}` : ""}`,
        data: {
          student_name: data.studentName,
          event_name: data.eventName,
          action: data.action,
          team_slug: data.teamSlug,
          subteam_id: data.subteamId,
        },
      });
    } catch (error) {
      logger.error(
        "Failed to create roster notification",
        error instanceof Error ? error : new Error(String(error)),
        {
          userId,
          action: data.action,
          teamSlug: data.teamSlug,
        }
      );
      // Ignore errors to avoid breaking the main flow
    }
  }

  /**
   * Create a notification when a roster name is removed
   * Inserts a notification record into the database for roster name removals
   *
   * @param {string} userId - The user ID to receive the notification
   * @param {RosterNotificationData} data - Roster notification data
   * @returns {Promise<void>} Promise that resolves when notification is created
   * @throws {Error} When database operation fails
   */
  static async notifyRosterNameRemoved(
    userId: string,
    data: RosterNotificationData
  ): Promise<void> {
    try {
      await dbPg.insert(newTeamNotifications).values({
        userId,
        teamId: data.subteamId,
        notificationType: "roster_name_removed",
        title: "Roster Name Removed",
        message: `"${data.studentName}" has been removed from the roster${data.eventName ? ` for ${data.eventName}` : ""}`,
        data: {
          student_name: data.studentName,
          event_name: data.eventName,
          action: data.action,
          team_slug: data.teamSlug,
          subteam_id: data.subteamId,
        },
      });
    } catch (error) {
      logger.error(
        "Failed to create roster notification",
        error instanceof Error ? error : new Error(String(error)),
        {
          userId,
          action: data.action,
          teamSlug: data.teamSlug,
        }
      );
      // Ignore errors to avoid breaking the main flow
    }
  }

  /**
   * Create a notification when a roster name is linked to a user account
   * Inserts a notification record into the database for roster name linking
   *
   * @param {string} userId - The user ID to receive the notification
   * @param {RosterNotificationData} data - Roster notification data
   * @returns {Promise<void>} Promise that resolves when notification is created
   * @throws {Error} When database operation fails
   */
  static async notifyRosterNameLinked(userId: string, data: RosterNotificationData): Promise<void> {
    try {
      await dbPg.insert(newTeamNotifications).values({
        userId,
        teamId: data.subteamId,
        notificationType: "roster_name_linked",
        title: "Roster Name Linked",
        message: `"${data.studentName}" has been linked to your account`,
        data: {
          student_name: data.studentName,
          event_name: data.eventName,
          action: data.action,
          linked_by: data.linkedBy,
          team_slug: data.teamSlug,
          subteam_id: data.subteamId,
        },
      });
    } catch (error) {
      logger.error(
        "Failed to create roster notification",
        error instanceof Error ? error : new Error(String(error)),
        {
          userId,
          action: data.action,
          teamSlug: data.teamSlug,
        }
      );
      // Ignore errors to avoid breaking the main flow
    }
  }

  /**
   * Create a notification when a roster name is unlinked from a user account
   * Inserts a notification record into the database for roster name unlinking
   *
   * @param {string} userId - The user ID to receive the notification
   * @param {RosterNotificationData} data - Roster notification data
   * @returns {Promise<void>} Promise that resolves when notification is created
   * @throws {Error} When database operation fails
   */
  static async notifyRosterNameUnlinked(
    userId: string,
    data: RosterNotificationData
  ): Promise<void> {
    try {
      await dbPg.insert(newTeamNotifications).values({
        userId,
        teamId: data.subteamId,
        notificationType: "roster_name_unlinked",
        title: "Roster Name Unlinked",
        message: `"${data.studentName}" has been unlinked from your account`,
        data: {
          student_name: data.studentName,
          event_name: data.eventName,
          action: data.action,
          team_slug: data.teamSlug,
          subteam_id: data.subteamId,
        },
      });
    } catch (error) {
      logger.error(
        "Failed to create roster notification",
        error instanceof Error ? error : new Error(String(error)),
        {
          userId,
          action: data.action,
          teamSlug: data.teamSlug,
        }
      );
      // Ignore errors to avoid breaking the main flow
    }
  }

  /**
   * Create a notification when a user is invited to link to a roster name
   * Inserts a notification record into the database for roster invitations
   *
   * @param {string} userId - The user ID to receive the notification
   * @param {RosterNotificationData} data - Roster notification data
   * @returns {Promise<void>} Promise that resolves when notification is created
   * @throws {Error} When database operation fails
   */
  static async notifyRosterInvitation(userId: string, data: RosterNotificationData): Promise<void> {
    try {
      await dbPg.insert(newTeamNotifications).values({
        userId,
        teamId: data.subteamId,
        notificationType: "roster_invitation",
        title: "Roster Invitation",
        message: `You've been invited to link to the roster name "${data.studentName}"`,
        data: {
          student_name: data.studentName,
          event_name: data.eventName,
          action: data.action,
          inviter_name: data.inviterName,
          team_slug: data.teamSlug,
          subteam_id: data.subteamId,
        },
      });
    } catch (error) {
      logger.error(
        "Failed to create roster notification",
        error instanceof Error ? error : new Error(String(error)),
        {
          userId,
          action: data.action,
          teamSlug: data.teamSlug,
        }
      );
      // Ignore errors to avoid breaking the main flow
    }
  }

  /**
   * Get all roster-related notifications for a user
   * Retrieves roster notifications from the database with optional limit
   *
   * @param {string} userId - The user ID to get notifications for
   * @param {number} [limit=50] - Maximum number of notifications to retrieve
   * @returns {Promise<any[]>} Array of roster notifications
   * @throws {Error} When database operation fails
   * @example
   * ```typescript
   * const notifications = await RosterNotificationService.getRosterNotifications('user-123', 25);
   * console.log(notifications.length); // Number of notifications retrieved
   * ```
   */
  static async getRosterNotifications(userId: string, limit = 50): Promise<unknown[]> {
    try {
      const rosterTypes = [
        "roster_name_added",
        "roster_name_removed",
        "roster_name_linked",
        "roster_name_unlinked",
        "roster_invitation",
      ];

      const result = await dbPg
        .select({
          id: newTeamNotifications.id,
          notification_type: newTeamNotifications.notificationType,
          title: newTeamNotifications.title,
          message: newTeamNotifications.message,
          data: newTeamNotifications.data,
          created_at: newTeamNotifications.createdAt,
          is_read: newTeamNotifications.isRead,
        })
        .from(newTeamNotifications)
        .where(
          and(
            eq(newTeamNotifications.userId, userId),
            inArray(newTeamNotifications.notificationType, rosterTypes)
          )
        )
        .orderBy(desc(newTeamNotifications.createdAt))
        .limit(limit);

      return result.map((row) => ({
        id: row.id,
        type: row.notification_type,
        title: row.title,
        message: row.message,
        data: row.data,
        createdAt: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
        isRead: row.is_read,
      }));
    } catch (error) {
      logger.error(
        "Failed to get roster notifications",
        error instanceof Error ? error : new Error(String(error)),
        {
          userId,
          limit,
        }
      );
      return [];
    }
  }

  /**
   * Mark roster notifications as read
   * Updates the read status of specific roster notifications
   *
   * @param {string} userId - The user ID who owns the notifications
   * @param {string[]} notificationIds - Array of notification IDs to mark as read
   * @returns {Promise<void>} Promise that resolves when notifications are marked as read
   * @throws {Error} When database operation fails
   */
  static async markRosterNotificationsAsRead(
    userId: string,
    notificationIds: string[]
  ): Promise<void> {
    try {
      const rosterTypes = [
        "roster_name_added",
        "roster_name_removed",
        "roster_name_linked",
        "roster_name_unlinked",
        "roster_invitation",
      ];

      await dbPg
        .update(newTeamNotifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(newTeamNotifications.userId, userId),
            inArray(newTeamNotifications.id, notificationIds),
            inArray(newTeamNotifications.notificationType, rosterTypes)
          )
        );
    } catch (_error) {
      // Ignore errors
    }
  }

  /**
   * Clear all roster notifications for a user
   * Removes all roster-related notifications for a specific user
   *
   * @param {string} userId - The user ID to clear notifications for
   * @returns {Promise<void>} Promise that resolves when notifications are cleared
   * @throws {Error} When database operation fails
   */
  static async clearRosterNotifications(userId: string): Promise<void> {
    try {
      const rosterTypes = [
        "roster_name_added",
        "roster_name_removed",
        "roster_name_linked",
        "roster_name_unlinked",
        "roster_invitation",
      ];

      await dbPg
        .delete(newTeamNotifications)
        .where(
          and(
            eq(newTeamNotifications.userId, userId),
            inArray(newTeamNotifications.notificationType, rosterTypes)
          )
        );
    } catch {
      // Ignore errors
    }
  }
}
