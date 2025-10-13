import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { dbPg } from '@/lib/db';
import { 
  newTeamAssignments, 
  newTeamAssignmentRoster, 
  newTeamAssignmentQuestions,
  newTeamNotifications,
  newTeamMemberships,
  users
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { NotificationSyncService } from '@/lib/services/notification-sync';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; subteamId: string }> }
) {
  try {
    const { subteamId } = await params;
    const body = await request.json();

    const {
      title,
      description,
      assignment_type,
      due_date,
      points,
      time_limit_minutes,
      questions,
      roster_members,
      codebusters_params
    } = body;

    console.log('=== CODEBUSTERS ASSIGNMENT CREATION DEBUG ===');
    console.log('Points received:', points);
    console.log('Questions count:', questions?.length || 0);
    console.log('Codebusters params:', codebusters_params);
    console.log('Calculated points should be:', (codebusters_params?.questionCount || 0) * 10);

    // Get user from Supabase
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a member of this subteam
    const membershipResult = await dbPg
      .select()
      .from(newTeamMemberships)
      .where(
        and(
          eq(newTeamMemberships.teamId, subteamId),
          eq(newTeamMemberships.userId, user.id),
          eq(newTeamMemberships.status, 'active')
        )
      )
      .limit(1);

    if (membershipResult.length === 0) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
    }

    // Create the assignment
    console.log('Creating Codebusters assignment with eventName: Codebusters');
    const assignmentResult = await dbPg
      .insert(newTeamAssignments)
      .values({
        title,
        description: description || '',
        assignmentType: assignment_type || 'homework',
        dueDate: due_date || null,
        points: points || 100,
        timeLimitMinutes: time_limit_minutes || 15,
        eventName: 'Codebusters',
        teamId: subteamId,
        createdBy: user.id,
        isRequired: true,
        maxAttempts: null
      })
      .returning({ id: newTeamAssignments.id });

    if (assignmentResult.length === 0) {
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }

    const assignment = assignmentResult[0];
    console.log('Created Codebusters assignment with ID:', assignment.id);

    // Create roster assignments for selected members
    if (roster_members && roster_members.length > 0) {
      // Get team members to match roster names with user IDs
      const teamMembersResult = await dbPg
        .select({
          userId: newTeamMemberships.userId,
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(newTeamMemberships)
        .leftJoin(users, eq(newTeamMemberships.userId, users.id))
        .where(
          and(
            eq(newTeamMemberships.teamId, subteamId),
            eq(newTeamMemberships.status, 'active')
          )
        );

      // Create a map of names to user IDs
      const nameToUserId = new Map<string, string>();
      teamMembersResult.forEach(member => {
        const displayName = member.displayName ||
          (member.firstName && member.lastName
            ? `${member.firstName} ${member.lastName}`
            : null);
        if (displayName) {
          nameToUserId.set(displayName.toLowerCase().trim(), member.userId);
        }
      });

      const rosterInserts = roster_members.map((studentName: string) => {
        const userId = nameToUserId.get(studentName.toLowerCase().trim()) || null;
        return {
          assignmentId: assignment.id,
          studentName,
          userId,
          subteamId: subteamId
        };
      });

      await dbPg
        .insert(newTeamAssignmentRoster)
        .values(rosterInserts);
    }

    // Save Codebusters parameters for dynamic question generation
    if (codebusters_params) {
      console.log('Saving Codebusters parameters:', codebusters_params);
      const parameterInsert = {
        assignmentId: assignment.id,
        questionText: 'Codebusters Assignment Parameters',
        questionType: 'codebusters',
        options: JSON.stringify({
          type: 'parameters',
          ...codebusters_params
        }),
        correctAnswer: null, // No correct answer for parameters
        points: 0, // Parameters don't have points
        orderIndex: 0,
        imageData: null
      };

      console.log('Parameter insert data:', parameterInsert);
      await dbPg
        .insert(newTeamAssignmentQuestions)
        .values([parameterInsert]);
      console.log('Successfully saved Codebusters parameters');
    } else {
      console.log('No codebusters_params provided, skipping parameter save');
    }

    // Check if creator is in the selected roster
    let creatorInRoster = false;
    if (roster_members && roster_members.length > 0) {
      const creatorResult = await dbPg
        .select({
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (creatorResult.length > 0) {
        const creator = creatorResult[0];
        const creatorDisplayName = creator.displayName ||
          (creator.firstName && creator.lastName ? `${creator.firstName} ${creator.lastName}` : null);
        
        if (creatorDisplayName) {
          creatorInRoster = roster_members.some((memberName: string) => 
            memberName.toLowerCase().trim() === creatorDisplayName.toLowerCase().trim()
          );
        }
      }
    }

    // Create notifications for all team members in this subteam
    const whereConditions = [
      eq(newTeamMemberships.teamId, subteamId),
      eq(newTeamMemberships.status, 'active')
    ];

    if (!creatorInRoster) {
      whereConditions.push(sql`${newTeamMemberships.userId} != ${user.id}`);
    }

    const membersResult = await dbPg
      .select({ userId: newTeamMemberships.userId })
      .from(newTeamMemberships)
      .where(and(...whereConditions));

    // Create general notifications for each member using Drizzle ORM
    for (const member of membersResult) {
      const notificationResult = await dbPg
        .insert(newTeamNotifications)
        .values({
          userId: member.userId,
          teamId: subteamId,
          notificationType: 'assignment_invitation',
          title: `New Codebusters assignment: ${title}`,
          message: description || 'You have been assigned to complete this Codebusters assignment',
          data: {
            assignment_id: assignment.id,
            due_date: due_date,
            assignment_type: assignment_type,
            points: points
          }
        })
        .returning({ id: newTeamNotifications.id });

      // Sync notification to Supabase for client-side access
      if (notificationResult.length > 0) {
        try {
          await NotificationSyncService.syncNotificationToSupabase(notificationResult[0].id);
        } catch (syncError) {
          console.error('Failed to sync Codebusters assignment notification to Supabase:', syncError);
          // Don't fail the entire request if sync fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        title,
        description,
        assignmentType: assignment_type,
        dueDate: due_date,
        points,
        timeLimitMinutes: time_limit_minutes,
        eventName: 'Codebusters',
        teamId: subteamId,
        createdBy: user.id
      }
    });

  } catch (error) {
    console.error('Error creating Codebusters assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
}
