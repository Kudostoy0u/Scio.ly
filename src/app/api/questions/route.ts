import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { Question, QuestionFilters, CreateQuestionRequest, ApiResponse } from '@/lib/types/api';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, or, gte, lte, sql } from 'drizzle-orm';

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

    // Build conditions array
    const conditions = [];

    // Add filters
    if (filters.event) {
      conditions.push(eq(questions.event, filters.event));
    }

    if (filters.division) {
      conditions.push(eq(questions.division, filters.division));
    }

    if (filters.tournament) {
      conditions.push(sql`${questions.tournament} ILIKE ${`%${filters.tournament}%`}`);
    }

    // Handle subtopic filtering
    const subtopicsToFilter: string[] = [];
    if (filters.subtopics) {
      subtopicsToFilter.push(...filters.subtopics.split(',').map(s => s.trim()));
    } else if (filters.subtopic) {
      subtopicsToFilter.push(filters.subtopic);
    }

    if (subtopicsToFilter.length > 0) {
      const subtopicConditions = subtopicsToFilter.map(subtopic => 
        sql`${questions.subtopics} @> ${JSON.stringify([subtopic])}`
      );
      conditions.push(or(...subtopicConditions));
    }

    // Add question type filtering
    if (filters.question_type) {
      if (filters.question_type === 'mcq') {
        conditions.push(sql`${questions.options} IS NOT NULL AND ${questions.options} != '[]'::jsonb AND jsonb_array_length(${questions.options}) > 0`);
      } else if (filters.question_type === 'frq') {
        conditions.push(sql`(${questions.options} IS NULL OR ${questions.options} = '[]'::jsonb OR jsonb_array_length(${questions.options}) = 0)`);
      }
    }

    if (filters.difficulty_min) {
      const difficulty = parseFloat(filters.difficulty_min);
      if (!isNaN(difficulty)) {
        conditions.push(gte(questions.difficulty, difficulty));
      }
    }

    if (filters.difficulty_max) {
      const difficulty = parseFloat(filters.difficulty_max);
      if (!isNaN(difficulty)) {
        conditions.push(lte(questions.difficulty, difficulty));
      }
    }

    // Build the query
    let query = db.select().from(questions);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Add ordering and limit
    const limit = filters.limit ? parseInt(filters.limit) : 50;
    query = query.orderBy(sql`RANDOM()`).limit(limit > 0 ? limit : 50);

    // Execute query
    const results = await query;

    const response: ApiResponse<Question[]> = {
      success: true,
      data: results as Question[],
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

    const result = await db.insert(questions).values({
      id,
      question: body.question,
      tournament: body.tournament,
      division: body.division,
      options: body.options || [],
      answers: body.answers || [],
      subtopics: body.subtopics || [],
      difficulty: body.difficulty || 0.5,
      event: body.event,
    }).returning();

    const question = result[0];

    if (!question) {
      throw new Error('Failed to create question');
    }

    const response: ApiResponse<Question> = {
      success: true,
      data: question as Question,
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