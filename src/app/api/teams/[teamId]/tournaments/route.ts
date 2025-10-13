import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';
import { checkTeamGroupAccessCockroach } from '@/lib/utils/team-auth';

// GET /api/teams/[teamId]/tournaments - Get upcoming tournaments for a subteam
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchTournaments, fetchStreamData)
// - src/app/hooks/useEnhancedTeamData.ts (fetchTournaments)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        error: 'Database configuration error',
        details: 'DATABASE_URL environment variable is missing'
      }, { status: 500 });
    }

    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await params;
    const { searchParams } = new URL(request.url);
    const subteamId = searchParams.get('subteamId');

    if (!subteamId) {
      return NextResponse.json({ error: 'Subteam ID is required' }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(subteamId)) {
      return NextResponse.json({ 
        error: 'Invalid subteam ID format. Must be a valid UUID.' 
      }, { status: 400 });
    }

    // First, resolve the slug to team group
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;

    // Check if user has access to this team group (membership OR roster entry)
    const authResult = await checkTeamGroupAccessCockroach(user.id, groupId);
    if (!authResult.isAuthorized) {
      return NextResponse.json({ error: 'Not authorized to access this team' }, { status: 403 });
    }

    // Get upcoming events for the team group with timer information
    const eventsResult = await queryCockroachDB<{
      id: string;
      title: string;
      start_time: string;
      location: string | null;
      event_type: string;
      has_timer: boolean;
    }>(
      `SELECT 
         te.id, 
         te.title, 
         te.start_time, 
         te.location, 
         te.event_type,
         CASE WHEN at.id IS NOT NULL THEN true ELSE false END as has_timer
       FROM new_team_events te
       LEFT JOIN new_team_active_timers at ON te.id = at.event_id AND at.team_unit_id = $2
       WHERE te.team_id IN (
         SELECT id FROM new_team_units WHERE group_id = $1
       )
         AND te.start_time > NOW()
       ORDER BY te.start_time ASC
       LIMIT 50`,
      [groupId, subteamId]
    );

    return NextResponse.json({ 
      events: eventsResult.rows 
    });

  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
