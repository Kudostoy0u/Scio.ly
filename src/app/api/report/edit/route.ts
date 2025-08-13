import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponse, ReportEditRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';
import { edits as editsTable, questions as questionsTable } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

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

        // Auto-apply to questions table
        const original = body.originalQuestion as Record<string, unknown>;
        const edited = body.editedQuestion as Record<string, unknown>;

        // Prefer ID if present, otherwise try to locate question by content and event
        const event = body.event;
        let targetId: string | undefined = (original.id as string | undefined) || (edited.id as string | undefined);
        if (!targetId) {
          // Locate by original content first
          const conditions: any[] = [
            eq(questionsTable.question, String(original.question || '')),
            eq(questionsTable.event, String(event)),
          ];
          if (original.tournament) conditions.push(eq(questionsTable.tournament, String(original.tournament)));
          if (original.division) conditions.push(eq(questionsTable.division, String(original.division)));
          const found = await db.select({ id: questionsTable.id }).from(questionsTable).where(and(...conditions)).limit(1);
          targetId = found[0]?.id as string | undefined;
          if (!targetId) {
            // Fallback: try via edited content
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
          message: 'Question edit saved and applied',
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