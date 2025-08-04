import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';
import { ApiResponse } from '@/lib/types/api';

// GET /api/meta/events - Get all distinct events
export async function GET() {
  try {
    const query = "SELECT DISTINCT event FROM questions ORDER BY event";
    const result = await executeQuery<{ event: string }>(query);
    
    const events = result.map(row => row.event);

    const response: ApiResponse<string[]> = {
      success: true,
      data: events,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/meta/events error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch events',
    };
    return NextResponse.json(response, { status: 500 });
  }
}