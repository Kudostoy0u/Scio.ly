import { db } from "@/lib/db";
import { questions as questionsTable } from "@/lib/db/schema";
import { blacklists as blacklistsTable } from "@/lib/db/schema/core";
import type { ApiResponse, BlacklistRequest } from "@/lib/types/api";
import { desc, eq } from "drizzle-orm";
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
      .from(blacklistsTable)
      .where(event ? eq(blacklistsTable.event, event) : (undefined as unknown as never))
      .orderBy(desc(blacklistsTable.createdAt));

    if (event) {
      const blacklist: unknown[] = [];
      let _rowCount = 0;

      for (const row of result) {
        _rowCount++;
        const questionObj = parseMaybeJson(row.questionData);
        blacklist.push(questionObj);
      }
      return NextResponse.json({
        success: true,
        blacklist,
      });
    }
    const blacklists: Record<string, unknown[]> = {};
    let _rowCount = 0;

    for (const row of result) {
      _rowCount++;
      if (!row.event) {
        continue;
      }
      if (!blacklists[row.event]) {
        blacklists[row.event] = [];
      }

      const questionObj = parseMaybeJson(row.questionData);
      if (blacklists[row.event]) {
        blacklists[row.event]?.push(questionObj);
      }
    }

    return NextResponse.json({
      success: true,
      blacklists,
    });
  } catch (_error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch blacklists",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// post /api/blacklists - add question to blacklist
export async function POST(request: NextRequest) {
  try {
    const body: BlacklistRequest = await request.json();

    if (!(body.event && body.questionData)) {
      const response: ApiResponse = {
        success: false,
        error: "Missing required fields: event, questionData",
      };
      return NextResponse.json(response, { status: 400 });
    }

    const questionDataJson = JSON.stringify(body.questionData);

    try {
      await db
        .insert(blacklistsTable)
        .values({ event: body.event, questionData: JSON.parse(questionDataJson) });

      // remove from main questions table if exists
      const questionId = body.questionData.id;
      if (questionId) {
        try {
          await db
            .delete(questionsTable)
            .where(eq(questionsTable.id, questionId as unknown as string));
        } catch (_error) {
          // Ignore deletion errors
        }
      }

      const response: ApiResponse = {
        success: true,
        message: "Question added to blacklist successfully",
      };

      return NextResponse.json(response);
    } catch (_error) {
      const response: ApiResponse = {
        success: false,
        error: "Failed to add to blacklist",
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (_error) {
    const response: ApiResponse = {
      success: false,
      error: "Invalid request body",
    };
    return NextResponse.json(response, { status: 400 });
  }
}
