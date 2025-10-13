import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { resolveTeamSlugToUnits } from '@/lib/utils/team-resolver';

// POST /api/teams/calendar/events - Create team event
// Frontend Usage:
// - src/app/teams/components/TeamCalendar.tsx (createEvent)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      start_time,
      end_time,
      location,
      event_type,
      is_all_day,
      is_recurring,
      recurrence_pattern,
      team_id,
      created_by
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Resolve team_id if it's a slug
    let resolvedTeamId = team_id;
    
    // Handle personal events (team_id is "personal" or null)
    if (!team_id || team_id === 'personal') {
      resolvedTeamId = null;
    } else if (!team_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      try {
        const teamInfo = await resolveTeamSlugToUnits(team_id);
        if (teamInfo.teamUnitIds.length > 0) {
          // Use the first team unit ID for the event
          resolvedTeamId = teamInfo.teamUnitIds[0];
        } else {
          return NextResponse.json({ error: 'No team units found' }, { status: 404 });
        }
      } catch (error) {
        console.error('Error resolving team slug:', error);
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
    }

    // Insert the event
    const result = await queryCockroachDB<{ id: string }>(
      `INSERT INTO new_team_events (
        team_id, created_by, title, description, event_type, 
        start_time, end_time, location, is_all_day, is_recurring, recurrence_pattern
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        resolvedTeamId, // This can now be null for personal events
        created_by || user.id,
        title,
        description || null,
        event_type || 'practice',
        start_time || null,
        end_time || null,
        location || null,
        is_all_day || false,
        is_recurring || false,
        recurrence_pattern ? JSON.stringify(recurrence_pattern) : null
      ]
    );

    return NextResponse.json({ 
      success: true, 
      eventId: result.rows[0]?.id 
    });

  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(_request.url);
    const teamId = searchParams.get('teamId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = `
      SELECT 
        e.id, e.title, e.description, e.start_time, e.end_time, 
        e.location, e.event_type, e.is_all_day, e.is_recurring, 
        e.recurrence_pattern, e.created_by, e.team_id,
        u.email as creator_email,
        COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name), u.email) as creator_name
      FROM new_team_events e
      LEFT JOIN public.users u ON e.created_by = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;

    if (teamId) {
      // Resolve team slug to team unit IDs
      try {
        const teamInfo = await resolveTeamSlugToUnits(teamId);
        if (teamInfo.teamUnitIds.length > 0) {
          const placeholders = teamInfo.teamUnitIds.map((_, index) => `$${paramCount + index}`).join(',');
          query += ` AND e.team_id IN (${placeholders})`;
          params.push(...teamInfo.teamUnitIds);
          paramCount += teamInfo.teamUnitIds.length;
        } else {
          // No team units found, return empty result
          return NextResponse.json({ 
            success: true, 
            events: [] 
          });
        }
      } catch (error) {
        console.error('Error resolving team slug:', error);
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
    }

    if (userId) {
      query += ` AND e.created_by = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    if (startDate) {
      query += ` AND e.start_time >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND e.start_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ` ORDER BY e.start_time ASC`;

    const result = await queryCockroachDB(query, params);

    // Get attendees for each event
    const eventsWithAttendees = await Promise.all(
      result.rows.map(async (event) => {
        const attendeesResult = await queryCockroachDB(
          `SELECT 
            ea.user_id, ea.status, ea.responded_at, ea.notes,
            u.email, COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name), u.email) as name
           FROM new_team_event_attendees ea
           LEFT JOIN public.users u ON ea.user_id = u.id
           WHERE ea.event_id = $1`,
          [event.id]
        );

        return {
          ...event,
          attendees: attendeesResult.rows
        };
      })
    );

    return NextResponse.json({ 
      success: true, 
      events: eventsWithAttendees 
    });

  } catch (error) {
    console.error('Error fetching calendar events:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ambiguous')) {
        return NextResponse.json({ error: 'Database query error - ambiguous column reference' }, { status: 500 });
      }
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json({ error: 'Database table not found' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
