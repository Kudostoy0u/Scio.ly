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

    // First, try to fetch from the regular questions table
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const questionsQuery = `SELECT * FROM questions WHERE id IN (${placeholders}) ORDER BY array_position($${ids.length + 1}, id)`;
    const questionsParams = [...ids, ids];

    const questionRows = await client.unsafe<Array<any>>(questionsQuery, questionsParams as (string | number | boolean | null)[]);
    
    // Then, try to fetch from the id_events table for any remaining IDs
    const foundQuestionIds = questionRows.map(row => row.id);
    const remainingIds = ids.filter(id => !foundQuestionIds.includes(id));
    
    let idEventRows: Array<any> = [];
    if (remainingIds.length > 0) {
      const idPlaceholders = remainingIds.map((_, index) => `$${index + 1}`).join(',');
      const idEventsQuery = `SELECT * FROM id_events WHERE id IN (${idPlaceholders}) ORDER BY array_position($${remainingIds.length + 1}, id)`;
      const idEventsParams = [...remainingIds, remainingIds];
      
      idEventRows = await client.unsafe<Array<any>>(idEventsQuery, idEventsParams as (string | number | boolean | null)[]);
    }

    // Combine and process all questions
    const allQuestions = [];
    
    // Process regular questions
    for (const row of questionRows) {
      allQuestions.push({
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
      });
    }
    
    // Process ID questions (from id_events table)
    for (const row of idEventRows) {
      const images = Array.isArray(row.images) ? row.images : [];
      const imageData = images.length > 0 ? images[Math.floor(Math.random() * images.length)] : undefined;
      
      allQuestions.push({
        id: row.id,
        question: row.question,
        tournament: row.tournament,
        division: row.division,
        options: Array.isArray(row.options) ? row.options : [],
        answers: Array.isArray(row.answers) ? row.answers : [],
        subtopics: Array.isArray(row.subtopics) ? row.subtopics : [],
        difficulty: typeof row.difficulty === 'number' ? row.difficulty : Number(row.difficulty ?? 0.5),
        event: row.event,
        imageData: imageData, // Add the imageData field for ID questions
        created_at: row.createdAt ?? row.created_at,
        updated_at: row.updatedAt ?? row.updated_at,
      });
    }

    // Sort by the original order of IDs
    const idToIndex = new Map(ids.map((id, index) => [id, index]));
    allQuestions.sort((a, b) => {
      const indexA = idToIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const indexB = idToIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return indexA - indexB;
    });

    const response: ApiResponse<Question[]> = {
      success: true,
      data: allQuestions,
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