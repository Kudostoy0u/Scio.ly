import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, GeminiAnalyzeQuestionRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';

// POST /api/gemini/analyze-question - Analyze a question for potential issues
export async function POST(request: NextRequest) {
  try {
    const body: GeminiAnalyzeQuestionRequest = await request.json();

    if (!body.question) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required field: question',
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log('🤖 [GEMINI/ANALYZE-QUESTION] Request received');

    if (!geminiService.isAvailable()) {
      console.log('❌ [GEMINI/ANALYZE-QUESTION] Gemini AI not available');
      const response: ApiResponse = {
        success: false,
        error: 'Gemini AI not available',
      };
      return NextResponse.json(response, { status: 503 });
    }

    // Extract question data
    const questionText = body.question.question || '';
    const options = body.question.options || [];
    const answers = body.question.answers || [];
    const subject = body.question.subject || '';
    const difficulty = body.question.difficulty || 0.5;

    console.log(`📋 [GEMINI/ANALYZE-QUESTION] Question: ${questionText}`);
    console.log(`📋 [GEMINI/ANALYZE-QUESTION] Options: ${JSON.stringify(options)}`);
    console.log(`📋 [GEMINI/ANALYZE-QUESTION] Answers: ${JSON.stringify(answers)}`);
    console.log(`📋 [GEMINI/ANALYZE-QUESTION] Subject: ${subject}, Difficulty: ${difficulty}`);

    console.log('🤖 [GEMINI/ANALYZE-QUESTION] Sending request to Gemini AI');

    try {
      const result = await geminiService.analyzeQuestion(body.question);

      console.log('✅ [GEMINI/ANALYZE-QUESTION] Gemini AI response received:', result);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.log('❌ [GEMINI/ANALYZE-QUESTION] Gemini AI error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to analyze question',
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    console.error('POST /api/gemini/analyze-question error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid request body',
    };
    return NextResponse.json(response, { status: 400 });
  }
}