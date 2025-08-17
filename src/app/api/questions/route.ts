import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { Question } from '@/lib/types/api';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, or, gte, lte, lt, sql, SQL } from 'drizzle-orm';
import { z } from 'zod';
import { 
  handleApiError, 
  createSuccessResponse, 
  parseRequestBody,
  logApiRequest,
  logApiResponse,
  ApiError
} from '@/lib/api/utils';

// Database result type
type DatabaseQuestion = {
  id: string;
  question: string;
  tournament: string;
  division: string;
  event: string;
  difficulty: string | null;
  options: unknown;
  answers: unknown;
  subtopics: unknown;
  createdAt: Date | null;
  updatedAt: Date | null;
};

// Validation schemas
const QuestionFiltersSchema = z.object({
  event: z.string().optional(),
  division: z.string().optional(),
  tournament: z.string().optional(),
  subtopic: z.string().optional(),
  subtopics: z.string().optional(),
  difficulty_min: z.string().optional(),
  difficulty_max: z.string().optional(),
  question_type: z.enum(['mcq', 'frq']).optional(),
  limit: z.string().optional(),
});

const CreateQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  tournament: z.string().min(1, 'Tournament is required'),
  division: z.string().min(1, 'Division is required'),
  event: z.string().min(1, 'Event is required'),
  options: z.array(z.string()).optional().default([]),
  answers: z.array(z.union([z.string(), z.number()])).optional().default([]),
  subtopics: z.array(z.string()).optional().default([]),
  difficulty: z.number().min(0).max(1).optional().default(0.5),
});

// Types
type ValidatedQuestionFilters = z.infer<typeof QuestionFiltersSchema>;
type ValidatedCreateQuestion = z.infer<typeof CreateQuestionSchema>;

// Query building utilities
class QueryBuilder {
  private conditions: SQL[] = [];
  private limit = 50;

  addCondition(condition: SQL): this {
    this.conditions.push(condition);
    return this;
  }

  addEventFilter(event: string): this {
    return this.addCondition(eq(questions.event, event));
  }

  addDivisionFilter(division: string): this {
    return this.addCondition(eq(questions.division, division));
  }

  addTournamentFilter(tournament: string): this {
    return this.addCondition(sql`${questions.tournament} ILIKE ${`%${tournament}%`}`);
  }

  addSubtopicsFilter(subtopics: string[]): this {
    if (subtopics.length === 0) return this;
    
    const subtopicConditions: SQL[] = subtopics.map(subtopic => 
      sql`${questions.subtopics} @> ${JSON.stringify([subtopic])}`
    );
    
    if (subtopicConditions.length === 1) {
      return this.addCondition(subtopicConditions[0]);
    }
    
    const orCondition = or(...subtopicConditions);
    if (orCondition) {
      return this.addCondition(orCondition);
    }
    
    return this;
  }

  addQuestionTypeFilter(questionType: 'mcq' | 'frq'): this {
    if (questionType === 'mcq') {
      return this.addCondition(
        sql`${questions.options} IS NOT NULL AND ${questions.options} != '[]'::jsonb AND jsonb_array_length(${questions.options}) > 0`
      );
    }
    
    return this.addCondition(
      sql`(${questions.options} IS NULL OR ${questions.options} = '[]'::jsonb OR jsonb_array_length(${questions.options}) = 0)`
    );
  }

  addDifficultyRange(min?: string, max?: string): this {
    if (min) {
      const difficulty = parseFloat(min);
      if (!isNaN(difficulty)) {
        this.addCondition(gte(questions.difficulty, difficulty.toString()));
      }
    }
    
    if (max) {
      const difficulty = parseFloat(max);
      if (!isNaN(difficulty)) {
        this.addCondition(lte(questions.difficulty, difficulty.toString()));
      }
    }
    
    return this;
  }

  setLimit(limit: string | undefined): this {
    const parsedLimit = limit ? parseInt(limit) : 50;
    // Ensure limit is between 1 and 200
    this.limit = Math.min(Math.max(parsedLimit > 0 ? parsedLimit : 50, 1), 200);
    return this;
  }

  getWhereCondition(): SQL | undefined {
    if (this.conditions.length === 0) return undefined;
    return this.conditions.length === 1 ? this.conditions[0] : and(...this.conditions);
  }

  getLimit(): number {
    return this.limit;
  }
}

// Data transformation utilities
const transformDatabaseResult = async (result: DatabaseQuestion): Promise<Question> => {
  // Generate base52 code for this question
  const { generateQuestionCode } = await import('@/lib/utils/base52');
  let base52Code: string | undefined;
  
  try {
    base52Code = await generateQuestionCode(result.id, 'questions');
  } catch (error) {
    console.warn(`Failed to generate base52 code for question ${result.id}:`, error);
    base52Code = undefined;
  }

  return {
    id: result.id,
    question: result.question,
    tournament: result.tournament,
    division: result.division,
    event: result.event,
    difficulty: result.difficulty ? parseFloat(result.difficulty) : 0.5,
    options: Array.isArray(result.options) ? result.options : [],
    answers: Array.isArray(result.answers) ? result.answers : [],
    subtopics: Array.isArray(result.subtopics) ? result.subtopics : [],
    created_at: result.createdAt?.toISOString(),
    updated_at: result.updatedAt?.toISOString(),
    base52: base52Code,
  };
};

