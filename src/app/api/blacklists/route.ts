import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, BlacklistRequest } from '@/lib/types/api';
import { client } from '@/lib/db';

// GET /api/blacklists - Get blacklisted questions (optionally filtered by event)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const event = searchParams.get('event');

    console.log(`🔍 [BLACKLIST/GET] Request received - Event: ${event}`);

    let query = "SELECT * FROM blacklists";
    const params: unknown[] = [];

    if (event) {
      query += " WHERE event = $1";
      params.push(event);
    }

    query += " ORDER BY created_at DESC";

    console.log(`🔍 [BLACKLIST/GET] Executing query: ${query} with params:`, params);

    const result = await client.unsafe<Array<{
      id: string;
      event: string;
      question_data: string;
      created_at: string;
    }>>(query, params as (string | number | boolean | null)[]);

    if (event) {
      // Return just the blacklist array for specific event
      const blacklist: unknown[] = [];
      let rowCount = 0;
      
      for (const row of result) {
        rowCount++;
        console.log(`📝 [BLACKLIST/GET] Row ${rowCount} - Event: ${row.event}, QuestionData: ${row.question_data}`);
        
        try {
          const questionObj = JSON.parse(row.question_data);
          blacklist.push(questionObj);
        } catch (error) {
          console.log(`❌ [BLACKLIST/GET] Failed to parse JSON for row ${rowCount}:`, error);
        }
      }

      console.log(`✅ [BLACKLIST/GET] Found ${blacklist.length} blacklist items for event ${event}`);
      
      return NextResponse.json({
        success: true,
        blacklist,
      });
    } else {
      // Return all blacklists grouped by event
      const blacklists: Record<string, unknown[]> = {};
      let rowCount = 0;
      
      for (const row of result) {
        rowCount++;
        console.log(`📝 [BLACKLIST/GET] Row ${rowCount} - Event: ${row.event}, QuestionData: ${row.question_data}`);
        
        if (!blacklists[row.event]) {
          blacklists[row.event] = [];
        }
        
        try {
          const questionObj = JSON.parse(row.question_data);
          blacklists[row.event].push(questionObj);
        } catch (error) {
          console.log(`❌ [BLACKLIST/GET] Failed to parse JSON for row ${rowCount}:`, error);
        }
      }

      console.log(`✅ [BLACKLIST/GET] Found blacklists for ${Object.keys(blacklists).length} events`);
      
      return NextResponse.json({
        success: true,
        blacklists,
      });
    }
  } catch (error) {
    console.error('❌ [BLACKLIST/GET] Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch blacklists',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/blacklists - Add question to blacklist
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

    // Start transaction-like operations (Neon doesn't support transactions in serverless)
    try {
      // Add to blacklist
      const insertQuery = `
        INSERT INTO blacklists (event, question_data, created_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `;
      
       await client.unsafe(insertQuery, [
        body.event,
        questionDataJSON,
      ]);

      // Remove from main questions table if it exists
      const questionId = body.questionData.id;
      if (questionId) {
        try {
          await client.unsafe("DELETE FROM questions WHERE id = $1", [questionId as unknown as string]);
        } catch (error) {
          // Log error but don't fail the request
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