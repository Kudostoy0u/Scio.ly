import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { acceptInvite } from '@/lib/db/teamExtras';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { user, error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { id, type, invitationId, school, division, teamId, memberName } = body;

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type === 'team_invite') {
      // Handle team invitation acceptance
      if (!school || !division || !teamId || !memberName) {
        return NextResponse.json({ error: 'Missing team invitation data' }, { status: 400 });
      }

      try {
        // Accept the team invitation using the existing acceptInvite function
        const invite = await acceptInvite(parseInt(id));
        
        if (!invite) {
          return NextResponse.json({ error: 'Invitation not found or already processed' }, { status: 404 });
        }

        // Get the team unit ID for the new team system
        const teamUnitResult = await queryCockroachDB<{ id: string }>(
          `SELECT id FROM new_team_units WHERE group_id = $1`,
          [teamId]
        );

        if (teamUnitResult.rows.length === 0) {
          return NextResponse.json({ error: 'Team unit not found' }, { status: 404 });
        }

        const teamUnitId = teamUnitResult.rows[0].id;

        // Check if user is already a member
        const existingMembership = await queryCockroachDB<{ id: string }>(
          `SELECT id FROM new_team_memberships WHERE user_id = $1 AND team_id = $2`,
          [user!.id, teamUnitId]
        );

        if (existingMembership.rows.length === 0) {
          // Create team membership in the new system
          await queryCockroachDB(
            `INSERT INTO new_team_memberships (user_id, team_id, role, status, joined_at)
             VALUES ($1, $2, 'member', 'active', NOW())`,
            [user!.id, teamUnitId]
          );
        }

        // Get the team slug for redirect
        const teamResult = await queryCockroachDB<{ slug: string }>(
          `SELECT slug FROM new_team_groups WHERE school = $1 AND division = $2 AND id = $3`,
          [school, division, teamId]
        );

        if (teamResult.rows.length === 0) {
          return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        const teamSlug = teamResult.rows[0].slug;

        // Mark the notification as read
        await queryCockroachDB(
          `UPDATE new_team_notifications 
           SET is_read = true, read_at = NOW()
           WHERE id = $1 AND user_id = $2`,
          [id, user!.id]
        );

        return NextResponse.json({ 
          success: true, 
          slug: teamSlug,
          message: 'Team invitation accepted successfully'
        });
      } catch (inviteError) {
        console.error('Error accepting team invitation:', inviteError);
        return NextResponse.json({ error: 'Failed to accept team invitation' }, { status: 500 });
      }
    }

    if (type === 'roster_link_invitation') {
      if (!invitationId) {
        return NextResponse.json({ error: 'Missing invitation ID' }, { status: 400 });
      }

      // Get the roster link invitation details
      const invitationResult = await queryCockroachDB<{ team_id: string, student_name: string }>(
        `SELECT team_id, student_name FROM roster_link_invitations WHERE id = $1`,
        [invitationId]
      );

      if (invitationResult.rows.length === 0) {
        return NextResponse.json({ error: 'Roster link invitation not found' }, { status: 404 });
      }

      const invitation = invitationResult.rows[0];
      const studentName = invitation.student_name;
      const teamId = invitation.team_id;

      // Check if user is already a team member
      const existingMembership = await queryCockroachDB<{ id: string }>(
        `SELECT id FROM new_team_memberships WHERE user_id = $1 AND team_id = $2`,
        [user!.id, teamId]
      );

      if (existingMembership.rows.length === 0) {
        // Create team membership since they're being invited to link to a roster entry
        await queryCockroachDB(
          `INSERT INTO new_team_memberships (user_id, team_id, role, status, joined_at)
           VALUES ($1, $2, 'member', 'active', NOW())`,
          [user!.id, teamId]
        );
      }

      // Get user's display name for the rewrite
      const userResult = await queryCockroachDB<{ display_name: string, username: string, email: string }>(
        `SELECT display_name, username, email FROM users WHERE id = $1`,
        [user!.id]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userInfo = userResult.rows[0];
      const newDisplayName = userInfo.display_name || userInfo.username || userInfo.email?.split('@')[0] || 'Unknown User';

      // Perform the roster member rewrite - replace all occurrences of the student name with the user's info
      console.log(`Rewriting roster member "${studentName}" to "${newDisplayName}" (user: ${user!.id}) in team ${teamId}`);

      // 1. Update roster data - replace student name in all roster entries and link to user
      await queryCockroachDB(
        `UPDATE new_team_roster_data 
         SET student_name = $1, user_id = $2
         WHERE team_unit_id = $3 AND student_name = $4`,
        [newDisplayName, user!.id, teamId, studentName]
      );

      // 2. Update assignment roster - replace student name in assignment rosters
      // Note: new_team_assignments doesn't have a roster column, roster info is in new_team_assignment_roster

      // 3. Update any other references in team posts, events, etc.
      // Update team posts that might reference the student
      await queryCockroachDB(
        `UPDATE new_team_posts 
         SET content = REPLACE(content, $1, $2)
         WHERE team_id = $3 AND content LIKE '%' || $1 || '%'`,
        [studentName, newDisplayName, teamId]
      );

      // Update team events that might reference the student
      await queryCockroachDB(
        `UPDATE new_team_events 
         SET title = REPLACE(title, $1, $2),
             description = REPLACE(description, $1, $2)
         WHERE team_id = $3 AND (title LIKE '%' || $1 || '%' OR description LIKE '%' || $1 || '%')`,
        [studentName, newDisplayName, teamId]
      );

      // 4. Update assignment analytics that might contain the student name
      await queryCockroachDB(
        `UPDATE new_team_assignment_analytics 
         SET student_name = $1, user_id = $2
         WHERE student_name = $3 AND assignment_id IN (
           SELECT id FROM new_team_assignments WHERE team_id = $4
         )`,
        [newDisplayName, user!.id, studentName, teamId]
      );

      // 5. Update assignment roster table (new_team_assignment_roster)
      await queryCockroachDB(
        `UPDATE new_team_assignment_roster 
         SET student_name = $1, user_id = $2
         WHERE student_name = $3 AND assignment_id IN (
           SELECT id FROM new_team_assignments WHERE team_id = $4
         )`,
        [newDisplayName, user!.id, studentName, teamId]
      );

      // 6. Skip updating old team_units table due to type mismatch (SERIAL vs UUID)
      // The old team_units table uses SERIAL id while new_team_units uses UUID
      // This would require a more complex mapping that's not necessary for the new system

      // 7. Update any materials or other team content that might reference the student
      await queryCockroachDB(
        `UPDATE new_team_materials 
         SET title = REPLACE(title, $1, $2),
             description = REPLACE(description, $1, $2)
         WHERE team_id = $3 AND (title LIKE '%' || $1 || '%' OR description LIKE '%' || $1 || '%')`,
        [studentName, newDisplayName, teamId]
      );

      console.log(`Successfully rewrote roster member "${studentName}" to "${newDisplayName}" in team ${teamId}`);

      // Update the roster link invitation status to accepted
      await queryCockroachDB(
        `UPDATE roster_link_invitations 
         SET status = 'accepted'
         WHERE id = $1`,
        [invitationId]
      );

      // Mark the notification as read
      await queryCockroachDB(
        `UPDATE new_team_notifications 
         SET is_read = true, read_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [id, user!.id]
      );

      return NextResponse.json({ success: true });
    }

    if (type === 'assignment_invitation') {
      // For assignment invitations, mark as read and return redirect URL
      await queryCockroachDB(
        `UPDATE new_team_notifications 
         SET is_read = true, read_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [id, user!.id]
      );

      // Get the assignment ID from the notification data
      const notificationResult = await queryCockroachDB<{ data: any }>(
        `SELECT data FROM new_team_notifications WHERE id = $1`,
        [id]
      );

      if (notificationResult.rows.length > 0) {
        const notificationData = notificationResult.rows[0].data;
        const assignmentId = notificationData?.assignment_id;
        
        if (assignmentId) {
          console.log('=== NOTIFICATION ACCEPTANCE DEBUG ===');
          console.log('Assignment ID:', assignmentId);
          
          // Check if this is a Codebusters assignment
          const assignmentResult = await queryCockroachDB<{ event_name: string }>(
            `SELECT event_name FROM new_team_assignments WHERE id = $1`,
            [assignmentId]
          );

          console.log('Assignment query result:', assignmentResult.rows);

          if (assignmentResult.rows.length > 0) {
            const eventName = assignmentResult.rows[0].event_name;
            console.log('Event name from assignment:', eventName);
            
            // Redirect to Codebusters page for Codebusters assignments
            if (eventName === 'Codebusters') {
              console.log('Redirecting to Codebusters page');
              return NextResponse.json({ 
                success: true, 
                redirect: `/codebusters?assignment=${assignmentId}` 
              });
            }
          }

          console.log('Redirecting to test page (default)');
          // Default redirect to test page for other assignments
          return NextResponse.json({ 
            success: true, 
            redirect: `/test?assignment=${assignmentId}` 
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    // For other notification types, just mark as read
    await queryCockroachDB(
      `UPDATE new_team_notifications 
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [id, user!.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting notification:', error);
    return NextResponse.json(
      { error: 'Failed to accept notification' },
      { status: 500 }
    );
  }
}
