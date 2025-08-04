import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/neon';
import { ApiResponse, StatsResponse, EventStat, DivisionStat } from '@/lib/types/api';

// GET /api/meta/stats - Get question statistics
export async function GET() {
  try {
    // Get total count
    const totalQuery = "SELECT COUNT(*) as total FROM questions";
    const totalResult = await executeQuery<{ total: string }>(totalQuery);
    const total = parseInt(totalResult[0]?.total || '0');

    // Get event stats
    const eventQuery = "SELECT event, COUNT(*) as count FROM questions GROUP BY event ORDER BY count DESC";
    const eventResult = await executeQuery<{ event: string; count: string }>(eventQuery);
    const byEvent: EventStat[] = eventResult.map(row => ({
      event: row.event,
      count: row.count,
    }));

    // Get division stats
    const divisionQuery = "SELECT division, COUNT(*) as count FROM questions GROUP BY division ORDER BY count DESC";
    const divisionResult = await executeQuery<{ division: string; count: string }>(divisionQuery);
    const byDivision: DivisionStat[] = divisionResult.map(row => ({
      division: row.division,
      count: row.count,
    }));

    const statsData: StatsResponse = {
      total,
      byEvent,
      byDivision,
    };

    const response: ApiResponse<StatsResponse> = {
      success: true,
      data: statsData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/meta/stats error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch stats',
    };
    return NextResponse.json(response, { status: 500 });
  }
}