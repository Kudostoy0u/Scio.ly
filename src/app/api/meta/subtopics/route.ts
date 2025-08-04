import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';
import { ApiResponse } from '@/lib/types/api';

// GET /api/meta/subtopics - Get all distinct subtopics (optionally filtered by event)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const event = searchParams.get('event');

    let query = `
      SELECT DISTINCT jsonb_array_elements_text(subtopics) as subtopic 
      FROM questions 
    `;
    const params: unknown[] = [];

    if (event) {
      query += " WHERE event = $1";
      params.push(event);
    }

    query += " ORDER BY subtopic";

    const result = await executeQuery<{ subtopic: string }>(query, params);
    const subtopics = result.map(row => row.subtopic);

    const response: ApiResponse<string[]> = {
      success: true,
      data: subtopics,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/meta/subtopics error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch subtopics',
    };
    return NextResponse.json(response, { status: 500 });
  }
}