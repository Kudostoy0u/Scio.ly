import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, GeminiGradeFreeResponsesRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';

export const maxDuration = 60;


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

    console.log('Request received');
    console.log(`Grading ${body.responses.length} responses`);

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
      const result = await geminiService.gradeFreeResponses(body.responses);

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