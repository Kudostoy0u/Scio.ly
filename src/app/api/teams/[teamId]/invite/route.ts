import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';
import { resolveTeamSlugToUnits } from '@/lib/utils/team-resolver';
import { NotificationSyncService } from '@/lib/services/notification-sync';

// POST /api/teams/[teamId]/invite - Invite user to team
// Frontend Usage:
// - src/app/teams/components/PeopleTab.tsx (inviteUser)
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
    const { username, email, role = 'member', message, targetTeamUnitId: requestedTeamUnitId } = body;

    if (!username && !email) {
      return NextResponse.json({ error: 'Username or email is required' }, { status: 400 });
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

    // Determine which team unit to invite to
    let targetTeamUnitId: string;
    if (requestedTeamUnitId) {
      // Validate that the specified team unit is in the group and user has permission
      if (!teamUnitIds.includes(requestedTeamUnitId)) {
        return NextResponse.json({ error: 'Invalid team unit' }, { status: 400 });
      }
      
      const hasPermissionForUnit = membershipResult.rows.some(membership => 
        membership.team_id === requestedTeamUnitId && 
        ['captain', 'co_captain'].includes(membership.role)
      );
      
      if (!hasPermissionForUnit) {
        return NextResponse.json({ error: 'No permission to invite to this team unit' }, { status: 403 });
      }
      
      targetTeamUnitId = requestedTeamUnitId;
    } else {
      // Default to the first team unit where user has captain/co-captain role
      const captainMembership = membershipResult.rows.find(membership => 
        ['captain', 'co_captain'].includes(membership.role)
      );
      
      if (!captainMembership) {
        return NextResponse.json({ error: 'Only captains can invite members' }, { status: 403 });
      }
      
      targetTeamUnitId = captainMembership.team_id;
    }

    // Find the user to invite
    let invitedUser;
    if (username) {
      const userResult = await queryCockroachDB<any>(
        `SELECT id, email, display_name, first_name, last_name, username
         FROM users 
         WHERE username = $1 OR email = $1`,
        [username]
      );
      invitedUser = userResult.rows[0];
    } else if (email) {
      const userResult = await queryCockroachDB<any>(
        `SELECT id, email, display_name, first_name, last_name, username
         FROM users 
         WHERE email = $1`,
        [email]
      );
      invitedUser = userResult.rows[0];
    }

    if (!invitedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already a member of any team unit in this group
    const existingMembership = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_memberships 
       WHERE user_id = $1 AND team_id = ANY($2)`,
      [invitedUser.id, teamUnitIds]
    );

    if (existingMembership.rows.length > 0) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 400 });
    }

    // Check for existing pending invitation to any team unit in this group
    const existingInvitation = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_invitations 
       WHERE team_id = ANY($1) AND email = $2 AND status = 'pending'`,
      [teamUnitIds, invitedUser.email]
    );

    if (existingInvitation.rows.length > 0) {
      return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 });
    }

    // Generate invitation code
    const invitationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Create invitation
    const invitationResult = await queryCockroachDB<any>(
      `INSERT INTO new_team_invitations 
       (team_id, invited_by, email, role, invitation_code, expires_at, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [targetTeamUnitId, user.id, invitedUser.email, role, invitationCode, expiresAt, message]
    );

    const invitation = invitationResult.rows[0];

    // Create notification for invited user
    const notificationResult = await queryCockroachDB(
      `INSERT INTO new_team_notifications 
       (user_id, team_id, notification_type, title, message, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        invitedUser.id,
        targetTeamUnitId,
        'team_invitation',
        'Team Invitation',
        `You've been invited to join a team`,
        JSON.stringify({ 
          invitation_id: invitation.id, 
          invitation_code: invitationCode,
          inviter_name: user.email,
          role: role
        })
      ]
    );

    // Sync notification to Supabase for client-side access
    if (notificationResult.rows.length > 0) {
      try {
        await NotificationSyncService.syncNotificationToSupabase(notificationResult.rows[0].id);
      } catch (syncError) {
        console.error('Failed to sync notification to Supabase:', syncError);
        // Don't fail the entire request if sync fails
      }
    }

    return NextResponse.json({ 
      invitation,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Error creating team invitation:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/teams/[teamId]/invite - Search users to invite
// Frontend Usage:
// - src/app/teams/components/PeopleTab.tsx (searchUsers)
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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
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
    const membershipResult = await queryCockroachDB<{ id: string, role: string }>(
      `SELECT id, role FROM new_team_memberships 
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
      return NextResponse.json({ error: 'Only captains can search users' }, { status: 403 });
    }

    // Search users by username or email
    const usersResult = await queryCockroachDB<any>(
      `SELECT 
         id,
         email,
         display_name,
         first_name,
         last_name,
         username,
         photo_url
       FROM users 
       WHERE (username ILIKE $1 OR email ILIKE $1)
       AND id != $2
       LIMIT 10`,
      [`%${query}%`, user.id]
    );

    return NextResponse.json({ users: usersResult.rows });

  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
