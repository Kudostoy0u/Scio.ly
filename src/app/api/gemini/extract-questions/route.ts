import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, GeminiExtractQuestionsRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';

// POST /api/gemini/extract-questions - Extract questions from text using AI
export async function POST(request: NextRequest) {
  try {
    const body: GeminiExtractQuestionsRequest = await request.json();

    if (!body.text) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required field: text',
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log('🤖 [GEMINI/EXTRACT-QUESTIONS] Request received');
    console.log(`📝 [GEMINI/EXTRACT-QUESTIONS] Text length: ${body.text.length} characters`);

    if (!geminiService.isAvailable()) {
      console.log('❌ [GEMINI/EXTRACT-QUESTIONS] Gemini AI not available');
      const response: ApiResponse = {
        success: false,
        error: 'Gemini AI not available',
      };
      return NextResponse.json(response, { status: 503 });
    }

    console.log('🤖 [GEMINI/EXTRACT-QUESTIONS] Sending request to Gemini AI');

    try {
      const result = await geminiService.extractQuestions(body.text);

      console.log('✅ [GEMINI/EXTRACT-QUESTIONS] Gemini AI response received:', result);
      console.log(`📊 [GEMINI/EXTRACT-QUESTIONS] Extracted ${Array.isArray(result.questions) ? result.questions.length : 0} questions`);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.log('❌ [GEMINI/EXTRACT-QUESTIONS] Gemini AI error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to extract questions',
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    console.error('POST /api/gemini/extract-questions error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid request body',
    };
    return NextResponse.json(response, { status: 400 });
  }
}