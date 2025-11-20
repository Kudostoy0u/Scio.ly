import { db } from "@/lib/db";
import { questions } from "@/lib/db/schema";
import type { ApiResponse } from "@/lib/types/api";
import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await db
      .select({ event: questions.event })
      .from(questions)
      .groupBy(questions.event)
      .orderBy(asc(questions.event));
    const events = rows.map((r) => r.event);

    const response: ApiResponse<string[]> = {
      success: true,
      data: events,
    };

    return NextResponse.json(response);
  } catch (_error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch events",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
