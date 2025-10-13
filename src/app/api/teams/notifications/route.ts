import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

// GET /api/teams/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        error: 'Database configuration error',
        details: 'DATABASE_URL environment variable is missing'
      }, { status: 500 });
    }

    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unread_only = searchParams.get('unread_only') === 'true';

    let query = `
      SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.is_read,
        n.created_at,
        n.read_at,
        tg.school,
        tg.division,
        tu.name as team_name
      FROM new_team_notifications n
      LEFT JOIN new_team_units tu ON n.team_id = tu.id
      LEFT JOIN new_team_groups tg ON tu.group_id = tg.id
      WHERE n.user_id = $1
    `;

    const params: any[] = [user.id];

    if (unread_only) {
      query += ' AND n.is_read = false';
    }

    query += ' ORDER BY n.created_at DESC LIMIT $2 OFFSET $3';

    params.push(limit, offset);

    const notificationsResult = await queryCockroachDB<any>(query, params);

    // Get unread count
    const unreadCountResult = await queryCockroachDB<{ count: string }>(
      `SELECT COUNT(*) as count FROM new_team_notifications 
       WHERE user_id = $1 AND is_read = false`,
      [user.id]
    );

    return NextResponse.json({
      notifications: notificationsResult.rows,
      unread_count: parseInt(unreadCountResult.rows[0].count)
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/teams/notifications - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        error: 'Database configuration error',
        details: 'DATABASE_URL environment variable is missing'
      }, { status: 500 });
    }

    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_ids, mark_all_read = false } = body;

    if (mark_all_read) {
      // Mark all notifications as read
      await queryCockroachDB(
        `UPDATE new_team_notifications 
         SET is_read = true, read_at = NOW() 
         WHERE user_id = $1 AND is_read = false`,
        [user.id]
      );
    } else if (notification_ids && Array.isArray(notification_ids)) {
      // Mark specific notifications as read
      const placeholders = notification_ids.map((_, index) => `$${index + 2}`).join(',');
      await queryCockroachDB(
        `UPDATE new_team_notifications 
         SET is_read = true, read_at = NOW() 
         WHERE user_id = $1 AND id IN (${placeholders})`,
        [user.id, ...notification_ids]
      );
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/teams/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        error: 'Database configuration error',
        details: 'DATABASE_URL environment variable is missing'
      }, { status: 500 });
    }

    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_ids, delete_all = false } = body;

    if (delete_all) {
      // Delete all notifications
      await queryCockroachDB(
        `DELETE FROM new_team_notifications WHERE user_id = $1`,
        [user.id]
      );
    } else if (notification_ids && Array.isArray(notification_ids)) {
      // Delete specific notifications
      const placeholders = notification_ids.map((_, index) => `$${index + 2}`).join(',');
      await queryCockroachDB(
        `DELETE FROM new_team_notifications 
         WHERE user_id = $1 AND id IN (${placeholders})`,
        [user.id, ...notification_ids]
      );
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
