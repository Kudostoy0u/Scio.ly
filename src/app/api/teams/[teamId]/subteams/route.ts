import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

// GET /api/teams/[teamId]/subteams - Get all subteams for a team group
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

    // First, resolve the slug to team group
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamId]
    );

    if (groupResult.rows.length === 0) {
      console.log(`Team group not found for slug: ${teamId}`);
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;
    console.log(`Resolved team slug ${teamId} to group ID: ${groupId}`);

    // Get all team units for this group
    console.log(`Looking for team units in group ID: ${groupId}`);
    const unitsResult = await queryCockroachDB<{
      id: string;
      team_id: string;
      description: string;
      created_at: string;
    }>(
      `SELECT id, team_id, description, created_at FROM new_team_units 
       WHERE group_id = $1 AND status = 'active' ORDER BY team_id ASC`,
      [groupId]
    );
    
    console.log(`Found ${unitsResult.rows.length} team units in database query:`, unitsResult.rows);

    const subteams = unitsResult.rows.map(unit => ({
      id: unit.id,
      name: unit.description, // Use description as the display name
      team_id: unit.team_id,
      description: unit.description,
      created_at: unit.created_at
    }));

    console.log(`Found ${subteams.length} subteams for team ${teamId}:`, subteams);

    return NextResponse.json({ subteams });

  } catch (error) {
    console.error('Error fetching subteams:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/teams/[teamId]/subteams - Create a new subteam
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
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Subteam name is required' }, { status: 400 });
    }

    // First, resolve the slug to team group
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;

    // Check if user is a captain of this team group
    const membershipResult = await queryCockroachDB<{ role: string }>(
      `SELECT tm.role 
       FROM new_team_memberships tm
       JOIN new_team_units tu ON tm.team_id = tu.id
       WHERE tm.user_id = $1 AND tu.group_id = $2 AND tm.status = 'active'`,
      [user.id, groupId]
    );

    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    const membership = membershipResult.rows[0];
    if (!['captain', 'co_captain'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only captains can create subteams' }, { status: 403 });
    }

    // Get the next team_id (A, B, C, etc.)
    const existingUnitsResult = await queryCockroachDB<{ team_id: string }>(
      `SELECT team_id FROM new_team_units WHERE group_id = $1 ORDER BY team_id ASC`,
      [groupId]
    );

    const existingTeamIds = existingUnitsResult.rows.map(row => row.team_id);
    let nextTeamId = 'A';
    for (let i = 0; i < 26; i++) {
      const teamId = String.fromCharCode(65 + i); // A, B, C, etc.
      if (!existingTeamIds.includes(teamId)) {
        nextTeamId = teamId;
        break;
      }
    }

    // Create new team unit
    const newUnitResult = await queryCockroachDB<{
      id: string;
      team_id: string;
      captain_code: string;
      user_code: string;
    }>(
      `INSERT INTO new_team_units (group_id, team_id, description, captain_code, user_code, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, team_id, captain_code, user_code`,
      [
        groupId,
        nextTeamId,
        name.trim(),
        `CAP${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        `USR${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        user.id
      ]
    );

    const newUnit = newUnitResult.rows[0];

    return NextResponse.json({
      id: newUnit.id,
      name: name.trim(), // Use the provided name as the display name
      team_id: newUnit.team_id,
      captain_code: newUnit.captain_code,
      user_code: newUnit.user_code
    });

  } catch (error) {
    console.error('Error creating subteam:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
