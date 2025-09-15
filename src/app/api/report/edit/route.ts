import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponse, ReportEditRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';
import { edits as editsTable, questions as questionsTable } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export const maxDuration = 60;


export async function POST(request: NextRequest) {
  try {
    const body: ReportEditRequest = await request.json();

    console.log('🔍 [REPORT/EDIT] Request body bypass flag:', body.bypass);
    console.log('🔍 [REPORT/EDIT] Received aiSuggestion:', body.aiSuggestion);

    if (!body.originalQuestion || !body.editedQuestion || !body.event) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: originalQuestion, editedQuestion, event',
      };
      return NextResponse.json(response, { status: 400 });
    }

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

    // Compute canBypass: either flag is true OR aiSuggestion matches exactly
    let canBypass = !!body.bypass;
    if (body.aiSuggestion) {
      try {
        const aiQ = String(body.aiSuggestion.question || '');
        const aiOpts = Array.isArray(body.aiSuggestion.options) ? body.aiSuggestion.options.map(String) : undefined;
        const aiAns = Array.isArray(body.aiSuggestion.answers) ? body.aiSuggestion.answers.map(String) : [];

        const editedQ = String((body.editedQuestion as any)?.question || '');
        const editedOpts = Array.isArray((body.editedQuestion as any)?.options) ? ((body.editedQuestion as any)?.options as unknown[]).map(String) : undefined;
        const editedAnsRaw = Array.isArray((body.editedQuestion as any)?.answers) ? ((body.editedQuestion as any)?.answers as unknown[]) : [];
        const editedAnsText = toText(editedOpts, editedAnsRaw);

        const matches = editedQ === aiQ && arraysEqual(editedOpts, aiOpts) && arraysEqual(editedAnsText, aiAns);
        console.log('🔒 [REPORT/EDIT] AI bypass verification:', { matches, editedAnsText, aiAns });
        if (matches) canBypass = true;
      } catch (e) {
        console.log('⚠️ [REPORT/EDIT] AI bypass verification failed:', e);
      }
    }

    if (canBypass) {
      isValid = true;
      aiReason = 'Edit accepted!';
      console.log('🤖 [REPORT/EDIT] AI bypass mode: Edit accepted as untampered AI suggestion');
    } else {

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
          console.log('📝 [REPORT/EDIT] Updated existing edit in database');
        } else {
          await db
            .insert(editsTable)
            .values({ event: body.event, originalQuestion: JSON.parse(originalJSON), editedQuestion: JSON.parse(editedJSON) });
          console.log('📝 [REPORT/EDIT] Created new edit in database');
        }

        console.log('✅ [REPORT/EDIT] Edit successfully saved to database');


        const original = body.originalQuestion as Record<string, unknown>;
        const edited = body.editedQuestion as Record<string, unknown>;


        const event = body.event;
        let targetId: string | undefined = (original.id as string | undefined) || (edited.id as string | undefined);
        if (!targetId) {

          const conditions: any[] = [
            eq(questionsTable.question, String(original.question || '')),
            eq(questionsTable.event, String(event)),
          ];
          if (original.tournament) conditions.push(eq(questionsTable.tournament, String(original.tournament)));
          if (original.division) conditions.push(eq(questionsTable.division, String(original.division)));
          const found = await db.select({ id: questionsTable.id }).from(questionsTable).where(and(...conditions)).limit(1);
          targetId = found[0]?.id as string | undefined;
          if (!targetId) {

            const cond2: any[] = [
              eq(questionsTable.question, String(edited.question || '')),
              eq(questionsTable.event, String(event)),
            ];
            if (edited.tournament) cond2.push(eq(questionsTable.tournament, String(edited.tournament)));
            if (edited.division) cond2.push(eq(questionsTable.division, String(edited.division)));
            const found2 = await db.select({ id: questionsTable.id }).from(questionsTable).where(and(...cond2)).limit(1);
            targetId = found2[0]?.id as string | undefined;
          }
        }

        if (targetId) {
          const payload: Partial<typeof questionsTable.$inferInsert> = {
            question: String(edited.question || ''),
            tournament: String(edited.tournament || ''),
            division: String(edited.division || ''),
            event: String(event || edited.event || ''),
            options: Array.isArray(edited.options) ? (edited.options as unknown[]) : [],
            answers: Array.isArray(edited.answers) ? (edited.answers as unknown[]) : [],
            subtopics: Array.isArray((edited as any).subtopics)
              ? ((edited as any).subtopics as unknown[])
              : (edited as any).subtopic
                ? [String((edited as any).subtopic)]
                : [],
            difficulty: typeof (edited as any).difficulty === 'number'
              ? (edited as any).difficulty.toString()
              : typeof (edited as any).difficulty === 'string'
                ? String((edited as any).difficulty)
                : '0.5',
          } as any;
          await db.update(questionsTable).set({ ...(payload as any), updatedAt: new Date() }).where(eq(questionsTable.id, targetId));
          console.log('🧩 [REPORT/EDIT] Applied edit to questions table for id:', targetId);
        } else {
          console.log('⚠️ [REPORT/EDIT] Could not locate target question to auto-apply edit');
        }
        
        const response: ApiResponse = {
          success: true,
          message: aiReason || 'Question edit saved and applied',
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
        message: aiReason || 'Edit was not accepted',
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