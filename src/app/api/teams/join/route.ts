import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { loadTeamData } from '@/lib/db/teams';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code || typeof code !== 'string') return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });

    const parts = code.split('::');
    if (parts.length !== 3) return NextResponse.json({ success: false, error: 'Invalid code format' }, { status: 400 });
    const [school, division, teamId] = parts as [string, string, string];
    if (!school || (division !== 'B' && division !== 'C') || !teamId) {
      return NextResponse.json({ success: false, error: 'Invalid code parts' }, { status: 400 });
    }

    const data = await loadTeamData(school, division as 'B'|'C');
    if (!data) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
    const teamExists = data.teams.some((t: any) => (t.id || '').toString() === teamId);
    if (!teamExists) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });

    const teamCode = `${school}::${division}::${teamId}`;
    await (supabase as any).from('users').update({ team_code: teamCode }).eq('id', user.id);

    return NextResponse.json({ success: true, data: { school, division, teamId, teams: data.teams } });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


