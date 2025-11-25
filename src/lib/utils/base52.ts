import { db } from "@/lib/db";
import { base52Codes, idEvents, questions } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

/** Base52 alphabet containing uppercase and lowercase letters */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
/** Base52 radix (52 characters) */
const BASE = ALPHABET.length; // 52
/** Core identifier length (4 characters) */
const CORE_LENGTH = 4; // 4 letters for the core identifier

/**
 * Encodes a number to Base52 string
 * Converts numeric index to URL-safe string using 52-character alphabet
 *
 * @param {number} index - Numeric index to encode
 * @returns {string} Base52 encoded string (4 characters)
 * @example
 * ```typescript
 * const encoded = encodeBase52(12345);
 * console.log(encoded); // "ABCd"
 * ```
 */
export function encodeBase52(index: number): string {
  let n = index;
  let out = "";
  for (let i = 0; i < CORE_LENGTH; i++) {
    out = ALPHABET[n % BASE] + out;
    n = Math.floor(n / BASE);
  }
  return out;
}

/**
 * Decodes a Base52 string to number
 * Converts Base52 string back to numeric index
 *
 * @param {string} core - Base52 encoded string (4 characters)
 * @returns {number} Decoded numeric index
 * @throws {Error} When core is not 4 characters or contains invalid characters
 * @example
 * ```typescript
 * const decoded = decodeBase52("ABCd");
 * console.log(decoded); // 12345
 * ```
 */
export function decodeBase52(core: string): number {
  if (typeof core !== "string" || core.length !== CORE_LENGTH) {
    throw new Error("Code core must be 4 characters");
  }
  let value = 0;
  for (const c of core) {
    if (c === undefined) {
      throw new Error("Invalid base52 character");
    }
    const digit = ALPHABET.indexOf(c);
    if (digit === -1) {
      throw new Error("Invalid base52 character");
    }
    value = value * BASE + digit;
  }
  return value;
}

/**
 * Generates a unique Base52 code for a question
 * Creates URL-safe identifiers for question sharing
 *
 * @param {string} questionId - UUID of the question
 * @param {'questions' | 'idEvents'} [table='questions'] - Database table name
 * @returns {Promise<string>} Unique 5-character Base52 code (4 chars + type suffix)
 * @throws {Error} When question not found or code generation fails
 * @example
 * ```typescript
 * const code = await generateQuestionCode('uuid-123', 'questions');
 * console.log(code); // "ABCdS" (S for questions table)
 * ```
 */
export async function generateQuestionCode(
  questionId: string,
  table: "questions" | "idEvents" = "questions"
): Promise<string> {
  const baseTable = table === "idEvents" ? idEvents : questions;

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

  if (existingCode.length > 0 && existingCode[0]) {
    return existingCode[0].code;
  }

  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const questionHash = calculateQuestionHash(questionId);
    const hashWithAttempt = (questionHash + attempts) % 1000000000;
    const base52Core = encodeBase52(hashWithAttempt);
    const typeSuffix = table === "idEvents" ? "P" : "S";
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

  throw new Error(
    `Failed to generate unique code for question ${questionId} after ${maxAttempts} attempts`
  );
}

function calculateQuestionHash(questionId: string): number {
  let hash = 0;
  for (let i = 0; i < questionId.length; i++) {
    const char = questionId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return Math.abs(hash) % 1000000000;
}

/**
 * Retrieves a question by its Base52 code
 * Looks up question from database using the code mapping
 *
 * @param {string} code - 5-character Base52 code
 * @returns {Promise<{ question: any; table: 'questions' | 'idEvents' }>} Question data and table name
 * @throws {Error} When code is invalid or question not found
 * @example
 * ```typescript
 * const result = await getQuestionByCode('ABCdS');
 * console.log(result.question); // Question object
 * console.log(result.table); // 'questions' or 'idEvents'
 * ```
 */
export async function getQuestionByCode(
  code: string
): Promise<{ question: Record<string, unknown>; table: "questions" | "idEvents" }> {
  const suffix = validateCodeSuffix(code);
  const mapping = await getCodeMapping(code);
  const resolvedTable = normalizeTableName(mapping.tableName, suffix);
  const question = await fetchQuestionRow(resolvedTable, mapping.questionId, code);
  return { question, table: resolvedTable };
}

function validateCodeSuffix(code: string): "S" | "P" {
  if (code.length !== 5) {
    throw new Error("Invalid code length. Expected 5 characters.");
  }
  const suffix = code.slice(4, 5);
  if (suffix !== "S" && suffix !== "P") {
    throw new Error("Invalid type suffix. Expected S or P.");
  }
  return suffix;
}

async function getCodeMapping(
  code: string
): Promise<{ questionId: string; tableName: string | null }> {
  const mapping = await db
    .select({ questionId: base52Codes.questionId, tableName: base52Codes.tableName })
    .from(base52Codes)
    .where(eq(base52Codes.code, code))
    .limit(1);

  if (!mapping[0]) {
    throw new Error(`Question not found for code: ${code}`);
  }

  return {
    questionId: mapping[0].questionId,
    tableName: mapping[0].tableName,
  };
}

function normalizeTableName(tableName: string | null, suffix: "S" | "P"): "questions" | "idEvents" {
  if (tableName === "questions" || tableName === "idEvents") {
    return tableName;
  }
  return suffix === "P" ? "idEvents" : "questions";
}

async function fetchQuestionRow(
  tableName: "questions" | "idEvents",
  questionId: string,
  code: string
): Promise<Record<string, unknown>> {
  const table = tableName === "questions" ? questions : idEvents;
  const row = await db.select().from(table).where(eq(table.id, questionId)).limit(1);
  if (!row[0]) {
    throw new Error(`Question not found for code: ${code}`);
  }
  return row[0] as Record<string, unknown>;
}

export async function generateQuestionCodes(
  questionIds: string[],
  table: "questions" | "idEvents" = "questions"
): Promise<Map<string, string>> {
  const baseTable = table === "idEvents" ? idEvents : questions;

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

export async function computeQuestionRank(
  questionId: string,
  _createdAt: Date | null,
  _table: "questions" | "idEvents" = "questions"
): Promise<number> {
  return calculateQuestionHash(questionId);
}

export async function getQuestionByRank(
  _targetRank: number,
  _table: "questions" | "idEvents" = "questions"
) {
  throw new Error("getQuestionByRank is deprecated. Use getQuestionByCode instead.");
}
