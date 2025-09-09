import { NextRequest, NextResponse } from 'next/server';
import { initExtrasDatabase } from '@/lib/db/teamExtras';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: "postgresql://kundan:jTucKCVvP7D1cRbB8doSVg@scioly-14433.j77.aws-us-east-2.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full",
  ssl: { rejectUnauthorized: false }
});

export async function POST(req: NextRequest) {
  try {
    const { assignmentId, userId, name, eventName, score, detail } = await req.json();
    if (!assignmentId || (!userId && !name)) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }
    await initExtrasDatabase();
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO assignment_results (assignment_id, user_id, name, event_name, score, detail) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [Number(assignmentId), userId || null, name || null, eventName || null, typeof score === 'number' ? score : null, detail ? JSON.stringify(detail) : null]
      );
      return NextResponse.json({ success: true, data: res.rows[0] });
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


