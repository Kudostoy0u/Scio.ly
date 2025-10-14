import { NextRequest } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { createAssignment, listRecentAssignments, listRecentResults, getAssignmentById, deleteAssignmentResult, deleteAssignment } from '@/lib/db/teamExtras';
import { successResponse, ApiErrors, validateFields, handleApiError } from '@/lib/api/utils';

interface CreateAssignmentRequest extends Record<string, unknown> {
  school: string;
  division: 'B' | 'C';
  teamId: string;
  eventName: string;
  assignees: Array<{ name: string; userId?: string }>;
  params: unknown;
  questions: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return ApiErrors.unauthorized();

    const body = await req.json();
    const validation = validateFields<CreateAssignmentRequest>(body, [
      'school',
      'division',
      'teamId',
      'eventName',
      'assignees',
      'params',
      'questions',
    ]);

    if (!validation.valid) return validation.error;

    const { school, division, teamId, eventName, assignees, params, questions } = validation.data;

    if (!Array.isArray(assignees)) {
      return ApiErrors.badRequest('Assignees must be an array');
    }

    const saved = await createAssignment({
      school,
      division,
      teamId,
      eventName,
      assignees,
      params,
      questions,
      createdBy: user.id,
    });

    return successResponse(saved);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');

    // Get by ID
    if (idStr) {
      const row = await getAssignmentById(idStr);
      return successResponse(row);
    }

    // List assignments or results
    const school = searchParams.get('school');
    const division = searchParams.get('division') as 'B' | 'C' | null;
    const mode = searchParams.get('mode') || 'assignments';

    if (!school || !division) {
      return ApiErrors.missingFields(['school', 'division']);
    }

    if (mode === 'results') {
      const rows = await listRecentResults(school, division);
      return successResponse(rows);
    }

    const rows = await listRecentAssignments(school, division);
    return successResponse(rows);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'result';
    const id = searchParams.get('id');

    if (!id) {
      return ApiErrors.missingFields(['id']);
    }

    if (mode === 'assignment') {
      await deleteAssignment(id);
    } else {
      await deleteAssignmentResult(id);
    }

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}


