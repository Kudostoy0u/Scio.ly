import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, GeminiValidateEditRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';

export const maxDuration = 60;


export async function POST(request: NextRequest) {
  try {
    const body: GeminiValidateEditRequest = await request.json();

    if (!body.originalQuestion || !body.editedQuestion || !body.event || !body.reason) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: originalQuestion, editedQuestion, event, reason',
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log('Request received');
    console.log(`Event: ${body.event}, Reason: ${body.reason}`);

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
      const result = await geminiService.validateEdit(
        body.originalQuestion,
        body.editedQuestion,
        body.event,
        body.reason
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
        error: 'Failed to validate edit',
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    console.error('POST /api/gemini/validate-edit error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid request body',
    };
    return NextResponse.json(response, { status: 400 });
  }
}