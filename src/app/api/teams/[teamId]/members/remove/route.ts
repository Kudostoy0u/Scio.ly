import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';
import { checkTeamGroupLeadershipCockroach } from '@/lib/utils/team-auth';

// POST /api/teams/[teamId]/members/remove - Remove a linked member from team and purge roster entries
// Frontend Usage:
// - src/app/teams/components/PeopleTab.tsx (removeMember)
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
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
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

    // Ensure requester has leadership privileges in this group
    const leadershipResult = await checkTeamGroupLeadershipCockroach(user.id, groupId);
    if (!leadershipResult.hasLeadership) {
      return NextResponse.json({ error: 'Only captains and co-captains can remove members' }, { status: 403 });
    }

    // Remove team memberships for this user within the group
    await queryCockroachDB(
      `DELETE FROM new_team_memberships
       WHERE user_id = $1 AND team_id IN (
         SELECT id FROM new_team_units WHERE group_id = $2
       )`,
      [userId, groupId]
    );

    // Purge their roster entries across the group
    await queryCockroachDB(
      `DELETE FROM new_team_roster_data
       WHERE user_id = $1 AND team_unit_id IN (
         SELECT id FROM new_team_units WHERE group_id = $2
       )`,
      [userId, groupId]
    );

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}