import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { loadTeamGroupBySlug, listTeamUnitsForGroup, getUserRoleForGroup, listGroupTournaments, addGroupTournament, deleteGroupTournament } from '@/lib/db/teams';

export async function GET(_request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const group = await loadTeamGroupBySlug(slug);
    if (!group) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    const units = await listTeamUnitsForGroup(group.id);
    const tournaments = await listGroupTournaments(group.id);
    let role: 'captain' | 'user' | null = null;
    try {
      const supa = await createSupabaseServerClient();
      const { data: { user } } = await supa.auth.getUser();
      if (user?.id) role = await getUserRoleForGroup(user.id, group.id);
    } catch {}
    return NextResponse.json({ success: true, data: { group, units, tournaments }, role });
  } catch (e) {
    console.error('group/[slug] GET error', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const group = await loadTeamGroupBySlug(slug);
    if (!group) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const supa = await createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRoleForGroup(user.id, group.id);
    if (role !== 'captain') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const name = (body?.name || '').toString().trim();
    const dateTime = (body?.dateTime || '').toString().trim();
    if (!name || !dateTime) return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });

    const created = await addGroupTournament(group.id, name, dateTime);
    return NextResponse.json({ success: true, data: created });
  } catch (e) {
    console.error('group/[slug] POST error', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const group = await loadTeamGroupBySlug(slug);
    if (!group) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const supa = await createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const role = await getUserRoleForGroup(user.id, group.id);
    if (role !== 'captain') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    const ok = await deleteGroupTournament(group.id, id);
    return NextResponse.json({ success: ok });
  } catch (e) {
    console.error('group/[slug] DELETE error', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}



