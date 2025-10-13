import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

// GET /api/teams/[teamId]/roster - Get roster data for a subteam
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

    // Check if user is a member of this team group
    const membershipResult = await queryCockroachDB<{ role: string }>(
      `SELECT tm.role 
       FROM new_team_memberships tm
       JOIN new_team_units tu ON tm.team_id = tu.id
       WHERE tm.user_id = $1 AND tu.group_id = $2 AND tm.status = 'active'`,
      [user.id, groupId]
    );

    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // Get roster data for the specific subteam
    const rosterResult = await queryCockroachDB<{
      event_name: string;
      slot_index: number;
      student_name: string;
      user_id: string;
    }>(
      `SELECT event_name, slot_index, student_name, user_id 
       FROM new_team_roster_data 
       WHERE team_unit_id = $1 
       ORDER BY event_name, slot_index`,
      [subteamId]
    );

    // Get removed events for the specific subteam
    const removedEventsResult = await queryCockroachDB<{
      event_name: string;
      conflict_block: string;
      removed_at: string;
    }>(
      `SELECT event_name, conflict_block, removed_at 
       FROM new_team_removed_events 
       WHERE team_unit_id = $1 
       ORDER BY removed_at DESC`,
      [subteamId]
    );

    // Convert to roster format
    const roster: Record<string, string[]> = {};
    rosterResult.rows.forEach(row => {
      if (!roster[row.event_name]) {
        roster[row.event_name] = [];
      }
      roster[row.event_name][row.slot_index] = row.student_name || '';
    });

    // Convert removed events to array of event names
    const removedEvents = removedEventsResult.rows.map(row => row.event_name);

    return NextResponse.json({ 
      roster,
      removedEvents 
    });

  } catch (error) {
    console.error('Error fetching roster data:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/teams/[teamId]/roster - Save roster data for a subteam
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
    const { subteamId, eventName, slotIndex, studentName } = body;

    if (!subteamId || !eventName || slotIndex === undefined) {
      return NextResponse.json({ 
        error: 'Subteam ID, event name, and slot index are required' 
      }, { status: 400 });
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

    // Check if user is a member of this team group
    const membershipResult = await queryCockroachDB<{ role: string }>(
      `SELECT tm.role 
       FROM new_team_memberships tm
       JOIN new_team_units tu ON tm.team_id = tu.id
       WHERE tm.user_id = $1 AND tu.group_id = $2 AND tm.status = 'active'`,
      [user.id, groupId]
    );

    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a team member' }, { status: 403 });
    }

    // Check if the subteam belongs to this group
    const subteamResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_units 
       WHERE id = $1 AND group_id = $2 AND status = 'active'`,
      [subteamId, groupId]
    );

    if (subteamResult.rows.length === 0) {
      return NextResponse.json({ error: 'Subteam not found' }, { status: 404 });
    }

    // Try to find a matching team member for auto-linking
    let userIdToLink: string | null = null;
    if (studentName && studentName.trim()) {
      // Get all team members for this group to check for name matches
      const teamMembersResult = await queryCockroachDB<{
        user_id: string;
        display_name: string;
        first_name: string;
        last_name: string;
      }>(
        `SELECT u.id as user_id, u.display_name, u.first_name, u.last_name
         FROM users u
         JOIN new_team_memberships tm ON u.id = tm.user_id
         JOIN new_team_units tu ON tm.team_id = tu.id
         WHERE tu.group_id = $1 AND tm.status = 'active' AND tu.status = 'active'`,
        [groupId]
      );

      // Try to find a matching team member
      const studentNameLower = studentName.toLowerCase().trim();
      for (const member of teamMembersResult.rows) {
        const displayName = member.display_name || 
          (member.first_name && member.last_name 
            ? `${member.first_name} ${member.last_name}` 
            : '');
        
        if (displayName) {
          const memberNameLower = displayName.toLowerCase().trim();
          
          // Exact case-insensitive match only
          if (memberNameLower === studentNameLower) {
            userIdToLink = member.user_id;
            break;
          }
        }
      }
    }

    // Upsert roster data with user_id if we found a match
    await queryCockroachDB(
      `INSERT INTO new_team_roster_data (team_unit_id, event_name, slot_index, student_name, user_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (team_unit_id, event_name, slot_index)
       DO UPDATE SET student_name = $4, user_id = $5, updated_at = NOW()`,
      [subteamId, eventName, slotIndex, studentName || null, userIdToLink]
    );

    return NextResponse.json({ message: 'Roster data saved successfully' });

  } catch (error) {
    console.error('Error saving roster data:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
