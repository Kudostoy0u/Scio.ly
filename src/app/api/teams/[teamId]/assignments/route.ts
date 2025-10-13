import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { resolveTeamSlugToUnits, getUserTeamMemberships } from '@/lib/utils/team-resolver';
import { hasLeadershipAccessCockroach } from '@/lib/utils/team-auth-v2';
import { dbPg } from '@/lib/db';
import { 
  newTeamAssignments,
  newTeamAssignmentSubmissions,
  newTeamAssignmentRoster,
  newTeamMemberships,
  newTeamNotifications,
  users 
} from '@/lib/db/schema';
import { eq, and, inArray, sql, desc, asc } from 'drizzle-orm';

// GET /api/teams/[teamId]/assignments - Get team assignments
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchAssignments)
// - src/app/hooks/useEnhancedTeamData.ts (fetchAssignments)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  // const startTime = Date.now();
  console.log('📚 [ASSIGNMENTS API] GET request started', { 
    timestamp: new Date().toISOString(),
    url: request.url 
  });

  try {
    if (!process.env.DATABASE_URL) {
      console.log('❌ [ASSIGNMENTS API] Database configuration missing');
      return NextResponse.json({
        error: 'Database configuration error',
        details: 'DATABASE_URL environment variable is missing'
      }, { status: 500 });
    }

    const user = await getServerUser();
    if (!user?.id) {
      console.log('❌ [ASSIGNMENTS API] Unauthorized - no user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await params;

    // Resolve team slug to team units
    const teamInfo = await resolveTeamSlugToUnits(teamId);
    
    // Check if user is member of any team unit in this group
    const memberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);

    if (memberships.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // Get assignments with creator information for all team units in this group using Drizzle ORM
    const assignmentsResult = await dbPg
      .select({
        id: newTeamAssignments.id,
        title: newTeamAssignments.title,
        description: newTeamAssignments.description,
        assignmentType: newTeamAssignments.assignmentType,
        dueDate: newTeamAssignments.dueDate,
        points: newTeamAssignments.points,
        isRequired: newTeamAssignments.isRequired,
        maxAttempts: newTeamAssignments.maxAttempts,
        timeLimitMinutes: newTeamAssignments.timeLimitMinutes,
        createdAt: newTeamAssignments.createdAt,
        updatedAt: newTeamAssignments.updatedAt,
        creatorEmail: users.email,
        creatorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`
      })
      .from(newTeamAssignments)
      .innerJoin(users, eq(newTeamAssignments.createdBy, users.id))
      .where(inArray(newTeamAssignments.teamId, teamInfo.teamUnitIds))
      .orderBy(asc(newTeamAssignments.dueDate), desc(newTeamAssignments.createdAt));

    // Get submission status for each assignment using Drizzle ORM
    const assignmentsWithSubmissions = await Promise.all(
      assignmentsResult.map(async (assignment) => {
        // Get user's submission using Drizzle ORM
        const submissionResult = await dbPg
          .select({
            status: newTeamAssignmentSubmissions.status,
            submittedAt: newTeamAssignmentSubmissions.submittedAt,
            grade: newTeamAssignmentSubmissions.grade,
            attemptNumber: newTeamAssignmentSubmissions.attemptNumber
          })
          .from(newTeamAssignmentSubmissions)
          .where(
            and(
              eq(newTeamAssignmentSubmissions.assignmentId, assignment.id),
              eq(newTeamAssignmentSubmissions.userId, user.id)
            )
          )
          .orderBy(desc(newTeamAssignmentSubmissions.submittedAt))
          .limit(1);

        // Get roster information using Drizzle ORM
        const rosterResult = await dbPg
          .select({
            student_name: newTeamAssignmentRoster.studentName,
            user_id: newTeamAssignmentRoster.userId,
            email: users.email,
            username: users.username,
            display_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`
          })
          .from(newTeamAssignmentRoster)
          .leftJoin(users, eq(newTeamAssignmentRoster.userId, users.id))
          .where(eq(newTeamAssignmentRoster.assignmentId, assignment.id))
          .orderBy(newTeamAssignmentRoster.studentName);

        // Get submission counts using Drizzle ORM (include both 'submitted' and 'graded' statuses)
        const submissionCountResult = await dbPg
          .select({ submittedCount: sql<number>`COUNT(*)` })
          .from(newTeamAssignmentSubmissions)
          .where(
            and(
              eq(newTeamAssignmentSubmissions.assignmentId, assignment.id),
              sql`${newTeamAssignmentSubmissions.status} IN ('submitted', 'graded')`
            )
          );

        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          assignment_type: assignment.assignmentType,
          due_date: assignment.dueDate?.toISOString(),
          points: assignment.points,
          is_required: assignment.isRequired,
          max_attempts: assignment.maxAttempts,
          time_limit_minutes: assignment.timeLimitMinutes,
          created_at: assignment.createdAt?.toISOString() || new Date().toISOString(),
          updated_at: assignment.updatedAt?.toISOString() || new Date().toISOString(),
          creator_email: assignment.creatorEmail,
          creator_name: assignment.creatorName,
          user_submission: submissionResult[0] ? {
            status: submissionResult[0].status,
            submitted_at: submissionResult[0].submittedAt?.toISOString() || new Date().toISOString(),
            grade: submissionResult[0].grade,
            attempt_number: submissionResult[0].attemptNumber
          } : null,
          roster: rosterResult,
          roster_count: rosterResult.length,
          submitted_count: submissionCountResult[0]?.submittedCount || 0
        };
      })
    );

    return NextResponse.json({ assignments: assignmentsWithSubmissions });

  } catch (error) {
    console.error('Error fetching team assignments:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/teams/[teamId]/assignments - Create new assignment
// Frontend Usage:
// - src/app/teams/components/assignment/assignmentUtils.ts (createAssignment)
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
    const { title, description, assignment_type = 'homework', due_date, is_required = true, max_attempts } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Resolve team slug to team units
    const teamInfo = await resolveTeamSlugToUnits(teamId);
    
    // Check if user has leadership privileges in this team group (including team creator)
    const hasLeadership = await hasLeadershipAccessCockroach(user.id, teamInfo.groupId);
    if (!hasLeadership) {
      return NextResponse.json({ error: 'Only captains and co-captains can create assignments' }, { status: 403 });
    }

    // Create the assignment for the first team unit (or the one the user is captain of)
    const memberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);
    const captainMembership = memberships.find(m => ['captain', 'co_captain'].includes(m.role));
    const targetTeamId = captainMembership?.team_id || teamInfo.teamUnitIds[0];
    
    // Create assignment using Drizzle ORM
    const [assignment] = await dbPg
      .insert(newTeamAssignments)
      .values({
        teamId: targetTeamId,
        createdBy: user.id,
        title,
        description,
        assignmentType: assignment_type,
        dueDate: due_date ? new Date(due_date) : null,
        isRequired: is_required,
        maxAttempts: max_attempts
      })
      .returning();

    // Create notifications for all team members in the group using Drizzle ORM
    const membersResult = await dbPg
      .select({ userId: newTeamMemberships.userId })
      .from(newTeamMemberships)
      .where(
        and(
          inArray(newTeamMemberships.teamId, teamInfo.teamUnitIds),
          eq(newTeamMemberships.status, 'active'),
          sql`${newTeamMemberships.userId} != ${user.id}`
        )
      );

    // Create notifications for each member using Drizzle ORM
    for (const member of membersResult) {
      await dbPg
        .insert(newTeamNotifications)
        .values({
          userId: member.userId,
          teamId: teamInfo.groupId,
          notificationType: 'new_assignment',
          title: `New ${assignment_type}: ${title}`,
          message: description || 'New assignment posted',
          data: { assignment_id: assignment.id, due_date: due_date }
        });
    }

    return NextResponse.json({ assignment });

  } catch (error) {
    console.error('Error creating team assignment:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
