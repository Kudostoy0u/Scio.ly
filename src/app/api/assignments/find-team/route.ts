import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { dbPg } from '@/lib/db';
import { newTeamAssignments, newTeamUnits, newTeamGroups } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    // Find the assignment and get the team group slug
    // newTeamAssignments.teamId -> newTeamUnits.id -> newTeamGroups.id
    const result = await dbPg
      .select({
        teamId: newTeamAssignments.teamId,
        groupSlug: newTeamGroups.slug
      })
      .from(newTeamAssignments)
      .innerJoin(newTeamUnits, eq(newTeamAssignments.teamId, newTeamUnits.id))
      .innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
      .where(eq(newTeamAssignments.id, assignmentId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const { groupSlug } = result[0];

    return NextResponse.json({ teamId: groupSlug });

  } catch (error) {
    console.error('Error finding team for assignment:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
