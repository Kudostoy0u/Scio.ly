import { pool } from './pool';

/**
 * Types of notifications supported by the system
 */
export type NotificationType = 'team_invite' | 'generic' | 'assignment' | 'roster_link_invitation';

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
export async function createNotification(n: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO notifications (user_id, type, title, body, data, is_read)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [n.userId, n.type, n.title, n.body ?? null, n.data ?? {}, n.isRead ?? false]
    );
    const row = rows[0];
    return mapRow(row);
  } catch (err) {
    throw new Error(`Failed to create notification: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally { client.release(); }
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
export async function listNotifications(userId: string, includeRead = false): Promise<Notification[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      includeRead
        ? `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`
        : `SELECT * FROM notifications WHERE user_id=$1 AND is_read=false ORDER BY created_at DESC LIMIT 100`,
      [userId]
    );
    return rows.map(mapRow);
  } catch (err) {
    throw new Error(`Failed to list notifications: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally { client.release(); }
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
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(`UPDATE notifications SET is_read=true, updated_at=NOW() WHERE id=$1::INT8 AND user_id=$2`, [id, userId]);
    return (rowCount ?? 0) > 0;
  } catch (err) {
    throw new Error(`Failed to mark notification as read: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally { client.release(); }
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
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(`UPDATE notifications SET is_read=true, updated_at=NOW() WHERE user_id=$1 AND is_read=false`, [userId]);
    return (rowCount ?? 0) > 0;
  } catch (err) {
    throw new Error(`Failed to mark all notifications as read: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally { client.release(); }
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
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT count(*)::INT AS c FROM notifications WHERE user_id=$1 AND is_read=false`, [userId]);
    return (rows[0]?.c as number) || 0;
  } catch (err) {
    throw new Error(`Failed to get unread count: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally { client.release(); }
}

/**
 * Database row structure for notifications
 * Represents the raw database row format before transformation
 */
interface NotificationRow {
  /** Database ID (number) */
  id: number;
  /** User ID from database */
  user_id: string;
  /** Notification type */
  type: NotificationType;
  /** Notification title */
  title: string;
  /** Notification body (nullable) */
  body: string | null;
  /** Additional data */
  data: Record<string, unknown>;
  /** Read status */
  is_read: boolean;
  /** Creation timestamp */
  created_at: Date;
  /** Update timestamp */
  updated_at: Date;
}

/**
 * Map database row to Notification interface
 * Transforms database row format to application interface
 * 
 * @param {NotificationRow} row - Database row to transform
 * @returns {Notification} Transformed notification object
 */
function mapRow(row: NotificationRow): Notification {
  return {
    id: row.id.toString(),
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data || {},
    isRead: row.is_read,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


