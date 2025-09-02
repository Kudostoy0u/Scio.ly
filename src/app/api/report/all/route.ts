import { NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types/api';
import { db } from '@/lib/db';
import { edits as editsTable, blacklists as blacklistsTable } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';


function parseMaybeJson(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : { value: parsed as unknown } as Record<string, unknown>;
    } catch {
      return { value } as Record<string, unknown>;
    }
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return { value } as Record<string, unknown>;
}


export async function GET() {
  try {
    console.log('🔍 [REPORT/ALL] Fetching all reports');


    const editsResult = await db
      .select()
      .from(editsTable)
      .orderBy(desc(editsTable.updatedAt));

          const edits: Record<string, Array<{
        original: Record<string, unknown>;
        edited: Record<string, unknown>;
        timestamp: string;
      }>> = {};

    for (const row of editsResult) {
      if (!edits[row.event]) {
        edits[row.event] = [];
      }
      
      const originalObj = parseMaybeJson(row.originalQuestion);
      const editedObj = parseMaybeJson(row.editedQuestion);
      edits[row.event].push({
        original: originalObj,
        edited: editedObj,
        timestamp: String(row.updatedAt),
      });
    }


    const blacklistsResult = await db
      .select()
      .from(blacklistsTable)
      .orderBy(desc(blacklistsTable.createdAt));

          const blacklists: Record<string, unknown[]> = {};

    for (const row of blacklistsResult) {
      if (!blacklists[row.event]) {
        blacklists[row.event] = [];
      }
      
      const questionObj = parseMaybeJson(row.questionData);
      blacklists[row.event].push(questionObj);
    }

    console.log(`✅ [REPORT/ALL] Found edits for ${Object.keys(edits).length} events, blacklists for ${Object.keys(blacklists).length} events`);

    const response: ApiResponse = {
      success: true,
      data: {
        edits,
        blacklists,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ [REPORT/ALL] Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch all reports',
    };
    return NextResponse.json(response, { status: 500 });
  }
}