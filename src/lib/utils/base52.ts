import { db } from '@/lib/db';
import { questions, idEvents, base52Codes } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = ALPHABET.length; // 52
const CORE_LENGTH = 4; // 4 letters for the core identifier

export function encodeBase52(index: number): string {
  let n = index;
  let out = '';
  for (let i = 0; i < CORE_LENGTH; i++) {
    out = ALPHABET[n % BASE] + out;
    n = Math.floor(n / BASE);
  }
  return out;
}

export function decodeBase52(core: string): number {
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


export async function generateQuestionCode(questionId: string, table: 'questions' | 'idEvents' = 'questions'): Promise<string> {
  const baseTable = table === 'idEvents' ? idEvents : questions;

  const result = await db
    .select({ id: baseTable.id })
    .from(baseTable)
    .where(eq(baseTable.id, questionId))
    .limit(1);
  
  if (result.length === 0) {
    throw new Error(`Question not found: ${questionId}`);
  }
  

  const existingCode = await db
    .select({ code: base52Codes.code })
    .from(base52Codes)
    .where(and(eq(base52Codes.questionId, questionId), eq(base52Codes.tableName, table)))
    .limit(1);
  
  if (existingCode.length > 0) {
    return existingCode[0].code;
  }
  

  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {

    const questionHash = calculateQuestionHash(questionId);
    const hashWithAttempt = (questionHash + attempts) % 1000000000;
    const base52Core = encodeBase52(hashWithAttempt);
    const typeSuffix = table === 'idEvents' ? 'P' : 'S';
    const code = base52Core + typeSuffix;
    

    const existingCodeCheck = await db
      .select({ id: base52Codes.id })
      .from(base52Codes)
      .where(eq(base52Codes.code, code))
      .limit(1);
    
    if (existingCodeCheck.length === 0) {

      try {
        await db.insert(base52Codes).values({
          code,
          questionId,
          tableName: table,
        });
        return code;
      } catch {

        attempts++;
        continue;
      }
    }
    
    attempts++;
  }
  
  throw new Error(`Failed to generate unique code for question ${questionId} after ${maxAttempts} attempts`);
}


function calculateQuestionHash(questionId: string): number {
  let hash = 0;
  for (let i = 0; i < questionId.length; i++) {
    const char = questionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 1000000000;
}


export async function getQuestionByCode(code: string): Promise<{ question: any; table: 'questions' | 'idEvents' }> {
  if (code.length !== 5) {
    throw new Error('Invalid code length. Expected 5 characters.');
  }
  
  const typeSuffix = code.slice(4, 5);
  
  if (typeSuffix !== 'S' && typeSuffix !== 'P') {
    throw new Error('Invalid type suffix. Expected S or P.');
  }
  
  const table = typeSuffix === 'P' ? 'idEvents' : 'questions';

  try {
    // Collapse to a single round-trip using a UNION query
    const rows = await db.execute(
      // eslint-disable-next-line drizzle/enforce-query-usage
      sql<{
        table_name: 'questions' | 'idEvents';
        id: string;
        question: unknown;
        tournament: string;
        division: string;
        options: unknown;
        answers: unknown;
        subtopics: unknown;
        difficulty: number;
        event: string;
        random_f: number;
        created_at: Date | null;
        updated_at: Date | null;
      }>`
        (
          SELECT 'questions'::text AS table_name, q.*
          FROM ${sql.identifier('questions')} q
          JOIN ${sql.identifier('base52_codes')} b ON b.question_id = q.id AND b.table_name = 'questions'
          WHERE b.code = ${code}
        )
        UNION ALL
        (
          SELECT 'idEvents'::text AS table_name, i.*
          FROM ${sql.identifier('id_events')} i
          JOIN ${sql.identifier('base52_codes')} b ON b.question_id = i.id AND b.table_name = 'idEvents'
          WHERE b.code = ${code}
        )
        LIMIT 1
      `
    );

    if (rows.length === 0) {
      throw new Error(`Question not found for code: ${code}`);
    }

    const row = rows[0] as any;
    return { question: row, table: row.table_name };
  } catch {
    throw new Error(`Failed to decode question code: ${code}`);
  }
}


export async function generateQuestionCodes(questionIds: string[], table: 'questions' | 'idEvents' = 'questions'): Promise<Map<string, string>> {
  const baseTable = table === 'idEvents' ? idEvents : questions;
  
  const results = await db
    .select({ id: baseTable.id })
    .from(baseTable)
    .where(inArray(baseTable.id, questionIds));
  
  const codeMap = new Map<string, string>();
  
  for (const result of results) {
    const code = await generateQuestionCode(result.id, table);
    codeMap.set(result.id, code);
  }
  
  return codeMap;
}


export async function computeQuestionRank(questionId: string, _createdAt: Date | null, _table: 'questions' | 'idEvents' = 'questions'): Promise<number> {

  return calculateQuestionHash(questionId);
}

export async function getQuestionByRank(_targetRank: number, _table: 'questions' | 'idEvents' = 'questions') {

  throw new Error('getQuestionByRank is deprecated. Use getQuestionByCode instead.');
}
