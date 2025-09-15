import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { listTeamUnits, saveTeamUnitRoster, loadTeamUnit, addMemberToTeam, loadTeamUnitBySlug, getUserMembershipForUnit, renameTeamUnit, deleteTeamUnit, isUserCaptainOfSchoolDivision, createNewTeamGroup, createInitialUnitForGroup, loadTeamGroupBySlug, createTeamUnitInGroup, getOrCreateTeamGroup, listUnitMembers, setUnitMemberRole, removeUnitMember, upsertUserProfile, getEarliestCaptainUserIdForUnitById } from '@/lib/db/teams';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school = searchParams.get('school');
    const division = searchParams.get('division');
    const teamId = searchParams.get('teamId');
    const slug = searchParams.get('slug');
    if (slug) {
      const unit = await loadTeamUnitBySlug(slug);
      return NextResponse.json({ success: true, data: unit });
    }
    if (!school || !division || !['B','C'].includes(division)) {
      return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
    }
    const members = searchParams.get('members');
    if (members === '1') {
      const list = await listUnitMembers(school, division as 'B'|'C', teamId || 'A');
      return NextResponse.json({ success: true, data: list });
    }
    if (teamId) {
      const unit = await loadTeamUnit(school, division as 'B'|'C', teamId);
      return NextResponse.json({ success: true, data: unit });
    }
    const units = await listTeamUnits(school, division as 'B'|'C');
    return NextResponse.json({ success: true, data: units });
  } catch (e) {
    console.error('units GET error', e);
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
    if (action === 'create') {
      const school = body?.school as string;
      const division = body?.division as 'B'|'C';
      const groupSlug = body?.groupSlug as string | undefined;
      if (!school || !division || !['B','C'].includes(division)) {
        return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
      }
      let created; let groupSlugOut: string | null = null;
      if (groupSlug) {
        const group = await loadTeamGroupBySlug(groupSlug);
        if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
        created = await createTeamUnitInGroup(group);
        groupSlugOut = group.slug;
      } else {
        const group = await getOrCreateTeamGroup(school, division);
        created = await createTeamUnitInGroup(group);
        groupSlugOut = group.slug;
      }
      // Auto-link creator as captain; ensure Cockroach users has a row first
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
        await addMemberToTeam(created.id, user.id, 'captain');
      } catch (e) {
        console.error('addMemberToTeam failed on create', e);
        return NextResponse.json({ success: false, error: 'Failed to set you as captain for the new team. Please try again.' }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: created, groupSlug: groupSlugOut, membershipAdded: true }, { status: 201 });
    }
    if (action === 'createNewGroup') {
      const school = body?.school as string;
      const division = body?.division as 'B'|'C';
      if (!school || !division || !['B','C'].includes(division)) {
        return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
      }
      const group = await createNewTeamGroup(school, division);
      const unit = await createInitialUnitForGroup(group);
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
        await addMemberToTeam(unit.id, user.id, 'captain');
      } catch (e) {
        console.error('addMemberToTeam failed on createNewGroup', e);
        return NextResponse.json({ success: false, error: 'Failed to set you as captain for the new team. Please try again.' }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: { group, unit } }, { status: 201 });
    }
    if (action === 'saveRoster') {
      const school = body?.school as string;
      const division = body?.division as 'B'|'C';
      const teamId = body?.teamId as string;
      const roster = body?.roster as Record<string, string[]>;
      if (!school || !division || !teamId || typeof roster !== 'object') {
        return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
      }
      // ensure membership
      try {
        const unit = await loadTeamUnit(school, division, teamId);
        if (!unit) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        const role = await getUserMembershipForUnit(user.id, Number(unit.id));
        if (!role) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      } catch {}
      await saveTeamUnitRoster(school, division, teamId, roster);
      return NextResponse.json({ success: true });
    }
    if (action === 'rename') {
      const school = body?.school as string;
      const division = body?.division as 'B'|'C';
      const teamId = body?.teamId as string;
      const name = (body?.name || '').toString();
      if (!school || !division || !teamId || !name) {
        return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
      }
      const unit = await loadTeamUnit(school, division, teamId);
      if (!unit) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      const role = await getUserMembershipForUnit(user.id, unit.id);
      if (role !== 'captain') return NextResponse.json({ success: false, error: 'Forbidden: Only captains can delete this subteam.' }, { status: 403 });
      await renameTeamUnit(school, division, teamId, name);
      return NextResponse.json({ success: true });
    }
    if (action === 'setRole') {
      const school = body?.school as string;
      const division = body?.division as 'B'|'C';
      const teamId = body?.teamId as string;
      const targetUserId = body?.userId as string;
      const role = body?.role as 'captain'|'user';
      if (!school || !division || !teamId || !targetUserId || !role) return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
      const okCaptain = await isUserCaptainOfSchoolDivision(user.id, school, division);
      if (!okCaptain) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      const unit = await loadTeamUnit(school, division, teamId);
      if (!unit) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      // Prevent self demote from captain
      if (targetUserId === user.id && role !== 'captain') {
        return NextResponse.json({ success: false, error: 'Captains cannot demote themselves.' }, { status: 403 });
      }
      // If target is a captain and caller is not the original captain, disallow demotion
      const targetRole = await getUserMembershipForUnit(targetUserId, unit.id);
      if (targetRole === 'captain' && role !== 'captain') {
        const earliestCaptain = await getEarliestCaptainUserIdForUnitById(unit.id);
        if (earliestCaptain && earliestCaptain !== user.id) {
          return NextResponse.json({ success: false, error: 'Only the team creator can demote another captain.' }, { status: 403 });
        }
      }
      const ok = await setUnitMemberRole(school, division, teamId, targetUserId, role);
      return NextResponse.json({ success: ok });
    }
    if (action === 'removeMember') {
      const school = body?.school as string;
      const division = body?.division as 'B'|'C';
      const teamId = body?.teamId as string;
      const targetUserId = body?.userId as string;
      const name = (body?.name || '').toString();
      if (!school || !division || !teamId || !targetUserId) return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
      const okCaptain = await isUserCaptainOfSchoolDivision(user.id, school, division);
      if (!okCaptain) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      const unit = await loadTeamUnit(school, division, teamId);
      if (!unit) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      // Prevent removing yourself if you are the only/earliest captain
      if (targetUserId === user.id) {
        const earliestCaptain = await getEarliestCaptainUserIdForUnitById(unit.id);
        if (earliestCaptain && earliestCaptain === user.id) {
          return NextResponse.json({ success: false, error: 'Team creator cannot remove own membership.' }, { status: 403 });
        }
      }
      // Prevent removing other captains unless caller is the creator
      const targetRole = await getUserMembershipForUnit(targetUserId, unit.id);
      if (targetRole === 'captain') {
        const earliestCaptain = await getEarliestCaptainUserIdForUnitById(unit.id);
        if (earliestCaptain && earliestCaptain !== user.id) {
          return NextResponse.json({ success: false, error: 'Only the team creator can remove a captain.' }, { status: 403 });
        }
      }
      // Remove roster appearances if a name was provided
      try {
        if (name) {
          const roster = unit.roster || {} as Record<string, string[]>;
          let changed = false;
          const updated: Record<string, string[]> = {};
          for (const [evt, arr] of Object.entries(roster)) {
            const copy = Array.isArray(arr) ? arr.slice() : [];
            for (let i = 0; i < copy.length; i++) {
              if ((copy[i] || '').trim() === name) {
                copy[i] = '';
                changed = true;
              }
            }
            updated[evt] = copy;
          }
          if (changed) {
            await saveTeamUnitRoster(school, division as 'B'|'C', teamId, updated);
          }
        }
      } catch {}
      const ok = await removeUnitMember(school, division, teamId, targetUserId);
      return NextResponse.json({ success: ok });
    }
    if (action === 'removePerson') {
      const school = body?.school as string;
      const division = body?.division as 'B'|'C';
      const teamId = body?.teamId as string;
      const name = (body?.name || '').toString();
      if (!school || !division || !teamId || !name) return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
      const okCaptain = await isUserCaptainOfSchoolDivision(user.id, school, division);
      if (!okCaptain) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      const unit = await loadTeamUnit(school, division as 'B'|'C', teamId);
      if (!unit) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      // Remove from roster only
      try {
        const roster = unit.roster || {} as Record<string, string[]>;
        let changed = false;
        const updated: Record<string, string[]> = {};
        for (const [evt, arr] of Object.entries(roster)) {
          const copy = Array.isArray(arr) ? arr.slice() : [];
          for (let i = 0; i < copy.length; i++) {
            if ((copy[i] || '').trim() === name) {
              copy[i] = '';
              changed = true;
            }
          }
          updated[evt] = copy;
        }
        if (changed) {
          await saveTeamUnitRoster(school, division as 'B'|'C', teamId, updated);
        }
      } catch {}
      return NextResponse.json({ success: true });
    }
    if (action === 'delete') {
      const school = body?.school as string;
      const division = body?.division as 'B'|'C';
      const teamId = body?.teamId as string;
      if (!school || !division || !teamId) return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
      const unit = await loadTeamUnit(school, division, teamId);
      if (!unit) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      const ok = await isUserCaptainOfSchoolDivision(user.id, school, division);
      if (!ok) return NextResponse.json({ success: false, error: 'Forbidden: Only captains can delete subteams for this school/division.' }, { status: 403 });
      await deleteTeamUnit(school, division, teamId);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error('units POST error', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


