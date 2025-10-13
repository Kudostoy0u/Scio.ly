import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { queryCockroachDB } from '@/lib/cockroachdb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const supa = await createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { teamId } = await params;

    // First, resolve the slug to team group
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;

    // Check if the requesting user is a captain of this team
    const captainCheck = await queryCockroachDB<{ role: string }>(
      `SELECT tm.role FROM new_team_memberships tm
       JOIN new_team_units tu ON tm.team_id = tu.id
       WHERE tm.user_id = $1 AND tu.group_id = $2 AND tm.status = 'active'`,
      [user.id, groupId]
    );

    if (captainCheck.rows.length === 0 || captainCheck.rows[0].role !== 'captain') {
      return NextResponse.json({ error: 'Only team captains can remove members' }, { status: 403 });
    }

    // Check if the user to be removed is a captain
    const memberCheck = await queryCockroachDB<{ role: string }>(
      `SELECT tm.role FROM new_team_memberships tm
       JOIN new_team_units tu ON tm.team_id = tu.id
       WHERE tm.user_id = $1 AND tu.group_id = $2 AND tm.status = 'active'`,
      [userId, groupId]
    );

    if (memberCheck.rows.length === 0) {
      return NextResponse.json({ error: 'User is not a member of this team' }, { status: 404 });
    }

    if (memberCheck.rows[0].role === 'captain') {
      return NextResponse.json({ error: 'Cannot remove team captain' }, { status: 403 });
    }

    // Remove the user from team memberships
    await queryCockroachDB(
      `DELETE FROM new_team_memberships 
       WHERE user_id = $1 AND team_id IN (
         SELECT tu.id FROM new_team_units tu WHERE tu.group_id = $2
       )`,
      [userId, groupId]
    );

    // Remove the user from roster data (unlink them from roster entries)
    await queryCockroachDB(
      `UPDATE new_team_roster_data 
       SET user_id = NULL, updated_at = NOW()
       WHERE user_id = $1 AND team_unit_id IN (
         SELECT tu.id FROM new_team_units tu WHERE tu.group_id = $2
       )`,
      [userId, groupId]
    );

    return NextResponse.json({ success: true, message: 'Member removed successfully' });

  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
