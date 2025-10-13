import { NextRequest, NextResponse } from 'next/server';
import { initExtrasDatabase } from '@/lib/db/teamExtras';
import { pool } from '@/lib/db/pool';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assignmentId, userId, name, eventName, score, detail } = body || {};

    if (!assignmentId || (!userId && !name)) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: assignmentId and either userId or name' },
        { status: 400 }
      );
    }

    await initExtrasDatabase();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO assignment_results (assignment_id, user_id, name, event_name, score, detail)
         VALUES ($1::INT8, $2, $3, $4, $5, $6) RETURNING *`,
        [
          String(assignmentId),
          userId || null,
          name || null,
          eventName || null,
          typeof score === 'number' ? score : null,
          detail ? JSON.stringify(detail) : null
        ]
      );
      return NextResponse.json({ success: true, data: res.rows[0] });
    } finally {
      client.release();
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to submit assignment', details: errorMessage },
      { status: 500 }
    );
  }
}


