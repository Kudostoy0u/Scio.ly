import { ApiErrors, handleApiError, successResponse, validateFields } from "@/lib/api/utils";
import { db } from "@/lib/db";
import { questions as questionsTable } from "@/lib/db/schema";
import { edits as editsTable } from "@/lib/db/schema/core";
import { geminiService } from "@/lib/services/gemini";
import type { ApiResponse } from "@/lib/types/api";
import logger from "@/lib/utils/logger";
import { type SQL, and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const maxDuration = 60;

export interface EditRequest extends Record<string, unknown> {
  originalQuestion: Record<string, unknown>;
  editedQuestion: Record<string, unknown>;
  event: string;
  reason?: string;
  bypass?: boolean;
  aiSuggestion?: Record<string, unknown>;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex edit report processing with validation and AI suggestions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateFields<EditRequest>(body, [
      "originalQuestion",
      "editedQuestion",
      "event",
    ]);

    if (!validation.valid) {
      return validation.error;
    }

    const { originalQuestion, editedQuestion, event, reason, bypass, aiSuggestion } =
      validation.data;

    logger.debug("Report edit request", { bypass, hasAiSuggestion: !!aiSuggestion });

    let isValid = false;
    let aiReason = "";

    const toText = (opts: string[] | undefined, answers: unknown[]): string[] => {
      if (!opts || opts.length === 0) {
        return answers.map((a) => String(a));
      }
      return answers.map((a) => {
        if (typeof a === "number") {
          return a >= 0 && a < opts.length ? (opts[a] ?? String(a)) : String(a);
        }
        const s = String(a);
        const idx = opts.map((o) => o.toLowerCase()).indexOf(s.toLowerCase());
        return idx >= 0 ? (opts[idx] ?? s) : s;
      });
    };

    const arraysEqual = (a?: string[], b?: string[]) => {
      if (!(a || b)) {
        return true;
      }
      if (!(a && b)) {
        return false;
      }
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          return false;
        }
      }
      return true;
    };

    // Compute canBypass: either flag is true OR aiSuggestion matches exactly
    let canBypass = !!bypass;
    if (aiSuggestion) {
      try {
        const aiQ = String(aiSuggestion.question || "");
        const aiOpts = Array.isArray(aiSuggestion.options)
          ? aiSuggestion.options.map(String)
          : undefined;
        const aiAns = Array.isArray(aiSuggestion.answers) ? aiSuggestion.answers.map(String) : [];

        const editedQ = String(editedQuestion.question || "");
        const editedOpts = Array.isArray(editedQuestion.options)
          ? (editedQuestion.options as unknown[]).map(String)
          : undefined;
        const editedAnsRaw = Array.isArray(editedQuestion.answers)
          ? (editedQuestion.answers as unknown[])
          : [];
        const editedAnsText = toText(editedOpts, editedAnsRaw);

        const matches =
          editedQ === aiQ && arraysEqual(editedOpts, aiOpts) && arraysEqual(editedAnsText, aiAns);
        logger.debug("AI bypass verification", { matches, editedAnsText, aiAns });
        if (matches) {
          canBypass = true;
        }
      } catch (e) {
        logger.warn("AI bypass verification failed", e);
      }
    }

    if (canBypass) {
      isValid = true;
      aiReason = "Edit accepted!";
      logger.info("AI bypass mode: Edit accepted as untampered AI suggestion");
    } else if (geminiService.isAvailable()) {
      logger.info("Sending request to Gemini AI for edit validation");
      logger.debug("Edit validation request", { event, reason });

      try {
        const result = await geminiService.validateReportEdit(
          originalQuestion,
          editedQuestion,
          event,
          reason || ""
        );

        logger.info("Gemini AI edit validation response received");

        isValid = Boolean(result.isValid);
        aiReason = String(result.reason || "AI evaluation completed");

        logger.info(`AI Decision: ${isValid ? "accepted" : "rejected"}`, { reason: aiReason });
      } catch (error) {
        isValid = false;
        aiReason = "AI evaluation failed";
        logger.error("Gemini AI edit validation error:", error);
      }
    } else {
      isValid = false;
      aiReason = "AI validation not available";
      logger.warn("Gemini AI client not available");
    }

    if (isValid) {
      const originalJson = JSON.stringify(originalQuestion);
      const editedJson = JSON.stringify(editedQuestion);

      try {
        const existing = await db
          .select({ id: editsTable.id })
          .from(editsTable)
          .where(
            and(
              eq(editsTable.event, event),
              eq(editsTable.originalQuestion, JSON.parse(originalJson))
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(editsTable)
            .set({ editedQuestion: JSON.parse(editedJson), updatedAt: new Date() })
            .where(eq(editsTable.id, existing[0]?.id ?? ""));
          logger.info("Updated existing edit in database");
        } else {
          await db.insert(editsTable).values({
            event,
            originalQuestion: JSON.parse(originalJson),
            editedQuestion: JSON.parse(editedJson),
          });
          logger.info("Created new edit in database");
        }

        logger.info("Edit successfully saved to database");

        let targetId: string | undefined =
          (originalQuestion.id as string | undefined) || (editedQuestion.id as string | undefined);
        if (!targetId) {
          const conditions: SQL[] = [
            eq(questionsTable.question, String(originalQuestion.question || "")),
            eq(questionsTable.event, String(event)),
          ];
          if (originalQuestion.tournament) {
            conditions.push(eq(questionsTable.tournament, String(originalQuestion.tournament)));
          }
          if (originalQuestion.division) {
            conditions.push(eq(questionsTable.division, String(originalQuestion.division)));
          }
          const found = await db
            .select({ id: questionsTable.id })
            .from(questionsTable)
            .where(and(...conditions))
            .limit(1);
          targetId = found[0]?.id as string | undefined;
          if (!targetId) {
            const cond2: SQL[] = [
              eq(questionsTable.question, String(editedQuestion.question || "")),
              eq(questionsTable.event, String(event)),
            ];
            if (editedQuestion.tournament) {
              cond2.push(eq(questionsTable.tournament, String(editedQuestion.tournament)));
            }
            if (editedQuestion.division) {
              cond2.push(eq(questionsTable.division, String(editedQuestion.division)));
            }
            const found2 = await db
              .select({ id: questionsTable.id })
              .from(questionsTable)
              .where(and(...cond2))
              .limit(1);
            targetId = found2[0]?.id as string | undefined;
          }
        }

        if (targetId) {
          const payload: Partial<typeof questionsTable.$inferInsert> = {
            question: String(editedQuestion.question || ""),
            tournament: String(editedQuestion.tournament || ""),
            division: String(editedQuestion.division || ""),
            event: String(event || editedQuestion.event || ""),
            options: Array.isArray(editedQuestion.options)
              ? (editedQuestion.options as unknown[])
              : [],
            answers: Array.isArray(editedQuestion.answers)
              ? (editedQuestion.answers as unknown[])
              : [],
            subtopics: Array.isArray(editedQuestion.subtopics)
              ? (editedQuestion.subtopics as unknown[])
              : editedQuestion.subtopic
                ? [String(editedQuestion.subtopic)]
                : [],
            difficulty:
              typeof editedQuestion.difficulty === "number"
                ? editedQuestion.difficulty.toString()
                : typeof editedQuestion.difficulty === "string"
                  ? String(editedQuestion.difficulty)
                  : "0.5",
          };
          await db
            .update(questionsTable)
            .set({ ...payload, updatedAt: new Date() })
            .where(eq(questionsTable.id, targetId));
          logger.info("Applied edit to questions table", { targetId });
        } else {
          logger.warn("Could not locate target question to auto-apply edit");
        }

        return successResponse<ApiResponse["data"]>(
          { reason: aiReason },
          aiReason || "Question edit saved and applied"
        );
      } catch (error) {
        logger.error("Database error saving edit:", error);
        return ApiErrors.serverError("Failed to save edit");
      }
    } else {
      logger.info("Edit rejected by AI validation");
      return successResponse<ApiResponse["data"]>(
        { reason: aiReason },
        aiReason || "Edit was not accepted"
      );
    }
  } catch (error) {
    logger.error("POST /api/report/edit error:", error);
    return handleApiError(error);
  }
}
