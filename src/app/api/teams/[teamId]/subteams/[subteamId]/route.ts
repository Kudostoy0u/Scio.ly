import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

// PUT /api/teams/[teamId]/subteams/[subteamId] - Update a subteam
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; subteamId: string }> }
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

    const { teamId, subteamId } = await params;
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

    // Check if the subteam exists and belongs to this group
    const subteamResult = await queryCockroachDB<{ id: string; group_id: string }>(
      `SELECT id, group_id FROM new_team_units WHERE id = $1 AND group_id = $2`,
      [subteamId, groupId]
    );

    if (subteamResult.rows.length === 0) {
      return NextResponse.json({ error: 'Subteam not found' }, { status: 404 });
    }

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
      return NextResponse.json({ error: 'Only captains can update subteams' }, { status: 403 });
    }

    // Update the subteam description
    const updateResult = await queryCockroachDB<{
      id: string;
      team_id: string;
      description: string;
    }>(
      `UPDATE new_team_units 
       SET description = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, team_id, description`,
      [name.trim(), subteamId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update subteam' }, { status: 500 });
    }

    const updatedSubteam = updateResult.rows[0];

    return NextResponse.json({
      id: updatedSubteam.id,
      name: updatedSubteam.description,
      team_id: updatedSubteam.team_id,
      description: updatedSubteam.description
    });

  } catch (error) {
    console.error('Error updating subteam:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/teams/[teamId]/subteams/[subteamId] - Delete a subteam
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; subteamId: string }> }
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

    const { teamId, subteamId } = await params;

    // First, resolve the slug to team group
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;

    // Check if the subteam exists and belongs to this group
    const subteamResult = await queryCockroachDB<{ id: string; group_id: string }>(
      `SELECT id, group_id FROM new_team_units WHERE id = $1 AND group_id = $2`,
      [subteamId, groupId]
    );

    if (subteamResult.rows.length === 0) {
      return NextResponse.json({ error: 'Subteam not found' }, { status: 404 });
    }

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
      return NextResponse.json({ error: 'Only captains can delete subteams' }, { status: 403 });
    }

    // Archive the subteam instead of deleting it
    const archiveResult = await queryCockroachDB<{ id: string }>(
      `UPDATE new_team_units 
       SET status = 'archived', updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [subteamId]
    );

    if (archiveResult.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to archive subteam' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error archiving subteam:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