// Business logic functions
const parseAndValidateFilters = (searchParams: URLSearchParams): ValidatedQuestionFilters => {
  const rawFilters = {
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

  return QuestionFiltersSchema.parse(rawFilters);
};

const buildSubtopicsArray = (filters: ValidatedQuestionFilters): string[] => {
  const subtopics: string[] = [];
  
  if (filters.subtopics) {
    subtopics.push(...filters.subtopics.split(',').map(s => s.trim()));
  } else if (filters.subtopic) {
    subtopics.push(filters.subtopic);
  }
  
  return subtopics;
};

const fetchQuestions = async (filters: ValidatedQuestionFilters): Promise<Question[]> => {
  const queryBuilder = new QueryBuilder();
  
  // Apply filters
  if (filters.event) {
    queryBuilder.addEventFilter(filters.event);
  }
  
  if (filters.division) {
    queryBuilder.addDivisionFilter(filters.division);
  }
  
  if (filters.tournament) {
    queryBuilder.addTournamentFilter(filters.tournament);
  }
  
  const subtopics = buildSubtopicsArray(filters);
  if (subtopics.length > 0) {
    queryBuilder.addSubtopicsFilter(subtopics);
  }
  
  if (filters.question_type) {
    queryBuilder.addQuestionTypeFilter(filters.question_type);
  }
  
  queryBuilder.addDifficultyRange(filters.difficulty_min, filters.difficulty_max);
  queryBuilder.setLimit(filters.limit);

  // Two-phase indexed random selection using random_f with fallback
  const whereCondition = queryBuilder.getWhereCondition();
  const limit = queryBuilder.getLimit();
  const r = Math.random();

  try {
    const first = await db
      .select()
      .from(questions)
      .where(
        whereCondition
          ? and(whereCondition, gte(questions.randomF, r))
          : gte(questions.randomF, r)
      )
      .orderBy(questions.randomF)
      .limit(limit);

    if (first.length >= limit) {
      return Promise.all(first.map(transformDatabaseResult));
    }

    const remaining = limit - first.length;
    const second = await db
      .select()
      .from(questions)
      .where(
        whereCondition
          ? and(whereCondition, lt(questions.randomF, r))
          : lt(questions.randomF, r)
      )
      .orderBy(questions.randomF)
      .limit(remaining);

    const allResults = [...first, ...second];
    return Promise.all(allResults.map(transformDatabaseResult));
  } catch (err) {
    console.log('Error fetching questions', err);
    // Fallback while migrations roll out: random() sort
    const base = whereCondition
      ? db.select().from(questions).where(whereCondition).orderBy(sql`RANDOM()`).limit(limit)
      : db.select().from(questions).orderBy(sql`RANDOM()`).limit(limit);
    const rows = await base;
    return Promise.all(rows.map(transformDatabaseResult));
  }
};

const createQuestion = async (data: ValidatedCreateQuestion): Promise<Question> => {
  const id = uuidv4();
  
  const result = await db.insert(questions).values({
    id,
    question: data.question,
    tournament: data.tournament,
    division: data.division,
    event: data.event,
    options: data.options,
    answers: data.answers,
    subtopics: data.subtopics,
    difficulty: data.difficulty.toString(),
    // randomF will default to random() via schema
  }).returning();
  
  const question = result[0];
  if (!question) {
    throw new ApiError(500, 'Failed to create question', 'CREATE_FAILED');
  }
  
  return await transformDatabaseResult(question);
};

// API Handlers
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logApiRequest('GET', '/api/questions', Object.fromEntries(request.nextUrl.searchParams));
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = parseAndValidateFilters(searchParams);
    
    const questions = await fetchQuestions(filters);
    
    const response = createSuccessResponse(questions);
    logApiResponse('GET', '/api/questions', 200, Date.now() - startTime);
    return response;
  } catch (error) {
    const response = handleApiError(error);
    logApiResponse('GET', '/api/questions', response.status, Date.now() - startTime);
    return response;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  logApiRequest('POST', '/api/questions');
  
  try {
    const validatedData = await parseRequestBody(request, CreateQuestionSchema);
    const question = await createQuestion(validatedData);
    
    const response = createSuccessResponse(question, 'Question created successfully');
    logApiResponse('POST', '/api/questions', 201, Date.now() - startTime);
    return response;
  } catch (error) {
    const response = handleApiError(error);
    logApiResponse('POST', '/api/questions', response.status, Date.now() - startTime);
    return response;
  }
}