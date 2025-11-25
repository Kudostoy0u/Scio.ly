// biome-ignore lint/correctness/noNodejsModules: Node.js crypto module is required for API routes
import crypto from "node:crypto";
import { ApiError, handleApiError, parseRequestBody } from "@/lib/api/utils";
import { db } from "@/lib/db";
import { questions } from "@/lib/db/schema";
import type { Question } from "@/lib/types/api";
import logger from "@/lib/utils/logger";
import { type SQL, and, eq, gte, lt, lte, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Feature flag: when true, use efficient two-phase indexed random selection
const trulyRandom = true;

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

const QuestionFiltersSchema = z.object({
  event: z.string().optional(),
  division: z.string().optional(),
  tournament: z.string().optional(),
  subtopic: z.string().optional(),
  subtopics: z.string().optional(),
  difficulty_min: z.string().optional(),
  difficulty_max: z.string().optional(),
  question_type: z.enum(["mcq", "frq"]).optional(),
  limit: z.string().optional(),
});

const CreateQuestionSchema = z.object({
  question: z.string().min(1, "Question is required"),
  tournament: z.string().min(1, "Tournament is required"),
  division: z.string().min(1, "Division is required"),
  event: z.string().min(1, "Event is required"),
  options: z.array(z.string()).optional().default([]),
  answers: z
    .array(z.union([z.string(), z.number()]))
    .optional()
    .default([]),
  subtopics: z.array(z.string()).optional().default([]),
  difficulty: z.number().min(0).max(1).optional().default(0.5),
});

type ValidatedQuestionFilters = z.infer<typeof QuestionFiltersSchema>;
type ValidatedCreateQuestion = z.infer<typeof CreateQuestionSchema>;

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
    if (subtopics.length === 0) {
      return this;
    }

    const subtopicConditions: SQL[] = subtopics.map(
      (subtopic) => sql`${questions.subtopics} @> ${JSON.stringify([subtopic])}`
    );

    if (subtopicConditions.length === 1) {
      const condition = subtopicConditions[0];
      if (!condition) {
        return this;
      }
      return this.addCondition(condition);
    }

    const orCondition = or(...subtopicConditions);
    if (!orCondition) {
      return this;
    }
    if (orCondition) {
      return this.addCondition(orCondition);
    }

    return this;
  }

  addQuestionTypeFilter(questionType: "mcq" | "frq"): this {
    if (questionType === "mcq") {
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
      const difficulty = Number.parseFloat(min);
      if (!Number.isNaN(difficulty)) {
        this.addCondition(gte(questions.difficulty, difficulty.toString()));
      }
    }

    if (max) {
      const difficulty = Number.parseFloat(max);
      if (!Number.isNaN(difficulty)) {
        this.addCondition(lte(questions.difficulty, difficulty.toString()));
      }
    }

    return this;
  }

  setLimit(limit: string | undefined): this {
    const parsedLimit = limit ? Number.parseInt(limit) : 50;

    this.limit = Math.min(Math.max(parsedLimit > 0 ? parsedLimit : 50, 1), 200);
    return this;
  }

  getWhereCondition(): SQL | undefined {
    if (this.conditions.length === 0) {
      return undefined;
    }
    return this.conditions.length === 1 ? this.conditions[0] : and(...this.conditions);
  }

  getLimit(): number {
    return this.limit;
  }
}

function encodeBase52Local(index: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const base = alphabet.length;
  const coreLength = 4;
  let n = index;
  let out = "";
  for (let i = 0; i < coreLength; i++) {
    out = alphabet[n % base] + out;
    n = Math.floor(n / base);
  }
  return out;
}

function hashIdToInt(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash) % 7311616; // 52^4
}

