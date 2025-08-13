import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blacklists as blacklistsTable, edits as editsTable, questions as questionsTable } from '@/lib/db/schema';
import { ApiResponse } from '@/lib/types/api';
import { and, desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

type AdminAction =
  | 'undoEdit'
  | 'undoAllEdits'
  | 'applyEdit'
  | 'applyAllEdits'
  | 'undoRemove'
  | 'restoreAllRemoved'
  | 'applyRemoved'
  | 'applyAllRemoved'
  | 'deleteEdit'
  | 'deleteRemoved';

function parseMaybeJson(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : { value: parsed as unknown } as Record<string, unknown>;
    } catch {
      return { value } as Record<string, unknown>;
    }
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return { value } as Record<string, unknown>;
}

function toStringDifficulty(input: unknown): string {
  if (typeof input === 'number') return input.toString();
  if (typeof input === 'string') {
    const n = Number(input);
    if (!Number.isNaN(n)) return n.toString();
  }
  return '0.5';
}

async function locateQuestionIdByContent(event: string, content: Record<string, unknown>) {
  const conditions = [
    eq(questionsTable.question, String(content.question || '')),
    eq(questionsTable.event, String(event || content.event || '')),
  ];
  if (content.tournament) conditions.push(eq(questionsTable.tournament, String(content.tournament)));
  if (content.division) conditions.push(eq(questionsTable.division, String(content.division)));

  const found = await db
    .select({ id: questionsTable.id })
    .from(questionsTable)
    .where(and(...(conditions as any)));
  return found[0]?.id as string | undefined;
}

function buildQuestionPayload(
  event: string,
  q: Record<string, unknown>
): Partial<typeof questionsTable.$inferInsert> {
  return {
    question: String(q.question || ''),
    tournament: String(q.tournament || ''),
    division: String(q.division || ''),
    event: String(event || q.event || ''),
    options: Array.isArray(q.options) ? (q.options as unknown[]) : [],
    answers: Array.isArray(q.answers) ? (q.answers as unknown[]) : [],
    subtopics: Array.isArray((q as any).subtopics)
      ? ((q as any).subtopics as unknown[])
      : (q as any).subtopic
        ? [String((q as any).subtopic)]
        : [],
    difficulty: toStringDifficulty((q as any).difficulty),
  } as any;
}

