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
    .where(eq(baseTable.id, questionId));
  
  if (result.length === 0) {
    throw new Error(`Question not found: ${questionId}`);
  }
  

  const existingCode = await db
    .select({ code: base52Codes.code })
    .from(base52Codes)
    .where(and(eq(base52Codes.questionId, questionId), eq(base52Codes.tableName, table)));
  
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
  const baseTable = table === 'idEvents' ? idEvents : questions;
  
  try {

    const codeEntry = await db
      .select({ questionId: base52Codes.questionId, tableName: base52Codes.tableName })
      .from(base52Codes)
      .where(eq(base52Codes.code, code))
      .limit(1);
    
    if (codeEntry.length === 0) {
      throw new Error(`Question not found for code: ${code}`);
    }
    

    const question = await db
      .select()
      .from(baseTable)
      .where(eq(baseTable.id, codeEntry[0].questionId))
      .limit(1);
    
    if (question.length === 0) {
      throw new Error(`Question not found for code: ${code}`);
    }
    
    return { question: question[0], table };
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
