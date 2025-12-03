import { dbPg } from "@/lib/db";
import {
  newTeamAssignmentAnalytics,
  newTeamAssignmentQuestionResponses,
  newTeamAssignmentQuestions,
  newTeamAssignmentRoster,
  newTeamAssignmentSubmissions,
  newTeamAssignments,
} from "@/lib/db/schema/assignments";
import { users } from "@/lib/db/schema/core";
import { UUIDSchema } from "@/lib/schemas/teams-validation";
import { getServerUser } from "@/lib/supabaseServer";
import {
  handleError,
  handleForbiddenError,
  handleNotFoundError,
  handleUnauthorizedError,
  validateEnvironment,
} from "@/lib/utils/error-handler";
import { getUserTeamMemberships, resolveTeamSlugToUnits } from "@/lib/utils/team-resolver";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/teams/[teamId]/assignments/[assignmentId] - Get detailed assignment information
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string; assignmentId: string }> }
) {
  try {
    const envError = validateEnvironment();
    if (envError) {
      return envError;
    }

    const user = await getServerUser();
    if (!user?.id) {
      return handleUnauthorizedError();
    }

    const { teamId, assignmentId } = await params;

    // Validate assignmentId
    try {
      UUIDSchema.parse(assignmentId);
    } catch (_error) {
      return handleNotFoundError("Assignment");
    }

    // Resolve team slug to team units
    const teamInfo = await resolveTeamSlugToUnits(teamId);

    // Check if user is member of any team unit in this group
    const memberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);

    if (memberships.length === 0) {
      return handleForbiddenError("Not a team member");
    }

    // Get assignment details using Drizzle ORM
    const [assignmentResult] = await dbPg
      .select({
        id: newTeamAssignments.id,
        title: newTeamAssignments.title,
        description: newTeamAssignments.description,
        assignment_type: newTeamAssignments.assignmentType,
        event_name: newTeamAssignments.eventName,
        due_date: newTeamAssignments.dueDate,
        points: newTeamAssignments.points,
        is_required: newTeamAssignments.isRequired,
        max_attempts: newTeamAssignments.maxAttempts,
        time_limit_minutes: newTeamAssignments.timeLimitMinutes,
        created_at: newTeamAssignments.createdAt,
        updated_at: newTeamAssignments.updatedAt,
        creator_email: users.email,
        creator_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      })
      .from(newTeamAssignments)
      .innerJoin(users, eq(newTeamAssignments.createdBy, users.id))
      .where(
        and(
          eq(newTeamAssignments.id, assignmentId),
          inArray(newTeamAssignments.teamId, teamInfo.teamUnitIds)
        )
      )
      .limit(1);

    if (!assignmentResult) {
      return handleNotFoundError("Assignment");
    }

    const assignment = assignmentResult;

    // Get assignment questions using Drizzle ORM
    const questionsResult = await dbPg
      .select({
        id: newTeamAssignmentQuestions.id,
        question_text: newTeamAssignmentQuestions.questionText,
        question_type: newTeamAssignmentQuestions.questionType,
        options: newTeamAssignmentQuestions.options,
        correct_answer: newTeamAssignmentQuestions.correctAnswer,
        points: newTeamAssignmentQuestions.points,
        order_index: newTeamAssignmentQuestions.orderIndex,
      })
      .from(newTeamAssignmentQuestions)
      .where(eq(newTeamAssignmentQuestions.assignmentId, assignmentId))
      .orderBy(asc(newTeamAssignmentQuestions.orderIndex));

    // Get roster assignments using Drizzle ORM
    const rosterResult = await dbPg
      .select({
        id: newTeamAssignmentRoster.id,
        student_name: newTeamAssignmentRoster.studentName,
        user_id: newTeamAssignmentRoster.userId,
        subteam_id: newTeamAssignmentRoster.subteamId,
        assigned_at: newTeamAssignmentRoster.assignedAt,
        email: users.email,
        display_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      })
      .from(newTeamAssignmentRoster)
      .leftJoin(users, eq(newTeamAssignmentRoster.userId, users.id))
      .where(eq(newTeamAssignmentRoster.assignmentId, assignmentId))
      .orderBy(asc(newTeamAssignmentRoster.studentName));

    // Get submission status for each roster member using Drizzle ORM
    const rosterWithSubmissions = await Promise.all(
      rosterResult.map(async (rosterMember) => {
        let submission: {
          id: string;
          status: string | null;
          grade: number | null;
          attempt_number: number | null;
          submitted_at: string | null;
        } | null = null;
        let analytics: {
          total_questions: number;
          correct_answers: number;
          total_points: number;
          earned_points: number;
          completion_time_seconds: number | null;
          submitted_at: string | null;
        } | null = null;

        if (rosterMember.user_id) {
          // Get latest submission using Drizzle ORM
          const [submissionResult] = await dbPg
            .select({
              id: newTeamAssignmentSubmissions.id,
              status: newTeamAssignmentSubmissions.status,
              grade: newTeamAssignmentSubmissions.grade,
              attempt_number: newTeamAssignmentSubmissions.attemptNumber,
              submitted_at: newTeamAssignmentSubmissions.submittedAt,
            })
            .from(newTeamAssignmentSubmissions)
            .where(
              and(
                eq(newTeamAssignmentSubmissions.assignmentId, assignmentId),
                eq(newTeamAssignmentSubmissions.userId, rosterMember.user_id)
              )
            )
            .orderBy(desc(newTeamAssignmentSubmissions.submittedAt))
            .limit(1);

          if (submissionResult) {
            submission = submissionResult;

            // Get analytics for this submission using Drizzle ORM
            const [analyticsResult] = await dbPg
              .select({
                total_questions: newTeamAssignmentAnalytics.totalQuestions,
                correct_answers: newTeamAssignmentAnalytics.correctAnswers,
                total_points: newTeamAssignmentAnalytics.totalPoints,
                earned_points: newTeamAssignmentAnalytics.earnedPoints,
                completion_time_seconds: newTeamAssignmentAnalytics.completionTimeSeconds,
                submitted_at: newTeamAssignmentAnalytics.submittedAt,
              })
              .from(newTeamAssignmentAnalytics)
              .where(
                and(
                  eq(newTeamAssignmentAnalytics.assignmentId, assignmentId),
                  eq(newTeamAssignmentAnalytics.userId, rosterMember.user_id)
                )
              )
              .orderBy(desc(newTeamAssignmentAnalytics.submittedAt))
              .limit(1);

            if (analyticsResult) {
              analytics = analyticsResult;
            }
          }
        }

        return {
          id: rosterMember.id,
          student_name: rosterMember.student_name,
          user_id: rosterMember.user_id,
          subteam_id: rosterMember.subteam_id,
          assigned_at: rosterMember.assigned_at,
          email: rosterMember.email,
          display_name: rosterMember.display_name,
          submission,
          analytics,
        };
      })
    );

    // Get question responses for detailed analysis (if user is captain) using Drizzle ORM
    const isCaptain = memberships.some((m) => ["captain", "co_captain"].includes(m.role));
    let questionResponses: Array<{
      submission_id: string;
      question_id: string;
      response_text: string | null;
      is_correct: boolean | null;
      points_earned: number | null;
      graded_at: string | null;
      question_text: string;
      question_type: string;
      question_points: number | null;
      user_id: string;
      email: string | null;
      student_name: string;
    }> | null = null;

    if (isCaptain) {
      const responsesResult = await dbPg
        .select({
          submission_id: newTeamAssignmentQuestionResponses.submissionId,
          question_id: newTeamAssignmentQuestionResponses.questionId,
          response_text: newTeamAssignmentQuestionResponses.responseText,
          is_correct: newTeamAssignmentQuestionResponses.isCorrect,
          points_earned: newTeamAssignmentQuestionResponses.pointsEarned,
          graded_at: newTeamAssignmentQuestionResponses.gradedAt,
          question_text: newTeamAssignmentQuestions.questionText,
          question_type: newTeamAssignmentQuestions.questionType,
          question_points: newTeamAssignmentQuestions.points,
          user_id: newTeamAssignmentSubmissions.userId,
          email: users.email,
          student_name: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        })
        .from(newTeamAssignmentQuestionResponses)
        .innerJoin(
          newTeamAssignmentQuestions,
          eq(newTeamAssignmentQuestionResponses.questionId, newTeamAssignmentQuestions.id)
        )
        .innerJoin(
          newTeamAssignmentSubmissions,
          eq(newTeamAssignmentQuestionResponses.submissionId, newTeamAssignmentSubmissions.id)
        )
        .leftJoin(users, eq(newTeamAssignmentSubmissions.userId, users.id))
        .where(eq(newTeamAssignmentQuestions.assignmentId, assignmentId))
        .orderBy(
          desc(newTeamAssignmentSubmissions.submittedAt),
          asc(newTeamAssignmentQuestions.orderIndex)
        );

      questionResponses = responsesResult;
    }

    return NextResponse.json({
      assignment: {
        ...assignment,
        questions: questionsResult.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || null,
          correct_answer: q.correct_answer,
          points: q.points,
          order_index: q.order_index,
        })),
        roster: rosterWithSubmissions,
        question_responses: questionResponses,
        questions_count: questionsResult.length,
        roster_count: rosterResult.length,
        submitted_count: rosterWithSubmissions.filter((r) => r.submission).length,
        graded_count: rosterWithSubmissions.filter((r) => r.submission?.status === "graded").length,
      },
    });
  } catch (error) {
    return handleError(error, "GET /api/teams/[teamId]/assignments/[assignmentId]");
  }
}

