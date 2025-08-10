import { NextRequest } from 'next/server';
import { client } from '@/lib/db';

type DBRow = { id: string; names: string[] };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const count = Math.max(1, Math.min(100, parseInt(searchParams.get('count') || '1')));
    console.log('[API] GET /api/rocks/random', { count });

    // Fetch random rows
    const rows = await client<DBRow[]>`
      SELECT id, names
      FROM rocksandminerals
      ORDER BY random()
      LIMIT ${count}
    `;
    console.log('[API] /api/rocks/random minerals', { rows: rows.length });

    // Fetch up to 3 images per mineral
    const mineralIds = rows.map(r => r.id);
    const imgRows = mineralIds.length
      ? await client<{ mineral_id: string; image_bytes: Buffer }[]>`
        SELECT mineral_id, image_bytes
        FROM rock_images
        WHERE mineral_id IN (${client.unsafe(mineralIds.map(id => `'${id}'`).join(','))})
      `
      : [];
    console.log('[API] /api/rocks/random images', { minerals: mineralIds.length, images: imgRows.length });
    const idToImages: Record<string, string[]> = {};
    for (const r of imgRows) {
      (idToImages[r.mineral_id] ||= []).push(`data:image/*;base64,${Buffer.from(r.image_bytes).toString('base64')}`);
    }

    // Build a name pool for MCQ distractors
    const namePoolRows = await client<{ name: string }[]>`
      SELECT DISTINCT unnest(names) AS name
      FROM rocksandminerals
    `;
    const namePool = namePoolRows.map(r => r.name);

    const data = rows.map(r => ({
      id: r.id,
      names: r.names,
      images: idToImages[r.id] || [],
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


