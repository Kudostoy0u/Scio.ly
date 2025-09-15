import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createNotification, listNotifications, markNotificationRead, unreadCount } from '@/lib/db/notifications';

export async function GET(request: NextRequest) {
  try {
    const supa = await createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include') === 'all';
    const items = await listNotifications(user.id, include);
    const count = await unreadCount(user.id);
    return NextResponse.json({ success: true, data: items, unread: count });
  } catch {
    // Emit more context to logs for debugging
    console.error('GET /api/notifications failed');
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supa = await createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const action = body?.action as string;
    if (action === 'markRead') {
      const id = body?.id?.toString();
      if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
      const ok = await markNotificationRead(user.id, id);
      return NextResponse.json({ success: ok });
    }
    if (action === 'create') {
      const targetUserId = (body?.userId || '').toString();
      const type = (body?.type || 'generic').toString();
      const title = (body?.title || '').toString();
      const note = await createNotification({ userId: targetUserId, type, title, body: body?.body || null, data: body?.data || {}, isRead: false } as any);
      return NextResponse.json({ success: true, data: note });
    }
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch {
    console.error('POST /api/notifications failed');
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

