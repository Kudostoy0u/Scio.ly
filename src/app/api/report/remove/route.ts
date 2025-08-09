import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponse, ReportRemoveRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';
import { blacklists as blacklistsTable, questions as questionsTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/report/remove - Report a question for removal
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

    // AI analysis of the question for removal justification
    let shouldRemove = false;
    let aiReason = 'Question analysis not available';

    if (geminiService.isAvailable()) {
      console.log('🤖 [REPORT/REMOVE] Sending request to Gemini AI for question analysis');

      try {
        const result = await geminiService.analyzeQuestion(body.question);

        console.log('✅ [REPORT/REMOVE] Gemini AI response received:', result);

        // Determine if question should be removed based on AI analysis
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
      // Move question to blacklist
      const questionDataJSON = JSON.stringify(body.question);

      try {
        // Add to blacklist via Drizzle
        await db
          .insert(blacklistsTable)
          .values({ event: body.event, questionData: JSON.parse(questionDataJSON) });

        // Remove from main questions table if it exists
        const questionId = body.question.id;
        if (questionId) {
          try {
            await db.delete(questionsTable).where(eq(questionsTable.id, questionId as unknown as string));
            console.log('📝 [REPORT/REMOVE] Removed question from main table');
          } catch (error) {
            console.log('Question might not exist in main table:', error);
          }
        } else {
          console.log('📝 [REPORT/REMOVE] No question ID provided, skipping main table deletion');
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