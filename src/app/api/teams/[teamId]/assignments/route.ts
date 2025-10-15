import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { resolveTeamSlugToUnits, getUserTeamMemberships } from '@/lib/utils/team-resolver';
import { hasLeadershipAccessCockroach } from '@/lib/utils/team-auth-v2';
import { dbPg } from '@/lib/db';
import { 
  newTeamAssignments,
  newTeamAssignmentSubmissions,
  newTeamAssignmentRoster,
  newTeamAssignmentQuestions,
  // newTeamMemberships, // DISABLED: Assignment notifications removed
  // newTeamNotifications, // DISABLED: Assignment notifications removed
  users 
} from '@/lib/db/schema';
import { eq, and, inArray, sql, desc, asc } from 'drizzle-orm';
import { parseDifficulty } from '@/lib/types/difficulty';
import { AssignmentQuestionSchema } from '@/lib/schemas/question';
import { z } from 'zod';

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

        const rosterCount = rosterResult.length;
        const submittedCount = parseInt(String(submissionCountResult[0]?.submittedCount || 0), 10);
        
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
          roster_count: rosterCount,
          submitted_count: submittedCount
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
    const { title, description, assignment_type = 'homework', due_date, is_required = true, max_attempts, questions } = body;

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

    /**
     * Save assignment questions to database
     *
     * Frontend to Backend Conversion:
     * - Frontend sends: { answers: [0], question_text: "...", question_type: "multiple_choice", options: [...] }
     * - Backend stores: { correct_answer: "A", question_text: "...", question_type: "multiple_choice", options: "[...]" }
     *
     * CRITICAL VALIDATION: All questions MUST have a valid answers array before being saved.
     * Questions without valid answers are REJECTED with a detailed error.
     */
    if (questions && Array.isArray(questions) && questions.length > 0) {
      // Strict validation of all questions before processing
      try {
        const validatedQuestions = questions.map((q, index) => {
          try {
            return AssignmentQuestionSchema.parse(q);
          } catch (error) {
            if (error instanceof z.ZodError) {
              const errorMessages = error.issues?.map(err => `${err.path.join('.')}: ${err.message}`) || ['Unknown validation error'];
              throw new Error(`Question ${index + 1} validation failed:\n${errorMessages.join('\n')}`);
            }
            throw error;
          }
        });
        console.log('🎯 DIFFICULTY DEBUG - All questions validated successfully:', validatedQuestions.length);
      } catch (error) {
        console.error('🎯 DIFFICULTY ERROR - Question validation failed:', error);
        return NextResponse.json({ 
          error: 'Invalid questions provided', 
          details: error instanceof Error ? error.message : 'Unknown validation error' 
        }, { status: 400 });
      }
      
      // Debug logging for received questions
      console.log('🎯 DIFFICULTY DEBUG - Assignment creation received questions:', 
        questions.slice(0, 3).map((q: any, idx: number) => ({
          index: idx + 1,
          question: q.question_text?.substring(0, 50) + '...',
          difficulty: q.difficulty,
          hasDifficulty: q.difficulty !== undefined,
          difficultyType: typeof q.difficulty
        }))
      );
      const questionInserts = questions.map((question: any, index: number) => {
        /**
         * Validate question has required fields
         */
        if (!question.question_text || question.question_text.trim() === '') {
          throw new Error(`Question ${index + 1} is missing question_text`);
        }

        if (!question.question_type) {
          throw new Error(`Question ${index + 1} is missing question_type`);
        }

        /**
         * CRITICAL: Validate answers field
         *
         * Every question MUST have a valid, non-empty answers array.
         * This is the source of truth for grading.
         */
        if (!question.answers || !Array.isArray(question.answers) || question.answers.length === 0) {
          const errorDetails = {
            questionNumber: index + 1,
            questionText: question.question_text?.substring(0, 100),
            questionType: question.question_type,
            hasAnswers: !!question.answers,
            answersType: typeof question.answers,
            answersValue: question.answers,
            hasCorrectAnswer: !!question.correct_answer,
            correctAnswerValue: question.correct_answer
          };

          console.error(`❌ INVALID QUESTION - Cannot save question without valid answers:`, errorDetails);

          throw new Error(
            `Cannot create assignment: Question ${index + 1} has no valid answers. ` +
            `Question: "${question.question_text?.substring(0, 50)}..." ` +
            `All questions must have a valid answers array before being saved.`
          );
        }

        /**
         * Convert frontend answers format to database format
         *
         * Frontend: answers = [0] (numeric indices for MCQ)
         * Database: correct_answer = "A" (letter for MCQ)
         *
         * Frontend: answers = ["Paris"] (strings for FRQ)
         * Database: correct_answer = "Paris" (string for FRQ)
         */
        let correctAnswer: string | null = null;

        if (question.question_type === 'multiple_choice') {
          // Convert numeric indices back to letters for database storage
          correctAnswer = question.answers
            .map((ans: number) => {
              if (typeof ans !== 'number' || ans < 0) {
                throw new Error(`Invalid answer index ${ans} for question ${index + 1}`);
              }
              return String.fromCharCode(65 + ans);
            })
            .join(',');
        } else {
          // For FRQ/Codebusters, store answers as-is
          correctAnswer = question.answers
            .map((ans: any) => String(ans))
            .join(',');
        }

        // Double-check we have a valid correct_answer
        if (!correctAnswer || correctAnswer.trim() === '') {
          throw new Error(`Failed to convert answers to correct_answer for question ${index + 1}`);
        }

        const questionInsert = {
          assignmentId: assignment.id,
          questionText: question.question_text,
          questionType: question.question_type,
          options: question.options ? JSON.stringify(question.options) : null,
          correctAnswer: correctAnswer, // GUARANTEED: Valid, non-empty string
          points: question.points || 1,
          orderIndex: question.order_index !== undefined ? question.order_index : index,
          imageData: question.imageData || null,
          difficulty: parseDifficulty(question.difficulty).toString() // Strict validation - convert to string for database
        };
        
        // Debug logging for database insert
        if (index < 3) { // Log first 3 questions
          console.log(`🎯 DIFFICULTY DEBUG - Database insert for question ${index + 1}:`, {
            question: questionInsert.questionText?.substring(0, 50) + '...',
            difficulty: questionInsert.difficulty,
            originalDifficulty: question.difficulty,
            hasOriginalDifficulty: question.difficulty !== undefined,
            difficultyType: typeof questionInsert.difficulty
          });
        }
        
        return questionInsert;
      });

      await dbPg
        .insert(newTeamAssignmentQuestions)
        .values(questionInserts);
    }

    // ASSIGNMENT NOTIFICATIONS DISABLED - Users should use assignments tab instead
    // TODO: Re-enable if needed in the future
    /*
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
    */

    return NextResponse.json({ assignment });

  } catch (error) {
    console.error('Error creating team assignment:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
