import { client } from "@/lib/db";
import type { ApiResponse, Question } from "@/lib/types/api";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type QuestionTableRow = {
  id: string;
  question: string;
  tournament: string;
  division: string;
  options: unknown;
  answers: unknown;
  subtopics: unknown;
  difficulty: number | string | null;
  event: string;
  createdAt?: string | Date | null;
  created_at?: string | Date | null;
  updatedAt?: string | Date | null;
  updated_at?: string | Date | null;
};

type IdEventTableRow = QuestionTableRow & {
  images?: unknown;
};

const BatchRequestSchema = z.object({
  ids: z.array(z.string()).min(1),
});

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
};

const parseAnswerArray = (value: unknown): (string | number)[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string | number => {
    return typeof item === "string" || typeof item === "number";
  });
};

const formatTimestamp = (value?: string | Date | null): string | undefined => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
};

const normalizeDifficulty = (value: number | string | null | undefined): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0.5;
};

const pickRandomImage = (value: unknown): string | undefined => {
  const images = parseStringArray(value);
  if (images.length === 0) {
    return undefined;
  }
  return images[Math.floor(Math.random() * images.length)];
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedBody = BatchRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      const response: ApiResponse = {
        success: false,
        error: "Missing or invalid question IDs",
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { ids } = parsedBody.data;

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(",");
    const questionsQuery = `SELECT * FROM questions WHERE id IN (${placeholders}) ORDER BY array_position($${ids.length + 1}, id)`;
    const questionsParams = [...ids, ids] as (string | number | boolean | null)[];

    const questionRows = await client.unsafe<QuestionTableRow[]>(questionsQuery, questionsParams);

    const foundQuestionIds = questionRows.map((row) => row.id);
    const remainingIds = ids.filter((id) => !foundQuestionIds.includes(id));

    let idEventRows: IdEventTableRow[] = [];
    if (remainingIds.length > 0) {
      const idPlaceholders = remainingIds.map((_, index) => `$${index + 1}`).join(",");
      const idEventsQuery = `SELECT * FROM id_events WHERE id IN (${idPlaceholders}) ORDER BY array_position($${remainingIds.length + 1}, id)`;
      const idEventsParams = [...remainingIds, remainingIds] as (
        | string
        | number
        | boolean
        | null
      )[];

      idEventRows = await client.unsafe<IdEventTableRow[]>(idEventsQuery, idEventsParams);
    }

    const allQuestions: Question[] = [];

    const { generateQuestionCodes } = await import("@/lib/utils/base52");

    const regularQuestionCodes =
      questionRows.length > 0
        ? await generateQuestionCodes(
            questionRows.map((row) => row.id),
            "questions"
          )
        : new Map<string, string>();

    const idQuestionCodes =
      idEventRows.length > 0
        ? await generateQuestionCodes(
            idEventRows.map((row) => row.id),
            "idEvents"
          )
        : new Map<string, string>();

    for (const row of questionRows) {
      allQuestions.push({
        id: row.id,
        question: row.question,
        tournament: row.tournament,
        division: row.division,
        options: parseStringArray(row.options),
        answers: parseAnswerArray(row.answers),
        subtopics: parseStringArray(row.subtopics),
        difficulty: normalizeDifficulty(row.difficulty),
        event: row.event,
        base52: regularQuestionCodes.get(row.id),
        created_at: formatTimestamp(row.createdAt ?? row.created_at),
        updated_at: formatTimestamp(row.updatedAt ?? row.updated_at),
      });
    }

    for (const row of idEventRows) {
      allQuestions.push({
        id: row.id,
        question: row.question,
        tournament: row.tournament,
        division: row.division,
        options: parseStringArray(row.options),
        answers: parseAnswerArray(row.answers),
        subtopics: parseStringArray(row.subtopics),
        difficulty: normalizeDifficulty(row.difficulty),
        event: row.event,
        imageData: pickRandomImage(row.images),
        base52: idQuestionCodes.get(row.id),
        created_at: formatTimestamp(row.createdAt ?? row.created_at),
        updated_at: formatTimestamp(row.updatedAt ?? row.updated_at),
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
  } catch (_error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch questions",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
