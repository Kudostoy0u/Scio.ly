import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabaseServer';
import { queryCockroachDB } from '@/lib/cockroachdb';

// Utility function to safely parse JSON with fallback
function safeJsonParse(jsonString: string | null | any, fallback: any = []): any {
  if (!jsonString) return fallback;
  
  // If it's already an array or object, return it as-is
  if (Array.isArray(jsonString) || (typeof jsonString === 'object' && jsonString !== null)) {
    return jsonString;
  }
  
  // Handle empty array string case
  if (jsonString === '[]') return [];
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error, 'Input:', jsonString);
    return fallback;
  }
}

// Utility function to get the first occurrence of a day of week
function getFirstOccurrenceOfDay(startDate: Date, targetDayOfWeek: number): Date {
  const startOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const currentDayOfWeek = startOfDay.getDay();
  
  // Calculate days until target day
  let daysToAdd = (targetDayOfWeek - currentDayOfWeek + 7) % 7;
  
  // If we're already on the target day, move to next week
  if (daysToAdd === 0) {
    daysToAdd = 7;
  }
  
  // Return the first occurrence date
  return new Date(startOfDay.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
}

// Utility function to create event times
function createEventTimes(eventDate: Date, startTime?: string, endTime?: string) {
  if (!startTime || !endTime) {
    // All-day event
    const startOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 23, 59, 59, 999);
    return {
      start_time: startOfDay.toISOString(),
      end_time: endOfDay.toISOString(),
      is_all_day: true
    };
  } else {
    // Timed event
    const startDateTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 
      parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]), 0, 0);
    const endDateTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 
      parseInt(endTime.split(':')[0]), parseInt(endTime.split(':')[1]), 0, 0);
    return {
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      is_all_day: false
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const {
      team_slug,
      title,
      description,
      location,
      days_of_week,
      start_time,
      end_time,
      start_date,
      end_date,
      exceptions,
      created_by,
      meeting_type = 'personal',
      selected_team_id
    } = body;

    if (!team_slug || !title || !days_of_week || days_of_week.length === 0 || !start_date || !end_date) {
      return NextResponse.json({ 
        error: 'Team slug, title, days of week, start date, and end date are required' 
      }, { status: 400 });
    }

    // Determine which team to use based on meeting type
    let targetTeamSlug = team_slug;
    if (meeting_type === 'team' && selected_team_id) {
      if (selected_team_id.startsWith('all-')) {
        // "All Subteams" option - use the school name to get the team group slug
        const schoolName = selected_team_id.replace('all-', '');
        const teamGroupResult = await queryCockroachDB<{ slug: string }>(
          `SELECT slug FROM new_team_groups WHERE school = $1`,
          [schoolName]
        );
        
        if (teamGroupResult.rows.length > 0) {
          targetTeamSlug = teamGroupResult.rows[0].slug;
        }
      } else {
        // Specific team - get the team slug for the selected team
        const selectedTeamResult = await queryCockroachDB<{ slug: string }>(
          `SELECT tg.slug FROM new_team_groups tg 
           JOIN new_team_units tu ON tg.id = tu.group_id 
           WHERE tu.id = $1`,
          [selected_team_id]
        );
        
        if (selectedTeamResult.rows.length > 0) {
          targetTeamSlug = selectedTeamResult.rows[0].slug;
        }
      }
    }

    // First, resolve the team slug to get the team group and units
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [targetTeamSlug]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;

    // Get team units for this group
    const unitsResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_units WHERE group_id = $1`,
      [groupId]
    );

    if (unitsResult.rows.length === 0) {
      return NextResponse.json({ error: 'No team units found for this group' }, { status: 404 });
    }

    // Check if user is a member of any team unit in this group
    const teamUnitIds = unitsResult.rows.map(row => row.id);
    const placeholders = teamUnitIds.map((_, index) => `$${index + 2}`).join(',');
    
    const membershipResult = await queryCockroachDB<{ role: string; team_id: string }>(
      `SELECT role, team_id FROM new_team_memberships 
       WHERE user_id = $1 AND team_id IN (${placeholders}) AND status = 'active'`,
      [user.id, ...teamUnitIds]
    );

    // For "All Subteams", we need to check if the user is a member of any team in this school
    // For personal meetings, we don't need to be a member of this specific team group
    if (membershipResult.rows.length === 0 && meeting_type !== 'personal') {
      if (meeting_type === 'team' && selected_team_id && selected_team_id.startsWith('all-')) {
        // For "All Subteams", check if user is a member of any team in this school
        const schoolName = selected_team_id.replace('all-', '');
        const schoolMembershipResult = await queryCockroachDB<{ role: string; team_id: string }>(
          `SELECT tm.role, tm.team_id FROM new_team_memberships tm
           JOIN new_team_units tu ON tm.team_id = tu.id
           JOIN new_team_groups tg ON tu.group_id = tg.id
           WHERE tm.user_id = $1 AND tg.school = $2 AND tm.status = 'active'`,
          [user.id, schoolName]
        );
        
        if (schoolMembershipResult.rows.length === 0) {
          return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
        }
        
        // Add the school membership results to the main membership result
        membershipResult.rows.push(...schoolMembershipResult.rows);
      } else {
        return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
      }
    }

    // Check if user is a captain (for team-wide meetings) or just a member (for personal meetings)
    const isCaptain = membershipResult.rows.some(m => ['captain', 'co_captain'].includes(m.role));
    const isMember = membershipResult.rows.some(m => ['member', 'captain', 'co_captain'].includes(m.role));
    
    // For team meetings, user must be a member. For personal meetings, this check is not required.
    if (!isMember && meeting_type === 'team') {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // Determine which team units to create recurring meetings for
    let targetTeamIds: string[] = [];
    
    if (meeting_type === 'personal') {
      // Personal meeting - use the first team unit from the group, or any team unit if user is not a member
      if (membershipResult.rows.length > 0) {
        targetTeamIds = [membershipResult.rows[0].team_id];
      } else {
        // User is not a member of this team group, use the first team unit for personal meeting
        targetTeamIds = [unitsResult.rows[0].id];
      }
    } else if (meeting_type === 'team' && selected_team_id) {
      if (selected_team_id.startsWith('all-')) {
        // "All Subteams" - create for all team units the user is a member of in this school
        targetTeamIds = membershipResult.rows.map(m => m.team_id);
      } else {
        // Specific team - find the team unit that matches the selected team
        const selectedTeamUnit = membershipResult.rows.find(m => m.team_id === selected_team_id);
        if (selectedTeamUnit) {
          targetTeamIds = [selectedTeamUnit.team_id];
        }
      }
    }

    // Create recurring meetings for all target teams
    const results: Array<{ rows: Array<{ id: string }>; rowCount: number }> = [];
    for (const teamId of targetTeamIds) {
      const result = await queryCockroachDB<{ id: string }>(
        `INSERT INTO new_team_recurring_meetings (
          team_id, created_by, title, description, location, 
          days_of_week, start_time, end_time, start_date, end_date, exceptions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          teamId,
          created_by || user.id,
          title,
          description || null,
          location || null,
          JSON.stringify(days_of_week),
          start_time || null,
          end_time || null,
          start_date,
          end_date || null,
          JSON.stringify(exceptions || [])
        ]
      );
      results.push(result);
    }

    const meetingIds = results.map(r => r.rows[0]?.id).filter(Boolean);

    // Create individual events based on meeting type
    if (meetingIds.length > 0) {
      if (meeting_type === 'team' && isCaptain) {
        // Team meeting: create events for all team members
      try {
        // Get all team members for the target teams
        const teamMembersResult = await queryCockroachDB<{
          user_id: string;
          role: string;
          team_id: string;
        }>(
          `SELECT tm.user_id, tm.role, tm.team_id
           FROM new_team_memberships tm
           WHERE tm.team_id = ANY($1) AND tm.status = 'active'
           ORDER BY tm.joined_at ASC`,
          [targetTeamIds]
        );

        // Create individual calendar events for each team member and each selected day
        for (const dayOfWeek of days_of_week) {
          for (const member of teamMembersResult.rows) {
            // Calculate the first occurrence date for this day of week
            const startDate = new Date(start_date);
            const firstOccurrence = getFirstOccurrenceOfDay(startDate, dayOfWeek);
            

            // Generate events for this day of week from start_date to end_date
            const endDate = end_date ? new Date(end_date) : new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000)); // Default to 1 year if no end date
            const currentEventDate = new Date(firstOccurrence);
            
            while (currentEventDate <= endDate) {
              // Skip if this date is in exceptions
              const dateStr = currentEventDate.toISOString().split('T')[0];
              if (exceptions && exceptions.includes(dateStr)) {
                currentEventDate.setDate(currentEventDate.getDate() + 7);
                continue;
              }

              // Create the event for this specific date
              const eventTimes = createEventTimes(currentEventDate, start_time, end_time);
              const eventResult = await queryCockroachDB<{ id: string }>(
                `INSERT INTO new_team_events (
                  team_id, created_by, title, description, event_type,
                  start_time, end_time, location, is_all_day, is_recurring, recurrence_pattern
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id`,
                [
                  member.team_id,
                  created_by || user.id,
                  title,
                  description || null,
                  'meeting',
                  eventTimes.start_time,
                  eventTimes.end_time,
                  location || null,
                  eventTimes.is_all_day,
                  false, // Individual events, not recurring
                  null
                ]
              );

              const eventId = eventResult.rows[0]?.id;

              // Add the team member as an attendee
              if (eventId) {
                await queryCockroachDB(
                  `INSERT INTO new_team_event_attendees (event_id, user_id, status)
                   VALUES ($1, $2, 'pending')`,
                  [eventId, member.user_id]
                );
              }

              // Move to next week
              currentEventDate.setDate(currentEventDate.getDate() + 7);
            }
          }
        }
      } catch (error) {
        console.error('Error creating individual events for team members:', error);
        // Don't fail the entire operation if individual event creation fails
      }
      } else {
        // Personal meeting: create events for the user only
        try {
          // Generate events for each selected day of the week
          for (const dayOfWeek of days_of_week) {
            // Calculate the first occurrence date for this day of week
            const startDate = new Date(start_date);
            const firstOccurrence = getFirstOccurrenceOfDay(startDate, dayOfWeek);
            

            // Generate events for this day of week from start_date to end_date
            const endDate = end_date ? new Date(end_date) : new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000)); // Default to 1 year if no end date
            const currentEventDate = new Date(firstOccurrence);
            
            while (currentEventDate <= endDate) {
              // Skip if this date is in exceptions
              const dateStr = currentEventDate.toISOString().split('T')[0];
              if (exceptions && exceptions.includes(dateStr)) {
                currentEventDate.setDate(currentEventDate.getDate() + 7);
                continue;
              }

              // Create the event for this specific date
              const eventTimes = createEventTimes(currentEventDate, start_time, end_time);
              const eventResult = await queryCockroachDB<{ id: string }>(
                `INSERT INTO new_team_events (
                  team_id, created_by, title, description, event_type,
                  start_time, end_time, location, is_all_day, is_recurring, recurrence_pattern
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id`,
                [
                  targetTeamIds[0], // Use first team ID for personal meetings
                  created_by || user.id,
                  title,
                  description || null,
                  'meeting',
                  eventTimes.start_time,
                  eventTimes.end_time,
                  location || null,
                  eventTimes.is_all_day,
                  false, // Individual events, not recurring
                  null
                ]
              );

              const eventId = eventResult.rows[0]?.id;

              // Add the user as an attendee
              if (eventId) {
                await queryCockroachDB(
                  `INSERT INTO new_team_event_attendees (event_id, user_id, status)
                   VALUES ($1, $2, 'attending')`,
                  [eventId, user.id]
                );
              }

              // Move to next week
              currentEventDate.setDate(currentEventDate.getDate() + 7);
            }
          }
        } catch (error) {
          console.error('Error creating personal events:', error);
          // Don't fail the entire operation if personal event creation fails
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      meetingIds: meetingIds,
      count: meetingIds.length
    });

  } catch (error) {
    console.error('Error creating recurring meeting:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ambiguous')) {
        return NextResponse.json({ error: 'Database query error - ambiguous column reference' }, { status: 500 });
      }
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json({ error: 'Database table not found' }, { status: 500 });
      }
      if (error.message.includes('duplicate key')) {
        return NextResponse.json({ error: 'A recurring meeting with this name already exists' }, { status: 409 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to create recurring meeting' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamSlug = searchParams.get('teamSlug');

    if (!teamSlug) {
      return NextResponse.json({ error: 'Team slug is required' }, { status: 400 });
    }

    // First, resolve the team slug to get the team group and units
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamSlug]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;

    // Get team units for this group
    const unitsResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_units WHERE group_id = $1`,
      [groupId]
    );

    if (unitsResult.rows.length === 0) {
      return NextResponse.json({ error: 'No team units found for this group' }, { status: 404 });
    }

    // Check if user is a member of any team unit in this group
    const teamUnitIds = unitsResult.rows.map(row => row.id);
    const placeholders = teamUnitIds.map((_, index) => `$${index + 2}`).join(',');
    
    const membershipResult = await queryCockroachDB<{ role: string }>(
      `SELECT role FROM new_team_memberships 
       WHERE user_id = $1 AND team_id IN (${placeholders}) AND status = 'active'`,
      [user.id, ...teamUnitIds]
    );

    if (membershipResult.rows.length === 0) {
      console.error('User not found in team memberships:', {
        userId: user.id,
        teamSlug,
        teamUnitIds,
        groupId
      });
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
    }

    // Get recurring meetings for all team units in this group
    const result = await queryCockroachDB(
      `SELECT 
        rm.id, rm.team_id, rm.created_by, rm.title, rm.description, rm.location,
        rm.days_of_week, rm.start_time, rm.end_time, rm.start_date, rm.end_date, rm.exceptions, rm.created_at,
        u.email as creator_email,
        COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name), u.email) as creator_name
      FROM new_team_recurring_meetings rm
      LEFT JOIN public.users u ON rm.created_by = u.id
      WHERE rm.team_id = ANY($1::uuid[])
      ORDER BY rm.created_at DESC`,
      [teamUnitIds]
    );

    // Parse JSON fields safely with utility function
    const meetings = result.rows.map(meeting => ({
      ...meeting,
      days_of_week: safeJsonParse(meeting.days_of_week, []),
      exceptions: safeJsonParse(meeting.exceptions, [])
    }));

    return NextResponse.json({ 
      success: true, 
      meetings 
    });

  } catch (error) {
    console.error('Error fetching recurring meetings:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('ambiguous')) {
        return NextResponse.json({ error: 'Database query error - ambiguous column reference' }, { status: 500 });
      }
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return NextResponse.json({ error: 'Database table not found' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to fetch recurring meetings' }, { status: 500 });
  }
}
