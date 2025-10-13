import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

// POST /api/teams/[teamId]/archive - Archive team
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

    // Check if user is the creator of the team group OR a captain of any team unit
    const groupCreatorResult = await queryCockroachDB<{ created_by: string }>(
      `SELECT created_by FROM new_team_groups WHERE id = $1`,
      [groupId]
    );

    if (groupCreatorResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupCreator = groupCreatorResult.rows[0].created_by;
    
    // Allow team creator OR captains to archive the team
    if (groupCreator !== user.id) {
      // Check if user is a captain of any team unit in this group
      const captainCheckResult = await queryCockroachDB<{ role: string }>(
        `SELECT tm.role 
         FROM new_team_memberships tm
         JOIN new_team_units tu ON tm.team_id = tu.id
         WHERE tm.user_id = $1 AND tu.group_id = $2 AND tm.status = 'active'`,
        [user.id, groupId]
      );

      if (captainCheckResult.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Only the team creator or captains can archive the team' 
        }, { status: 403 });
      }

      const userRole = captainCheckResult.rows[0].role;
      if (!['captain', 'co_captain'].includes(userRole)) {
        return NextResponse.json({ 
          error: 'Only the team creator or captains can archive the team' 
        }, { status: 403 });
      }
    }

    // Archive the team group (set archived status)
    await queryCockroachDB(
      `UPDATE new_team_groups SET status = 'archived', updated_at = NOW() 
       WHERE id = $1`,
      [groupId]
    );

    // Archive all team units
    await queryCockroachDB(
      `UPDATE new_team_units SET status = 'archived', updated_at = NOW() 
       WHERE group_id = $1`,
      [groupId]
    );

    // Archive all memberships
    await queryCockroachDB(
      `UPDATE new_team_memberships SET status = 'archived' 
       WHERE team_id = ANY($1)`,
      [teamUnitIds]
    );

    return NextResponse.json({ message: 'Team successfully archived' });

  } catch (error) {
    console.error('Error archiving team:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
