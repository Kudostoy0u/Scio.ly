import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';
import { ApiResponse, ReportEditRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';

// POST /api/report/edit - Report and validate an edit
export async function POST(request: NextRequest) {
  try {
    const body: ReportEditRequest = await request.json();

    if (!body.originalQuestion || !body.editedQuestion || !body.event) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: originalQuestion, editedQuestion, event',
      };
      return NextResponse.json(response, { status: 400 });
    }

    let isValid = false;
    let aiReason = '';

    if (body.bypass) {
      isValid = true;
      aiReason = 'Edit bypassed AI validation and was accepted by administrator';
      console.log('🔧 [REPORT/EDIT] Bypass mode: Edit accepted without AI validation');
    } else {
      // AI validation using Gemini
      if (geminiService.isAvailable()) {
        console.log('🤖 [REPORT/EDIT] Sending request to Gemini AI for edit validation');
        console.log(`📝 [REPORT/EDIT] Event: ${body.event}, Reason: ${body.reason}`);

        try {
          const result = await geminiService.validateReportEdit(
            body.originalQuestion,
            body.editedQuestion,
            body.event,
            body.reason || ''
          );

          console.log('✅ [REPORT/EDIT] Gemini AI response received:', result);

          isValid = Boolean(result.isValid) || false;
          aiReason = String(result.reason || 'AI evaluation completed');

          console.log(`🎯 [REPORT/EDIT] AI Decision: ${isValid}, Reason: ${aiReason}`);
        } catch (error) {
          isValid = false;
          aiReason = 'AI evaluation failed';
          console.log('❌ [REPORT/EDIT] Gemini AI error:', error);
        }
      } else {
        isValid = false;
        aiReason = 'AI validation not available';
        console.log('⚠️ [REPORT/EDIT] Gemini AI client not available');
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
          console.log('📝 [REPORT/EDIT] Updated existing edit in database');
        } else {
          // Create new edit
          const insertQuery = `
            INSERT INTO edits (event, original_question, edited_question) 
            VALUES ($1, $2, $3)
          `;
          await executeQuery(insertQuery, [body.event, originalJSON, editedJSON]);
          console.log('📝 [REPORT/EDIT] Created new edit in database');
        }

        console.log('✅ [REPORT/EDIT] Edit successfully saved to database');
        
        const response: ApiResponse = {
          success: true,
          message: 'Question edit saved',
          data: {
            reason: aiReason,
          },
        };
        return NextResponse.json(response);
      } catch (error) {
        console.log('❌ [REPORT/EDIT] Database error:', error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to save edit',
        };
        return NextResponse.json(response, { status: 500 });
      }
    } else {
      console.log('❌ [REPORT/EDIT] Edit rejected by AI validation');
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
    console.error('POST /api/report/edit error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid request body',
    };
    return NextResponse.json(response, { status: 400 });
  }
}