const transformDatabaseResult = (result: DatabaseQuestion): Question => {
  const core = encodeBase52Local(hashIdToInt(result.id));
  const base52Code = `${core}S`;
  return {
    id: result.id,
    question: result.question,
    tournament: result.tournament,
    division: result.division,
    event: result.event,
    difficulty: result.difficulty ? Number.parseFloat(result.difficulty) : 0.5,
    options: Array.isArray(result.options) ? result.options : [],
    answers: Array.isArray(result.answers) ? result.answers : [],
    subtopics: Array.isArray(result.subtopics) ? result.subtopics : [],
    created_at: result.createdAt?.toISOString(),
    updated_at: result.updatedAt?.toISOString(),
    base52: base52Code,
  };
};

const CACHE_TTL_MS = 60000;
const questionsCache = new Map<string, { expiresAt: number; data: Question[] }>();
const inflight = new Map<string, Promise<Question[]>>();

function makeCacheKey(filters: ValidatedQuestionFilters): string {
  const parts: string[] = [];
  const entries = Object.entries(filters).filter(([, v]) => v !== undefined) as [string, string][];
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [k, v] of entries) {
    parts.push(`${k}=${v}`);
  }
  return parts.join("&");
}

const parseAndValidateFilters = (searchParams: URLSearchParams): ValidatedQuestionFilters => {
  const rawFilters = {
    event: searchParams.get("event") || undefined,
    division: searchParams.get("division") || undefined,
    tournament: searchParams.get("tournament") || undefined,
    subtopic: searchParams.get("subtopic") || undefined,
    subtopics: searchParams.get("subtopics") || undefined,
    difficulty_min: searchParams.get("difficulty_min") || undefined,
    difficulty_max: searchParams.get("difficulty_max") || undefined,
    question_type: (searchParams.get("question_type") as "mcq" | "frq") || undefined,
    limit: searchParams.get("limit") || undefined,
  };

  return QuestionFiltersSchema.parse(rawFilters);
};

const buildSubtopicsArray = (filters: ValidatedQuestionFilters): string[] => {
  const subtopics: string[] = [];

  if (filters.subtopics) {
    subtopics.push(...filters.subtopics.split(",").map((s) => s.trim()));
  } else if (filters.subtopic) {
    subtopics.push(filters.subtopic);
  }

  return subtopics;
};

