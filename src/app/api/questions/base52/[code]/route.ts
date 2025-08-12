import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { createErrorResponse, createSuccessResponse, logApiRequest, logApiResponse } from '@/lib/api/utils';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = ALPHABET.length; // 52
const CODE_LENGTH = 5;

function decodeBase52(code: string): number {
  if (typeof code !== 'string' || code.length !== CODE_LENGTH) {
    throw new Error('Code must be a 5-character base52 string');
  }
  let value = 0;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    const digit = ALPHABET.indexOf(c);
    if (digit === -1) {
      throw new Error('Invalid base52 character');
    }
    value = value * BASE + digit;
  }
  return value;
}

// Deterministic order: first by createdAt asc (nulls last), then by id asc
// This provides a stable index across calls.

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const start = Date.now();
  const { code } = await params;
  logApiRequest('GET', `/api/questions/base52/${code}`);
  try {
    const index = decodeBase52(code);

    // We want the Nth row in a stable order. Use a window function to rank rows.
    // Drizzle doesn't expose window functions directly across all dialects, so we use raw SQL.
    // Note: CockroachDB/Postgres support window functions with ROW_NUMBER().

    const rows = await db.execute(sql`
      WITH ordered AS (
        SELECT
          q.id,
          q.question,
          q.tournament,
          q.division,
          q.event,
          q.difficulty,
          q.options,
          q.answers,
          q.subtopics,
          q.created_at,
          q.updated_at,
          ROW_NUMBER() OVER (
            ORDER BY q.created_at ASC NULLS LAST, q.id ASC
          ) AS rn
        FROM ${questions} AS q
      )
      SELECT *
      FROM ordered
      WHERE rn = ${index + 1}
    `);

    const item = Array.isArray(rows) ? (rows as any[])[0] : (rows as any).rows?.[0];
    if (!item) {
      const res = createErrorResponse('Question not found for index', 404, 'NOT_FOUND');
      logApiResponse('GET', `/api/questions/base52/${code}`, 404, Date.now() - start);
      return res;
    }

    // Normalize difficulty to number and JSON fields to arrays
    const difficulty = typeof item.difficulty === 'number' ? item.difficulty : parseFloat(String(item.difficulty ?? 0.5));
    const options = Array.isArray(item.options) ? item.options : [];
    const answers = Array.isArray(item.answers) ? item.answers : [];
    const subtopics = Array.isArray(item.subtopics) ? item.subtopics : [];

    const res = createSuccessResponse({
      index,
      code,
      question: {
        id: String(item.id),
        question: String(item.question),
        tournament: String(item.tournament),
        division: String(item.division),
        event: String(item.event),
        difficulty: Number.isFinite(difficulty) ? difficulty : 0.5,
        options,
        answers,
        subtopics,
        created_at: item.created_at ? new Date(item.created_at).toISOString() : undefined,
        updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : undefined,
      }
    });
    logApiResponse('GET', `/api/questions/base52/${code}`, 200, Date.now() - start);
    return res;
  } catch (err) {
    const res = createErrorResponse('Failed to decode or lookup question', 400, 'DECODE_OR_LOOKUP_ERROR');
    logApiResponse('GET', `/api/questions/base52/${code}`, 400, Date.now() - start);
    return res;
  }
}


