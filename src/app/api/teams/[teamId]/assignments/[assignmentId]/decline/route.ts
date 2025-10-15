import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { dbPg } from '@/lib/db';
import { 
  newTeamAssignments,
  newTeamAssignmentRoster,
  newTeamAssignmentSubmissions,
  // newTeamNotifications // DISABLED: Assignment notifications removed
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { resolveTeamSlugToUnits, getUserTeamMemberships } from '@/lib/utils/team-resolver';

// POST /api/teams/[teamId]/assignments/[assignmentId]/decline - Decline an assignment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; assignmentId: string }> }
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

    const { teamId, assignmentId } = await params;

    // Resolve team slug to team units
    const teamInfo = await resolveTeamSlugToUnits(teamId);
    
    // Check if user is member of any team unit in this group
    const memberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);

    if (memberships.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // Verify assignment exists and user is assigned to it
    const assignmentResult = await dbPg
      .select({
        id: newTeamAssignments.id,
        title: newTeamAssignments.title,
        teamId: newTeamAssignments.teamId
      })
      .from(newTeamAssignments)
      .where(
        and(
          eq(newTeamAssignments.id, assignmentId),
          eq(newTeamAssignments.teamId, teamInfo.teamUnitIds[0]) // Check against first team unit
        )
      )
      .limit(1);

    if (assignmentResult.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const assignment = assignmentResult[0];

    // Check if user is in the assignment roster
    const rosterResult = await dbPg
      .select({
        id: newTeamAssignmentRoster.id,
        userId: newTeamAssignmentRoster.userId
      })
      .from(newTeamAssignmentRoster)
      .where(
        and(
          eq(newTeamAssignmentRoster.assignmentId, assignmentId),
          eq(newTeamAssignmentRoster.userId, user.id)
        )
      )
      .limit(1);

    if (rosterResult.length === 0) {
      return NextResponse.json({ error: 'You are not assigned to this assignment' }, { status: 403 });
    }

    // Check if user has already submitted
    const submissionResult = await dbPg
      .select({
        id: newTeamAssignmentSubmissions.id,
        status: newTeamAssignmentSubmissions.status
      })
      .from(newTeamAssignmentSubmissions)
      .where(
        and(
          eq(newTeamAssignmentSubmissions.assignmentId, assignmentId),
          eq(newTeamAssignmentSubmissions.userId, user.id)
        )
      )
      .limit(1);

    if (submissionResult.length > 0) {
      return NextResponse.json({ error: 'Cannot decline assignment that has already been submitted' }, { status: 400 });
    }

    // Remove user from assignment roster
    await dbPg
      .delete(newTeamAssignmentRoster)
      .where(
        and(
          eq(newTeamAssignmentRoster.assignmentId, assignmentId),
          eq(newTeamAssignmentRoster.userId, user.id)
        )
      );

    // ASSIGNMENT NOTIFICATIONS DISABLED - Users should use assignments tab instead
    // TODO: Re-enable if needed in the future
    /*
    // Create a notification for the assignment creator (if not the user themselves)
    const assignmentCreatorResult = await dbPg
      .select({ createdBy: newTeamAssignments.createdBy })
      .from(newTeamAssignments)
      .where(eq(newTeamAssignments.id, assignmentId))
      .limit(1);

    if (assignmentCreatorResult.length > 0 && assignmentCreatorResult[0].createdBy !== user.id) {
      await dbPg
        .insert(newTeamNotifications)
        .values({
          userId: assignmentCreatorResult[0].createdBy,
          teamId: teamInfo.groupId,
          notificationType: 'assignment_declined',
          title: `Assignment Declined: ${assignment.title}`,
          message: `A team member has declined the assignment "${assignment.title}"`,
          data: { 
            assignment_id: assignmentId, 
            declined_by: user.id,
            declined_at: new Date().toISOString()
          }
        });
    }
    */

    return NextResponse.json({ 
      message: 'Assignment declined successfully',
      assignment: {
        id: assignmentId,
        title: assignment.title
      }
    });

  } catch (error) {
    console.error('Error declining assignment:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
