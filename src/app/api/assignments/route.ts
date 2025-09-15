import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { createAssignment, listRecentAssignments, listRecentResults, getAssignmentById, deleteAssignmentResult, deleteAssignment } from '@/lib/db/teamExtras';

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { school, division, teamId, eventName, assignees, params, questions } = body || {};
    if (!school || !division || !teamId || !eventName || !Array.isArray(assignees) || !params || !questions) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }
    const saved = await createAssignment({ school, division, teamId, eventName, assignees, params, questions, createdBy: user.id });
    return NextResponse.json({ success: true, data: saved });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');
    if (idStr) {
      try {
        const row = await getAssignmentById(idStr);
        return NextResponse.json({ success: true, data: row, debug: { id: idStr } });
      } catch (e) {
        return NextResponse.json({ success: false, error: 'Lookup failed', debug: { id: idStr } }, { status: 500 });
      }
    }
    const school = searchParams.get('school');
    const division = searchParams.get('division') as 'B'|'C' | null;
    const mode = searchParams.get('mode') || 'assignments';
    if (!school || !division) return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    if (mode === 'results') {
      const rows = await listRecentResults(school, division as 'B'|'C');
      return NextResponse.json({ success: true, data: rows });
    }
    const rows = await listRecentAssignments(school, division as 'B'|'C');
    return NextResponse.json({ success: true, data: rows });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'result';
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    if (mode === 'assignment') {
      await deleteAssignment(id);
    } else {
      await deleteAssignmentResult(id);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


