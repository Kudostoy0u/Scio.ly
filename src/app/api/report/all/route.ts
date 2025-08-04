import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';
import { ApiResponse } from '@/lib/types/api';

// GET /api/report/all - Get all reports (edits and blacklists)
export async function GET() {
  try {
    console.log('🔍 [REPORT/ALL] Fetching all reports');

    // Get all edits
    const editsQuery = "SELECT * FROM edits ORDER BY updated_at DESC";
    const editsResult = await executeQuery<{
      id: string;
      event: string;
      original_question: string;
      edited_question: string;
      reason: string;
      updated_at: string;
    }>(editsQuery);

          const edits: Record<string, Array<{
        original: Record<string, unknown>;
        edited: Record<string, unknown>;
        timestamp: string;
      }>> = {};

    for (const row of editsResult) {
      if (!edits[row.event]) {
        edits[row.event] = [];
      }
      
      try {
        const originalObj = JSON.parse(row.original_question);
        const editedObj = JSON.parse(row.edited_question);
        
        edits[row.event].push({
          original: originalObj,
          edited: editedObj,
          timestamp: row.updated_at,
        });
      } catch (error) {
        console.log('Failed to parse edit JSON:', error);
      }
    }

    // Get all blacklists
    const blacklistsQuery = "SELECT * FROM blacklists ORDER BY created_at DESC";
    const blacklistsResult = await executeQuery<{
      id: string;
      event: string;
      question_data: string;
      reason: string;
      created_at: string;
    }>(blacklistsQuery);

          const blacklists: Record<string, unknown[]> = {};

    for (const row of blacklistsResult) {
      if (!blacklists[row.event]) {
        blacklists[row.event] = [];
      }
      
      try {
        const questionObj = JSON.parse(row.question_data);
        blacklists[row.event].push(questionObj);
      } catch (error) {
        console.log('Failed to parse blacklist JSON:', error);
      }
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