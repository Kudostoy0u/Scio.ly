/**
 * NOTE: This file uses raw SQL queries because it performs complex cross-database operations
 * between CockroachDB and Supabase. The queries involve:
 * 1. Complex JOINs with team data and user information
 * 2. Cross-database synchronization logic
 * 3. Dynamic query building based on notification types
 *
 * These queries cannot be easily converted to Drizzle ORM without significant refactoring
 * of the notification sync architecture.
 */

import { queryCockroachDB } from "@/lib/cockroachdb";
import { createClient } from "@supabase/supabase-js";

// Create a server-side Supabase client with service key for bypassing RLS
function getSupabaseServer() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qzwdlqeicmcaoggdavdm.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

interface CockroachNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  data: unknown;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  team_id: string | null;
  team_name: string | null;
  user_id: string;
}

// biome-ignore lint/complexity/noStaticOnlyClass: Service class with related notification methods
export class NotificationSyncService {
  /**
   * Sync notifications from CockroachDB to Supabase
   * This should be called when notifications are created/updated in CockroachDB
   */
  static async syncNotificationToSupabase(notificationId: string): Promise<void> {
    // Get notification from CockroachDB
    const result = await queryCockroachDB<CockroachNotification>(
      `SELECT 
          n.id,
          n.notification_type,
          n.title,
          n.message,
          n.data,
          n.is_read,
          n.created_at,
          n.read_at,
          n.user_id,
          tu.id as team_id,
          CONCAT(tg.school, ' ', tg.division) as team_name
        FROM new_team_notifications n
        LEFT JOIN new_team_units tu ON n.team_id = tu.id
        LEFT JOIN new_team_groups tg ON tu.group_id = tg.id
        WHERE n.id = $1`,
      [notificationId]
    );

    if (result.rows.length === 0) {
      return;
    }

    const notification = result.rows[0];
    if (!notification) {
      return;
    }

    // Upsert to Supabase using service key (bypasses RLS)
    const supabaseServer = getSupabaseServer();
    if (!supabaseServer) {
      throw new Error("Supabase server client not available. SUPABASE_SERVICE_KEY is required.");
    }

    const upsertData = {
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
    };

    const { error } = await supabaseServer.from("notifications").upsert(upsertData as unknown);

    if (error) {
      throw error;
    }
  }

  /**
   * Sync all unread notifications for a user from CockroachDB to Supabase
   */
  static async syncUserNotificationsToSupabase(userId: string): Promise<void> {
    // Get all unread notifications from CockroachDB
    const result = await queryCockroachDB<CockroachNotification>(
      `SELECT 
          n.id,
          n.notification_type,
          n.title,
          n.message,
          n.data,
          n.is_read,
          n.created_at,
          n.read_at,
          n.user_id,
          tu.id as team_id,
          CONCAT(tg.school, ' ', tg.division) as team_name
        FROM new_team_notifications n
        LEFT JOIN new_team_units tu ON n.team_id = tu.id
        LEFT JOIN new_team_groups tg ON tu.group_id = tg.id
        WHERE n.user_id = $1 AND n.is_read = false
        ORDER BY n.created_at DESC
        LIMIT 50`,
      [userId]
    );

    if (result.rows.length === 0) {
      return;
    }

    // Upsert all notifications to Supabase
    const notifications = result.rows.map((notification) => ({
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
    }));

    const supabaseServer = getSupabaseServer();
    if (!supabaseServer) {
      throw new Error("Supabase server client not available. SUPABASE_SERVICE_KEY is required.");
    }

    const { error } = await supabaseServer.from("notifications").upsert(notifications as unknown);

    if (error) {
      throw error;
    }
  }

  /**
   * Update notification read status in both CockroachDB and Supabase
   */
  static async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    const readAt = new Date().toISOString();

    // Update in CockroachDB
    await queryCockroachDB(
      `UPDATE new_team_notifications 
         SET is_read = true, read_at = $1 
         WHERE id = $2 AND user_id = $3`,
      [readAt, notificationId, userId]
    );

    // Update in Supabase using service key (bypasses RLS)
    const supabaseServer = getSupabaseServer();
    if (!supabaseServer) {
      throw new Error("Supabase server client not available. SUPABASE_SERVICE_KEY is required.");
    }

    const { error } = await supabaseServer
      .from("notifications")
      .update({ is_read: true, read_at: readAt })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  }
}
