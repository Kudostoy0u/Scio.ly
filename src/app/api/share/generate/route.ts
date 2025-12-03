import { ApiErrors, handleApiError, successResponse, validateFields } from "@/lib/api/utils";
import { db } from "@/lib/db";
import { idEvents, questions } from "@/lib/db/schema";
import { shareLinks } from "@/lib/db/schema/core";
import type { ShareCodeRequest, ShareCodeResponse } from "@/lib/types/api";
import logger from "@/lib/utils/logger";
import { eq, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateFields<ShareCodeRequest>(body, ["questionIds", "testParamsRaw"]);

    if (!validation.valid) {
      return validation.error;
    }

    const { questionIds, testParamsRaw, code, idQuestionIds, timeRemainingSeconds } =
      validation.data;

    if (questionIds.length === 0) {
      return ApiErrors.badRequest("Question IDs array cannot be empty");
    }

    // Validate question IDs exist in database
    const validQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(inArray(questions.id, questionIds));

    const validIdQuestions = await db
      .select({ id: idEvents.id })
      .from(idEvents)
      .where(inArray(idEvents.id, questionIds));

    const totalValidQuestions = validQuestions.length + validIdQuestions.length;

    if (totalValidQuestions !== questionIds.length) {
      return ApiErrors.badRequest("Some question IDs are invalid");
    }

    // Generate or validate share code
    let shareCode = code;
    if (!shareCode) {
      shareCode = generateShareCode();
    }

    // Check if code already exists
    const existingResult = await db
      .select({ id: shareLinks.id })
      .from(shareLinks)
      .where(eq(shareLinks.code, shareCode));

    if (existingResult.length > 0) {
      return ApiErrors.badRequest("Code already exists");
    }

    // Prepare data for storage
    const dataToStore = {
      questionIds,
      idQuestionIds: idQuestionIds || [],
      testParamsRaw,
      timeRemainingSeconds: timeRemainingSeconds || null,
      createdAtMs: Date.now(),
    };

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Insert share link
    await db.insert(shareLinks).values({
      code: shareCode,
      indices: [],
      testParamsRaw: dataToStore,
      expiresAt: expiresAt.toISOString(),
    } as typeof shareLinks.$inferInsert);

    logger.info(`Generated share code: ${shareCode}, expires: ${expiresAt.toISOString()}`);

    return successResponse<ShareCodeResponse["data"]>({
      shareCode,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    logger.error("Failed to generate share code:", error);
    return handleApiError(error);
  }
}

/**
 * Generate a random 6-character share code
 */
function generateShareCode(): string {
  const charset = "0123456789abcdefghijklmnopqrstuvwxyz";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }
  return code.toUpperCase();
}
