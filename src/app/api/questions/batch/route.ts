import { NextRequest, NextResponse } from 'next/server';
import { Question, ApiResponse } from '@/lib/types/api';
import { client } from '@/lib/db';


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


    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const questionsQuery = `SELECT * FROM questions WHERE id IN (${placeholders}) ORDER BY array_position($${ids.length + 1}, id)`;
    const questionsParams = [...ids, ids];

    const questionRows = await client.unsafe<Array<any>>(questionsQuery, questionsParams as (string | number | boolean | null)[]);
    

    const foundQuestionIds = questionRows.map(row => row.id);
    const remainingIds = ids.filter(id => !foundQuestionIds.includes(id));
    
    let idEventRows: Array<any> = [];
    if (remainingIds.length > 0) {
      const idPlaceholders = remainingIds.map((_, index) => `$${index + 1}`).join(',');
      const idEventsQuery = `SELECT * FROM id_events WHERE id IN (${idPlaceholders}) ORDER BY array_position($${remainingIds.length + 1}, id)`;
      const idEventsParams = [...remainingIds, remainingIds];
      
      idEventRows = await client.unsafe<Array<any>>(idEventsQuery, idEventsParams as (string | number | boolean | null)[]);
    }


    const allQuestions: Question[] = [];
    

    const { generateQuestionCodes } = await import('@/lib/utils/base52');
    

    const regularQuestionCodes = questionRows.length > 0 
      ? await generateQuestionCodes(questionRows.map(row => row.id), 'questions')
      : new Map<string, string>();
    

    const idQuestionCodes = idEventRows.length > 0
      ? await generateQuestionCodes(idEventRows.map(row => row.id), 'idEvents')
      : new Map<string, string>();
    

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
        base52: regularQuestionCodes.get(row.id),
        created_at: row.createdAt ?? row.created_at,
        updated_at: row.updatedAt ?? row.updated_at,
      });
    }
    

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
        imageData: imageData,
        base52: idQuestionCodes.get(row.id),
        created_at: row.createdAt ?? row.created_at,
        updated_at: row.updatedAt ?? row.updated_at,
      });
    }


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