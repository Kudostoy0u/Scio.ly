import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';
import { Question, QuestionFilters, CreateQuestionRequest, ApiResponse } from '@/lib/types/api';
import { v4 as uuidv4 } from 'uuid';

// GET /api/questions - Fetch questions with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const filters: QuestionFilters = {
      event: searchParams.get('event') || undefined,
      division: searchParams.get('division') || undefined,
      tournament: searchParams.get('tournament') || undefined,
      subtopic: searchParams.get('subtopic') || undefined,
      subtopics: searchParams.get('subtopics') || undefined,
      difficulty_min: searchParams.get('difficulty_min') || undefined,
      difficulty_max: searchParams.get('difficulty_max') || undefined,
      question_type: searchParams.get('question_type') as 'mcq' | 'frq' || undefined,
      limit: searchParams.get('limit') || undefined,
    };

    // Build dynamic query
    let query = "SELECT * FROM questions WHERE 1=1";
    const params: unknown[] = [];
    let paramIndex = 1;

    // Add filters
    if (filters.event) {
      query += ` AND event = $${paramIndex}`;
      params.push(filters.event);
      paramIndex++;
    }

    if (filters.division) {
      query += ` AND division = $${paramIndex}`;
      params.push(filters.division);
      paramIndex++;
    }

    if (filters.tournament) {
      query += ` AND tournament ILIKE $${paramIndex}`;
      params.push(`%${filters.tournament}%`);
      paramIndex++;
    }

    // Handle subtopic filtering
    const subtopicsToFilter: string[] = [];
    if (filters.subtopics) {
      subtopicsToFilter.push(...filters.subtopics.split(',').map(s => s.trim()));
    } else if (filters.subtopic) {
      subtopicsToFilter.push(filters.subtopic);
    }

    if (subtopicsToFilter.length > 0) {
      const subtopicConditions: string[] = [];
      for (const subtopic of subtopicsToFilter) {
        subtopicConditions.push(`subtopics @> $${paramIndex}`);
        params.push(JSON.stringify([subtopic]));
        paramIndex++;
      }
      query += ` AND (${subtopicConditions.join(' OR ')})`;
    }

    // Add question type filtering
    if (filters.question_type) {
      if (filters.question_type === 'mcq') {
        query += " AND options IS NOT NULL AND options != '[]'::jsonb AND jsonb_array_length(options) > 0";
      } else if (filters.question_type === 'frq') {
        query += " AND (options IS NULL OR options = '[]'::jsonb OR jsonb_array_length(options) = 0)";
      }
    }

    if (filters.difficulty_min) {
      const difficulty = parseFloat(filters.difficulty_min);
      if (!isNaN(difficulty)) {
        query += ` AND difficulty >= $${paramIndex}`;
        params.push(difficulty);
        paramIndex++;
      }
    }

    if (filters.difficulty_max) {
      const difficulty = parseFloat(filters.difficulty_max);
      if (!isNaN(difficulty)) {
        query += ` AND difficulty <= $${paramIndex}`;
        params.push(difficulty);
        paramIndex++;
      }
    }

    // Add ordering
    query += " ORDER BY RANDOM()";

    // Get total count first
    const countQuery = query.replace("SELECT *", "SELECT COUNT(*)");
    await executeQuery<{ count: string }>(countQuery, params);

    // Apply limit
    const limit = filters.limit ? parseInt(filters.limit) : 50;
    if (limit > 0) {
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);
    }

    // Execute main query
    const questions = await executeQuery<Question>(query, params);

    const response: ApiResponse<Question[]> = {
      success: true,
      data: questions,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/questions error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch questions',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/questions - Create a new question
export async function POST(request: NextRequest) {
  try {
    const body: CreateQuestionRequest = await request.json();

    // Validate required fields
    if (!body.question || !body.tournament || !body.division || !body.event) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: question, tournament, division, event',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const id = uuidv4();
    const optionsJSON = JSON.stringify(body.options || []);
    const answersJSON = JSON.stringify(body.answers || []);
    const subtopicsJSON = JSON.stringify(body.subtopics || []);

    const query = `
      INSERT INTO questions (id, question, tournament, division, options, answers, subtopics, difficulty, event)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const params = [
      id,
      body.question,
      body.tournament,
      body.division,
      optionsJSON,
      answersJSON,
      subtopicsJSON,
      body.difficulty || 0.5,
      body.event,
    ];

    const result = await executeQuery<Question>(query, params);
    const question = result[0];

    if (!question) {
      throw new Error('Failed to create question');
    }

    const response: ApiResponse<Question> = {
      success: true,
      data: question,
      message: 'Question created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST /api/questions error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create question',
    };
    return NextResponse.json(response, { status: 500 });
  }
}