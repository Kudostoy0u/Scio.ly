import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, GeminiExplainRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';


export async function POST(request: NextRequest) {
  try {
    const body: GeminiExplainRequest = await request.json();

    if (!body.question || !body.event) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: question, event',
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log('Request received');
    console.log(`Event: ${body.event}`);

    if (!geminiService.isAvailable()) {
      console.log('Gemini AI not available');
      const response: ApiResponse = {
        success: false,
        error: 'Gemini AI not available',
      };
      return NextResponse.json(response, { status: 503 });
    }

    console.log('Sending request to Gemini AI');

    try {
      const result = await geminiService.explain(
        body.question,
        body.userAnswer,
        body.event
      );

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
        error: 'Failed to generate explanation',
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    console.error('POST /api/gemini/explain error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid request body',
    };
    return NextResponse.json(response, { status: 400 });
  }
}