import { dbPg } from './index';
import { 
  newTeamAssignments, 
  newTeamAssignmentSubmissions, 
  newTeamAssignmentRoster,
  newTeamAssignmentQuestions
} from './schema';
import { eq, desc, sql } from 'drizzle-orm';
import { 
  teamAssignmentCreateSchema,
  teamAssignmentSubmissionCreateSchema,
  type TeamAssignmentCreate,
  type TeamAssignmentSubmissionCreate
} from './schemas';
import logger from '@/lib/utils/logger';

/**
 * Legacy assignment system functions converted to use Drizzle ORM
 * These functions maintain compatibility with the existing API while using Drizzle
 */

/**
 * Create a legacy assignment using Drizzle ORM
 * Maintains compatibility with the old assignment system
 */
export async function createLegacyAssignment(data: {
  school: string;
  division: 'B' | 'C';
  teamId: string;
  eventName: string;
  assignees: Array<{ name: string; userId?: string }>;
  params: Record<string, unknown>;
  questions: unknown[];
  createdBy: string;
}): Promise<{ id: string; success: boolean }> {
  try {
    // Create assignment using the new schema
    const assignmentData: TeamAssignmentCreate = {
      teamId: data.teamId,
      createdBy: data.createdBy,
      title: `${data.eventName} Assignment`,
      description: `Assignment for ${data.eventName} in ${data.school} Division ${data.division}`,
      assignmentType: 'task',
      eventName: data.eventName,
      isRequired: true
    };

    const validatedData = teamAssignmentCreateSchema.parse(assignmentData);

    const [assignment] = await dbPg
      .insert(newTeamAssignments)
      .values(validatedData)
      .returning();

    // Create roster entries for assignees
    const rosterData = data.assignees.map((assignee) => ({
      assignmentId: assignment.id,
      studentName: assignee.name,
      userId: assignee.userId,
      subteamId: data.teamId
    }));

    if (rosterData.length > 0) {
      await dbPg
        .insert(newTeamAssignmentRoster)
        .values(rosterData);
    }

    // Create assignment questions if provided
    if (data.questions && Array.isArray(data.questions)) {
      const questionData = data.questions.map((question: unknown, index: number) => {
        const q = question as Record<string, unknown>;
        return {
          assignmentId: assignment.id,
          questionText: String(q.question || q.text || ''),
          questionType: String(q.type || 'multiple_choice'),
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: String(q.answer || q.correctAnswer || ''),
          points: Number(q.points || 1),
          orderIndex: index,
          imageData: (q.imageData as string) || null,
          difficulty: sql`${Number(q.difficulty || 0.5)}` // Use SQL template for bigint
        };
      });

      await dbPg
        .insert(newTeamAssignmentQuestions)
        .values(questionData);
    }

    // Return in the legacy format for compatibility
    return {
      id: assignment.id,
      success: true
    };
  } catch (error) {
    logger.error('Error creating legacy assignment:', error);
    throw error;
  }
}

/**
 * List recent legacy assignments using Drizzle ORM
 */
export async function listRecentLegacyAssignments(school: string) {
  try {
    const assignments = await dbPg
      .select({
        id: newTeamAssignments.id,
        title: newTeamAssignments.title,
        eventName: newTeamAssignments.eventName,
        createdAt: newTeamAssignments.createdAt,
        createdBy: newTeamAssignments.createdBy,
        teamId: newTeamAssignments.teamId
      })
      .from(newTeamAssignments)
      .where(eq(newTeamAssignments.teamId, school)) // Assuming teamId maps to school for legacy compatibility
      .orderBy(desc(newTeamAssignments.createdAt))
      .limit(50);

    // Transform to legacy format
    return assignments.map(assignment => ({
      id: assignment.id,
      event_name: assignment.eventName,
      created_at: assignment.createdAt,
      assignees: [] // Would need to fetch from roster table if needed
    }));
  } catch (error) {
    logger.error('Error listing recent legacy assignments:', error);
    return [];
  }
}

/**
 * List recent legacy assignment results using Drizzle ORM
 */
