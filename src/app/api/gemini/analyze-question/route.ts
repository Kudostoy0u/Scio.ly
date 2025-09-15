import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, GeminiAnalyzeQuestionRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';

export const maxDuration = 60;


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

    console.log('Request received');

    if (!geminiService.isAvailable()) {
      console.log('Gemini AI not available');
      const response: ApiResponse = {
        success: false,
        error: 'Gemini AI not available',
      };
      return NextResponse.json(response, { status: 503 });
    }


    const questionText = body.question.question || '';
    const options = body.question.options || [];
    const answers = body.question.answers || [];
    const subject = body.question.subject || '';
    const difficulty = body.question.difficulty || 0.5;

    console.log(`Question: ${questionText}`);
    console.log(`Options: ${JSON.stringify(options)}`);
    console.log(`Answers: ${JSON.stringify(answers)}`);
    console.log(`Subject: ${subject}, Difficulty: ${difficulty}`);

    console.log('Sending request to Gemini AI');

    try {
      const result = await geminiService.analyzeQuestion(body.question);

      console.log('Gemini AI response received:', result);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.log('Gemini AI error:', error);
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