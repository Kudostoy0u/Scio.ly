import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { idEvents } from '@/lib/db/schema';
import { sql, and, gte, lt } from 'drizzle-orm';
import { z } from 'zod';
import { createSuccessResponse, handleApiError, logApiRequest, logApiResponse } from '@/lib/api/utils';



const Filters = z.object({
  event: z.string().optional(),
  division: z.string().optional(),
  subtopic: z.string().optional(),
  subtopics: z.string().optional(),
  difficulty_min: z.string().optional(),
  difficulty_max: z.string().optional(),
  limit: z.string().optional(),
});

const toArray = (v: unknown) => (Array.isArray(v) ? v : []);
const toNum = (v: unknown, d = 0.5) => (typeof v === 'number' ? v : parseFloat(String(v ?? d)) || d);

export async function GET(request: NextRequest) {
  const started = Date.now();
  logApiRequest('GET', '/api/id-questions', Object.fromEntries(request.nextUrl.searchParams));
  try {
    const p = Filters.parse(Object.fromEntries(request.nextUrl.searchParams));
    const subtopics: string[] = p.subtopics ? p.subtopics.split(',').map(s => s.trim()) : p.subtopic ? [p.subtopic] : [];
    const conds: any[] = [];
    if (p.event) conds.push(sql`${idEvents.event} = ${p.event}`);
    if (p.division) conds.push(sql`${idEvents.division} = ${p.division}`);
    if (subtopics.length > 0) conds.push(sql`${idEvents.subtopics} @> ${JSON.stringify(subtopics)}`);
    if (p.difficulty_min) conds.push(gte(idEvents.difficulty, String(parseFloat(p.difficulty_min))));
    if (p.difficulty_max) conds.push(lt(idEvents.difficulty, String(parseFloat(p.difficulty_max))));

    const where = conds.length === 0 ? undefined : (conds.length === 1 ? conds[0] : and(...conds));
    const limit = Math.min(Math.max(parseInt(p.limit || '50') || 50, 1), 200);
    const r = Math.random();

    try {
      const first = await db.select().from(idEvents).where(where ? and(where, gte(idEvents.randomF, r)) : gte(idEvents.randomF, r)).orderBy(idEvents.randomF).limit(limit);
      const rows = first.length >= limit ? first : [
        ...first,
        ...await db.select().from(idEvents).where(where ? and(where, lt(idEvents.randomF, r)) : lt(idEvents.randomF, r)).orderBy(idEvents.randomF).limit(limit - first.length),
      ];
      const data = rows.map((row: any) => ({
        id: row.id,
        question: row.question,
        tournament: row.tournament,
        division: row.division,
        event: row.event,
        difficulty: toNum(row.difficulty),
        options: toArray(row.options),
        answers: toArray(row.answers),
        subtopics: toArray(row.subtopics),
        images: toArray(row.images),
        created_at: row.createdAt ?? row.created_at,
        updated_at: row.updatedAt ?? row.updated_at,
      }));
      const res = createSuccessResponse(data);
      logApiResponse('GET', '/api/id-questions', 200, Date.now() - started);
      return res;
    } catch {
      const base = where ? db.select().from(idEvents).where(where).orderBy(sql`RANDOM()`).limit(limit) : db.select().from(idEvents).orderBy(sql`RANDOM()`).limit(limit);
      const rows = await base;
      const data = rows.map((row: any) => ({
        id: row.id,
        question: row.question,
        tournament: row.tournament,
        division: row.division,
        event: row.event,
        difficulty: toNum(row.difficulty),
        options: toArray(row.options),
        answers: toArray(row.answers),
        subtopics: toArray(row.subtopics),
        images: toArray(row.images),
        created_at: row.createdAt ?? row.created_at,
        updated_at: row.updatedAt ?? row.updated_at,
      }));
      const res = createSuccessResponse(data);
      logApiResponse('GET', '/api/id-questions', 200, Date.now() - started);
      return res;
    }
  } catch (err) {
    const res = handleApiError(err);
    logApiResponse('GET', '/api/id-questions', res.status, Date.now() - started);
    return res;
  }
}


