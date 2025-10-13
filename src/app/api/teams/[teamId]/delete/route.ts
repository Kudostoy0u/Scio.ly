import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

// DELETE /api/teams/[teamId]/delete - Delete archived team
export async function DELETE(
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

    // First, resolve the slug to team group and get team units
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;

    // Get team units for this group
    const unitsResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_units WHERE group_id = $1`,
      [groupId]
    );

    if (unitsResult.rows.length === 0) {
      return NextResponse.json({ error: 'No team units found for this group' }, { status: 404 });
    }

    const teamUnitIds = unitsResult.rows.map(row => row.id);

    // Check if user is the creator of the team group
    const groupCreatorResult = await queryCockroachDB<{ created_by: string }>(
      `SELECT created_by FROM new_team_groups WHERE id = $1`,
      [groupId]
    );

    if (groupCreatorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupCreator = groupCreatorResult.rows[0].created_by;
    if (groupCreator !== user.id) {
      return NextResponse.json({ 
        error: 'Only the team creator can delete the team' 
      }, { status: 403 });
    }

    // Check if team is archived
    const teamStatusResult = await queryCockroachDB<{ status: string }>(
      `SELECT status FROM new_team_groups WHERE id = $1`,
      [groupId]
    );

    if (teamStatusResult.rows.length === 0 || teamStatusResult.rows[0].status !== 'archived') {
      return NextResponse.json({ 
        error: 'Only archived teams can be deleted' 
      }, { status: 400 });
    }

    // Delete all memberships
    await queryCockroachDB(
      `DELETE FROM new_team_memberships WHERE team_id = ANY($1)`,
      [teamUnitIds]
    );

    // Delete all team units
    await queryCockroachDB(
      `DELETE FROM new_team_units WHERE group_id = $1`,
      [groupId]
    );

    // Delete the team group
    await queryCockroachDB(
      `DELETE FROM new_team_groups WHERE id = $1`,
      [groupId]
    );

    return NextResponse.json({ message: 'Team successfully deleted' });

  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
