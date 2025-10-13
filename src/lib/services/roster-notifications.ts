import { queryCockroachDB } from '@/lib/cockroachdb';

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
  action: 'added' | 'removed' | 'linked' | 'unlinked' | 'invited';
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
  static async notifyRosterNameAdded(
    userId: string,
    data: RosterNotificationData
  ): Promise<void> {
    try {
      await queryCockroachDB(
        `INSERT INTO new_team_notifications 
         (user_id, team_id, notification_type, title, message, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          data.subteamId,
          'roster_name_added',
          'Roster Name Added',
          `"${data.studentName}" has been added to the roster${data.eventName ? ` for ${data.eventName}` : ''}`,
          JSON.stringify({
            student_name: data.studentName,
            event_name: data.eventName,
            action: data.action,
            team_slug: data.teamSlug,
            subteam_id: data.subteamId
          })
        ]
      );
    } catch (error) {
      console.error('Error creating roster name added notification:', error);
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
      await queryCockroachDB(
        `INSERT INTO new_team_notifications 
         (user_id, team_id, notification_type, title, message, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          data.subteamId,
          'roster_name_removed',
          'Roster Name Removed',
          `"${data.studentName}" has been removed from the roster${data.eventName ? ` for ${data.eventName}` : ''}`,
          JSON.stringify({
            student_name: data.studentName,
            event_name: data.eventName,
            action: data.action,
            team_slug: data.teamSlug,
            subteam_id: data.subteamId
          })
        ]
      );
    } catch (error) {
      console.error('Error creating roster name removed notification:', error);
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
  static async notifyRosterNameLinked(
    userId: string,
    data: RosterNotificationData
  ): Promise<void> {
    try {
      await queryCockroachDB(
        `INSERT INTO new_team_notifications 
         (user_id, team_id, notification_type, title, message, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          data.subteamId,
          'roster_name_linked',
          'Roster Name Linked',
          `"${data.studentName}" has been linked to your account`,
          JSON.stringify({
            student_name: data.studentName,
            event_name: data.eventName,
            action: data.action,
            linked_by: data.linkedBy,
            team_slug: data.teamSlug,
            subteam_id: data.subteamId
          })
        ]
      );
    } catch (error) {
      console.error('Error creating roster name linked notification:', error);
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
      await queryCockroachDB(
        `INSERT INTO new_team_notifications 
         (user_id, team_id, notification_type, title, message, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          data.subteamId,
          'roster_name_unlinked',
          'Roster Name Unlinked',
          `"${data.studentName}" has been unlinked from your account`,
          JSON.stringify({
            student_name: data.studentName,
            event_name: data.eventName,
            action: data.action,
            team_slug: data.teamSlug,
            subteam_id: data.subteamId
          })
        ]
      );
    } catch (error) {
      console.error('Error creating roster name unlinked notification:', error);
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
  static async notifyRosterInvitation(
    userId: string,
    data: RosterNotificationData
  ): Promise<void> {
    try {
      await queryCockroachDB(
        `INSERT INTO new_team_notifications 
         (user_id, team_id, notification_type, title, message, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          data.subteamId,
          'roster_invitation',
          'Roster Invitation',
          `You've been invited to link to the roster name "${data.studentName}"`,
          JSON.stringify({
            student_name: data.studentName,
            event_name: data.eventName,
            action: data.action,
            inviter_name: data.inviterName,
            team_slug: data.teamSlug,
            subteam_id: data.subteamId
          })
        ]
      );
    } catch (error) {
      console.error('Error creating roster invitation notification:', error);
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
  static async getRosterNotifications(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const result = await queryCockroachDB<{
        id: string;
        type: string;
        title: string;
        message: string;
        data: any;
        created_at: string;
        is_read: boolean;
      }>(
        `SELECT id, notification_type, title, message, data, created_at, is_read
         FROM new_team_notifications 
         WHERE user_id = $1 
         AND notification_type IN ('roster_name_added', 'roster_name_removed', 'roster_name_linked', 'roster_name_unlinked', 'roster_invitation')
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        type: row.notification_type,
        title: row.title,
        message: row.message,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
        createdAt: row.created_at,
        isRead: row.is_read
      }));
    } catch (error) {
      console.error('Error fetching roster notifications:', error);
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
      await queryCockroachDB(
        `UPDATE new_team_notifications 
         SET is_read = true 
         WHERE user_id = $1 
         AND id = ANY($2)
         AND notification_type IN ('roster_name_added', 'roster_name_removed', 'roster_name_linked', 'roster_name_unlinked', 'roster_invitation')`,
        [userId, notificationIds]
      );
    } catch (error) {
      console.error('Error marking roster notifications as read:', error);
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
      await queryCockroachDB(
        `DELETE FROM new_team_notifications 
         WHERE user_id = $1 
         AND notification_type IN ('roster_name_added', 'roster_name_removed', 'roster_name_linked', 'roster_name_unlinked', 'roster_invitation')`,
        [userId]
      );
    } catch (error) {
      console.error('Error clearing roster notifications:', error);
    }
  }
}
