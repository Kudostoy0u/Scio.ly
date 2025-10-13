import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

// POST /api/teams/[teamId]/stream/comments - Add a comment to a stream post
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
    const { postId, content } = body;

    if (!postId || !content) {
      return NextResponse.json({ 
        error: 'Post ID and content are required' 
      }, { status: 400 });
    }

    // Validate UUID format for postId
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

    // Insert comment
    const commentResult = await queryCockroachDB<{ id: string }>(
      `INSERT INTO new_team_stream_comments (post_id, author_id, content)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [postId, user.id, content]
    );

    return NextResponse.json({ 
      message: 'Comment added successfully',
      commentId: commentResult.rows[0].id
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
