import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';
import { resolveTeamSlugToUnits, getUserTeamMemberships } from '@/lib/utils/team-resolver';

// GET /api/teams/[teamId]/timers - Get active timers for a team
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
      return NextResponse.json({ 
        error: 'Subteam ID is required' 
      }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(subteamId)) {
      return NextResponse.json({ 
        error: 'Invalid subteam ID format. Must be a valid UUID.' 
      }, { status: 400 });
    }

    // Resolve team slug to get team info
    const teamInfo = await resolveTeamSlugToUnits(teamId);
    if (!teamInfo) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if the user is a member of the team
    const userMemberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);
    const isMemberOfTeam = userMemberships.some(membership => membership.team_id === subteamId);

    if (!isMemberOfTeam) {
      return NextResponse.json({ error: 'Not authorized to view this team' }, { status: 403 });
    }

    // Get active timers with event details
    const timersResult = await queryCockroachDB<{
      id: string;
      title: string;
      start_time: string;
      location: string | null;
      event_type: string;
      added_at: string;
    }>(
      `SELECT 
         at.event_id as id,
         te.title,
         te.start_time,
         te.location,
         te.event_type,
         at.added_at
       FROM new_team_active_timers at
       JOIN new_team_events te ON at.event_id = te.id
       WHERE at.team_unit_id = $1
       ORDER BY at.added_at ASC`,
      [subteamId]
    );

    return NextResponse.json({ 
      timers: timersResult.rows 
    });

  } catch (error) {
    console.error('Error fetching active timers:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/teams/[teamId]/timers - Add a timer for an event
export async function POST(
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
    const body = await request.json();
    const { subteamId, eventId } = body;

    if (!subteamId || !eventId) {
      return NextResponse.json({ 
        error: 'Subteam ID and event ID are required' 
      }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(subteamId) || !uuidRegex.test(eventId)) {
      return NextResponse.json({ 
        error: 'Invalid ID format. Must be a valid UUID.' 
      }, { status: 400 });
    }

    // Resolve team slug to get team info
    const teamInfo = await resolveTeamSlugToUnits(teamId);
    if (!teamInfo) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if the user is a captain/co-captain of the team
    const userMemberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);
    const membership = userMemberships.find(m => m.team_id === subteamId);
    
    if (!membership || !['captain', 'co-captain'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only captains and co-captains can manage timers' }, { status: 403 });
    }

    // Verify the event belongs to the team
    const eventResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_events 
       WHERE id = $1 AND team_id IN (
         SELECT id FROM new_team_units WHERE group_id = (
           SELECT group_id FROM new_team_units WHERE id = $2
         )
       )`,
      [eventId, subteamId]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found or not accessible to this team' }, { status: 404 });
    }

    // Add the timer (using ON CONFLICT to handle duplicates gracefully)
    const timerResult = await queryCockroachDB<{ id: string }>(
      `INSERT INTO new_team_active_timers (team_unit_id, event_id, added_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_unit_id, event_id) DO NOTHING
       RETURNING id`,
      [subteamId, eventId, user.id]
    );

    if (timerResult.rows.length === 0) {
      return NextResponse.json({ 
        message: 'Timer already exists for this event',
        timerId: null
      });
    }

    return NextResponse.json({ 
      message: 'Timer added successfully',
      timerId: timerResult.rows[0].id
    });

  } catch (error) {
    console.error('Error adding timer:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/teams/[teamId]/timers - Remove a timer for an event
export async function DELETE(
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
    const body = await request.json();
    const { subteamId, eventId } = body;

    if (!subteamId || !eventId) {
      return NextResponse.json({ 
        error: 'Subteam ID and event ID are required' 
      }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(subteamId) || !uuidRegex.test(eventId)) {
      return NextResponse.json({ 
        error: 'Invalid ID format. Must be a valid UUID.' 
      }, { status: 400 });
    }

    // Resolve team slug to get team info
    const teamInfo = await resolveTeamSlugToUnits(teamId);
    if (!teamInfo) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if the user is a captain/co-captain of the team
    const userMemberships = await getUserTeamMemberships(user.id, teamInfo.teamUnitIds);
    const membership = userMemberships.find(m => m.team_id === subteamId);
    
    if (!membership || !['captain', 'co-captain'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only captains and co-captains can manage timers' }, { status: 403 });
    }

    // Remove the timer
    const deleteResult = await queryCockroachDB<{ id: string }>(
      `DELETE FROM new_team_active_timers 
       WHERE team_unit_id = $1 AND event_id = $2
       RETURNING id`,
      [subteamId, eventId]
    );

    if (deleteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Timer not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Timer removed successfully'
    });

  } catch (error) {
    console.error('Error removing timer:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
