import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';
import { resolveTeamSlugToUnits, getUserTeamMemberships } from '@/lib/utils/team-resolver';

// GET /api/teams/[teamId]/assignments/[assignmentId] - Get detailed assignment information
export async function GET(
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

    // Get assignment details
    const assignmentResult = await queryCockroachDB<any>(
      `SELECT
         a.id,
         a.title,
         a.description,
         a.assignment_type,
         a.event_name,
         a.due_date,
         a.points,
         a.is_required,
         a.max_attempts,
         a.time_limit_minutes,
         a.created_at,
         a.updated_at,
         u.email as creator_email,
         COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as creator_name
       FROM new_team_assignments a
       JOIN users u ON a.created_by = u.id
       WHERE a.id = $1 AND a.team_id = ANY($2)`,
      [assignmentId, teamInfo.teamUnitIds]
    );

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const assignment = assignmentResult.rows[0];

    // Get assignment questions
    const questionsResult = await queryCockroachDB<any>(
      `SELECT 
         id,
         question_text,
         question_type,
         options,
         correct_answer,
         points,
         order_index
       FROM new_team_assignment_questions
       WHERE assignment_id = $1
       ORDER BY order_index ASC`,
      [assignmentId]
    );

    // Get roster assignments
    const rosterResult = await queryCockroachDB<any>(
      `SELECT 
         r.id,
         r.student_name,
         r.user_id,
         r.subteam_id,
         r.assigned_at,
         u.email,
         COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as display_name
       FROM new_team_assignment_roster r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.assignment_id = $1
       ORDER BY r.student_name ASC`,
      [assignmentId]
    );

    // Get submission status for each roster member
    const rosterWithSubmissions = await Promise.all(
      rosterResult.rows.map(async (rosterMember) => {
        let submission = null;
        let analytics = null;

        if (rosterMember.user_id) {
          // Get latest submission
          const submissionResult = await queryCockroachDB<any>(
            `SELECT 
               id,
               status,
               grade,
               attempt_number,
               submitted_at
             FROM new_team_assignment_submissions
             WHERE assignment_id = $1 AND user_id = $2
             ORDER BY submitted_at DESC
             LIMIT 1`,
            [assignmentId, rosterMember.user_id]
          );

          if (submissionResult.rows.length > 0) {
            submission = submissionResult.rows[0];

            // Get analytics for this submission
            const analyticsResult = await queryCockroachDB<any>(
              `SELECT 
                 total_questions,
                 correct_answers,
                 total_points,
                 earned_points,
                 completion_time_seconds,
                 submitted_at
               FROM new_team_assignment_analytics
               WHERE assignment_id = $1 AND user_id = $2
               ORDER BY submitted_at DESC
               LIMIT 1`,
              [assignmentId, rosterMember.user_id]
            );

            if (analyticsResult.rows.length > 0) {
              analytics = analyticsResult.rows[0];
            }
          }
        }

        return {
          ...rosterMember,
          submission,
          analytics
        };
      })
    );

    // Get question responses for detailed analysis (if user is captain)
    const isCaptain = memberships.some(m => ['captain', 'co_captain'].includes(m.role));
    let questionResponses: any[] | null = null;

    if (isCaptain) {
      const responsesResult = await queryCockroachDB<any>(
        `SELECT 
           qr.submission_id,
           qr.question_id,
           qr.response_text,
           qr.is_correct,
           qr.points_earned,
           qr.graded_at,
           q.question_text,
           q.question_type,
           q.points as question_points,
           s.user_id,
           u.email,
           COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as student_name
         FROM new_team_assignment_question_responses qr
         JOIN new_team_assignment_questions q ON qr.question_id = q.id
         JOIN new_team_assignment_submissions s ON qr.submission_id = s.id
         LEFT JOIN users u ON s.user_id = u.id
         WHERE q.assignment_id = $1
         ORDER BY s.submitted_at DESC, q.order_index ASC`,
        [assignmentId]
      );

      questionResponses = responsesResult.rows;
    }

    return NextResponse.json({
      assignment: {
        ...assignment,
        questions: questionsResult.rows.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || null,
          correct_answer: q.correct_answer,
          points: q.points,
          order_index: q.order_index
        })),
        roster: rosterWithSubmissions,
        question_responses: questionResponses,
        questions_count: questionsResult.rows.length,
        roster_count: rosterResult.rows.length,
        submitted_count: rosterWithSubmissions.filter(r => r.submission).length,
        graded_count: rosterWithSubmissions.filter(r => r.submission?.status === 'graded').length
      }
    });

  } catch (error) {
    console.error('Error fetching assignment details:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/teams/[teamId]/assignments/[assignmentId] - Delete assignment
export async function DELETE(
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
    
    // Check if user is captain or co-captain of any team unit in this group
    const memberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);

    if (memberships.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    const isCaptain = memberships.some(m => ['captain', 'co_captain'].includes(m.role));
    if (!isCaptain) {
      return NextResponse.json({ error: 'Only captains can delete assignments' }, { status: 403 });
    }

    // Verify assignment exists and user has permission to delete it
    const assignmentResult = await queryCockroachDB<any>(
      `SELECT id, created_by, title
       FROM new_team_assignments
       WHERE id = $1 AND team_id = ANY($2)`,
      [assignmentId, teamInfo.teamUnitIds]
    );

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const assignment = assignmentResult.rows[0];

    // Check if user created the assignment or is captain
    const isCreator = assignment.created_by === user.id;
    if (!isCreator && !isCaptain) {
      return NextResponse.json({ error: 'Only assignment creators or captains can delete assignments' }, { status: 403 });
    }

    // Delete the assignment (cascade will handle related records)
    await queryCockroachDB(
      `DELETE FROM new_team_assignments WHERE id = $1`,
      [assignmentId]
    );

    return NextResponse.json({ 
      message: 'Assignment deleted successfully',
      assignment: {
        id: assignmentId,
        title: assignment.title
      }
    });

  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
