import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { loadTeamUnit, addMemberToTeam, upsertUserProfile, saveTeamUnitRoster } from '@/lib/db/teams';
import { markNotificationRead } from '@/lib/db/notifications';

export async function POST(request: NextRequest) {
  try {
    const supa = await createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const id = (body?.id || '').toString();
    const school = (body?.school || '').toString();
    const division = (body?.division || '').toString();
    const teamId = (body?.teamId || '').toString();
    const memberNameRaw = body?.memberName;
    const memberName = typeof memberNameRaw === 'string' ? memberNameRaw.trim() : '';
    if (!id || !school || !division || !teamId) return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });

    const unit = await loadTeamUnit(school, division as 'B'|'C', teamId);
    if (!unit) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });

    // Ensure user exists in Cockroach users before adding membership
    try {
      const { data: profile } = await supa.from('users')
        .select('email, username, first_name, last_name, display_name, photo_url')
        .eq('id', user.id)
        .maybeSingle();
      await upsertUserProfile({
        id: user.id,
        email: (profile as any)?.email || user.email || null,
        username: (profile as any)?.username || null,
        firstName: (profile as any)?.first_name || null,
        lastName: (profile as any)?.last_name || null,
        displayName: (profile as any)?.display_name || null,
        photoUrl: (profile as any)?.photo_url || null,
      });
    } catch {}

    await addMemberToTeam(unit.id, user.id, 'user');
    // If the invite referenced a specific roster name, replace that name with the user's display
    if (memberName && memberName.length > 0) {
      try {
        const roster = unit.roster || {} as Record<string, string[]>;
        const display = (user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '').toString();
        let changed = false;
        const updated: Record<string, string[]> = {};
        for (const [evt, arr] of Object.entries(roster)) {
          const copy = Array.isArray(arr) ? arr.slice() : [];
          for (let i = 0; i < copy.length; i++) {
            if ((copy[i] || '').trim() === memberName) {
              copy[i] = display;
              changed = true;
            }
          }
          updated[evt] = copy;
        }
        if (changed) {
          await saveTeamUnitRoster(unit.school, unit.division, unit.teamId, updated);
        }
      } catch {}
    } else {
      // No specific memberName provided: append the user as a new standalone member by adding them to a neutral placeholder event entry
      try {
        const roster = unit.roster || {} as Record<string, string[]>;
        const display = (user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '').toString();
        const updated: Record<string, string[]> = { ...roster };
        // Choose an event list to place the name visibly; if empty roster, create a synthetic entry
        const allEvents = Object.keys(updated);
        if (allEvents.length === 0) {
          // Create a synthetic holder event to surface standalone members
          updated['__members__'] = [display];
        } else {
          const first = allEvents[0];
          const arr = Array.isArray(updated[first]) ? updated[first].slice() : [];
          // Prefer placing in an empty slot; otherwise append
          const emptyIdx = arr.findIndex((v) => !v || (v.trim && v.trim() === ''));
          if (emptyIdx >= 0) arr[emptyIdx] = display; else arr.push(display);
          updated[first] = arr;
        }
        await saveTeamUnitRoster(unit.school, unit.division, unit.teamId, updated);
      } catch {}
    }
    await markNotificationRead(user.id, id);
    return NextResponse.json({ success: true, slug: unit.slug });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