// DELETE /api/teams/[teamId]/assignments/[assignmentId] - Delete assignment
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string; assignmentId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: "Database configuration error",
          details: "DATABASE_URL environment variable is missing",
        },
        { status: 500 }
      );
    }

    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId, assignmentId } = await params;

    // Resolve team slug to team units
    const teamInfo = await resolveTeamSlugToUnits(teamId);

    // Check if user is captain or co-captain of any team unit in this group
    const memberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);

    if (memberships.length === 0) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    const isCaptain = memberships.some((m) => ["captain", "co_captain"].includes(m.role));
    if (!isCaptain) {
      return NextResponse.json({ error: "Only captains can delete assignments" }, { status: 403 });
    }

    // Verify assignment exists and user has permission to delete it
    const assignmentResult = await dbPg
      .select({
        id: newTeamAssignments.id,
        created_by: newTeamAssignments.createdBy,
        title: newTeamAssignments.title,
      })
      .from(newTeamAssignments)
      .where(
        and(
          eq(newTeamAssignments.id, assignmentId),
          inArray(newTeamAssignments.teamId, teamInfo.teamUnitIds)
        )
      )
      .limit(1);

    if (assignmentResult.length === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const assignment = assignmentResult[0];
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Check if user created the assignment or is captain
    const isCreator = assignment.created_by === user.id;
    if (!(isCreator || isCaptain)) {
      return NextResponse.json(
        { error: "Only assignment creators or captains can delete assignments" },
        { status: 403 }
      );
    }

    // Delete the assignment (cascade will handle related records)
    await dbPg.delete(newTeamAssignments).where(eq(newTeamAssignments.id, assignmentId));

    return NextResponse.json({
      message: "Assignment deleted successfully",
      assignment: {
        id: assignmentId,
        title: assignment.title,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
