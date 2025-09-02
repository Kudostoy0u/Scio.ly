import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, BlacklistRequest } from '@/lib/types/api';
import { db } from '@/lib/db';
import { blacklists as blacklistsTable, questions as questionsTable } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const event = searchParams.get('event');

    console.log(`blacklist/get: Request received - Event: ${event}`);

    console.log(`blacklist/get: Executing Drizzle query`);

    const result = await db
      .select()
      .from(blacklistsTable)
      .where(event ? eq(blacklistsTable.event, event) : undefined as unknown as never)
      .orderBy(desc(blacklistsTable.createdAt));

    if (event) {

      const blacklist: unknown[] = [];
      let rowCount = 0;
      
      for (const row of result) {
        rowCount++;
        const preview = typeof row.questionData === 'string' ? row.questionData.slice(0, 80) : JSON.stringify(row.questionData).slice(0, 80);
        console.log(`blacklist/get: Row ${rowCount} - Event: ${row.event}, QuestionData: ${preview}`);

        const questionObj = parseMaybeJson(row.questionData);
        blacklist.push(questionObj);
      }

      console.log(`blacklist/get: Found ${blacklist.length} blacklist items for event ${event}`);
      return NextResponse.json({
        success: true,
        blacklist,
      });
    } else {

      const blacklists: Record<string, unknown[]> = {};
      let rowCount = 0;
      
      for (const row of result) {
        rowCount++;
        const preview = typeof row.questionData === 'string' ? row.questionData.slice(0, 80) : JSON.stringify(row.questionData).slice(0, 80);
        console.log(`blacklist/get: Row ${rowCount} - Event: ${row.event}, QuestionData: ${preview}`);

        if (!blacklists[row.event]) {
          blacklists[row.event] = [];
        }
        
        const questionObj = parseMaybeJson(row.questionData);
        blacklists[row.event].push(questionObj);
      }

      console.log(`blacklist/get: Found blacklists for ${Object.keys(blacklists).length} events`);

      return NextResponse.json({
        success: true,
        blacklists,
      });
    }
  } catch (error) {
    console.error('blacklist/get Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch blacklists',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// post /api/blacklists - add question to blacklist
export async function POST(request: NextRequest) {
  try {
    const body: BlacklistRequest = await request.json();

    if (!body.event || !body.questionData) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: event, questionData',
      };
      return NextResponse.json(response, { status: 400 });
    }

    const questionDataJSON = JSON.stringify(body.questionData);

    try {

      await db
        .insert(blacklistsTable)
        .values({ event: body.event, questionData: JSON.parse(questionDataJSON) });

      // remove from main questions table if exists
      const questionId = body.questionData.id;
      if (questionId) {
        try {
          await db.delete(questionsTable).where(eq(questionsTable.id, questionId as unknown as string));
        } catch (error) {
          // log error but don't fail the request
          console.log('Question might not exist in main table:', error);
        }
      }

      const response: ApiResponse = {
        success: true,
        message: 'Question added to blacklist successfully',
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Failed to add to blacklist:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to add to blacklist',
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    console.error('POST /api/blacklists error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid request body',
    };
    return NextResponse.json(response, { status: 400 });
  }
}