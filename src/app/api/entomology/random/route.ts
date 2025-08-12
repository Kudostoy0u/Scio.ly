import { NextRequest } from 'next/server';
import { client } from '@/lib/db';

type Row = { id: string; names: string[]; image_urls: string[] };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const count = Math.max(1, Math.min(100, parseInt(searchParams.get('count') || '1')));

    const rows = await client<Row[]>`
      SELECT id, names, image_urls
      FROM public.entomology
      ORDER BY random()
      LIMIT ${count}
    `;

    const data = rows.map((r) => ({ id: r.id, names: r.names, images: r.image_urls || [] }));

    // Build name pool for MCQ distractors
    const namePoolRows = await client<{ name: string }[]>`
      SELECT DISTINCT unnest(names) AS name
      FROM public.entomology
    `;
    const namePool = namePoolRows.map((r) => r.name);

    return new Response(JSON.stringify({ success: true, data, namePool }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


