import { db } from "@/lib/db";
import { blacklists as blacklistsTable, edits as editsTable } from "@/lib/db/schema/core";
import type { ApiResponse } from "@/lib/types/api";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Return counts only, grouped by event, to power lazy-loading UIs
    const [editCounts, blacklistCounts] = await Promise.all([
      db
        .select({ event: editsTable.event, count: sql<number>`count(*)` })
        .from(editsTable)
        .groupBy(editsTable.event),
      db
        .select({ event: blacklistsTable.event, count: sql<number>`count(*)` })
        .from(blacklistsTable)
        .groupBy(blacklistsTable.event),
    ]);

    const editsByEvent: Record<string, number> = {};
    for (const row of editCounts) {
      editsByEvent[row.event] = Number(row.count || 0);
    }

    const removedByEvent: Record<string, number> = {};
    for (const row of blacklistCounts) {
      removedByEvent[row.event] = Number(row.count || 0);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        editsByEvent,
        removedByEvent,
      },
    };
    return NextResponse.json(response);
  } catch (_error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch report metadata",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
