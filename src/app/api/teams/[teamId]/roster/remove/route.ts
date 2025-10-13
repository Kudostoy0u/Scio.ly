import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { queryCockroachDB } from '@/lib/cockroachdb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const supa = await createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentName } = await request.json();
    
    if (!studentName) {
      return NextResponse.json({ error: 'Student name is required' }, { status: 400 });
    }

    const { teamId } = await params;

    // First, resolve the slug to team group
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;

    // Check if the requesting user is a captain of this team
    const captainCheck = await queryCockroachDB<{ role: string }>(
      `SELECT tm.role FROM new_team_memberships tm
       JOIN new_team_units tu ON tm.team_id = tu.id
       WHERE tm.user_id = $1 AND tu.group_id = $2 AND tm.status = 'active'`,
      [user.id, groupId]
    );

    if (captainCheck.rows.length === 0 || captainCheck.rows[0].role !== 'captain') {
      return NextResponse.json({ error: 'Only team captains can remove roster entries' }, { status: 403 });
    }

    // First, let's see what roster entries exist for this student
    const checkResult = await queryCockroachDB(
      `SELECT trd.team_unit_id, trd.event_name, trd.slot_index, trd.student_name, tu.description as subteam_name
       FROM new_team_roster_data trd
       JOIN new_team_units tu ON trd.team_unit_id = tu.id
       WHERE trd.student_name = $1 AND tu.group_id = $2`,
      [studentName, groupId]
    );
    
    console.log(`Found ${checkResult.rows.length} roster entries for "${studentName}":`, checkResult.rows);

    // Remove the student from all roster entries in this team group
    const deleteResult = await queryCockroachDB(
      `DELETE FROM new_team_roster_data 
       WHERE student_name = $1 AND team_unit_id IN (
         SELECT tu.id FROM new_team_units tu WHERE tu.group_id = $2
       )`,
      [studentName, groupId]
    );

    console.log(`Removed ${deleteResult.rowCount} roster entries for "${studentName}"`);

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ error: 'Student not found in roster' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${studentName} has been removed from the roster`,
      removedEntries: deleteResult.rowCount
    });

  } catch (error) {
    console.error('Error removing roster entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
