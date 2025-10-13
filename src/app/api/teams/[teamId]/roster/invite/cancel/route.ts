import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

// POST /api/teams/[teamId]/roster/invite/cancel - Cancel roster link invitation
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
    const { subteamId, studentName } = body;

    if (!subteamId || !studentName) {
      return NextResponse.json({ 
        error: 'Subteam ID and student name are required' 
      }, { status: 400 });
    }

    // Validate UUID format for subteamId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(subteamId)) {
      return NextResponse.json({ 
        error: 'Invalid subteam ID format. Must be a valid UUID.' 
      }, { status: 400 });
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

    // Check if user is a member of this team group
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

    // Check if user has captain or co-captain role in any team unit
    const hasCaptainRole = membershipResult.rows.some(membership => 
      ['captain', 'co_captain'].includes(membership.role)
    );

    if (!hasCaptainRole) {
      return NextResponse.json({ error: 'Only captains can cancel roster invitations' }, { status: 403 });
    }

    // Check if the subteam belongs to this group
    const subteamResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_units 
       WHERE id = $1 AND group_id = $2 AND status = 'active'`,
      [subteamId, groupId]
    );

    if (subteamResult.rows.length === 0) {
      return NextResponse.json({ error: 'Subteam not found' }, { status: 404 });
    }

    // Find and cancel the pending roster link invitation
    const invitationResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM roster_link_invitations 
       WHERE team_id = $1 AND student_name = $2 AND status = 'pending'`,
      [subteamId, studentName]
    );

    if (invitationResult.rows.length === 0) {
      return NextResponse.json({ error: 'No pending invitation found' }, { status: 404 });
    }

    // Cancel the invitation
    await queryCockroachDB(
      `UPDATE roster_link_invitations 
       SET status = 'declined'
       WHERE team_id = $1 AND student_name = $2 AND status = 'pending'`,
      [subteamId, studentName]
    );

    return NextResponse.json({ 
      message: 'Roster link invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling roster link invitation:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
