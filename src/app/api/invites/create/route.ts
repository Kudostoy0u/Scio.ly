import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createInvite } from '@/lib/db/teamExtras';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { inviteeUsername, school, division, teamId } = await req.json();
    if (!inviteeUsername || !school || (division !== 'B' && division !== 'C') || !teamId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }
    // Resolve invitee username to user_id if exists
    const { data: target } = await supabase.from('users').select('id, username').ilike('username', String(inviteeUsername)).maybeSingle();
    const inv = await createInvite(user.id, String(target?.username || inviteeUsername), String(school), division, String(teamId));
    return NextResponse.json({ success: true, data: inv });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


