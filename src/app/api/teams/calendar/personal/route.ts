import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { queryCockroachDB } from '@/lib/cockroachdb';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Only allow users to access their own personal events
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let query = `
      SELECT 
        e.id, e.title, e.description, e.start_time, e.end_time, 
        e.location, e.event_type, e.is_all_day, e.is_recurring, 
        e.recurrence_pattern, e.created_by, e.team_id
      FROM new_team_events e
      WHERE e.created_by = $1 AND e.team_id IS NULL
    `;
    
    const params: any[] = [user.id];
    let paramCount = 2;

    if (startDate) {
      query += ` AND e.start_time >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND e.start_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ` ORDER BY e.start_time ASC`;

    const result = await queryCockroachDB(query, params);

    return NextResponse.json({ 
      success: true, 
      events: result.rows 
    });

  } catch (error) {
    console.error('Error fetching personal events:', error);
    return NextResponse.json({ error: 'Failed to fetch personal events' }, { status: 500 });
  }
}
