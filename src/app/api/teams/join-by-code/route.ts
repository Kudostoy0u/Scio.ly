import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { addMemberToTeam } from '@/lib/db/teams';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://kundan:jTucKCVvP7D1cRbB8doSVg@scioly-14433.j77.aws-us-east-2.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full",
  ssl: { rejectUnauthorized: false }
});

export async function POST(request: NextRequest) {
  try {
    const supa = await createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { code } = await request.json();
    if (!code || typeof code !== 'string') return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT id, school, division, team_id, name, roster, captain_code, user_code, slug,
                CASE WHEN captain_code = $1 THEN 'captain' ELSE 'user' END AS role
         FROM team_units WHERE captain_code = $1 OR user_code = $1
         LIMIT 1`, [code]
      );
      if (rows.length === 0) return NextResponse.json({ success: false, error: 'Invalid or expired code' }, { status: 400 });
      const row = rows[0];
      await addMemberToTeam(row.id, user.id, row.role);
      return NextResponse.json({ success: true, slug: row.slug, role: row.role });
    } finally { client.release(); }
  } catch (e) {
    console.error('join-by-code error', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


