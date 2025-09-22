import { NextResponse } from 'next/server';
import path from 'node:path';
import { promises as fs } from 'node:fs';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await ctx.params;
    const parts = Array.isArray(slug) ? slug : [];
    if (parts.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const last = parts[parts.length - 1];
    const fsParts = parts.slice(0, -1);
    const filename = last.endsWith('.md') ? last : `${last}.md`;
    const filePath = path.join(process.cwd(), 'src', 'app', 'docs', 'content', '2026', ...fsParts, filename);
    const buf = await fs.readFile(filePath);
    const text = buf.toString('utf-8');
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}


