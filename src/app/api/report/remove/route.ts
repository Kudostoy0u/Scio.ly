import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponse } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';
import { blacklists as blacklistsTable, questions as questionsTable } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { validateFields, ApiErrors, successResponse, handleApiError } from '@/lib/api/utils';
import logger from '@/lib/utils/logger';

export const maxDuration = 60;

interface RemoveRequest extends Record<string, unknown> {
  question: Record<string, unknown>;
  event: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateFields<RemoveRequest>(body, ['question', 'event']);

    if (!validation.valid) return validation.error;

    const { question, event } = validation.data;

    logger.info(`Report remove request received for event: ${event}`);


    let shouldRemove = false;
    let aiReason = 'Question analysis not available';

    if (geminiService.isAvailable()) {
      logger.info('Sending request to Gemini AI for question analysis');

      try {
        const result = await geminiService.analyzeQuestion(question, '', event);

        logger.info('Gemini AI question analysis response received');


        shouldRemove = Boolean((result as any).remove);
        aiReason = String((result as any).reason || 'AI analysis completed');

        logger.info(`AI Decision: ${shouldRemove ? 'remove' : 'keep'}`, { reason: aiReason });
      } catch (error) {
        shouldRemove = false;
        aiReason = 'AI analysis failed';
        logger.error('Gemini AI question analysis error:', error);
      }
    } else {
      logger.warn('Gemini AI client not available');
    }

    if (shouldRemove) {

      const questionDataJSON = JSON.stringify(question);

      try {

        await db
          .insert(blacklistsTable)
          .values({ event, questionData: JSON.parse(questionDataJSON) });


        const questionId = question.id as string | undefined;
        if (questionId) {
          try {
            await db.delete(questionsTable).where(eq(questionsTable.id, questionId));
            logger.info('Removed question from main table by id');
          } catch (error) {
            logger.warn('Question might not exist in main table (id path):', error);
          }
        } else {

          const conditions: any[] = [
            eq(questionsTable.question, String(question.question || '')),
            eq(questionsTable.event, event),
          ];
          if (question.tournament) conditions.push(eq(questionsTable.tournament, String(question.tournament)));
          if (question.division) conditions.push(eq(questionsTable.division, String(question.division)));
          try {
            const found = await db.select({ id: questionsTable.id }).from(questionsTable).where(and(...conditions)).limit(1);
            const targetId = found[0]?.id as string | undefined;
            if (targetId) {
              await db.delete(questionsTable).where(eq(questionsTable.id, targetId));
              logger.info('Removed question from main table by content');
            } else {
              logger.warn('Could not locate question in main table by content');
            }
          } catch (error) {
            logger.error('Error during content-based deletion attempt:', error);
          }
        }

        logger.info('Question successfully removed and blacklisted');

        return successResponse<ApiResponse['data']>(
          { reason: aiReason, removed: true },
          'Question removed and blacklisted'
        );
      } catch (error) {
        logger.error('Database error removing question:', error);
        return ApiErrors.serverError('Failed to remove question');
      }
    } else {
      logger.info('Question removal not justified by AI');
      return successResponse<ApiResponse['data']>(
        { reason: aiReason, removed: false },
        'Question removal not justified'
      );
    }
  } catch (error) {
    logger.error('POST /api/report/remove error:', error);
    return handleApiError(error);
  }
}