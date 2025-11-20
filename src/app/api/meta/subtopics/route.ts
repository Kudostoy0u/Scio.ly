import { client } from "@/lib/db";
import type { ApiResponse } from "@/lib/types/api";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const event = searchParams.get("event");

    let query = `
      SELECT DISTINCT jsonb_array_elements_text(subtopics) as subtopic 
      FROM questions 
    `;
    const params: unknown[] = [];

    if (event) {
      query += " WHERE event = $1";
      params.push(event);
    }

    query += " ORDER BY subtopic";

    const result = await client.unsafe<Array<{ subtopic: string }>>(
      query,
      params as (string | number | boolean | null)[]
    );
    const subtopics = result.map((row) => row.subtopic);

    const response: ApiResponse<string[]> = {
      success: true,
      data: subtopics,
    };

    return NextResponse.json(response);
  } catch (_error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch subtopics",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
