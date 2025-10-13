import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

// POST /api/teams/[teamId]/exit - Exit team
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

    // First, we need to resolve the slug to actual team unit IDs
    // The teamId parameter is actually a slug, so we need to find the team units for this group
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;

    // Get all team units for this group
    const unitsResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_units WHERE group_id = $1`,
      [groupId]
    );

    if (unitsResult.rows.length === 0) {
      return NextResponse.json({ error: 'No team units found for this group' }, { status: 404 });
    }

    const teamUnitIds = unitsResult.rows.map(row => row.id);

    // Check if user is a member of any team unit in this group
    const membershipResult = await queryCockroachDB<{ id: string, role: string, team_id: string }>(
      `SELECT id, role, team_id FROM new_team_memberships 
       WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
      [user.id, teamUnitIds]
    );

    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    const memberships = membershipResult.rows;

    // Check if user is a captain in any team unit
    const captainMemberships = memberships.filter(m => m.role === 'captain');
    
    if (captainMemberships.length > 0) {
      // Check if there are other captains in the same team units
      for (const membership of captainMemberships) {
        const captainCountResult = await queryCockroachDB<{ count: string }>(
          `SELECT COUNT(*) as count FROM new_team_memberships 
           WHERE team_id = $1 AND role = 'captain' AND status = 'active'`,
          [membership.team_id]
        );

        if (parseInt(captainCountResult.rows[0].count) <= 1) {
          return NextResponse.json({ 
            error: 'Cannot exit team as the only captain. Promote another member to captain first.' 
          }, { status: 400 });
        }
      }
    }

    // Remove user from all team units in this group
    await queryCockroachDB(
      `UPDATE new_team_memberships SET status = 'inactive' 
       WHERE user_id = $1 AND team_id = ANY($2)`,
      [user.id, teamUnitIds]
    );

    return NextResponse.json({ message: 'Successfully exited team' });

  } catch (error) {
    console.error('Error exiting team:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
