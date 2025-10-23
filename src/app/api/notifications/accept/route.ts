import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { dbPg } from '@/lib/db';
import { newTeamMemberships, newTeamPeople, newTeamGroups, newTeamUnits, newTeamRosterData } from '@/lib/db/schema/teams';
import { newTeamNotifications } from '@/lib/db/schema/notifications';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

// Zod validation schemas
const NotificationAcceptanceSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['team_invite', 'roster_link_invitation']),
  school: z.string().optional(),
  division: z.string().optional(),
  teamId: z.string().uuid().optional(),
  memberName: z.string().optional(),
  invitationId: z.string().uuid().optional()
});



export async function POST(request: NextRequest) {
  console.log('=== NOTIFICATION ACCEPTANCE DEBUG START ===');
  try {
    // Require authentication
    const { user, error } = await requireAuth(request);
    if (error) {
      console.log('Authentication error:', error);
      return error;
    }
    console.log('User authenticated:', user?.id);

    const body = await request.json();
    console.log('Request body:', body);
    
    // Validate request body with Zod
    const validationResult = NotificationAcceptanceSchema.safeParse(body);
    if (!validationResult.success) {
      console.log('Request validation failed:', validationResult.error.issues);
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: validationResult.error.issues 
      }, { status: 400 });
    }
    
    const { id, type, invitationId } = validationResult.data;
    console.log('Validated request data:', { id, type, invitationId });


    if (type === 'team_invite') {
      console.log('Processing team_invite notification:', id);
      // Handle team invitation acceptance using join code
      try {
      // Get the notification data to extract the join code using Drizzle ORM
      console.log('Fetching notification data for ID:', id, 'User ID:', user!.id);
      const notificationResult = await dbPg
        .select({
          data: newTeamNotifications.data,
          teamId: newTeamNotifications.teamId
        })
        .from(newTeamNotifications)
        .where(and(
          eq(newTeamNotifications.id, id),
          eq(newTeamNotifications.userId, user!.id)
        ))
        .limit(1);

      console.log('Notification query result:', notificationResult);

      if (notificationResult.length === 0) {
        console.log('Notification not found for user');
          return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
        }

      const notification = notificationResult[0];
      console.log('Found notification:', notification);
      const notificationData = notification.data as {
        invitation_id?: string;
        inviter_name?: string;
        student_name?: string;
        team_name?: string;
        team_slug?: string;
        joinCode?: string;
      };
      console.log('Notification data:', notificationData);
        const joinCode = notificationData?.joinCode;
      console.log('Extracted join code:', joinCode);

        if (!joinCode) {
          console.log('No join code found in notification data');
          return NextResponse.json({ error: 'Join code not found in notification' }, { status: 400 });
        }

        // Use the existing join team by code functionality
        console.log('Attempting to join team with code:', joinCode);
        const { cockroachDBTeamsService } = await import('@/lib/services/cockroachdb-teams');
        
        // Add retry logic for robustness
        let team: any = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!team && retryCount < maxRetries) {
          try {
            console.log(`Join team attempt ${retryCount + 1}/${maxRetries}`);
            team = await cockroachDBTeamsService.joinTeamByCode(user!.id, joinCode);
            if (team) {
              console.log('Join team successful on attempt:', retryCount + 1);
              break;
            }
          } catch (joinError) {
            console.error(`Join team attempt ${retryCount + 1} failed:`, joinError);
            retryCount++;
            if (retryCount < maxRetries) {
              console.log('Retrying in 1 second...');
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        console.log('Join team result:', team);

        if (!team) {
          console.log('Failed to join team after all retries - invalid or expired join code');
          return NextResponse.json({ error: 'Invalid or expired join code' }, { status: 400 });
        }

        console.log('Successfully joined team:', team.slug);

        // Verify the team membership was created using Drizzle ORM
        console.log('Verifying team membership was created...');
        const membershipVerification = await dbPg
          .select({
            id: newTeamMemberships.id,
            role: newTeamMemberships.role
          })
          .from(newTeamMemberships)
          .where(and(
            eq(newTeamMemberships.userId, user!.id),
            eq(newTeamMemberships.teamId, team.id)
          ))
          .limit(1);
        
        console.log('Membership verification result:', membershipVerification);
        
        if (membershipVerification.length === 0) {
          console.error('CRITICAL: Team membership was not created despite successful join!');
          return NextResponse.json({ error: 'Team membership creation failed' }, { status: 500 });
        }
        
        console.log('Team membership verified successfully');

        // Verify the new_team_people entry was created using Drizzle ORM
        console.log('Verifying new_team_people entry was created...');
        const peopleVerification = await dbPg
          .select({
            id: newTeamPeople.id,
            name: newTeamPeople.name,
            isAdmin: newTeamPeople.isAdmin
          })
          .from(newTeamPeople)
          .where(and(
            eq(newTeamPeople.userId, user!.id),
            eq(newTeamPeople.teamUnitId, team.id)
          ))
          .limit(1);
        
        console.log('People verification result:', peopleVerification);
        
        if (peopleVerification.length === 0) {
          console.warn('WARNING: new_team_people entry was not created, but membership exists');
          // Don't fail the request, just log the warning
        } else {
          console.log('new_team_people entry verified successfully');
        }

        // Mark the notification as read using Drizzle ORM
        console.log('Marking notification as read');
        await dbPg
          .update(newTeamNotifications)
          .set({
            isRead: true,
            readAt: new Date()
          })
          .where(and(
            eq(newTeamNotifications.id, id),
            eq(newTeamNotifications.userId, user!.id)
          ));

        console.log('Notification marked as read successfully');

        return NextResponse.json({ 
          success: true, 
          slug: team.slug,
          message: 'Team invitation accepted successfully',
          membershipId: membershipVerification[0].id,
          role: membershipVerification[0].role
        });
      } catch (inviteError) {
        console.error('Error accepting team invitation:', inviteError);
        return NextResponse.json({ error: 'Failed to accept team invitation' }, { status: 500 });
      }
    }


    if (type === 'roster_link_invitation') {
      console.log('Processing roster_link_invitation notification:', id);
      console.log('This is a roster link invitation - it SHOULD create team membership');
      console.log('Roster link invitations DO create team memberships and sync with new_team_people');
      
      // Get the notification data to extract team information using Drizzle ORM
      console.log('Fetching notification data for roster link invitation...');
      const notificationResult = await dbPg
        .select({
          data: newTeamNotifications.data,
          teamId: newTeamNotifications.teamId
        })
        .from(newTeamNotifications)
        .where(and(
          eq(newTeamNotifications.id, id),
          eq(newTeamNotifications.userId, user!.id)
        ))
        .limit(1);

      console.log('Notification query result:', notificationResult);

      if (notificationResult.length === 0) {
        console.log('Notification not found for user');
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }

      const notification = notificationResult[0];
      console.log('Found notification:', notification);
      const notificationData = notification.data as {
        invitation_id?: string;
        inviter_name?: string;
        student_name?: string;
        team_name?: string;
        team_slug?: string;
        joinCode?: string;
      };
      console.log('Notification data:', notificationData);
      const teamId = notification.teamId;
      console.log('Team ID from notification:', teamId);

      if (!teamId) {
        console.log('No team ID found in notification');
        return NextResponse.json({ error: 'Team ID not found in notification' }, { status: 400 });
      }

      // Check if user is already a team member using Drizzle ORM
      console.log('Checking if user is already a team member...');
      const existingMembership = await dbPg
        .select({
          id: newTeamMemberships.id,
          role: newTeamMemberships.role
        })
        .from(newTeamMemberships)
        .where(and(
          eq(newTeamMemberships.userId, user!.id),
          eq(newTeamMemberships.teamId, teamId)
        ))
        .limit(1);

      console.log('Existing membership check result:', existingMembership);

      if (existingMembership.length === 0) {
        console.log('User is not a team member, creating membership...');
        
        // Create team membership for the user
        const { cockroachDBTeamsService } = await import('@/lib/services/cockroachdb-teams');
        const membership = await cockroachDBTeamsService.createTeamMembership({
          userId: user!.id,
          teamId: teamId,
          role: 'member', // Default role for roster link invitations
          status: 'active'
        });
        
        console.log('Created team membership:', membership);
      } else {
        console.log('User is already a team member, updating status...');
        
        // Update existing membership to active using Drizzle ORM
        await dbPg
          .update(newTeamMemberships)
          .set({
            status: 'active',
            joinedAt: new Date()
          })
          .where(and(
            eq(newTeamMemberships.userId, user!.id),
            eq(newTeamMemberships.teamId, teamId)
          ));
        
        console.log('Updated existing membership to active');
      }

      // Handle roster linking - find and replace unlinked roster entries
      console.log('Processing roster linking...');
      
      // Get user's display name for the roster
      const userResult = await queryCockroachDB<{ display_name: string, username: string, email: string }>(
        `SELECT display_name, username, email FROM users WHERE id = $1`,
        [user!.id]
      );

      const userInfo = userResult.rows[0];
      const displayName = userInfo?.display_name || userInfo?.username || userInfo?.email?.split('@')[0] || 'Unknown User';

      console.log('User display name for roster linking:', displayName);

      // Find ALL unlinked roster entries in this team
      console.log('Finding all unlinked roster entries in team:', teamId);
      const unlinkedRosterResult = await dbPg
        .select({
          id: newTeamRosterData.id,
          studentName: newTeamRosterData.studentName,
          teamUnitId: newTeamRosterData.teamUnitId,
          eventName: newTeamRosterData.eventName,
          slotIndex: newTeamRosterData.slotIndex
        })
        .from(newTeamRosterData)
        .where(and(
          isNull(newTeamRosterData.userId),
          eq(newTeamRosterData.teamUnitId, teamId)
        ));

      console.log('Found unlinked roster entries:', unlinkedRosterResult);

      if (unlinkedRosterResult.length > 0) {
        console.log(`Found ${unlinkedRosterResult.length} unlinked roster entries to process`);
        
        // Process each unlinked entry
        for (const unlinkedEntry of unlinkedRosterResult) {
          console.log('Processing unlinked entry:', unlinkedEntry);

          // Update the roster entry to link it to the user using Drizzle ORM
          await dbPg
            .update(newTeamRosterData)
            .set({
              studentName: displayName,
              userId: user!.id
            })
            .where(eq(newTeamRosterData.id, unlinkedEntry.id));

          console.log(`Linked roster entry ${unlinkedEntry.id} to user ${user!.id}`);

          // Update any assignment rosters that reference this student
          await queryCockroachDB(
            `UPDATE new_team_assignment_roster 
             SET student_name = $1, user_id = $2
             WHERE student_name = $3 AND user_id IS NULL`,
            [displayName, user!.id, unlinkedEntry.studentName]
          );

          console.log(`Updated assignment rosters for ${unlinkedEntry.studentName}`);

          // Update any team posts that might reference the student
          await queryCockroachDB(
            `UPDATE new_team_posts 
             SET content = REPLACE(content, $1, $2)
             WHERE team_id = $3 AND content LIKE '%' || $1 || '%'`,
            [unlinkedEntry.studentName, displayName, teamId]
          );

          console.log(`Updated team posts for ${unlinkedEntry.studentName}`);

          // Update any team events that might reference the student
          await queryCockroachDB(
            `UPDATE new_team_events 
             SET title = REPLACE(title, $1, $2),
                 description = REPLACE(description, $1, $2)
             WHERE team_id = $3 AND (title LIKE '%' || $1 || '%' OR description LIKE '%' || $1 || '%')`,
            [unlinkedEntry.studentName, displayName, teamId]
          );

          console.log(`Updated team events for ${unlinkedEntry.studentName}`);

          // Update assignment analytics that might contain the student name
          await queryCockroachDB(
            `UPDATE new_team_assignment_analytics 
             SET student_name = $1, user_id = $2
             WHERE student_name = $3 AND user_id IS NULL`,
            [displayName, user!.id, unlinkedEntry.studentName]
          );

          console.log(`Updated assignment analytics for ${unlinkedEntry.studentName}`);

          // Update any materials or other team content that might reference the student
          await queryCockroachDB(
            `UPDATE new_team_materials 
             SET title = REPLACE(title, $1, $2),
                 description = REPLACE(description, $1, $2)
             WHERE team_id = $3 AND (title LIKE '%' || $1 || '%' OR description LIKE '%' || $1 || '%')`,
            [unlinkedEntry.studentName, displayName, teamId]
          );

          console.log(`Updated team materials for ${unlinkedEntry.studentName}`);
        }

        // Update the new_team_people entry to reflect the proper name using Drizzle ORM
        console.log('Updating new_team_people entry with proper name');
        
        await dbPg
          .update(newTeamPeople)
          .set({
            name: displayName
          })
          .where(and(
            eq(newTeamPeople.userId, user!.id),
            eq(newTeamPeople.teamUnitId, teamId)
          ));
        
        console.log('Updated new_team_people with proper name');

        console.log(`Successfully linked ${unlinkedRosterResult.length} roster entries to user`);
      } else {
        console.log('No unlinked roster entries found in team');
      }

      // Mark the notification as read using Drizzle ORM
      console.log('Marking roster link invitation as read...');
      await dbPg
        .update(newTeamNotifications)
        .set({
          isRead: true,
          readAt: new Date()
        })
        .where(and(
          eq(newTeamNotifications.id, id),
          eq(newTeamNotifications.userId, user!.id)
        ));
      console.log('Roster link invitation marked as read');

      // Verify the team membership was created using Drizzle ORM
      console.log('Verifying team membership was created...');
      const membershipVerification = await dbPg
        .select({
          id: newTeamMemberships.id,
          role: newTeamMemberships.role
        })
        .from(newTeamMemberships)
        .where(and(
          eq(newTeamMemberships.userId, user!.id),
          eq(newTeamMemberships.teamId, teamId)
        ))
        .limit(1);
      
      console.log('Membership verification result:', membershipVerification);
      
      if (membershipVerification.length === 0) {
        console.error('CRITICAL: Team membership was not created despite successful roster link!');
        return NextResponse.json({ error: 'Team membership creation failed' }, { status: 500 });
      }
      
      console.log('Team membership verified successfully');

      // Verify the new_team_people entry was created using Drizzle ORM
      console.log('Verifying new_team_people entry was created...');
      const peopleVerification = await dbPg
        .select({
          id: newTeamPeople.id,
          name: newTeamPeople.name,
          isAdmin: newTeamPeople.isAdmin
        })
        .from(newTeamPeople)
        .where(and(
          eq(newTeamPeople.userId, user!.id),
          eq(newTeamPeople.teamUnitId, teamId)
        ))
        .limit(1);
      
      console.log('People verification result:', peopleVerification);
      
      if (peopleVerification.length === 0) {
        console.warn('WARNING: new_team_people entry was not created, but membership exists');
        // Don't fail the request, just log the warning
      } else {
        console.log('new_team_people entry verified successfully');
      }

      // Get team information for redirect using Drizzle ORM
      console.log('Getting team information for redirect...');
      const teamResult = await dbPg
        .select({
          slug: newTeamGroups.slug,
          school: newTeamGroups.school,
          division: newTeamGroups.division
        })
        .from(newTeamGroups)
        .innerJoin(newTeamUnits, eq(newTeamGroups.id, newTeamUnits.groupId))
        .where(eq(newTeamUnits.id, teamId))
        .limit(1);

      console.log('Team information result:', teamResult);

      if (teamResult.length > 0) {
        const team = teamResult[0];
        console.log('Redirecting to team page:', team.slug);
          return NextResponse.json({ 
            success: true, 
          slug: team.slug,
          message: 'Roster link invitation accepted successfully',
          membershipId: membershipVerification[0].id,
          role: membershipVerification[0].role
        });
      }

      console.log('Roster link invitation processed successfully - redirecting to teams page');
      return NextResponse.json({ 
        success: true, 
        message: 'Roster link invitation accepted successfully',
        membershipId: membershipVerification[0].id,
        role: membershipVerification[0].role
      });
    }

    // For other notification types, just mark as read using Drizzle ORM
    await dbPg
      .update(newTeamNotifications)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(and(
        eq(newTeamNotifications.id, id),
        eq(newTeamNotifications.userId, user!.id)
      ));

    console.log('Processing other notification type:', type);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting notification:', error);
    return NextResponse.json(
      { error: 'Failed to accept notification' },
      { status: 500 }
    );
  } finally {
    console.log('=== NOTIFICATION ACCEPTANCE DEBUG END ===');
  }
}
