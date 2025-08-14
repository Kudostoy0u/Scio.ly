import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { eq, lt, and, count, isNull, isNotNull } from 'drizzle-orm';
import { Question, UpdateQuestionRequest, ApiResponse } from '@/lib/types/api';

// GET /api/questions/[id] - Fetch a specific question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Load the question
    const rows = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .limit(1);

    const row = (rows as any[])[0];

    if (!row) {
      const response: ApiResponse = {
        success: false,
        error: 'Question not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Compute stable rank without raw SQL: created_at ASC NULLS LAST, then id ASC
    const createdAtVal: Date | null = row.createdAt ?? row.created_at ?? null;
    let earlierCount = 0;
    let tieCount = 0;
    if (createdAtVal) {
      const a = await db.select({ c: count() }).from(questions).where(lt(questions.createdAt, createdAtVal));
      const b = await db
        .select({ c: count() })
        .from(questions)
        .where(and(eq(questions.createdAt, createdAtVal), lt(questions.id, id)));
      earlierCount = Number(a[0]?.c || 0);
      tieCount = Number(b[0]?.c || 0);
    } else {
      const a = await db.select({ c: count() }).from(questions).where(isNotNull(questions.createdAt));
      const b = await db
        .select({ c: count() })
        .from(questions)
        .where(and(isNull(questions.createdAt), lt(questions.id, id)));
      earlierCount = Number(a[0]?.c || 0);
      tieCount = Number(b[0]?.c || 0);
    }
    const rn = earlierCount + tieCount + 1;

    // Base52 encoding for 4 characters + type suffix 'S'
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const BASE = ALPHABET.length; // 52
    const CORE_LENGTH = 4;
    const encodeBase52 = (index: number): string => {
      let n = index;
      let out = '';
      for (let i = 0; i < CORE_LENGTH; i++) {
        out = ALPHABET[n % BASE] + out;
        n = Math.floor(n / BASE);
      }
      return out;
    };

    const base52 = encodeBase52(rn - 1) + 'S';
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
      // Attach short code
      base52,
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