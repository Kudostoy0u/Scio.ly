import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';
import { resolveTeamSlugToUnits } from '@/lib/utils/team-resolver';

// POST /api/teams/[teamId]/invite/cancel - Cancel team invitation
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
    const { invitationCode } = body;

    if (!invitationCode) {
      return NextResponse.json({ error: 'Invitation code is required' }, { status: 400 });
    }

    // Resolve team slug to team unit IDs
    let teamUnitIds: string[];
    try {
      const teamInfo = await resolveTeamSlugToUnits(teamId);
      teamUnitIds = teamInfo.teamUnitIds;
    } catch {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is captain or co-captain in any of the team units
    const membershipResult = await queryCockroachDB<{ id: string, role: string, team_id: string }>(
      `SELECT id, role, team_id FROM new_team_memberships 
       WHERE user_id = $1 AND team_id = ANY($2) AND status = 'active'`,
      [user.id, teamUnitIds]
    );

    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // Check if user has captain or co-captain role in any team unit
    const hasCaptainRole = membershipResult.rows.some(membership => 
      ['captain', 'co_captain'].includes(membership.role)
    );

    if (!hasCaptainRole) {
      return NextResponse.json({ error: 'Only captains can cancel invitations' }, { status: 403 });
    }

    // Find and cancel the invitation
    const invitationResult = await queryCockroachDB<{ id: string, email: string }>(
      `SELECT id, email FROM new_team_invitations 
       WHERE invitation_code = $1 AND team_id = ANY($2) AND status = 'pending'`,
      [invitationCode, teamUnitIds]
    );

    if (invitationResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invitation not found or already processed' }, { status: 404 });
    }

    const invitation = invitationResult.rows[0];

    // Update invitation status to cancelled
    await queryCockroachDB(
      `UPDATE new_team_invitations 
       SET status = 'declined', accepted_at = NOW()
       WHERE id = $1`,
      [invitation.id]
    );

    return NextResponse.json({ 
      message: 'Invitation cancelled successfully',
      email: invitation.email
    });

  } catch (error) {
    console.error('Error cancelling team invitation:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
