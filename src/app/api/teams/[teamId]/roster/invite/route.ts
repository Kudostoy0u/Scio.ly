import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { NotificationSyncService } from '@/lib/services/notification-sync';
import { getServerUser } from '@/lib/supabaseServer';

// GET /api/teams/[teamId]/roster/invite - Search users to invite for roster linking
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
    console.error('Error searching users for roster invite:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/teams/[teamId]/roster/invite - Send roster link invitation
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
    const { subteamId, studentName, username, message } = body;

    if (!subteamId || !studentName || !username) {
      return NextResponse.json({ 
        error: 'Subteam ID, student name, and username are required' 
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
      return NextResponse.json({ error: 'Only captains can send roster invitations' }, { status: 403 });
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

    // Find the user to invite
    const userResult = await queryCockroachDB<any>(
      `SELECT id, email, display_name, first_name, last_name, username
       FROM users 
       WHERE username = $1 OR email = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const invitedUser = userResult.rows[0];
    
    // Use the user's actual display name instead of the roster entry name
    const userDisplayName = invitedUser.display_name || 
                           (invitedUser.first_name && invitedUser.last_name ? 
                            `${invitedUser.first_name} ${invitedUser.last_name}` : 
                            invitedUser.username || invitedUser.email?.split('@')[0] || 'Unknown User');
    
    console.log('User lookup result:', {
      username: invitedUser.username,
      email: invitedUser.email,
      display_name: invitedUser.display_name,
      first_name: invitedUser.first_name,
      last_name: invitedUser.last_name,
      constructed_display_name: userDisplayName,
      roster_entry_name: studentName
    });

    // Check for existing roster link invitation (pending or declined)
    const existingInvitation = await queryCockroachDB<{ id: string, status: string }>(
      `SELECT id, status FROM roster_link_invitations 
       WHERE team_id = $1 AND student_name = $2 AND invited_user_id = $3`,
      [subteamId, studentName, invitedUser.id]
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    let invitationResult;

    if (existingInvitation.rows.length > 0) {
      const existing = existingInvitation.rows[0];
      
      if (existing.status === 'pending') {
        return NextResponse.json({ error: 'Roster link invitation already sent' }, { status: 400 });
      }
      
      // Update existing declined/expired invitation to pending
      invitationResult = await queryCockroachDB<any>(
        `UPDATE roster_link_invitations 
         SET status = 'pending', invited_by = $1, message = $2, expires_at = $3, created_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [user.id, message || `You've been invited to link your account to the roster entry "${studentName}"`, expiresAt, existing.id]
      );
    } else {
      // Create new roster link invitation
      invitationResult = await queryCockroachDB<any>(
        `INSERT INTO roster_link_invitations 
         (team_id, student_name, invited_user_id, invited_by, message, status, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), $6)
         RETURNING *`,
        [subteamId, studentName, invitedUser.id, user.id, message || `You've been invited to link your account to the roster entry "${studentName}"`, expiresAt]
      );
    }

    const invitation = invitationResult.rows[0];

    // Get team information for the notification
    const teamInfoResult = await queryCockroachDB<{ school: string, division: string }>(
      `SELECT tg.school, tg.division 
       FROM new_team_units tu 
       JOIN new_team_groups tg ON tu.group_id = tg.id 
       WHERE tu.id = $1`,
      [subteamId]
    );

    const teamInfo = teamInfoResult.rows[0];
    const teamName = teamInfo ? `${teamInfo.school} ${teamInfo.division}` : 'Unknown Team';

    // Create notification for invited user
    const notificationResult = await queryCockroachDB(
      `INSERT INTO new_team_notifications 
       (user_id, team_id, notification_type, title, message, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        invitedUser.id,
        subteamId,
        'roster_link_invitation',
        `Roster Link Invitation - ${teamName}`,
        `You've been invited to link your account to "${userDisplayName}" on ${teamName}`,
        JSON.stringify({ 
          invitation_id: invitation.id, 
          student_name: userDisplayName, // Use actual display name instead of roster entry name
          inviter_name: user.email,
          team_slug: teamId,
          team_name: teamName
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
      message: 'Roster link invitation sent successfully'
    });

  } catch (error) {
    console.error('Error creating roster link invitation:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
