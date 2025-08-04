import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, GeminiImproveReasonRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';

// POST /api/gemini/improve-reason - Improve user's reasoning for an edit
export async function POST(request: NextRequest) {
  try {
    const body: GeminiImproveReasonRequest = await request.json();

    if (!body.reason || !body.question) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: reason, question',
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log('🤖 [GEMINI/IMPROVE-REASON] Request received');
    console.log(`📝 [GEMINI/IMPROVE-REASON] Original reason: ${body.reason}`);

    if (!geminiService.isAvailable()) {
      console.log('❌ [GEMINI/IMPROVE-REASON] Gemini AI not available');
      const response: ApiResponse = {
        success: false,
        error: 'Gemini AI not available',
      };
      return NextResponse.json(response, { status: 503 });
    }

    console.log('🤖 [GEMINI/IMPROVE-REASON] Sending request to Gemini AI');

    try {
      const result = await geminiService.improveReason(body.reason, body.question);

      console.log('✅ [GEMINI/IMPROVE-REASON] Gemini AI response received:', result);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.log('❌ [GEMINI/IMPROVE-REASON] Gemini AI error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to improve reasoning',
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    console.error('POST /api/gemini/improve-reason error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid request body',
    };
    return NextResponse.json(response, { status: 400 });
  }
}