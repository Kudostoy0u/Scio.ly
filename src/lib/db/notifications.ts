import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export type NotificationType = 'team_invite' | 'generic' | 'assignment';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
    // Log and rethrow for API to handle
    console.error('createNotification error', { err, payload: { ...n, userId: n.userId } });
    throw err;
  } finally { client.release(); }
}

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
    console.error('listNotifications error', { err, userId, includeRead });
    return [];
  } finally { client.release(); }
}

export async function markNotificationRead(userId: string, id: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(`UPDATE notifications SET is_read=true, updated_at=NOW() WHERE id=$1::INT8 AND user_id=$2`, [id, userId]);
    return (rowCount ?? 0) > 0;
  } catch (err) {
    console.error('markNotificationRead error', { err, userId, id });
    return false;
  } finally { client.release(); }
}

export async function unreadCount(userId: string): Promise<number> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT count(*)::INT AS c FROM notifications WHERE user_id=$1 AND is_read=false`, [userId]);
    return (rows[0]?.c as number) || 0;
  } catch (err) {
    console.error('unreadCount error', { err, userId });
    return 0;
  } finally { client.release(); }
}

function mapRow(row: any): Notification {
  return {
    id: row.id?.toString(),
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data || {},
    isRead: !!row.is_read,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


