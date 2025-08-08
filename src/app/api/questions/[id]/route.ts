import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Question, UpdateQuestionRequest, ApiResponse } from '@/lib/types/api';

// GET /api/questions/[id] - Fetch a specific question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await db.select().from(questions).where(eq(questions.id, id));

    if (result.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Question not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const row = result[0] as any;
    const normalized: Question = {
      id: row.id,
      question: row.question,
      tournament: row.tournament,
      division: row.division,
      options: Array.isArray(row.options) ? row.options : [],
      answers: Array.isArray(row.answers) ? row.answers : [],
      subtopics: Array.isArray(row.subtopics) ? row.subtopics : [],
      difficulty: typeof row.difficulty === 'number' ? row.difficulty : Number(row.difficulty ?? 0.5),
      event: row.event,
      created_at: row.createdAt ?? row.created_at,
      updated_at: row.updatedAt ?? row.updated_at,
    } as any;
    const response: ApiResponse<Question> = { success: true, data: normalized };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`GET /api/questions/${(await params).id} error:`, error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch question',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// PUT /api/questions/[id] - Update a question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates: UpdateQuestionRequest = await request.json();

    // Build update query dynamically
    const entries = Object.entries(updates).filter(([k, v]) => k !== 'id' && v !== undefined);
    if (entries.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'No valid fields to update',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const payload: Partial<typeof questions.$inferInsert> = {};
    for (const [key, value] of entries) {
      if (key === 'options' || key === 'answers' || key === 'subtopics') {
        (payload as any)[key] = value;
      } else {
        (payload as any)[key] = value as any;
      }
    }
    (payload as any).updatedAt = new Date();

    const updated = await db.update(questions).set(payload).where(eq(questions.id, id)).returning();

    if (updated.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Question not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const row = updated[0] as any;
    const normalized: Question = {
      id: row.id,
      question: row.question,
      tournament: row.tournament,
      division: row.division,
      options: Array.isArray(row.options) ? row.options : [],
      answers: Array.isArray(row.answers) ? row.answers : [],
      subtopics: Array.isArray(row.subtopics) ? row.subtopics : [],
      difficulty: typeof row.difficulty === 'number' ? row.difficulty : Number(row.difficulty ?? 0.5),
      event: row.event,
      created_at: row.createdAt ?? row.created_at,
      updated_at: row.updatedAt ?? row.updated_at,
    } as any;
    const response: ApiResponse<Question> = {
      success: true,
      data: normalized,
      message: 'Question updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`PUT /api/questions/${(await params).id} error:`, error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update question',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/questions/[id] - Delete a question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deleted = await db.delete(questions).where(eq(questions.id, id)).returning({ id: questions.id });
    if (deleted.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Question not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Question deleted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`DELETE /api/questions/${(await params).id} error:`, error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete question',
    };
    return NextResponse.json(response, { status: 500 });
  }
}