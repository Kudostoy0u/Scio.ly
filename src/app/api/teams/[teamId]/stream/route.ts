import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';
import { checkTeamGroupAccessCockroach } from '@/lib/utils/team-auth';

// GET /api/teams/[teamId]/stream - Get stream posts for a subteam
// Frontend Usage:
// - src/lib/stores/teamStore.ts (fetchStream, fetchStreamData)
// - src/app/hooks/useEnhancedTeamData.ts (fetchStream)
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

    // Get stream posts with author information and tournament details
    const streamResult = await queryCockroachDB<{
      id: string;
      content: string;
      show_tournament_timer: boolean;
      tournament_id: string | null;
      tournament_title: string | null;
      tournament_start_time: string | null;
      author_name: string;
      author_email: string;
      created_at: string;
      attachment_url: string | null;
      attachment_title: string | null;
    }>(
      `SELECT 
         sp.id,
         sp.content,
         sp.show_tournament_timer,
         sp.tournament_id,
         te.title as tournament_title,
         te.start_time as tournament_start_time,
         CONCAT(u.first_name, ' ', u.last_name) as author_name,
         u.email as author_email,
         sp.created_at,
         sp.attachment_url,
         sp.attachment_title
       FROM new_team_stream_posts sp
       JOIN public.users u ON sp.author_id = u.id
       LEFT JOIN new_team_events te ON sp.tournament_id = te.id
       WHERE sp.team_unit_id = $1
       ORDER BY sp.created_at DESC
       LIMIT 50`,
      [subteamId]
    );

    // Get comments for each post
    const postsWithComments = await Promise.all(
      streamResult.rows.map(async (post) => {
        const commentsResult = await queryCockroachDB<{
          id: string;
          content: string;
          author_name: string;
          author_email: string;
          created_at: string;
        }>(
          `SELECT 
            sc.id,
            sc.content,
            CONCAT(u.first_name, ' ', u.last_name) as author_name,
            u.email as author_email,
            sc.created_at
          FROM new_team_stream_comments sc
          JOIN public.users u ON sc.author_id = u.id
          WHERE sc.post_id = $1
          ORDER BY sc.created_at ASC`,
          [post.id]
        );

        return {
          ...post,
          comments: commentsResult.rows
        };
      })
    );

    return NextResponse.json({ 
      posts: postsWithComments 
    });

  } catch (error) {
    console.error('Error fetching stream posts:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/teams/[teamId]/stream - Create a new stream post
// Frontend Usage:
// - src/app/teams/components/StreamTab.tsx (createPost)
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
    const { subteamId, content, showTournamentTimer, tournamentId, attachmentUrl, attachmentTitle } = body;

    if (!subteamId || !content) {
      return NextResponse.json({ 
        error: 'Subteam ID and content are required' 
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

    // Check if user is a captain/leader of this team group
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

    const userRole = membershipResult.rows[0].role;
    if (!['captain', 'co_captain'].includes(userRole)) {
      return NextResponse.json({ error: 'Only captains and co-captains can post to the stream' }, { status: 403 });
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

    // If tournament timer is enabled, validate tournament
    if (showTournamentTimer && tournamentId) {
      const tournamentResult = await queryCockroachDB<{ id: string }>(
        `SELECT id FROM new_team_events 
         WHERE id = $1 AND team_id = $2 AND event_type = 'tournament'`,
        [tournamentId, subteamId]
      );

      if (tournamentResult.rows.length === 0) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
      }
    }

    // Insert stream post
    const postResult = await queryCockroachDB<{ id: string }>(
      `INSERT INTO new_team_stream_posts (team_unit_id, author_id, content, show_tournament_timer, tournament_id, attachment_url, attachment_title)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [subteamId, user.id, content, showTournamentTimer || false, tournamentId || null, attachmentUrl || null, attachmentTitle || null]
    );

    return NextResponse.json({ 
      message: 'Post created successfully',
      postId: postResult.rows[0].id
    });

  } catch (error) {
    console.error('Error creating stream post:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/teams/[teamId]/stream - Edit a stream post
// Frontend Usage:
// - src/app/teams/components/StreamTab.tsx (editPost)
export async function PUT(
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
    const { postId, content, attachmentUrl, attachmentTitle } = body;

    if (!postId || !content) {
      return NextResponse.json({ 
        error: 'Post ID and content are required' 
      }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(postId)) {
      return NextResponse.json({ 
        error: 'Invalid post ID format. Must be a valid UUID.' 
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

    // Check if user is a captain/leader of this team group
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

    const userRole = membershipResult.rows[0].role;
    if (!['captain', 'co_captain'].includes(userRole)) {
      return NextResponse.json({ error: 'Only captains and co-captains can edit posts' }, { status: 403 });
    }

    // Verify the post exists and belongs to this team
    const postResult = await queryCockroachDB<{ id: string }>(
      `SELECT sp.id 
       FROM new_team_stream_posts sp
       JOIN new_team_units tu ON sp.team_unit_id = tu.id
       WHERE sp.id = $1 AND tu.group_id = $2`,
      [postId, groupId]
    );

    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Update the post
    await queryCockroachDB(
      `UPDATE new_team_stream_posts 
       SET content = $1, attachment_url = $2, attachment_title = $3, updated_at = NOW()
       WHERE id = $4`,
      [content, attachmentUrl || null, attachmentTitle || null, postId]
    );

    return NextResponse.json({ 
      message: 'Post updated successfully'
    });

  } catch (error) {
    console.error('Error updating stream post:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/teams/[teamId]/stream - Delete a stream post
// Frontend Usage:
// - src/app/teams/components/StreamTab.tsx (deletePost)
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
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ 
        error: 'Post ID is required' 
      }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(postId)) {
      return NextResponse.json({ 
        error: 'Invalid post ID format. Must be a valid UUID.' 
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

    // Check if user is a captain/leader of this team group
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

    const userRole = membershipResult.rows[0].role;
    if (!['captain', 'co_captain'].includes(userRole)) {
      return NextResponse.json({ error: 'Only captains and co-captains can delete posts' }, { status: 403 });
    }

    // Verify the post exists and belongs to this team
    const postResult = await queryCockroachDB<{ id: string }>(
      `SELECT sp.id 
       FROM new_team_stream_posts sp
       JOIN new_team_units tu ON sp.team_unit_id = tu.id
       WHERE sp.id = $1 AND tu.group_id = $2`,
      [postId, groupId]
    );

    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Delete the post (this will cascade delete comments due to foreign key constraints)
    await queryCockroachDB(
      `DELETE FROM new_team_stream_posts WHERE id = $1`,
      [postId]
    );

    return NextResponse.json({ 
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting stream post:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
