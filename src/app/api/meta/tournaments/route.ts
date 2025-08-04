import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';
import { ApiResponse } from '@/lib/types/api';

// GET /api/meta/tournaments - Get all distinct tournaments
export async function GET() {
  try {
    const query = "SELECT DISTINCT tournament FROM questions ORDER BY tournament";
    const result = await executeQuery<{ tournament: string }>(query);
    
    const tournaments = result.map(row => row.tournament);

    const response: ApiResponse<string[]> = {
      success: true,
      data: tournaments,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/meta/tournaments error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch tournaments',
    };
    return NextResponse.json(response, { status: 500 });
  }
}