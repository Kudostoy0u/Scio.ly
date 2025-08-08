import { NextRequest, NextResponse } from 'next/server';
import { Question, ApiResponse } from '@/lib/types/api';
import { client } from '@/lib/db';

// POST /api/questions/batch - Fetch multiple questions by IDs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing or invalid question IDs',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Build query with placeholders for each ID
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const query = `SELECT * FROM questions WHERE id IN (${placeholders}) ORDER BY array_position($${ids.length + 1}, id)`;

    // Add the IDs array as the last parameter for ordering
    const params = [...ids, ids];

    const rows = await client.unsafe<Array<any>>(query, params as (string | number | boolean | null)[]);
    const questions = rows.map((row: any) => ({
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
    })) as Question[];

    const response: ApiResponse<Question[]> = {
      success: true,
      data: questions,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('POST /api/questions/batch error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch questions',
    };
    return NextResponse.json(response, { status: 500 });
  }
} 