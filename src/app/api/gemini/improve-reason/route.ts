import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';
import { validateFields, ApiErrors, successResponse, handleApiError } from '@/lib/api/utils';
import logger from '@/lib/utils/logger';

export const maxDuration = 60;

interface ImproveReasonRequest extends Record<string, unknown> {
  reason: string;
  question: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateFields<ImproveReasonRequest>(body, ['reason', 'question']);

    if (!validation.valid) return validation.error;

    const { reason, question } = validation.data;

    logger.info('Gemini improve-reason request received');
    logger.debug('Original reason', { reason });

    if (!geminiService.isAvailable()) {
      logger.warn('Gemini AI not available');
      return ApiErrors.serverError('Gemini AI not available');
    }

    logger.info('Sending improve-reason request to Gemini AI');

    try {
      const result = await geminiService.improveReason(reason, question);

      logger.info('Gemini AI improve-reason response received');

      return successResponse<ApiResponse['data']>(result);
    } catch (error) {
      logger.error('Gemini AI improve-reason error:', error);
      return ApiErrors.serverError('Failed to improve reasoning');
    }
  } catch (error) {
    logger.error('POST /api/gemini/improve-reason error:', error);
    return handleApiError(error);
  }
}