const fetchQuestions = async (filters: ValidatedQuestionFilters): Promise<Question[]> => {
  const queryBuilder = new QueryBuilder();

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

  const whereCondition = queryBuilder.getWhereCondition();
  const limit = queryBuilder.getLimit();
  const r = (() => {
    try {
      const buf = crypto.randomBytes(6); // 48 bits
      const n = Number.parseInt(buf.toString("hex"), 16);
      return n / 2 ** 48;
    } catch {
      return Math.random();
    }
  })();

  if (!trulyRandom) {
    try {
      // Single scan using CASE wrap-around
      const rows = await db
        .select({
          id: questions.id,
          question: questions.question,
          tournament: questions.tournament,
          division: questions.division,
          event: questions.event,
          difficulty: questions.difficulty,
          options: questions.options,
          answers: questions.answers,
          subtopics: questions.subtopics,
          createdAt: questions.createdAt,
          updatedAt: questions.updatedAt,
          randomF: questions.randomF,
        })
        .from(questions)
        .where(whereCondition)
        .orderBy(sql`CASE WHEN ${questions.randomF} >= ${r} THEN 0 ELSE 1 END`, questions.randomF)
        .limit(limit);

      return rows.map((row) => transformDatabaseResult(row as DatabaseQuestion));
    } catch (err) {
      logger.warn("Error fetching questions (single scan), falling back to RANDOM()", err);

      const rows = await db
        .select({
          id: questions.id,
          question: questions.question,
          tournament: questions.tournament,
          division: questions.division,
          event: questions.event,
          difficulty: questions.difficulty,
          options: questions.options,
          answers: questions.answers,
          subtopics: questions.subtopics,
          createdAt: questions.createdAt,
          updatedAt: questions.updatedAt,
          randomF: questions.randomF,
        })
        .from(questions)
        .where(whereCondition)
        .orderBy(sql`RANDOM()`)
        .limit(limit);

      return rows.map((row) => transformDatabaseResult(row as DatabaseQuestion));
    }
  }

  // Two-phase indexed random seek for truly random selection
  try {
    logger.debug("Using two-phase indexed random seek");
    const whereFirst = whereCondition
      ? and(whereCondition, gte(questions.randomF, r))
      : gte(questions.randomF, r);

    const firstRows = await db
      .select({
        id: questions.id,
        question: questions.question,
        tournament: questions.tournament,
        division: questions.division,
        event: questions.event,
        difficulty: questions.difficulty,
        options: questions.options,
        answers: questions.answers,
        subtopics: questions.subtopics,
        createdAt: questions.createdAt,
        updatedAt: questions.updatedAt,
        randomF: questions.randomF,
      })
      .from(questions)
      .where(whereFirst)
      .orderBy(questions.randomF)
      .limit(limit);

    let rows = firstRows;

    if (rows.length < limit) {
      const remaining = limit - rows.length;
      const whereSecond = whereCondition
        ? and(whereCondition, lt(questions.randomF, r))
        : lt(questions.randomF, r);

      const secondRows = await db
        .select({
          id: questions.id,
          question: questions.question,
          tournament: questions.tournament,
          division: questions.division,
          event: questions.event,
          difficulty: questions.difficulty,
          options: questions.options,
          answers: questions.answers,
          subtopics: questions.subtopics,
          createdAt: questions.createdAt,
          updatedAt: questions.updatedAt,
          randomF: questions.randomF,
        })
        .from(questions)
        .where(whereSecond)
        .orderBy(questions.randomF)
        .limit(remaining);

      rows = rows.concat(secondRows);
    }

    return rows.map((row) => transformDatabaseResult(row as DatabaseQuestion));
  } catch (err) {
    logger.warn("Error fetching questions (two-phase), falling back to RANDOM()", err);

    const rows = await db
      .select({
        id: questions.id,
        question: questions.question,
        tournament: questions.tournament,
        division: questions.division,
        event: questions.event,
        difficulty: questions.difficulty,
        options: questions.options,
        answers: questions.answers,
        subtopics: questions.subtopics,
        createdAt: questions.createdAt,
        updatedAt: questions.updatedAt,
        randomF: questions.randomF,
      })
      .from(questions)
      .where(whereCondition)
      .orderBy(sql`RANDOM()`)
      .limit(limit);

    return rows.map((row) => transformDatabaseResult(row as DatabaseQuestion));
  }
};

const createQuestion = async (data: ValidatedCreateQuestion): Promise<Question> => {
  const id = uuidv4();

  const result = await db
    .insert(questions)
    .values({
      id,
      question: data.question,
      tournament: data.tournament,
      division: data.division,
      event: data.event,
      options: data.options,
      answers: data.answers,
      subtopics: data.subtopics,
      difficulty: data.difficulty.toString(),
      // randomf will default to random() via schema
    })
    .returning();

  const question = result[0];
  if (!question) {
    throw new ApiError(500, "Failed to create question", "CREATE_FAILED");
  }

  return transformDatabaseResult(question as DatabaseQuestion);
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = parseAndValidateFilters(searchParams);

    // For truly random selection, bypass caches entirely and disable response caching
    if (trulyRandom) {
      const data = await fetchQuestions(filters);
      const res = NextResponse.json({ success: true, data });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // Existing behavior with short-term caching
    const cacheKey = makeCacheKey(filters);
    const now = Date.now();
    const cached = questionsCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      const res = NextResponse.json({ success: true, data: cached.data });
      res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
      return res;
    }

    let promise = inflight.get(cacheKey);
    if (!promise) {
      promise = fetchQuestions(filters);
      inflight.set(cacheKey, promise);
    }
    const data = await promise.finally(() => inflight.delete(cacheKey));
    questionsCache.set(cacheKey, { expiresAt: now + CACHE_TTL_MS, data });

    const res = NextResponse.json({ success: true, data });
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const validatedData = await parseRequestBody(request, CreateQuestionSchema);
    const question = await createQuestion(validatedData);
    return NextResponse.json({
      success: true,
      data: question,
      message: "Question created successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
