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

    const toText = (opts: string[] | undefined, answers: unknown[]): string[] => {
      if (!opts || opts.length === 0) return answers.map(a => String(a));
      return answers.map(a => {
        if (typeof a === 'number') return (a >= 0 && a < opts.length) ? opts[a] : String(a);
        const s = String(a);
        const idx = opts.map(o => o.toLowerCase()).indexOf(s.toLowerCase());
        return idx >= 0 ? opts[idx] : s;
      });
    };

    const arraysEqual = (a?: string[], b?: string[]) => {
      if (!a && !b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) return false; }
      return true;
    };

    let canBypass = !!body.bypass;
    if ((body as any).aiSuggestion) {
      try {
        const ai = (body as any).aiSuggestion as { question: string; options?: string[]; answers: string[] };
        const aiQ = String(ai.question || '');
        const aiOpts = Array.isArray(ai.options) ? ai.options.map(String) : undefined;
        const aiAns = Array.isArray(ai.answers) ? ai.answers.map(String) : [];

        const editedQ = String((body.editedQuestion as any)?.question || '');
        const editedOpts = Array.isArray((body.editedQuestion as any)?.options) ? ((body.editedQuestion as any)?.options as unknown[]).map(String) : undefined;
        const editedAnsRaw = Array.isArray((body.editedQuestion as any)?.answers) ? ((body.editedQuestion as any)?.answers as unknown[]) : [];
        const editedAnsText = toText(editedOpts, editedAnsRaw);

        const matches = editedQ === aiQ && arraysEqual(editedOpts, aiOpts) && arraysEqual(editedAnsText, aiAns);
        console.log('🔒 [EDIT/SUBMIT] AI bypass verification:', { matches, editedAnsText, aiAns });
        if (matches) canBypass = true;
      } catch (e) {
        console.log('⚠️ [EDIT/SUBMIT] AI bypass verification failed:', e);
      }
    }

    if (canBypass) {
      isValid = true;
      aiReason = 'Edit accepted!';
      console.log('🤖 [EDIT/SUBMIT] AI bypass mode: Edit accepted as untampered AI suggestion');
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