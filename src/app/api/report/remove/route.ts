import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponse, ReportRemoveRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';
import { blacklists as blacklistsTable, questions as questionsTable } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';


export async function POST(request: NextRequest) {
  try {
    const body: ReportRemoveRequest = await request.json();

    if (!body.question || !body.event) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: question, event',
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log('📝 [REPORT/REMOVE] Remove request received');
    console.log(`📋 [REPORT/REMOVE] Event: ${body.event}`);


    let shouldRemove = false;
    let aiReason = 'Question analysis not available';

    if (geminiService.isAvailable()) {
      console.log('🤖 [REPORT/REMOVE] Sending request to Gemini AI for question analysis');

      try {
        const result = await geminiService.analyzeQuestion(body.question);

        console.log('✅ [REPORT/REMOVE] Gemini AI response received:', result);


        shouldRemove = Boolean(result.remove);
        aiReason = String(result.reason || 'AI analysis completed');

        console.log(`🎯 [REPORT/REMOVE] AI Decision: ${shouldRemove}, Reason: ${aiReason}`);
      } catch (error) {
        shouldRemove = false;
        aiReason = 'AI analysis failed';
        console.log('❌ [REPORT/REMOVE] Gemini AI error:', error);
      }
    } else {
      console.log('⚠️ [REPORT/REMOVE] Gemini AI client not available');
    }

    if (shouldRemove) {

      const questionDataJSON = JSON.stringify(body.question);

      try {

        await db
          .insert(blacklistsTable)
          .values({ event: body.event, questionData: JSON.parse(questionDataJSON) });


        const questionId = body.question.id as string | undefined;
        if (questionId) {
          try {
            await db.delete(questionsTable).where(eq(questionsTable.id, questionId));
            console.log('📝 [REPORT/REMOVE] Removed question from main table by id');
          } catch (error) {
            console.log('Question might not exist in main table (id path):', error);
          }
        } else {

          const event = String(body.event);
          const q = body.question as Record<string, unknown>;
          const conditions: any[] = [
            eq(questionsTable.question, String(q.question || '')),
            eq(questionsTable.event, event),
          ];
          if (q.tournament) conditions.push(eq(questionsTable.tournament, String(q.tournament)));
          if (q.division) conditions.push(eq(questionsTable.division, String(q.division)));
          try {
            const found = await db.select({ id: questionsTable.id }).from(questionsTable).where(and(...conditions)).limit(1);
            const targetId = found[0]?.id as string | undefined;
            if (targetId) {
              await db.delete(questionsTable).where(eq(questionsTable.id, targetId));
              console.log('📝 [REPORT/REMOVE] Removed question from main table by content');
            } else {
              console.log('⚠️ [REPORT/REMOVE] Could not locate question in main table by content');
            }
          } catch (error) {
            console.log('Error during content-based deletion attempt:', error);
          }
        }

        console.log('✅ [REPORT/REMOVE] Question successfully removed and blacklisted');
        
        const response: ApiResponse = {
          success: true,
          message: 'Question removed and blacklisted',
          data: {
            reason: aiReason,
            removed: true,
          },
        };
        return NextResponse.json(response);
      } catch (error) {
        console.log('❌ [REPORT/REMOVE] Database error:', error);
        const response: ApiResponse = {
          success: false,
          error: 'Failed to remove question',
        };
        return NextResponse.json(response, { status: 500 });
      }
    } else {
      console.log('❌ [REPORT/REMOVE] Question removal not justified by AI');
      const response: ApiResponse = {
        success: false,
        message: 'Question removal not justified',
        data: {
          reason: aiReason,
          removed: false,
        },
      };
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('POST /api/report/remove error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid request body',
    };
    return NextResponse.json(response, { status: 400 });
  }
}