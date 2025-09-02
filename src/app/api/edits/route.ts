import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponse, EditRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';
import { edits as editsTable } from '@/lib/db/schema';
import { desc, eq, and } from 'drizzle-orm';


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

    console.log(`🔍 [EDIT/GET] Request received - Event: ${event}`);

    console.log(`🔍 [EDIT/GET] Executing Drizzle query`);

    const result = await db
      .select()
      .from(editsTable)
      .where(event ? eq(editsTable.event, event) : undefined as unknown as never)
      .orderBy(desc(editsTable.updatedAt));

    if (event) {

      const edits: Array<{
        original: Record<string, unknown>;
        edited: Record<string, unknown>;
        timestamp: string;
      }> = [];
      
      let rowCount = 0;
      for (const row of result) {
        rowCount++;
        const originalPreview = typeof row.originalQuestion === 'string' ? row.originalQuestion.slice(0, 80) : JSON.stringify(row.originalQuestion).slice(0, 80);
        const editedPreview = typeof row.editedQuestion === 'string' ? row.editedQuestion.slice(0, 80) : JSON.stringify(row.editedQuestion).slice(0, 80);
        console.log(`📝 [EDIT/GET] Row ${rowCount} - Event: ${row.event}, Original: ${originalPreview}, Edited: ${editedPreview}`);
        
        const originalObj = parseMaybeJson(row.originalQuestion);
        const editedObj = parseMaybeJson(row.editedQuestion);
        edits.push({
          original: originalObj,
          edited: editedObj,
          timestamp: String(row.updatedAt),
        });
      }

      console.log(`✅ [EDIT/GET] Found ${edits.length} edits for event ${event}`);
      
      return NextResponse.json({
        success: true,
        edits,
      });
    } else {

      const edits: Record<string, Array<{
        original: Record<string, unknown>;
        edited: Record<string, unknown>;
        timestamp: string;
      }>> = {};
      
      let rowCount = 0;
      for (const row of result) {
        rowCount++;
        const originalPreview = typeof row.originalQuestion === 'string' ? row.originalQuestion.slice(0, 80) : JSON.stringify(row.originalQuestion).slice(0, 80);
        const editedPreview = typeof row.editedQuestion === 'string' ? row.editedQuestion.slice(0, 80) : JSON.stringify(row.editedQuestion).slice(0, 80);
        console.log(`📝 [EDIT/GET] Row ${rowCount} - Event: ${row.event}, Original: ${originalPreview}, Edited: ${editedPreview}`);
        
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

      const originalJSON = JSON.stringify(body.originalQuestion);
      const editedJSON = JSON.stringify(body.editedQuestion);

      try {


        const existing = await db
          .select({ id: editsTable.id })
          .from(editsTable)
          .where(and(eq(editsTable.event, body.event), eq(editsTable.originalQuestion, JSON.parse(originalJSON))))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(editsTable)
            .set({ editedQuestion: JSON.parse(editedJSON), updatedAt: new Date() })
            .where(eq(editsTable.id, existing[0].id));
          console.log('📝 [EDIT/SUBMIT] Updated existing edit in database');
        } else {
          await db
            .insert(editsTable)
            .values({ event: body.event, originalQuestion: JSON.parse(originalJSON), editedQuestion: JSON.parse(editedJSON) });
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