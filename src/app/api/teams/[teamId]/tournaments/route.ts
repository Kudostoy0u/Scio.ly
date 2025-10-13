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

    // Get recurring meetings for the team group
    const recurringMeetingsResult = await queryCockroachDB<{
      id: string;
      title: string;
      description: string | null;
      location: string | null;
      days_of_week: string;
      start_time: string | null;
      end_time: string | null;
      start_date: string | null;
      end_date: string | null;
      exceptions: string;
      team_id: string;
    }>(
      `SELECT 
         rm.id, 
         rm.title, 
         rm.description, 
         rm.location, 
         rm.days_of_week, 
         rm.start_time, 
         rm.end_time, 
         rm.start_date, 
         rm.end_date, 
         rm.exceptions,
         rm.team_id
       FROM new_team_recurring_meetings rm
       WHERE rm.team_id IN (
         SELECT id FROM new_team_units WHERE group_id = $1
       )
       ORDER BY rm.created_at DESC`,
      [groupId]
    );

    // Generate recurring events from recurring meetings
    const recurringEvents: Array<{
      id: string;
      title: string;
      start_time: string;
      location: string | null;
      event_type: string;
      has_timer: boolean;
    }> = [];

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 30); // Look ahead 30 days

    for (const meeting of recurringMeetingsResult.rows) {
      try {
        const daysOfWeek = JSON.parse(meeting.days_of_week || '[]');
        const exceptions = JSON.parse(meeting.exceptions || '[]');
        const startDate = meeting.start_date ? new Date(meeting.start_date) : now;
        const endDate = meeting.end_date ? new Date(meeting.end_date) : futureDate;

        // Generate events for the next 30 days
        for (let date = new Date(Math.max(now.getTime(), startDate.getTime())); 
             date <= futureDate && date <= endDate; 
             date.setDate(date.getDate() + 1)) {
          
          const dayOfWeek = date.getDay();
          const dateStr = date.toISOString().split('T')[0];
          
          // Check if this day matches the recurring pattern
          if (daysOfWeek.includes(dayOfWeek) && !exceptions.includes(dateStr)) {
            const startTime = meeting.start_time ? 
              `${dateStr}T${meeting.start_time}` : 
              `${dateStr}T00:00:00`;
            
            const eventId = `recurring-${meeting.id}-${dateStr}`;
            
            // Check if this recurring event already has a timer
            const hasTimerResult = await queryCockroachDB<{ id: string }>(
              `SELECT id FROM new_team_active_timers 
               WHERE event_id = $1 AND team_unit_id = $2`,
              [eventId, subteamId]
            );
            
            recurringEvents.push({
              id: eventId,
              title: meeting.title,
              start_time: startTime,
              location: meeting.location,
              event_type: 'meeting',
              has_timer: hasTimerResult.rows.length > 0
            });
          }
        }
      } catch (error) {
        console.error('Error processing recurring meeting:', meeting.id, error);
        // Continue with other meetings even if one fails
      }
    }

    // Combine regular events and recurring events
    const allEvents = [...eventsResult.rows, ...recurringEvents];
    
    // Sort by start time and limit to 50 total events
    allEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const limitedEvents = allEvents.slice(0, 50);

    return NextResponse.json({ 
      events: limitedEvents 
    });

  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
