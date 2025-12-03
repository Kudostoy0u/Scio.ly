import { db } from "@/lib/db";
import { edits as editsTable } from "@/lib/db/schema/core";
import { geminiService } from "@/lib/services/gemini";
import type { ApiResponse, EditRequest } from "@/lib/types/api";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

function parseMaybeJson(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) {
    return {};
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : ({ value: parsed as unknown } as Record<string, unknown>);
    } catch {
      return { value } as Record<string, unknown>;
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return { value } as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const event = searchParams.get("event");

    const result = await db
      .select()
      .from(editsTable)
      .where(event ? eq(editsTable.event, event) : (undefined as unknown as never))
      .orderBy(desc(editsTable.updatedAt));

    if (event) {
      const edits: Array<{
        original: Record<string, unknown>;
        edited: Record<string, unknown>;
        timestamp: string;
      }> = [];

      let _rowCount = 0;
      for (const row of result) {
        _rowCount++;
        const originalObj = parseMaybeJson(row.originalQuestion);
        const editedObj = parseMaybeJson(row.editedQuestion);
        edits.push({
          original: originalObj,
          edited: editedObj,
          timestamp: String(row.updatedAt),
        });
      }

      return NextResponse.json({
        success: true,
        edits,
      });
    }
    const edits: Record<
      string,
      Array<{
        original: Record<string, unknown>;
        edited: Record<string, unknown>;
        timestamp: string;
      }>
    > = {};

    let _rowCount = 0;
    for (const row of result) {
      _rowCount++;
      if (!row.event) {
        continue;
      }
      if (!edits[row.event]) {
        edits[row.event] = [];
      }

      const originalObj = parseMaybeJson(row.originalQuestion);
      const editedObj = parseMaybeJson(row.editedQuestion);
      edits[row.event]?.push({
        original: originalObj,
        edited: editedObj,
        timestamp: String(row.updatedAt),
      });
    }

    return NextResponse.json({
      success: true,
      edits,
    });
  } catch (_error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch edits",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex edit validation and processing logic
export async function POST(request: NextRequest) {
  try {
    const body: EditRequest = await request.json();

    if (!(body.event && body.originalQuestion && body.editedQuestion)) {
      const response: ApiResponse = {
        success: false,
        error: "Missing required fields: event, originalQuestion, editedQuestion",
      };
      return NextResponse.json(response, { status: 400 });
    }

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

    let canBypass = !!body.bypass;
    if (body.aiSuggestion && typeof body.aiSuggestion === "object") {
      try {
        const ai = body.aiSuggestion as {
          question: string;
          options?: string[];
          answers: string[];
        };
        const aiQ = String(ai.question || "");
        const aiOpts = Array.isArray(ai.options) ? ai.options.map(String) : undefined;
        const aiAns = Array.isArray(ai.answers) ? ai.answers.map(String) : [];

        const editedQuestion = body.editedQuestion;
        const editedQ = String(
          editedQuestion && typeof editedQuestion === "object" && "question" in editedQuestion
            ? editedQuestion.question
            : ""
        );
        const editedOpts =
          editedQuestion &&
          typeof editedQuestion === "object" &&
          "options" in editedQuestion &&
          Array.isArray(editedQuestion.options)
            ? (editedQuestion.options as unknown[]).map(String)
            : undefined;
        const editedAnsRaw =
          editedQuestion &&
          typeof editedQuestion === "object" &&
          "answers" in editedQuestion &&
          Array.isArray(editedQuestion.answers)
            ? (editedQuestion.answers as unknown[])
            : [];
        const editedAnsText = toText(editedOpts, editedAnsRaw);

        const matches =
          editedQ === aiQ && arraysEqual(editedOpts, aiOpts) && arraysEqual(editedAnsText, aiAns);
        if (matches) {
          canBypass = true;
        }
      } catch (_e) {
        // Ignore regex errors
      }
    }

    if (canBypass) {
      isValid = true;
      aiReason = "Edit accepted!";
    } else if (geminiService.isAvailable()) {
      try {
        const result = await geminiService.validateEdit(
          body.originalQuestion,
          body.editedQuestion,
          body.event,
          body.reason || ""
        );

        isValid = Boolean(result.isValid);
        aiReason = String(result.reason || "AI evaluation completed");
      } catch (_error) {
        isValid = false;
        aiReason = "AI evaluation failed";
      }
    } else {
      isValid = false;
      aiReason = "AI validation not available";
    }

    if (isValid) {
      const originalJson = JSON.stringify(body.originalQuestion);
      const editedJson = JSON.stringify(body.editedQuestion);

      try {
        const existing = await db
          .select({ id: editsTable.id })
          .from(editsTable)
          .where(
            and(
              eq(editsTable.event, body.event),
              eq(editsTable.originalQuestion, JSON.parse(originalJson))
            )
          )
          .limit(1);

        if (existing.length > 0 && existing[0]) {
          await db
            .update(editsTable)
            .set({ editedQuestion: JSON.parse(editedJson), updatedAt: new Date().toISOString() })
            .where(eq(editsTable.id, existing[0].id));
        } else {
          await db.insert(editsTable).values({
            event: body.event,
            originalQuestion: JSON.parse(originalJson),
            editedQuestion: JSON.parse(editedJson),
          });
        }

        const response: ApiResponse = {
          success: true,
          message: "Question edit saved",
          data: {
            reason: aiReason,
          },
        };
        return NextResponse.json(response);
      } catch (_error) {
        const response: ApiResponse = {
          success: false,
          error: "Failed to save edit",
        };
        return NextResponse.json(response, { status: 500 });
      }
    } else {
      const response: ApiResponse = {
        success: false,
        message: "Edit was not accepted",
        data: {
          reason: aiReason,
        },
      };
      return NextResponse.json(response);
    }
  } catch (_error) {
    const response: ApiResponse = {
      success: false,
      error: "Invalid request body",
    };
    return NextResponse.json(response, { status: 400 });
  }
}
