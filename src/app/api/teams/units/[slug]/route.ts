import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { loadTeamUnitBySlug, saveTeamUnitRoster, getUserMembershipForUnit } from '@/lib/db/teams';

export async function GET(_request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const unit = await loadTeamUnitBySlug(slug);
    let role: 'captain' | 'user' | null = null;
    try {
      const supa = await createSupabaseServerClient();
      const { data: { user } } = await supa.auth.getUser();
      if (user?.id && unit?.id) {
        role = await getUserMembershipForUnit(user.id, unit.id);
      }
    } catch {}
    return NextResponse.json({ success: true, data: unit, role });
  } catch (e) {
    console.error('units/[slug] GET error', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const supa = await createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized: Sign in to save this team.' }, { status: 401 });
    const body = await request.json();
    const action = body?.action as string;
    if (action !== 'saveRoster') return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

    const { slug } = await ctx.params;
    const unit = await loadTeamUnitBySlug(slug);
    if (!unit) return NextResponse.json({ success: false, error: 'Team not found.' }, { status: 404 });
    const role = await getUserMembershipForUnit(user.id, unit.id);
    if (!role) return NextResponse.json({ success: false, error: `Forbidden: You are not a member of this team. uid=${user.id} unit=${unit.id}` }, { status: 403 });
    if (role !== 'captain') return NextResponse.json({ success: false, error: `Forbidden: Only captains can save the roster. role=${role}` }, { status: 403 });

    const roster = body?.roster as Record<string, string[]>;
    if (!roster || typeof roster !== 'object') return NextResponse.json({ success: false, error: 'Missing or invalid parameters: roster' }, { status: 400 });

    await saveTeamUnitRoster(unit.school, unit.division, unit.teamId, roster);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('units/[slug] POST error', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
