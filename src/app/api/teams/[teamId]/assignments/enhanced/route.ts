import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';
import { resolveTeamSlugToUnits, getUserTeamMemberships } from '@/lib/utils/team-resolver';

// POST /api/teams/[teamId]/assignments/enhanced - Create enhanced assignment with questions and roster
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
    const { 
      title, 
      description, 
      assignment_type = 'homework', 
      due_date, 
      points, 
      questions = [],
      roster = [],
      event_name,
      time_limit_minutes
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'At least one question is required' }, { status: 400 });
    }

    if (!roster || roster.length === 0) {
      return NextResponse.json({ error: 'At least one roster member must be selected' }, { status: 400 });
    }

    // Resolve team slug to team units
    const teamInfo = await resolveTeamSlugToUnits(teamId);
    
    // Check if user is captain or co-captain of any team unit in this group
    const memberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);

    if (memberships.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    const isCaptain = memberships.some(m => ['captain', 'co_captain'].includes(m.role));
    if (!isCaptain) {
      return NextResponse.json({ error: 'Only captains can create assignments' }, { status: 403 });
    }

    // Create the assignment for the first team unit (or the one the user is captain of)
    const captainMembership = memberships.find(m => ['captain', 'co_captain'].includes(m.role));
    const targetTeamId = captainMembership?.team_id || teamInfo.teamUnitIds[0];
    
    // 1. Create the main assignment
    const assignmentResult = await queryCockroachDB<any>(
      `INSERT INTO new_team_assignments 
       (team_id, created_by, title, description, assignment_type, event_name, due_date, points, is_required, max_attempts, time_limit_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [targetTeamId, user.id, title, description, assignment_type, event_name, due_date, points, true, 1, time_limit_minutes]
    );

    const assignment = assignmentResult.rows[0];

    // 2. Create assignment questions
    console.log('=== ASSIGNMENT CREATION DEBUG ===');
    console.log('Raw questions from API:', JSON.stringify(questions, null, 2));
    console.log('Number of questions:', questions.length);
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionText = question.question_text || question.question || question.text || '';
      
      console.log(`\n--- Question ${i + 1} ---`);
      console.log('Raw question object:', JSON.stringify(question, null, 2));
      console.log('Question text extracted:', questionText);
      console.log('Question keys:', Object.keys(question));
      
      // Determine question type - handle both 'mcq'/'frq' and 'multiple_choice'/'free_response' formats
      let questionType = 'multiple_choice';
      if (question.type === 'frq' || question.type === 'free_response') {
        questionType = 'free_response';
      } else if (question.type === 'mcq' || question.type === 'multiple_choice') {
        questionType = 'multiple_choice';
      }
      
      // Get correct answer - handle different formats
      let correctAnswer = '';
      if (question.answer !== undefined && question.answer !== null) {
        correctAnswer = String(question.answer);
      } else if (question.correct_answer !== undefined && question.correct_answer !== null) {
        correctAnswer = String(question.correct_answer);
      } else if (Array.isArray(question.answers) && question.answers.length > 0) {
        correctAnswer = String(question.answers[0]);
      }
      
      console.log('Question type:', questionType);
      console.log('Correct answer:', correctAnswer);
      console.log('Options (raw):', question.options);
      console.log('Options (JSON stringified):', question.options ? JSON.stringify(question.options) : null);
      
      const insertData = [
        assignment.id,
        questionText,
        questionType,
        question.options ? JSON.stringify(question.options) : null,
        correctAnswer,
        question.points || 1,
        i + 1
      ];
      
      console.log('Insert data:', insertData);
      
      await queryCockroachDB(
        `INSERT INTO new_team_assignment_questions 
         (assignment_id, question_text, question_type, options, correct_answer, points, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        insertData
      );
      
      console.log(`Question ${i + 1} stored successfully`);
    }
    
    console.log('=== END ASSIGNMENT CREATION DEBUG ===\n');

    // 3. Create roster assignments
    for (const rosterMember of roster) {
      await queryCockroachDB(
        `INSERT INTO new_team_assignment_roster 
         (assignment_id, student_name, user_id, subteam_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (assignment_id, student_name, subteam_id) DO NOTHING`,
        [
          assignment.id,
          rosterMember.student_name,
          rosterMember.user_id || null,
          rosterMember.subteam_id || null
        ]
      );
    }

    // 4. Create notifications for assigned roster members
    for (const rosterMember of roster) {
      if (rosterMember.user_id) {
        // Create notification in CockroachDB (will be synced to Supabase)
        try {
          const notificationResult = await queryCockroachDB<any>(
            `INSERT INTO new_team_notifications 
             (user_id, team_id, notification_type, title, message, data)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
              rosterMember.user_id,
              targetTeamId,
              'assignment',
              `New ${assignment_type}: ${title}`,
              description || 'You have been assigned a new assignment',
              JSON.stringify({
                assignment_id: assignment.id,
                event_name: event_name || '',
                url: `/test?assignment=${assignment.id}`,
                due_date: due_date,
                time_limit_minutes: time_limit_minutes
              })
            ]
          );

          // Sync notification to Supabase
          if (notificationResult.rows.length > 0) {
            const { NotificationSyncService } = await import('@/lib/services/notification-sync');
            await NotificationSyncService.syncNotificationToSupabase(notificationResult.rows[0].id);
          }
        } catch (notificationError) {
          console.warn('Failed to create notification:', notificationError);
        }
      }
    }

    return NextResponse.json({ 
      assignment: {
        ...assignment,
        questions_count: questions.length,
        roster_count: roster.length
      }
    });

  } catch (error) {
    console.error('Error creating enhanced assignment:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