// GET /api/admin - Overview: list all edits and blacklists with IDs
export async function GET() {
  try {
    const [edits, blacklists] = await Promise.all([
      db.select().from(editsTable).orderBy(desc(editsTable.updatedAt)),
      db.select().from(blacklistsTable).orderBy(desc(blacklistsTable.createdAt)),
    ]);

    // Compute stats and enrich with resolvability
    let editsResolvable = 0;
    let removedResolvable = 0;
    const byEvent: Record<string, { edits: number; removed: number }> = {};

    const enrichedEdits = await Promise.all(edits.map(async (row) => {
      const event = row.event;
      byEvent[event] = byEvent[event] || { edits: 0, removed: 0 };
      byEvent[event].edits += 1;

      const original = parseMaybeJson(row.originalQuestion);
      const edited = parseMaybeJson(row.editedQuestion);
      const candidateId = (edited.id as string | undefined) || (original.id as string | undefined);
      let canLocate = Boolean(candidateId);
      if (!canLocate) {
        // Try by original content first (likely DB has originals)
        const idByOriginal = await locateQuestionIdByContent(event, original);
        canLocate = Boolean(idByOriginal);
      }
      if (canLocate) editsResolvable += 1;
      return {
        id: row.id,
        event,
        original,
        edited,
        updatedAt: String(row.updatedAt),
        canLocateTarget: canLocate,
      };
    }));

    const enrichedBlacklists = await Promise.all(blacklists.map(async (row) => {
      const event = row.event;
      byEvent[event] = byEvent[event] || { edits: 0, removed: 0 };
      byEvent[event].removed += 1;

      const q = parseMaybeJson(row.questionData);
      const candidateId = (q.id as string | undefined) || undefined;
      let exists = false;
      if (candidateId) {
        const found = await db.select({ id: questionsTable.id }).from(questionsTable).where(eq(questionsTable.id, candidateId)).limit(1);
        exists = found.length > 0;
      } else {
        const idByContent = await locateQuestionIdByContent(event, q);
        exists = Boolean(idByContent);
      }
      if (exists) removedResolvable += 1;
      return {
        id: row.id,
        event,
        question: q,
        createdAt: String(row.createdAt),
        existsInQuestions: exists,
      };
    }));

    const response: ApiResponse = {
      success: true,
      data: {
        edits: enrichedEdits,
        blacklists: enrichedBlacklists,
        stats: {
          totalEdits: edits.length,
          totalRemoved: blacklists.length,
          editsResolvable,
          removedResolvable,
          byEvent,
        },
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('[ADMIN/GET] Error:', error);
    const response: ApiResponse = { success: false, error: 'Failed to fetch admin overview' };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/admin - Perform actions (undo/edit/delete)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action: AdminAction = body.action;
    const id: string | undefined = body.id;

    if (!action) {
      const response: ApiResponse = { success: false, error: 'Missing action' };
      return NextResponse.json(response, { status: 400 });
    }

    if (action === 'undoEdit') {
      if (!id) return NextResponse.json({ success: false, error: 'Missing id' } as ApiResponse, { status: 400 });
      const rows = await db.select().from(editsTable).where(eq(editsTable.id, id)).limit(1);
      const row = rows[0];
      if (!row) {
        const response: ApiResponse = { success: false, error: 'Edit not found' };
        return NextResponse.json(response, { status: 404 });
      }

      const event = row.event;
      const original = parseMaybeJson(row.originalQuestion);
      const edited = parseMaybeJson(row.editedQuestion);

      const originalId = (original.id as string | undefined) || undefined;
      const editedId = (edited.id as string | undefined) || undefined;

      const initialTargetId: string | null = originalId || editedId || null;
      let targetId: string | null = initialTargetId;

      if (!targetId) {
        // Prefer locating by original content (we want to revert to original)
        const idByOriginal = await locateQuestionIdByContent(event, original);
        targetId = idByOriginal || (await locateQuestionIdByContent(event, edited)) || null;
      }

      if (!targetId) {
        const response: ApiResponse = { success: false, error: 'Could not locate target question to revert' };
        return NextResponse.json(response, { status: 404 });
      }

      const payload = buildQuestionPayload(event, original);

      await db.update(questionsTable).set({ ...(payload as any), updatedAt: new Date() }).where(eq(questionsTable.id, targetId));
      await db.delete(editsTable).where(eq(editsTable.id, id));

      const response: ApiResponse = { success: true, message: 'Edit reverted and record removed' };
      return NextResponse.json(response);
    }

    if (action === 'applyEdit') {
      if (!id) return NextResponse.json({ success: false, error: 'Missing id' } as ApiResponse, { status: 400 });
      const rows = await db.select().from(editsTable).where(eq(editsTable.id, id)).limit(1);
      const row = rows[0];
      if (!row) return NextResponse.json({ success: false, error: 'Edit not found' } as ApiResponse, { status: 404 });
      const event = row.event;
      const original = parseMaybeJson(row.originalQuestion);
      const edited = parseMaybeJson(row.editedQuestion);

      // Locate by original first (most likely case
      const targetId = (original.id as string | undefined)
        || (await locateQuestionIdByContent(event, original))
        || (edited.id as string | undefined)
        || (await locateQuestionIdByContent(event, edited))
        || null;

      if (!targetId) {
        const response: ApiResponse = { success: false, error: 'Could not locate target question to apply edit' };
        return NextResponse.json(response, { status: 404 });
      }

      const payload = buildQuestionPayload(event, edited);
      await db.update(questionsTable).set({ ...(payload as any), updatedAt: new Date() }).where(eq(questionsTable.id, targetId));
      const response: ApiResponse = { success: true, message: 'Edit applied to database' };
      return NextResponse.json(response);
    }

    if (action === 'deleteEdit') {
      if (!id) return NextResponse.json({ success: false, error: 'Missing id' } as ApiResponse, { status: 400 });
      await db.delete(editsTable).where(eq(editsTable.id, id));
      const response: ApiResponse = { success: true, message: 'Edit record deleted' };
      return NextResponse.json(response);
    }

    if (action === 'undoRemove') {
      if (!id) return NextResponse.json({ success: false, error: 'Missing id' } as ApiResponse, { status: 400 });
      const rows = await db.select().from(blacklistsTable).where(eq(blacklistsTable.id, id)).limit(1);
      const row = rows[0];
      if (!row) {
        const response: ApiResponse = { success: false, error: 'Blacklisted item not found' };
        return NextResponse.json(response, { status: 404 });
      }

      const q = parseMaybeJson(row.questionData);
      const values: typeof questionsTable.$inferInsert = {
        id: (q.id as string | undefined) || uuidv4(),
        ...(buildQuestionPayload(row.event, q) as any),
      } as any;

      let inserted = false;
      try {
        await db.insert(questionsTable).values(values);
        inserted = true;
      } catch {
        // If insert failed (likely due to existing id), perform update
        await db.update(questionsTable).set({
          question: values.question,
          tournament: values.tournament,
          division: values.division,
          event: values.event,
          options: values.options,
          answers: values.answers,
          subtopics: values.subtopics,
          difficulty: values.difficulty,
          updatedAt: new Date(),
        } as any).where(eq(questionsTable.id, values.id as string));
      }

      await db.delete(blacklistsTable).where(eq(blacklistsTable.id, id));

      const response: ApiResponse = { success: true, message: inserted ? 'Question restored and blacklist removed' : 'Question updated and blacklist removed' };
      return NextResponse.json(response);
    }

    if (action === 'applyRemoved') {
      if (!id) return NextResponse.json({ success: false, error: 'Missing id' } as ApiResponse, { status: 400 });
      const rows = await db.select().from(blacklistsTable).where(eq(blacklistsTable.id, id)).limit(1);
      const row = rows[0];
      if (!row) return NextResponse.json({ success: false, error: 'Blacklisted item not found' } as ApiResponse, { status: 404 });
      const q = parseMaybeJson(row.questionData);
      const candidateId = (q.id as string | undefined)
        || (await locateQuestionIdByContent(row.event, q))
        || null;
      if (!candidateId) {
        const response: ApiResponse = { success: false, error: 'Question not found in database to remove' };
        return NextResponse.json(response, { status: 404 });
      }
      await db.delete(questionsTable).where(eq(questionsTable.id, candidateId));
      const response: ApiResponse = { success: true, message: 'Question removed from database (kept in blacklist)' };
      return NextResponse.json(response);
    }

    if (action === 'deleteRemoved') {
      if (!id) return NextResponse.json({ success: false, error: 'Missing id' } as ApiResponse, { status: 400 });
      await db.delete(blacklistsTable).where(eq(blacklistsTable.id, id));
      const response: ApiResponse = { success: true, message: 'Blacklisted record deleted' };
      return NextResponse.json(response);
    }

    // Bulk actions
    if (action === 'applyAllEdits') {
      const edits = await db.select().from(editsTable).orderBy(desc(editsTable.updatedAt));
      let applied = 0, skipped = 0;
      for (const row of edits) {
        const event = row.event;
        const original = parseMaybeJson(row.originalQuestion);
        const edited = parseMaybeJson(row.editedQuestion);
        const targetId = (original.id as string | undefined)
          || (await locateQuestionIdByContent(event, original))
          || (edited.id as string | undefined)
          || (await locateQuestionIdByContent(event, edited))
          || null;
        if (!targetId) { skipped++; continue; }
        const payload = buildQuestionPayload(event, edited);
        await db.update(questionsTable).set({ ...(payload as any), updatedAt: new Date() }).where(eq(questionsTable.id, targetId));
        applied++;
      }
      const response: ApiResponse = { success: true, message: `Applied ${applied} edits, skipped ${skipped}` };
      return NextResponse.json(response);
    }

    if (action === 'undoAllEdits') {
      const edits = await db.select().from(editsTable).orderBy(desc(editsTable.updatedAt));
      let reverted = 0, skipped = 0;
      for (const row of edits) {
        const event = row.event;
        const original = parseMaybeJson(row.originalQuestion);
        const edited = parseMaybeJson(row.editedQuestion);
        const targetId = (original.id as string | undefined)
          || (await locateQuestionIdByContent(event, original))
          || (edited.id as string | undefined)
          || (await locateQuestionIdByContent(event, edited))
          || null;
        if (!targetId) { skipped++; continue; }
        const payload = buildQuestionPayload(event, original);
        await db.update(questionsTable).set({ ...(payload as any), updatedAt: new Date() }).where(eq(questionsTable.id, targetId));
        // Remove the edit record after reverting
        await db.delete(editsTable).where(eq(editsTable.id, row.id));
        reverted++;
      }
      const response: ApiResponse = { success: true, message: `Reverted ${reverted} edits, skipped ${skipped}` };
      return NextResponse.json(response);
    }

    if (action === 'applyAllRemoved') {
      const list = await db.select().from(blacklistsTable).orderBy(desc(blacklistsTable.createdAt));
      let removed = 0, skipped = 0;
      for (const row of list) {
        const q = parseMaybeJson(row.questionData);
        const candidateId = (q.id as string | undefined)
          || (await locateQuestionIdByContent(row.event, q))
          || null;
        if (!candidateId) { skipped++; continue; }
        await db.delete(questionsTable).where(eq(questionsTable.id, candidateId));
        removed++;
      }
      const response: ApiResponse = { success: true, message: `Removed ${removed} questions from DB, skipped ${skipped}` };
      return NextResponse.json(response);
    }

    if (action === 'restoreAllRemoved') {
      const list = await db.select().from(blacklistsTable).orderBy(desc(blacklistsTable.createdAt));
      let restored = 0, updated = 0, failed = 0;
      for (const row of list) {
        const q = parseMaybeJson(row.questionData);
        const values: typeof questionsTable.$inferInsert = {
          id: (q.id as string | undefined) || uuidv4(),
          ...(buildQuestionPayload(row.event, q) as any),
        } as any;
        try {
          await db.insert(questionsTable).values(values);
          restored++;
        } catch {
          try {
            await db.update(questionsTable).set({
              question: values.question,
              tournament: values.tournament,
              division: values.division,
              event: values.event,
              options: values.options,
              answers: values.answers,
              subtopics: values.subtopics,
              difficulty: values.difficulty,
              updatedAt: new Date(),
            } as any).where(eq(questionsTable.id, values.id as string));
            updated++;
          } catch {
            failed++;
          }
        }
        // Remove blacklist record after successful restore/update attempt
        await db.delete(blacklistsTable).where(eq(blacklistsTable.id, row.id));
      }
      const response: ApiResponse = { success: true, message: `Restored ${restored}, updated ${updated}, failed ${failed}` };
      return NextResponse.json(response);
    }

    const response: ApiResponse = { success: false, error: 'Unknown action' };
    return NextResponse.json(response, { status: 400 });
  } catch (error) {
    console.error('[ADMIN/POST] Error:', error);
    const response: ApiResponse = { success: false, error: 'Failed to perform admin action' };
    return NextResponse.json(response, { status: 500 });
  }
}


