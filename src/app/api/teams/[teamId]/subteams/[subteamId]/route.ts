import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

// PUT /api/teams/[teamId]/subteams/[subteamId] - Update a subteam
// Frontend Usage:
// - src/app/teams/components/TeamDashboard.tsx (updateSubteam)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; subteamId: string }> }
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

    const { teamId, subteamId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Subteam name is required' }, { status: 400 });
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

    // Check if the subteam exists and belongs to this group
    const subteamResult = await queryCockroachDB<{ id: string; group_id: string }>(
      `SELECT id, group_id FROM new_team_units WHERE id = $1 AND group_id = $2`,
      [subteamId, groupId]
    );

    if (subteamResult.rows.length === 0) {
      return NextResponse.json({ error: 'Subteam not found' }, { status: 404 });
    }

    // Check if user is a captain of this team group
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

    const membership = membershipResult.rows[0];
    if (!['captain', 'co_captain'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only captains can update subteams' }, { status: 403 });
    }

    // Update the subteam name (description field)
    const updateResult = await queryCockroachDB<{
      id: string;
      team_id: string;
      description: string;
    }>(
      `UPDATE new_team_units 
       SET description = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, team_id, description`,
      [name.trim(), subteamId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update subteam' }, { status: 500 });
    }

    const updatedSubteam = updateResult.rows[0];

    return NextResponse.json({
      id: updatedSubteam.id,
      name: updatedSubteam.description || `Team ${updatedSubteam.team_id}`,
      team_id: updatedSubteam.team_id,
      description: updatedSubteam.description
    });

  } catch (error) {
    console.error('Error updating subteam:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/teams/[teamId]/subteams/[subteamId] - Delete a subteam
// Frontend Usage:
// - src/app/teams/components/TeamDashboard.tsx (deleteSubteam)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; subteamId: string }> }
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

    const { teamId, subteamId } = await params;

    // First, resolve the slug to team group
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team group not found' }, { status: 404 });
    }

    const groupId = groupResult.rows[0].id;

    // Check if the subteam exists and belongs to this group
    const subteamResult = await queryCockroachDB<{ id: string; group_id: string }>(
      `SELECT id, group_id FROM new_team_units WHERE id = $1 AND group_id = $2`,
      [subteamId, groupId]
    );

    if (subteamResult.rows.length === 0) {
      return NextResponse.json({ error: 'Subteam not found' }, { status: 404 });
    }

    // Check if user is a captain of this team group
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

    const membership = membershipResult.rows[0];
    if (!['captain', 'co_captain'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only captains can delete subteams' }, { status: 403 });
    }

    // Comprehensive subteam deletion - delete all related data
    console.log('🗑️ [SUBNTEAM DELETE] Starting comprehensive deletion', { subteamId, groupId });
    
    // Start a transaction to ensure all deletions succeed or none do
    await queryCockroachDB('BEGIN', []);
    
    try {
      // 1. Delete team memberships (will cascade to related data)
      console.log('🗑️ [SUBNTEAM DELETE] Deleting team memberships');
      await queryCockroachDB(
        `DELETE FROM new_team_memberships WHERE team_id = $1`,
        [subteamId]
      );
      
      // 2. Delete roster data
      console.log('🗑️ [SUBNTEAM DELETE] Deleting roster data');
      await queryCockroachDB(
        `DELETE FROM new_team_roster_data WHERE team_unit_id = $1`,
        [subteamId]
      );
      
      // 3. Delete stream posts
      console.log('🗑️ [SUBNTEAM DELETE] Deleting stream posts');
      await queryCockroachDB(
        `DELETE FROM new_team_stream_posts WHERE team_unit_id = $1`,
        [subteamId]
      );
      
      // 4. Delete stream comments
      console.log('🗑️ [SUBNTEAM DELETE] Deleting stream comments');
      await queryCockroachDB(
        `DELETE FROM new_team_stream_comments WHERE team_unit_id = $1`,
        [subteamId]
      );
      
      // 5. Delete active timers
      console.log('🗑️ [SUBNTEAM DELETE] Deleting active timers');
      await queryCockroachDB(
        `DELETE FROM new_team_active_timers WHERE team_unit_id = $1`,
        [subteamId]
      );
      
      // 6. Delete removed events
      console.log('🗑️ [SUBNTEAM DELETE] Deleting removed events');
      await queryCockroachDB(
        `DELETE FROM new_team_removed_events WHERE team_unit_id = $1`,
        [subteamId]
      );
      
      // 7. Delete assignment roster entries
      console.log('🗑️ [SUBNTEAM DELETE] Deleting assignment roster entries');
      await queryCockroachDB(
        `DELETE FROM new_team_assignment_roster WHERE subteam_id = $1`,
        [subteamId]
      );
      
      // 8. Delete assignments
      console.log('🗑️ [SUBNTEAM DELETE] Deleting assignments');
      await queryCockroachDB(
        `DELETE FROM new_team_assignments WHERE team_id = $1`,
        [subteamId]
      );
      
      // 9. Delete events
      console.log('🗑️ [SUBNTEAM DELETE] Deleting events');
      await queryCockroachDB(
        `DELETE FROM new_team_events WHERE team_id = $1`,
        [subteamId]
      );
      
      // 10. Delete materials
      console.log('🗑️ [SUBNTEAM DELETE] Deleting materials');
      await queryCockroachDB(
        `DELETE FROM new_team_materials WHERE team_id = $1`,
        [subteamId]
      );
      
      // 11. Delete messages
      console.log('🗑️ [SUBNTEAM DELETE] Deleting messages');
      await queryCockroachDB(
        `DELETE FROM new_team_messages WHERE team_id = $1`,
        [subteamId]
      );
      
      // 12. Delete notifications
      console.log('🗑️ [SUBNTEAM DELETE] Deleting notifications');
      await queryCockroachDB(
        `DELETE FROM new_team_notifications WHERE team_id = $1`,
        [subteamId]
      );
      
      // 13. Delete polls
      console.log('🗑️ [SUBNTEAM DELETE] Deleting polls');
      await queryCockroachDB(
        `DELETE FROM new_team_polls WHERE team_id = $1`,
        [subteamId]
      );
      
      // 14. Delete posts
      console.log('🗑️ [SUBNTEAM DELETE] Deleting posts');
      await queryCockroachDB(
        `DELETE FROM new_team_posts WHERE team_id = $1`,
        [subteamId]
      );
      
      // 15. Delete recurring meetings
      console.log('🗑️ [SUBNTEAM DELETE] Deleting recurring meetings');
      await queryCockroachDB(
        `DELETE FROM new_team_recurring_meetings WHERE team_id = $1`,
        [subteamId]
      );
      
      // 16. Finally, delete the subteam itself
      console.log('🗑️ [SUBNTEAM DELETE] Deleting subteam');
      const deleteResult = await queryCockroachDB<{ id: string }>(
        `DELETE FROM new_team_units WHERE id = $1 RETURNING id`,
        [subteamId]
      );
      
      if (deleteResult.rows.length === 0) {
        throw new Error('Failed to delete subteam');
      }
      
      // Commit the transaction
      await queryCockroachDB('COMMIT', []);
      
      console.log('✅ [SUBNTEAM DELETE] Comprehensive deletion completed successfully', { subteamId });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Subteam and all related data deleted successfully' 
      });
      
    } catch (error) {
      // Rollback the transaction on any error
      await queryCockroachDB('ROLLBACK', []);
      console.error('❌ [SUBNTEAM DELETE] Transaction rolled back due to error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error deleting subteam:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