export async function listRecentLegacyResults(school: string) {
  try {
    const results = await dbPg
      .select({
        id: newTeamAssignmentSubmissions.id,
        assignmentId: newTeamAssignmentSubmissions.assignmentId,
        userId: newTeamAssignmentSubmissions.userId,
        content: newTeamAssignmentSubmissions.content,
        submittedAt: newTeamAssignmentSubmissions.submittedAt,
        grade: newTeamAssignmentSubmissions.grade,
        feedback: newTeamAssignmentSubmissions.feedback,
        status: newTeamAssignmentSubmissions.status,
        attemptNumber: newTeamAssignmentSubmissions.attemptNumber,
        eventName: newTeamAssignments.eventName
      })
      .from(newTeamAssignmentSubmissions)
      .innerJoin(newTeamAssignments, eq(newTeamAssignmentSubmissions.assignmentId, newTeamAssignments.id))
      .where(eq(newTeamAssignments.teamId, school)) // Assuming teamId maps to school for legacy compatibility
      .orderBy(desc(newTeamAssignmentSubmissions.submittedAt))
      .limit(100);

    // Transform to legacy format
    return results.map(result => ({
      id: result.id,
      assignment_id: result.assignmentId,
      user_id: result.userId,
      name: '', // Would need to fetch from user profile
      event_name: result.eventName,
      score: result.grade,
      submitted_at: result.submittedAt,
      detail: {
        content: result.content,
        feedback: result.feedback,
        status: result.status,
        attemptNumber: result.attemptNumber
      }
    }));
  } catch (error) {
    logger.error('Error listing recent legacy results:', error);
    return [];
  }
}

/**
 * Delete a legacy assignment result using Drizzle ORM
 */
export async function deleteLegacyAssignmentResult(id: string) {
  try {
    await dbPg
      .delete(newTeamAssignmentSubmissions)
      .where(eq(newTeamAssignmentSubmissions.id, id));

    logger.info(`Deleted legacy assignment result ${id}`);
    return true;
  } catch (error) {
    logger.error('Error deleting legacy assignment result:', error);
    throw error;
  }
}

/**
 * Delete a legacy assignment using Drizzle ORM
 */
export async function deleteLegacyAssignment(id: string) {
  try {
    await dbPg
      .delete(newTeamAssignments)
      .where(eq(newTeamAssignments.id, id));

    logger.info(`Deleted legacy assignment ${id}`);
    return true;
  } catch (error) {
    logger.error('Error deleting legacy assignment:', error);
    throw error;
  }
}

/**
 * Get legacy assignment by ID using Drizzle ORM
 */
export async function getLegacyAssignmentById(id: string) {
  try {
    const [assignment] = await dbPg
      .select()
      .from(newTeamAssignments)
      .where(eq(newTeamAssignments.id, id))
      .limit(1);

    if (!assignment) {
      return null;
    }

    // Get roster data for assignees
    const rosterData = await dbPg
      .select()
      .from(newTeamAssignmentRoster)
      .where(eq(newTeamAssignmentRoster.assignmentId, id));

    // Get questions
    const questions = await dbPg
      .select()
      .from(newTeamAssignmentQuestions)
      .where(eq(newTeamAssignmentQuestions.assignmentId, id))
      .orderBy(newTeamAssignmentQuestions.orderIndex);

    // Transform to legacy format
    return {
      id: assignment.id,
      school: assignment.teamId, // Assuming teamId maps to school for legacy compatibility
      division: 'B', // Would need to determine from team data
      team_id: assignment.teamId,
      event_name: assignment.eventName,
      assignees: rosterData.map(roster => ({
        name: roster.studentName,
        userId: roster.userId
      })),
      params: {}, // Would need to store in assignment data
      questions: questions.map(q => ({
        question: q.questionText,
        type: q.questionType,
        options: q.options,
        answer: q.correctAnswer,
        points: q.points,
        difficulty: q.difficulty
      })),
      created_by: assignment.createdBy,
      created_at: assignment.createdAt
    };
  } catch (error) {
    logger.error('Error getting legacy assignment by ID:', error);
    return null;
  }
}

/**
 * Create a legacy assignment submission using Drizzle ORM
 */
export async function createLegacyAssignmentSubmission(data: {
  assignmentId: string;
  userId: string;
  name: string;
  eventName: string;
  score?: number;
  submittedAt?: Date;
  detail?: Record<string, unknown>;
}): Promise<{ id: string; success: boolean }> {
  try {
    const submissionData: TeamAssignmentSubmissionCreate = {
      assignmentId: data.assignmentId,
      userId: data.userId,
      content: JSON.stringify(data.detail || {}),
      grade: data.score,
      status: 'submitted',
      attachments: [],
      attemptNumber: 1
    };

    const validatedData = teamAssignmentSubmissionCreateSchema.parse(submissionData);

    const [submission] = await dbPg
      .insert(newTeamAssignmentSubmissions)
      .values(validatedData)
      .returning();

    // Return in legacy format
    return {
      id: submission.id,
      success: true
    };
  } catch (error) {
    logger.error('Error creating legacy assignment submission:', error);
    throw error;
  }
}
