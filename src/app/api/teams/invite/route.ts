import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { loadTeamUnit } from '@/lib/db/teams';
import { createNotification } from '@/lib/db/notifications';

export async function POST(request: NextRequest) {
  try {
    const supa = await createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const username = (body?.username || '').toString().trim();
    const school = (body?.school || '').toString();
    const division = (body?.division || '').toString();
    const teamId = (body?.teamId || '').toString();
    const memberName = (body?.memberName || '').toString();
    if (!username || !school || !division || !teamId) return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });

    // Lookup target user by username
    const { data: match, error } = await supa.from('users').select('id, username').eq('username', username).maybeSingle() as any;
    if (error || !match?.id) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    // Verify team exists
    const unit = await loadTeamUnit(school, division as 'B'|'C', teamId);
    if (!unit) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });

    // Create a team_invite notification for the target user (include roster memberName if provided)
    const note = await createNotification({
      userId: match.id,
      type: 'team_invite',
      title: 'Team Invitation',
      body: `You have been invited to join ${school} Division ${division}, Team ${teamId}.`,
      data: { school, division, teamId, memberName },
      isRead: false,
    } as any);

    return NextResponse.json({ success: true, data: note });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


