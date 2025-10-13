import { queryCockroachDB } from '@/lib/cockroachdb';

export interface TeamInfo {
  groupId: string;
  teamUnitIds: string[];
}

export interface UserMembership {
  team_id: string;
  role: string;
  status: string;
}

/**
 * Resolve team slug to team units
 */
export async function resolveTeamSlugToUnits(teamSlug: string): Promise<TeamInfo | null> {
  try {
    const groupResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_groups WHERE slug = $1`,
      [teamSlug]
    );

    if (groupResult.rows.length === 0) {
      return null;
    }

    const groupId = groupResult.rows[0].id;

    const unitsResult = await queryCockroachDB<{ id: string }>(
      `SELECT id FROM new_team_units WHERE group_id = $1`,
      [groupId]
    );

    return {
      groupId,
      teamUnitIds: unitsResult.rows.map(unit => unit.id)
    };
  } catch (error) {
    console.error('Error resolving team slug to units:', error);
    return null;
  }
}

/**
 * Get user team memberships for specific team units
 */
export async function getUserTeamMemberships(userId: string, teamUnitIds: string[]): Promise<UserMembership[]> {
  if (teamUnitIds.length === 0) return [];

  const placeholders = teamUnitIds.map((_, index) => `$${index + 2}`).join(',');
  const query = `
    SELECT 
      tm.team_id,
      tm.role,
      tm.status
    FROM new_team_memberships tm
    WHERE tm.user_id = $1 
      AND tm.team_id IN (${placeholders})
      AND tm.status = 'active'
  `;

  const result = await queryCockroachDB<UserMembership>(query, [userId, ...teamUnitIds]);
  return result.rows;
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get stream posts for a team unit
 */
export async function getStreamPosts(subteamId: string) {
  const result = await queryCockroachDB<{
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
    result.rows.map(async (post) => {
      const commentsResult = await queryCockroachDB<{
        id: string;
        post_id: string;
        author_name: string;
        author_email: string;
        content: string;
        created_at: string;
      }>(
        `SELECT 
           sc.id,
           sc.post_id,
           CONCAT(u.first_name, ' ', u.last_name) as author_name,
           u.email as author_email,
           sc.content,
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

  return postsWithComments;
}

/**
 * Get tournaments for a team unit
 */
export async function getTournaments(subteamId: string) {
  // First get the group ID from the subteam
  const groupResult = await queryCockroachDB<{ group_id: string }>(
    `SELECT group_id FROM new_team_units WHERE id = $1`,
    [subteamId]
  );

  if (groupResult.rows.length === 0) {
    return [];
  }

  const groupId = groupResult.rows[0].group_id;

  const result = await queryCockroachDB<{
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

  return result.rows;
}

/**
 * Get active timers for a team unit
 */
export async function getActiveTimers(subteamId: string) {
  const result = await queryCockroachDB<{
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

  return result.rows;
}
