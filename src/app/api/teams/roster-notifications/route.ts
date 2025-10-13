import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { RosterNotificationService } from '@/lib/services/roster-notifications';

// GET /api/teams/roster-notifications - Get roster notifications for user
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const notifications = await RosterNotificationService.getRosterNotifications(user.id, limit);

    return NextResponse.json({ 
      notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('Error fetching roster notifications:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/teams/roster-notifications - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds } = body;

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'notificationIds must be an array' }, { status: 400 });
    }

    await RosterNotificationService.markRosterNotificationsAsRead(user.id, notificationIds);

    return NextResponse.json({ message: 'Notifications marked as read' });

  } catch (error) {
    console.error('Error marking roster notifications as read:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/teams/roster-notifications - Clear all roster notifications
export async function DELETE(_request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await RosterNotificationService.clearRosterNotifications(user.id);

    return NextResponse.json({ message: 'All roster notifications cleared' });

  } catch (error) {
    console.error('Error clearing roster notifications:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
