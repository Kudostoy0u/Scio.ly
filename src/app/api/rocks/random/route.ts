import { NextRequest } from 'next/server';
import { client, db } from '@/lib/db';
import { sql } from 'drizzle-orm';

type DBRow = { id: string; names: string[]; image_urls: string[] };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const count = Math.max(1, Math.min(100, parseInt(searchParams.get('count') || '1')));
    console.log('[API] GET /api/rocks/random', { count });

    // Fetch random rows with image URLs
    const rows = await client<DBRow[]>`
      SELECT id, names, image_urls
      FROM rocksandminerals
      ORDER BY random()
      LIMIT ${count}
    `;
    console.log('[API] /api/rocks/random minerals', { rows: rows.length });

    // Build a name pool for MCQ distractors
    const namePoolRows = await client<{ name: string }[]>`
      SELECT DISTINCT unnest(names) AS name
      FROM rocksandminerals
    `;
    const namePool = namePoolRows.map(r => r.name);

    const data = rows.map(r => ({
      id: r.id,
      names: r.names,
      images: r.image_urls || [],
    }));

    return new Response(JSON.stringify({ success: true, data, namePool }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('rocks/random error:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


