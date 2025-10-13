import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';
import { checkTeamGroupLeadershipCockroach } from '@/lib/utils/team-auth';

// POST /api/teams/[teamId]/roster/remove - Remove all roster occurrences by student name or userId across the team group
// Frontend Usage:
// - src/app/teams/components/PeopleTab.tsx (removeMember, removeSubteamBadge, removeEventBadge)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
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

    const { teamId } = await params;
    const body = await request.json();
    const { studentName, userId, eventName, subteamId } = body as { 
      studentName?: string; 
      userId?: string; 
      eventName?: string; 
      subteamId?: string; 
    };
    
    console.log('Roster remove API called with:', { studentName, userId, eventName, subteamId, teamId });

    if ((!studentName || !studentName.trim()) && !userId) {
      return NextResponse.json({ error: 'studentName or userId is required' }, { status: 400 });
    }

    // Resolve slug to group id
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamId]
    );
    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }
    const groupId = groupResult.rows[0].id;

    // Ensure user has leadership privileges in this group
    const leadershipResult = await checkTeamGroupLeadershipCockroach(user.id, groupId);
    if (!leadershipResult.hasLeadership) {
      return NextResponse.json({ error: 'Only captains and co-captains can modify roster' }, { status: 403 });
    }

    // Build deletion
    if (userId) {
      if (eventName && eventName.trim()) {
        // Remove specific event entries for this user
        const deleteByUserEvent = await queryCockroachDB<{ id: string }>(
          `DELETE FROM new_team_roster_data r
           WHERE r.user_id = $1 AND LOWER(r.event_name) = LOWER($2) AND r.team_unit_id IN (
             SELECT id FROM new_team_units WHERE group_id = $3 AND status = 'active'
           )
           RETURNING r.team_unit_id`,
          [userId, eventName.trim(), groupId]
        );
        return NextResponse.json({ removedEntries: deleteByUserEvent.rows.length });
      } else {
        if (subteamId) {
          console.log('Removing from specific subteam:', { userId, subteamId });
          // Remove roster entries and team membership for this user from specific subteam only
          const deleteByUserSubteam = await queryCockroachDB<{ id: string }>(
            `DELETE FROM new_team_roster_data r
             WHERE r.user_id = $1 AND r.team_unit_id = $2
             RETURNING r.team_unit_id`,
            [userId, subteamId]
          );
          
          console.log('Deleted roster entries:', deleteByUserSubteam.rows.length);
          
          // Also remove team membership for this user from the specific subteam
          const deleteMembership = await queryCockroachDB(
            `DELETE FROM new_team_memberships
             WHERE user_id = $1 AND team_id = $2`,
            [userId, subteamId]
          );
          
          console.log('Deleted team memberships:', deleteMembership.rowCount);
          
          return NextResponse.json({ removedEntries: deleteByUserSubteam.rows.length });
        } else {
          // Remove all roster entries AND team memberships for this user across the group
          const deleteByUser = await queryCockroachDB<{ id: string }>(
            `DELETE FROM new_team_roster_data r
             WHERE r.user_id = $1 AND r.team_unit_id IN (
               SELECT id FROM new_team_units WHERE group_id = $2 AND status = 'active'
             )
             RETURNING r.team_unit_id`,
            [userId, groupId]
          );
          
          // Also remove team memberships for this user within the group
          await queryCockroachDB(
            `DELETE FROM new_team_memberships
             WHERE user_id = $1 AND team_id IN (
               SELECT id FROM new_team_units WHERE group_id = $2
             )`,
            [userId, groupId]
          );
          
          return NextResponse.json({ removedEntries: deleteByUser.rows.length });
        }
      }
    }

    const deleteByName = await queryCockroachDB<{ count: string }>(
      `WITH target_units AS (
         SELECT id FROM new_team_units WHERE group_id = $1 AND status = 'active'
       )
       DELETE FROM new_team_roster_data r
       USING target_units u
       WHERE r.team_unit_id = u.id AND LOWER(COALESCE(r.student_name,'')) = LOWER($2)
       RETURNING 1`,
      [groupId, (studentName || '').trim()]
    );

    return NextResponse.json({ removedEntries: deleteByName.rows.length });
  } catch (error) {
    console.error('Error removing roster entries:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}