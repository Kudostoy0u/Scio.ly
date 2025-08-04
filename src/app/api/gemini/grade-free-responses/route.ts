import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, GeminiGradeFreeResponsesRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';

// POST /api/gemini/grade-free-responses - Grade free response answers using AI
export async function POST(request: NextRequest) {
  try {
    const body: GeminiGradeFreeResponsesRequest = await request.json();

    if (!body.responses || !Array.isArray(body.responses)) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required field: responses (array)',
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log('🤖 [GEMINI/GRADE-FREE-RESPONSES] Request received');
    console.log(`📋 [GEMINI/GRADE-FREE-RESPONSES] Grading ${body.responses.length} responses`);

    if (!geminiService.isAvailable()) {
      console.log('❌ [GEMINI/GRADE-FREE-RESPONSES] Gemini AI not available');
      const response: ApiResponse = {
        success: false,
        error: 'Gemini AI not available',
      };
      return NextResponse.json(response, { status: 503 });
    }

    console.log('🤖 [GEMINI/GRADE-FREE-RESPONSES] Sending request to Gemini AI');

    try {
      const result = await geminiService.gradeFreeResponses(body.responses);

      console.log('✅ [GEMINI/GRADE-FREE-RESPONSES] Gemini AI response received:', result);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.log('❌ [GEMINI/GRADE-FREE-RESPONSES] Gemini AI error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to grade free responses',
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    console.error('POST /api/gemini/grade-free-responses error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid request body',
    };
    return NextResponse.json(response, { status: 400 });
  }
}