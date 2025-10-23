import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';
import { checkTeamGroupAccessCockroach } from '@/lib/utils/team-auth';
import { z } from 'zod';
import { dbPg } from '@/lib/db';
import { newTeamRosterData, users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// Zod schemas for comprehensive validation
const RosterDataSchema = z.object({
  event_name: z.string(),
  slot_index: z.number(),
  student_name: z.string(),
  user_id: z.string().nullable()
});

const RosterResponseSchema = z.object({
  roster: z.record(z.string(), z.array(z.string())),
  removedEvents: z.array(z.string())
});

// GET /api/teams/[teamId]/roster - Get roster data for a subteam
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchRoster)
// - src/app/teams/components/assignment/assignmentUtils.ts (getTeamMembersAndRoster)
// - src/app/hooks/useEnhancedTeamData.ts (fetchRoster)
// - src/app/hooks/useTeamData.ts (fetchRoster)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  // const startTime = Date.now();
  console.log('📋 [ROSTER API] GET request started', { 
    timestamp: new Date().toISOString(),
    url: request.url 
  });

  try {
    if (!process.env.DATABASE_URL) {
      console.log('❌ [ROSTER API] Database configuration missing');
      return NextResponse.json({
        error: 'Database configuration error',
        details: 'DATABASE_URL environment variable is missing'
      }, { status: 500 });
    }

    const user = await getServerUser();
    if (!user?.id) {
      console.log('❌ [ROSTER API] Unauthorized - no user ID');
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

    // Get roster data for the specific subteam with proper name resolution using Drizzle ORM
    console.log('🔍 [ROSTER API] Fetching roster data for subteam using Drizzle ORM:', subteamId);
    
    const rosterResult = await dbPg
      .select({
        event_name: newTeamRosterData.eventName,
        slot_index: newTeamRosterData.slotIndex,
        student_name: sql<string>`COALESCE(${newTeamRosterData.studentName}, ${users.displayName}, ${users.firstName} || ' ' || ${users.lastName})`,
        user_id: newTeamRosterData.userId
      })
      .from(newTeamRosterData)
      .leftJoin(users, eq(newTeamRosterData.userId, users.id))
      .where(eq(newTeamRosterData.teamUnitId, subteamId))
      .orderBy(newTeamRosterData.eventName, newTeamRosterData.slotIndex);

    console.log('📊 [ROSTER API] Raw roster data from Drizzle:', {
      subteamId,
      rowCount: rosterResult.length,
      rows: rosterResult
    });

    // Validate roster data with Zod
    console.log('🔍 [ROSTER API] Validating roster data...');
    const validatedRosterData = rosterResult.map((row, index) => {
      try {
        const validated = RosterDataSchema.parse(row);
        console.log(`✅ [ROSTER API] Row ${index} validation passed:`, validated);
        return validated;
      } catch (error) {
        console.error(`❌ [ROSTER API] Row ${index} validation failed:`, {
          row,
          error: error instanceof z.ZodError ? error.issues : error
        });
        throw new Error(`Invalid roster data at row ${index}: ${error}`);
      }
    });

    // Get removed events for the specific subteam (using raw SQL for now)
    console.log('🔍 [ROSTER API] Fetching removed events...');
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

    // Convert to roster format using validated data
    const roster: Record<string, string[]> = {};
    console.log('🔄 [ROSTER API] Converting validated roster data...');
    
    validatedRosterData.forEach((row, index) => {
      console.log(`📝 [ROSTER API] Processing validated row ${index}:`, {
        event_name: row.event_name,
        slot_index: row.slot_index,
        student_name: row.student_name,
        user_id: row.user_id
      });
      
      // Convert "and" to "&" in event names to match frontend expectations
      const normalizedEventName = row.event_name.replace(/\band\b/g, '&');
      console.log(`🔄 [ROSTER API] Normalizing event name: "${row.event_name}" → "${normalizedEventName}"`);
      
      if (!roster[normalizedEventName]) {
        roster[normalizedEventName] = [];
      }
      roster[normalizedEventName][row.slot_index] = row.student_name || '';
    });

    console.log('✅ [ROSTER API] Final roster object:', roster);

    // Convert removed events to array of event names
    console.log('📊 [ROSTER API] Removed events:', removedEventsResult.rows);
    const removedEvents = removedEventsResult.rows.map(row => row.event_name);

    // Validate final response
    console.log('🔍 [ROSTER API] Validating final response...');
    const responseData = { roster, removedEvents };
    
    try {
      const validatedResponse = RosterResponseSchema.parse(responseData);
      console.log('✅ [ROSTER API] Response validation passed:', validatedResponse);
      
      return NextResponse.json(validatedResponse);
    } catch (error) {
      console.error('❌ [ROSTER API] Response validation failed:', {
        responseData,
        error: error instanceof z.ZodError ? error.issues : error
      });
      throw new Error(`Invalid response data: ${error}`);
    }

  } catch (error) {
    console.error('Error fetching roster data:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/teams/[teamId]/roster - Save roster data for a subteam
// Frontend Usage:
// - src/app/teams/components/RosterTab.tsx (saveRoster)
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
    const { subteamId, eventName, slotIndex, studentName, userId } = body;

    if (!subteamId || !eventName || slotIndex === undefined) {
      return NextResponse.json({ 
        error: 'Subteam ID, event name, and slot index are required' 
      }, { status: 400 });
    }

    // Convert "&" back to "and" in event names for database storage
    const normalizedEventName = eventName.replace(/&/g, 'and');
    console.log(`🔄 [ROSTER API] Normalizing event name for storage: "${eventName}" → "${normalizedEventName}"`);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(subteamId)) {
      return NextResponse.json({ 
        error: 'Invalid subteam ID format. Must be a valid UUID.' 
      }, { status: 400 });
    }

    // Validate event name
    if (!eventName || typeof eventName !== 'string' || eventName.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Event name is required and must be a non-empty string.' 
      }, { status: 400 });
    }

    // Validate slot index
    if (typeof slotIndex !== 'number' || slotIndex < 0 || slotIndex > 10) {
      return NextResponse.json({ 
        error: 'Slot index must be a number between 0 and 10.' 
      }, { status: 400 });
    }

    // Validate student name if provided
    if (studentName && (typeof studentName !== 'string' || studentName.trim().length === 0)) {
      return NextResponse.json({ 
        error: 'Student name must be a non-empty string if provided.' 
      }, { status: 400 });
    }

    // Validate user ID if provided
    if (userId && !uuidRegex.test(userId)) {
      return NextResponse.json({ 
        error: 'Invalid user ID format. Must be a valid UUID.' 
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

    // Check if the subteam belongs to this group
    const subteamResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_units 
       WHERE id = $1 AND group_id = $2 AND status = 'active'`,
      [subteamId, groupId]
    );

    if (subteamResult.rows.length === 0) {
      return NextResponse.json({ error: 'Subteam not found' }, { status: 404 });
    }

    // Determine user ID to link - use provided userId if available, otherwise auto-link by name
    let userIdToLink: string | null = null;
    
    if (userId) {
      // Use the explicitly provided userId
      userIdToLink = userId;
    } else if (studentName && studentName.trim()) {
      // Auto-link by matching student name to team members
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
      [subteamId, normalizedEventName, slotIndex, studentName || null, userIdToLink]
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
