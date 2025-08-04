import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, GeminiSuggestEditRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';

// POST /api/gemini/suggest-edit - Get AI suggestions for improving a question
export async function POST(request: NextRequest) {
  try {
    const body: GeminiSuggestEditRequest = await request.json();

    if (!body.question) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required field: question',
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log('🤖 [GEMINI/SUGGEST-EDIT] Request received');
    if (body.userReason) {
      console.log(`📝 [GEMINI/SUGGEST-EDIT] User reason: ${body.userReason}`);
    }

    if (!geminiService.isAvailable()) {
      console.log('❌ [GEMINI/SUGGEST-EDIT] Gemini AI not available');
      const response: ApiResponse = {
        success: false,
        error: 'Gemini AI not available',
      };
      return NextResponse.json(response, { status: 503 });
    }

    console.log('📋 [GEMINI/SUGGEST-EDIT] Question:', body.question);
    console.log('🤖 [GEMINI/SUGGEST-EDIT] Sending request to Gemini AI');

    try {
      const result = await geminiService.suggestEdit(body.question, body.userReason);

      console.log('✅ [GEMINI/SUGGEST-EDIT] Gemini AI response received:', result);

      console.log('🎯 [GEMINI/SUGGEST-EDIT] AI Suggestions:');
      if (result.suggestedQuestion) {
        console.log(`   - Suggested Question: ${result.suggestedQuestion}`);
      }
      if (result.suggestedOptions) {
        console.log(`   - Suggested Options: ${JSON.stringify(result.suggestedOptions)}`);
      }
      if (result.suggestedAnswers) {
        console.log(`   - Suggested Answers: ${JSON.stringify(result.suggestedAnswers)}`);
      }
      if (result.reasoning) {
        console.log(`   - Reasoning: ${result.reasoning}`);
      }
      if (result.confidence) {
        console.log(`   - Confidence: ${result.confidence}`);
      }

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.log('❌ [GEMINI/SUGGEST-EDIT] Gemini AI error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to generate edit suggestions',
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    console.error('POST /api/gemini/suggest-edit error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid request body',
    };
    return NextResponse.json(response, { status: 400 });
  }
}