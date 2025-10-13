import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { queryCockroachDB } from '@/lib/cockroachdb';

// POST /api/teams/[teamId]/members/promote - Promote a member to captain or co-captain
// Frontend Usage:
// - src/app/teams/components/PeopleTab.tsx (promoteMember)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, newRole } = body;

    if (!userId || !newRole) {
      return NextResponse.json({ error: 'User ID and new role are required' }, { status: 400 });
    }

    if (newRole !== 'captain') {
      return NextResponse.json({ error: 'Only captain promotion is supported' }, { status: 400 });
    }

    // First, resolve the team group from the slug
    const groupResult = await queryCockroachDB<{
      id: string;
      slug: string;
    }>(
      `SELECT id, slug FROM new_team_groups WHERE slug = $1`,
      [teamId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;

    // Get all team units for this group
    const unitsResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_units WHERE group_id = $1`,
      [groupId]
    );

    if (unitsResult.rows.length === 0) {
      return NextResponse.json({ error: 'No team units found' }, { status: 404 });
    }

    const teamUnitIds = unitsResult.rows.map(row => row.id);

    // Check if the requesting user is a captain of this team group
    const captainCheck = await queryCockroachDB<{ role: string }>(
      `SELECT role FROM new_team_memberships 
       WHERE team_id = ANY($1) AND user_id = $2 AND role = 'captain'`,
      [teamUnitIds, user.id]
    );

    if (captainCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Only team captains can promote members' }, { status: 403 });
    }

    // Check if the user to be promoted is a member of this team
    const memberCheck = await queryCockroachDB<{ id: string; role: string }>(
      `SELECT id, role FROM new_team_memberships 
       WHERE team_id = ANY($1) AND user_id = $2`,
      [teamUnitIds, userId]
    );

    if (memberCheck.rows.length === 0) {
      return NextResponse.json({ error: 'User is not a member of this team' }, { status: 404 });
    }

    if (memberCheck.rows[0].role === 'captain') {
      return NextResponse.json({ error: 'User is already a captain' }, { status: 400 });
    }

    // Promote the user to captain in all team units they're a member of
    const promoteResult = await queryCockroachDB(
      `UPDATE new_team_memberships 
       SET role = 'captain'
       WHERE team_id = ANY($1) AND user_id = $2 AND role != 'captain'`,
      [teamUnitIds, userId]
    );

    if (promoteResult.rowCount === 0) {
      return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User promoted to captain successfully' 
    });

  } catch (error) {
    console.error('Error promoting member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
