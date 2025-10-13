import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

// GET /api/teams/[teamId]/codes - Get team join codes
export async function GET(
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

    // Check if user is captain or co-captain of any team unit
    const membershipResult = await queryCockroachDB<{ id: string, role: string, team_id: string }>(
      `SELECT id, role, team_id FROM new_team_memberships 
       WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
      [user.id, teamUnitIds]
    );

    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    const memberships = membershipResult.rows;
    const captainMemberships = memberships.filter(m => ['captain', 'co_captain'].includes(m.role));
    
    if (captainMemberships.length === 0) {
      return NextResponse.json({ error: 'Only captains can view team codes' }, { status: 403 });
    }

    // Get team codes from the first team unit (they should be the same for all units in a group)
    const teamResult = await queryCockroachDB<{ captain_code: string, user_code: string }>(
      `SELECT captain_code, user_code FROM new_team_units WHERE id = $1`,
      [teamUnitIds[0]]
    );

    if (teamResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const team = teamResult.rows[0];

    return NextResponse.json({
      captainCode: team.captain_code,
      userCode: team.user_code
    });

  } catch (error) {
    console.error('Error fetching team codes:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
