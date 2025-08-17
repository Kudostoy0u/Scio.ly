import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { questions, idEvents } from '@/lib/db/schema';

import { createErrorResponse, createSuccessResponse, logApiRequest, logApiResponse } from '@/lib/api/utils';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = ALPHABET.length; // 52
const CORE_LENGTH = 4; // base52 core

function decodeBase52(core: string): number {
  if (typeof core !== 'string' || core.length !== CORE_LENGTH) {
    throw new Error('Code core must be 4 characters');
  }
  let value = 0;
  for (let i = 0; i < core.length; i++) {
    const c = core[i];
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
    const type = code.slice(-1).toUpperCase(); // 'S' or 'I'
    const core = code.slice(0, -1);
    const index = decodeBase52(core);

    // Get the Nth row in stable order using Drizzle queries
    const baseTable = type === 'I' ? idEvents : questions;
    
    // Get all rows ordered by created_at ASC NULLS LAST, then id ASC
    const allRows = await db
      .select()
      .from(baseTable)
      .orderBy(baseTable.createdAt, baseTable.id);
    
    const item = allRows[index];
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
    const images = Array.isArray((item as any).images) ? (item as any).images : [];

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
        ...(type === 'I' ? { images } : {}),
        created_at: item.createdAt ? new Date(item.createdAt).toISOString() : undefined,
        updated_at: item.updatedAt ? new Date(item.updatedAt).toISOString() : undefined,
      }
    });
    logApiResponse('GET', `/api/questions/base52/${code}`, 200, Date.now() - start);
    return res;
  } catch {
    const res = createErrorResponse('Failed to decode or lookup question', 400, 'DECODE_OR_LOOKUP_ERROR');
    logApiResponse('GET', `/api/questions/base52/${code}`, 400, Date.now() - start);
    return res;
  }
}


