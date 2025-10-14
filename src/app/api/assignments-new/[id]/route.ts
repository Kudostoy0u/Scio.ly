import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { dbPg } from '@/lib/db';
import { 
  newTeamAssignments,
  newTeamUnits,
  newTeamGroups,
  newTeamAssignmentQuestions,
  newTeamAssignmentRoster,
  users
} from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/assignments-new/[id] - Get assignment by UUID (returns old format)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get assignment details with team info
    const assignmentResult = await dbPg
      .select({
        id: newTeamAssignments.id,
        title: newTeamAssignments.title,
        description: newTeamAssignments.description,
        eventName: newTeamAssignments.eventName,
        school: newTeamGroups.school,
        division: newTeamGroups.division,
        teamId: newTeamUnits.id,
        createdBy: newTeamAssignments.createdBy,
        createdAt: newTeamAssignments.createdAt
      })
      .from(newTeamAssignments)
      .innerJoin(newTeamUnits, eq(newTeamAssignments.teamId, newTeamUnits.id))
      .innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
      .where(eq(newTeamAssignments.id, id))
      .limit(1);

    if (assignmentResult.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const assignment = assignmentResult[0];

    // Get assignment questions
    const questionsResult = await dbPg
      .select({
        id: newTeamAssignmentQuestions.id,
        questionText: newTeamAssignmentQuestions.questionText,
        questionType: newTeamAssignmentQuestions.questionType,
        options: newTeamAssignmentQuestions.options,
        correctAnswer: newTeamAssignmentQuestions.correctAnswer,
        points: newTeamAssignmentQuestions.points,
        orderIndex: newTeamAssignmentQuestions.orderIndex
      })
      .from(newTeamAssignmentQuestions)
      .where(eq(newTeamAssignmentQuestions.assignmentId, id))
      .orderBy(newTeamAssignmentQuestions.orderIndex);

    // Get roster assignments
    const rosterResult = await dbPg
      .select({
        studentName: newTeamAssignmentRoster.studentName,
        userId: newTeamAssignmentRoster.userId,
        email: users.email,
        username: users.username
      })
      .from(newTeamAssignmentRoster)
      .leftJoin(users, eq(newTeamAssignmentRoster.userId, users.id))
      .where(eq(newTeamAssignmentRoster.assignmentId, id));

    // Transform questions to match old format
    const questions = questionsResult.map(q => {
      // Transform options to array of strings if they're objects
      let options = q.options || [];
      if (Array.isArray(options) && options.length > 0) {
        // If options are objects with text property, extract the text
        if (typeof options[0] === 'object' && options[0].text) {
          options = options.map((opt: any) => opt.text);
        }
        // If options are already strings, keep them as is
      }
      
      return {
        id: q.id,
        question: q.questionText, // Map questionText to question
        question_type: q.questionType,
        options: options,
        correct_answer: q.correctAnswer,
        points: q.points,
        order_index: q.orderIndex
      };
    });

    // Transform roster to match old format
    const assignees = rosterResult.map(r => ({
      name: r.studentName,
      userId: r.userId,
      email: r.email,
      username: r.username
    }));

    // Return in old format
    const assignmentData = {
      id: assignment.id,
      title: assignment.title,
      event_name: assignment.eventName,
      school: assignment.school,
      division: assignment.division,
      team_id: assignment.teamId,
      created_by: assignment.createdBy,
      created_at: assignment.createdAt,
      questions: questions,
      assignees: assignees,
      params: {
        eventName: assignment.eventName,
        questionCount: questions.length
      }
    };

    return NextResponse.json({ assignment: assignmentData });

  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
