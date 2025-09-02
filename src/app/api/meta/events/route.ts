import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { questions } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { ApiResponse } from '@/lib/types/api';


export async function GET() {
  try {
    const rows = await db.select({ event: questions.event }).from(questions).groupBy(questions.event).orderBy(asc(questions.event));
    const events = rows.map(r => r.event);

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