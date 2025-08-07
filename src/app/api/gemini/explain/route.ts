import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, GeminiExplainRequest } from '@/lib/types/api';
import { geminiService } from '@/lib/services/gemini';

// POST /api/gemini/explain - Get AI explanation for a question
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

    console.log('🤖 [GEMINI/EXPLAIN] Request received');
    console.log(`📋 [GEMINI/EXPLAIN] Event: ${body.event}`);

    if (!geminiService.isAvailable()) {
      console.log('❌ [GEMINI/EXPLAIN] Gemini AI not available');
      const response: ApiResponse = {
        success: false,
        error: 'Gemini AI not available',
      };
      return NextResponse.json(response, { status: 503 });
    }

    const streaming = Boolean(body.streaming);
    console.log('🤖 [GEMINI/EXPLAIN] Sending request to Gemini AI', { streaming });

    if (streaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            // Send an initial event for clients to prepare UI
            controller.enqueue(encoder.encode('event: start\n\n'));
            for await (const chunk of geminiService.streamExplain(
              body.question,
              body.userAnswer,
              body.event
            )) {
              if (chunk.type === 'text') {
                // Send as server-sent events with data lines
                const safe = chunk.chunk.replace(/\n/g, '\\n');
                controller.enqueue(encoder.encode(`event: chunk\ndata: ${safe}\n\n`));
              } else if (chunk.type === 'final') {
                controller.enqueue(
                  encoder.encode(`event: final\ndata: ${JSON.stringify(chunk.data)}\n\n`)
                );
              }
            }
            controller.enqueue(encoder.encode('event: end\n\n'));
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new NextResponse(stream as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    try {
      const result = await geminiService.explain(
        body.question,
        body.userAnswer,
        body.event
      );

      console.log('✅ [GEMINI/EXPLAIN] Gemini AI response received:', result);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.log('❌ [GEMINI/EXPLAIN] Gemini AI error:', error);
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