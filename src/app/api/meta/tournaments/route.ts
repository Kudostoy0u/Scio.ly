import { db } from "@/lib/db";
import { questions } from "@/lib/db/schema";
import type { ApiResponse } from "@/lib/types/api";
import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await db
      .select({ tournament: questions.tournament })
      .from(questions)
      .groupBy(questions.tournament)
      .orderBy(asc(questions.tournament));
    const tournaments = rows.map((r) => r.tournament);

    const response: ApiResponse<string[]> = {
      success: true,
      data: tournaments,
    };

    return NextResponse.json(response);
  } catch (_error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch tournaments",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
