import { queryCockroachDB } from "@/lib/cockroachdb";
import { getServerUser } from "@/lib/supabaseServer";
import { type NextRequest, NextResponse } from "next/server";

// POST /api/assignments/[assignmentId]/submit - Submit assignment results
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
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

    const { assignmentId } = await params;
    const body = await request.json();
    const { answers, score, totalPoints, timeSpent, submittedAt, isDynamicCodebusters } = body;

    // Verify assignment exists and user is assigned
    const assignmentResult = await queryCockroachDB<any>(
      `SELECT a.id, a.title, a.points as max_points
       FROM new_team_assignments a
       JOIN new_team_assignment_roster r ON a.id = r.assignment_id
       WHERE a.id = $1 AND (r.user_id = $2 OR r.student_name = $3)`,
      [assignmentId, user.id, user.email]
    );

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json({ error: "Assignment not found or not assigned" }, { status: 404 });
    }

    const assignment = assignmentResult.rows[0];

    // Check if user has already submitted - prevent multiple submissions
    const existingSubmissionResult = await queryCockroachDB<any>(
      `SELECT id, attempt_number, status
       FROM new_team_assignment_submissions
       WHERE assignment_id = $1 AND user_id = $2
       ORDER BY attempt_number DESC
       LIMIT 1`,
      [assignmentId, user.id]
    );

    const existingSubmission = existingSubmissionResult.rows[0];

    // Prevent multiple submissions to the same assignment
    if (existingSubmission) {
      return NextResponse.json(
        {
          error: "Assignment already submitted",
          details: "You have already submitted this assignment and cannot submit again",
        },
        { status: 400 }
      );
    }

    const attemptNumber = 1;

    // Create submission record
    const submissionResult = await queryCockroachDB<any>(
      `INSERT INTO new_team_assignment_submissions
       (assignment_id, user_id, status, grade, attempt_number, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        assignmentId,
        user.id,
        "submitted",
        score,
        attemptNumber,
        submittedAt || new Date().toISOString(),
      ]
    );

    const submission = submissionResult.rows[0];

    // Store individual question responses (skip for dynamic Codebusters assignments)
    if (answers && typeof answers === "object" && !isDynamicCodebusters) {
      for (const [questionId, answer] of Object.entries(answers)) {
        if (answer !== null && answer !== undefined) {
          // For regular assignments, get question details from database
          const questionResult = await queryCockroachDB<any>(
            `SELECT correct_answer, points
             FROM new_team_assignment_questions
             WHERE id = $1`,
            [questionId]
          );

          if (questionResult.rows.length > 0) {
            const question = questionResult.rows[0];
            const isCorrect = question.correct_answer === answer;
            const pointsEarned = isCorrect ? question.points : 0;

            await queryCockroachDB(
              `INSERT INTO new_team_assignment_question_responses
               (submission_id, question_id, response_text, is_correct, points_earned)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (submission_id, question_id) DO UPDATE SET
               response_text = EXCLUDED.response_text,
               is_correct = EXCLUDED.is_correct,
               points_earned = EXCLUDED.points_earned`,
              [
                submission.id,
                questionId,
                typeof answer === "string" ? answer : JSON.stringify(answer),
                isCorrect,
                pointsEarned,
              ]
            );
          }
        }
      }
    }

    // Calculate points using the same method as Codebusters test summary
    let calculatedTotalPoints = 0;
    let calculatedEarnedPoints = 0;
    let calculatedCorrectAnswers = 0;

    if (isDynamicCodebusters && answers) {
      // For dynamic Codebusters assignments, use the exact same values as the test summary
      const { codebustersPoints } = body;

      if (codebustersPoints) {
        // Use the exact same values calculated by the test summary
        calculatedTotalPoints = codebustersPoints.totalPointsAttempted || 0;
        calculatedEarnedPoints = codebustersPoints.totalPointsEarned || 0;
        calculatedCorrectAnswers = codebustersPoints.totalPointsEarned || 0;
      } else {
        // Fallback to simple calculation if codebustersPoints not provided
        calculatedTotalPoints = Object.keys(answers || {}).length * 10;
        calculatedEarnedPoints = score || 0;
        calculatedCorrectAnswers = Math.round(calculatedEarnedPoints);
      }
    } else {
      // For regular assignments, use the existing calculation
      calculatedTotalPoints = totalPoints || assignment.points || 0;
      calculatedEarnedPoints = score || 0;
      calculatedCorrectAnswers =
        Math.round(
          (score / Math.max(1, calculatedTotalPoints)) * Object.keys(answers || {}).length
        ) || 0;
    }

    // Create analytics record (delete existing first, then insert)
    await queryCockroachDB(
      `DELETE FROM new_team_assignment_analytics 
       WHERE assignment_id = $1 AND user_id = $2`,
      [assignmentId, user.id]
    );

    await queryCockroachDB(
      `INSERT INTO new_team_assignment_analytics
       (assignment_id, student_name, user_id, total_questions, correct_answers, 
        total_points, earned_points, completion_time_seconds, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        assignmentId,
        user.email || user.id,
        user.id,
        Object.keys(answers || {}).length,
        calculatedCorrectAnswers,
        calculatedTotalPoints,
        calculatedEarnedPoints,
        timeSpent || 0,
        submittedAt || new Date().toISOString(),
      ]
    );

    return NextResponse.json({
      submission: {
        id: submission.id,
        assignment_id: assignmentId,
        score,
        total_points: totalPoints || assignment.max_points,
        attempt_number: attemptNumber,
        submitted_at: submission.submitted_at,
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
