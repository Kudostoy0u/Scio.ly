import { and, count, desc, eq, sql } from "drizzle-orm";
import { dbPg } from "./index";
import { notifications } from "./schema/core";

/**
 * Types of notifications supported by the system
 */
export type NotificationType = "team_invite" | "generic" | "assignment" | "roster_link_invitation";

/**
 * Notification data structure
 * Represents a notification in the system with all necessary metadata
 */
export interface Notification {
  /** Unique identifier for the notification */
  id: string;
  /** ID of the user who owns this notification */
  userId: string;
  /** Type of notification */
  type: NotificationType;
  /** Title of the notification */
  title: string;
  /** Optional body text of the notification */
  body?: string | null;
  /** Additional data associated with the notification */
  data: Record<string, unknown>;
  /** Whether the notification has been read */
  isRead: boolean;
  /** When the notification was created */
  createdAt: Date;
  /** When the notification was last updated */
  updatedAt: Date;
}

/**
 * Create a new notification in the database
 * Inserts a notification record and returns the created notification with generated ID and timestamps
 *
 * @param {Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>} n - Notification data without ID and timestamps
 * @returns {Promise<Notification>} The created notification with ID and timestamps
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const notification = await createNotification({
 *   userId: 'user-123',
 *   type: 'team_invite',
 *   title: 'Team Invitation',
 *   body: 'You have been invited to join Team Alpha',
 *   data: { teamId: 'team-456' },
 *   isRead: false
 * });
 * ```
 */
export async function createNotification(
  n: Omit<Notification, "id" | "createdAt" | "updatedAt">
): Promise<Notification> {
  try {
    const [row] = await dbPg
      .insert(notifications)
      .values({
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body ?? null,
        data: n.data ?? {},
        isRead: n.isRead ?? false,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to create notification: No row returned");
    }
    return mapRow({
      ...row,
      type: row.type as NotificationType,
      data: row.data as Record<string, unknown>,
    });
  } catch (err) {
    throw new Error(
      `Failed to create notification: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}

/**
 * List notifications for a user
 * Retrieves notifications from the database with optional filtering by read status
 *
 * @param {string} userId - The user ID to get notifications for
 * @param {boolean} [includeRead=false] - Whether to include read notifications
 * @returns {Promise<Notification[]>} Array of notifications
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * // Get only unread notifications
 * const unreadNotifications = await listNotifications('user-123');
 *
 * // Get all notifications including read ones
 * const allNotifications = await listNotifications('user-123', true);
 * ```
 */
export async function listNotifications(
  userId: string,
  includeRead = false
): Promise<Notification[]> {
  try {
    const whereConditions = [eq(notifications.userId, userId)];
    if (!includeRead) {
      whereConditions.push(eq(notifications.isRead, false));
    }

    const rows = await dbPg
      .select()
      .from(notifications)
      .where(and(...whereConditions))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    return rows.map((row) =>
      mapRow({
        ...row,
        type: row.type as NotificationType,
        data: row.data as Record<string, unknown>,
      })
    );
  } catch (err) {
    throw new Error(
      `Failed to list notifications: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}

/**
 * Mark a specific notification as read
 * Updates the read status of a notification for a user
 *
 * @param {string} userId - The user ID who owns the notification
 * @param {string} id - The notification ID to mark as read
 * @returns {Promise<boolean>} True if notification was found and updated, false otherwise
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const success = await markNotificationRead('user-123', 'notification-456');
 * if (success) {
 *   console.log('Notification marked as read');
 * }
 * ```
 */
export async function markNotificationRead(userId: string, id: string): Promise<boolean> {
  try {
    const result = await dbPg
      .update(notifications)
      .set({
        isRead: true,
        updatedAt: sql`NOW()`,
      })
      .where(and(eq(notifications.id, Number(id)), eq(notifications.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    throw new Error(
      `Failed to mark notification as read: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}

/**
 * Mark all notifications as read for a user
 * Updates all unread notifications to read status for a specific user
 *
 * @param {string} userId - The user ID to mark all notifications as read
 * @returns {Promise<boolean>} True if any notifications were updated, false otherwise
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const success = await markAllNotificationsRead('user-123');
 * if (success) {
 *   console.log('All notifications marked as read');
 * }
 * ```
 */
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  try {
    const result = await dbPg
      .update(notifications)
      .set({
        isRead: true,
        updatedAt: sql`NOW()`,
      })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    throw new Error(
      `Failed to mark all notifications as read: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}

/**
 * Get the count of unread notifications for a user
 * Returns the number of unread notifications for a specific user
 *
 * @param {string} userId - The user ID to count unread notifications for
 * @returns {Promise<number>} Number of unread notifications
 * @throws {Error} When database operation fails
 * @example
 * ```typescript
 * const count = await unreadCount('user-123');
 * console.log(`User has ${count} unread notifications`);
 * ```
 */
export async function unreadCount(userId: string): Promise<number> {
  try {
    const [result] = await dbPg
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result?.count ?? 0;
  } catch (err) {
    throw new Error(
      `Failed to get unread count: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }
}

/**
 * Map database row to Notification interface
 * Transforms database row format to application interface
 *
 * @param {any} row - Database row to transform
 * @returns {Notification} Transformed notification object
 */
function mapRow(row: {
  id: number;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Notification {
  return {
    id: row.id.toString(),
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data || {},
    isRead: row.isRead,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
