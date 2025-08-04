import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';
import { ApiResponse, EditRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';

// GET /api/edits - Get edits (optionally filtered by event)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const event = searchParams.get('event');

    console.log(`🔍 [EDIT/GET] Request received - Event: ${event}`);

    let query = "SELECT * FROM edits";
    const params: unknown[] = [];

    if (event) {
      query += " WHERE event = $1";
      params.push(event);
    }

    query += " ORDER BY updated_at DESC";

    console.log(`🔍 [EDIT/GET] Executing query: ${query} with params:`, params);

    const result = await executeQuery<{
      id: string;
      event: string;
      original_question: string;
      edited_question: string;
      reason: string;
      updated_at: string;
    }>(query, params);

    if (event) {
      // Return edits array for specific event
      const edits: Array<{
        original: Record<string, unknown>;
        edited: Record<string, unknown>;
        timestamp: string;
      }> = [];
      
      let rowCount = 0;
      for (const row of result) {
        rowCount++;
        console.log(`📝 [EDIT/GET] Row ${rowCount} - Event: ${row.event}, Original: ${row.original_question}, Edited: ${row.edited_question}`);
        
        try {
          const originalObj = JSON.parse(row.original_question);
          const editedObj = JSON.parse(row.edited_question);
          
          edits.push({
            original: originalObj,
            edited: editedObj,
            timestamp: row.updated_at,
          });
        } catch {
          console.log(`❌ [EDIT/GET] Failed to parse JSON for row ${rowCount}`);
        }
      }

      console.log(`✅ [EDIT/GET] Found ${edits.length} edits for event ${event}`);
      
      return NextResponse.json({
        success: true,
        edits,
      });
    } else {
      // Return all edits grouped by event
      const edits: Record<string, Array<{
        original: Record<string, unknown>;
        edited: Record<string, unknown>;
        timestamp: string;
      }>> = {};
      
      let rowCount = 0;
      for (const row of result) {
        rowCount++;
        console.log(`📝 [EDIT/GET] Row ${rowCount} - Event: ${row.event}, Original: ${row.original_question}, Edited: ${row.edited_question}`);
        
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
        } catch {
          console.log(`❌ [EDIT/GET] Failed to parse JSON for row ${rowCount}`);
        }
      }

      console.log(`✅ [EDIT/GET] Found edits for ${Object.keys(edits).length} events`);
      
      return NextResponse.json({
        success: true,
        edits,
      });
    }
  } catch (error) {
    console.error('❌ [EDIT/GET] Database error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch edits',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/edits - Submit an edit
export async function POST(request: NextRequest) {
  try {
    const body: EditRequest = await request.json();

    if (!body.event || !body.originalQuestion || !body.editedQuestion) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: event, originalQuestion, editedQuestion',
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log('📝 [EDIT/SUBMIT] Edit submission received');
    console.log(`📋 [EDIT/SUBMIT] Event: ${body.event}`);
    console.log(`📋 [EDIT/SUBMIT] Reason: ${body.reason}`);
    console.log(`📋 [EDIT/SUBMIT] Bypass: ${body.bypass}`);

    let isValid = false;
    let aiReason = '';

    if (body.bypass) {
      isValid = true;
      aiReason = 'Edit bypassed AI validation and was accepted by administrator';
      console.log('🔧 [EDIT/SUBMIT] Bypass mode: Edit accepted without AI validation');
    } else {
      // AI validation using Gemini
      if (geminiService.isAvailable()) {
        console.log('🤖 [EDIT/SUBMIT] Sending request to Gemini AI for edit validation');

        try {
          const result = await geminiService.validateEdit(
            body.originalQuestion,
            body.editedQuestion,
            body.event,
            body.reason || ''
          );

          console.log('✅ [EDIT/SUBMIT] Gemini AI response received:', result);

          isValid = Boolean(result.isValid) || false;
          aiReason = String(result.reason || 'AI evaluation completed');

          console.log(`🎯 [EDIT/SUBMIT] AI Decision: ${isValid}, Reason: ${aiReason}`);
        } catch (error) {
          isValid = false;
          aiReason = 'AI evaluation failed';
          console.log('❌ [EDIT/SUBMIT] Gemini AI error:', error);
        }
      } else {
        isValid = false;
        aiReason = 'AI validation not available';
        console.log('⚠️ [EDIT/SUBMIT] Gemini AI client not available');
      }
    }

    if (isValid) {
      // Save edit to database
      const originalJSON = JSON.stringify(body.originalQuestion);
      const editedJSON = JSON.stringify(body.editedQuestion);

      try {
        // Check if edit already exists
        const existingQuery = `
          SELECT id FROM edits 
          WHERE event = $1 AND original_question = $2
        `;
        const existingResult = await executeQuery<{ id: string }>(existingQuery, [body.event, originalJSON]);

        if (existingResult.length > 0) {
          // Update existing edit
          const updateQuery = `
            UPDATE edits 
            SET edited_question = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
          `;
          await executeQuery(updateQuery, [editedJSON, existingResult[0].id]);
          console.log('📝 [EDIT/SUBMIT] Updated existing edit in database');
        } else {
          // Create new edit
          const insertQuery = `
            INSERT INTO edits (event, original_question, edited_question) 
            VALUES ($1, $2, $3)
          `;
          await executeQuery(insertQuery, [body.event, originalJSON, editedJSON]);
          console.log('📝 [EDIT/SUBMIT] Created new edit in database');
        }

        console.log('✅ [EDIT/SUBMIT] Edit successfully saved to database');
        
        const response: ApiResponse = {
          success: true,
          message: 'Question edit saved',
          data: {
            reason: aiReason,
          },
        };
        return NextResponse.json(response);
      } catch (error) {
        console.log('❌ [EDIT/SUBMIT] Database error:', error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to save edit',
        };
        return NextResponse.json(response, { status: 500 });
      }
    } else {
      console.log('❌ [EDIT/SUBMIT] Edit rejected by AI validation');
      const response: ApiResponse = {
        success: false,
        message: 'Edit was not accepted',
        data: {
          reason: aiReason,
        },
      };
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('POST /api/edits error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid request body',
    };
    return NextResponse.json(response, { status: 400 });
  }
}