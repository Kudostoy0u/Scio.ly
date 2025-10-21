/**
 * Centralized Teams Service
 *
 * This service provides a single, robust interface for all teams-related database operations.
 * All queries use Drizzle ORM with proper Zod validation and error handling.
 *
 * Benefits:
 * - Single source of truth for all teams data access
 * - Consistent error handling and validation
 * - Easy to test and maintain
 * - Type-safe database queries
 */

import { db } from '@/lib/db';
import {
  newTeamGroups,
  newTeamUnits,
  newTeamMemberships,
  newTeamRosterData,
  newTeamPosts,
  newTeamAssignments,
  newTeamEvents,
  rosterLinkInvitations,
  users,
  newTeamInvitations,
  newTeamNotifications,
} from '@/lib/db/schema';
import {
  teamQuerySchema,
  subteamQuerySchema,
  memberQuerySchema,
  rosterQuerySchema,
  createSubteamSchema,
  updateSubteamSchema,
  rosterEntrySchema,
  updateRosterEntrySchema,
  removeRosterEntrySchema,
  type Subteam,
  type TeamMember,
  type RosterData,
} from '@/lib/schemas/teams.schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { ZodError } from 'zod';

// ============================================================================
// Error Handling
// ============================================================================

export class TeamsServiceError extends Error {
  constructor(
    message: string,
    public code: string = 'TEAMS_ERROR',
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'TeamsServiceError';
  }
}

function handleError(error: unknown, operation: string): never {
  if (error instanceof ZodError) {
    throw new TeamsServiceError(
      `Validation error in ${operation}: ${error.errors.map(e => e.message).join(', ')}`,
      'VALIDATION_ERROR',
      400
    );
  }

  if (error instanceof TeamsServiceError) {
    throw error;
  }

  console.error(`[Teams Service] Error in ${operation}:`, error);
  throw new TeamsServiceError(
    `Failed to ${operation}`,
    'INTERNAL_ERROR',
    500
  );
}

// ============================================================================
// Team Groups (Teams) Operations
// ============================================================================

/**
 * Get all teams for a specific user
 */
export async function getUserTeams(userId: string) {
  try {
    const memberships = await db
      .select({
        team: newTeamGroups,
        role: newTeamMemberships.role,
        joinedAt: newTeamMemberships.joinedAt,
        subteamId: newTeamUnits.id,
        subteamName: newTeamUnits.teamId,
      })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
      .where(
        and(
          eq(newTeamMemberships.userId, userId),
          eq(newTeamMemberships.status, 'active'),
          eq(newTeamGroups.status, 'active')
        )
      )
      .orderBy(newTeamGroups.createdAt);

    return memberships.map(m => ({
      id: m.team.id,
      name: `${m.team.school} ${m.team.division}`,
      slug: m.team.slug,
      school: m.team.school,
      division: m.team.division as 'B' | 'C',
      role: m.role as 'captain' | 'member',
      joinedAt: m.joinedAt?.toISOString() || '',
    }));
  } catch (error) {
    return handleError(error, 'getUserTeams');
  }
}

/**
 * Get a specific team by slug
 */
export async function getTeamBySlug(slug: string, userId?: string) {
  try {
    const validated = teamQuerySchema.parse({ teamSlug: slug });

    const team = await db
      .select()
      .from(newTeamGroups)
      .where(
        and(
          eq(newTeamGroups.slug, validated.teamSlug),
          eq(newTeamGroups.status, 'active')
        )
      )
      .limit(1);

    if (!team.length) {
      throw new TeamsServiceError('Team not found', 'NOT_FOUND', 404);
    }

    let userRole: string | undefined;
    if (userId) {
      const membership = await db
        .select({ role: newTeamMemberships.role })
        .from(newTeamMemberships)
        .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
        .where(
          and(
            eq(newTeamUnits.groupId, team[0].id),
            eq(newTeamMemberships.userId, userId),
            eq(newTeamMemberships.status, 'active')
          )
        )
        .limit(1);

      userRole = membership[0]?.role;
    }

    return {
      ...team[0],
      userRole,
      isMember: !!userRole,
    };
  } catch (error) {
    return handleError(error, 'getTeamBySlug');
  }
}

// ============================================================================
// Subteams (Team Units) Operations
// ============================================================================

/**
 * Get all subteams for a team
 */
export async function getSubteams(teamSlug: string): Promise<Subteam[]> {
  try {
    const validated = teamQuerySchema.parse({ teamSlug });

    const team = await db
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, validated.teamSlug))
      .limit(1);

    if (!team.length) {
      throw new TeamsServiceError('Team not found', 'NOT_FOUND', 404);
    }

    const subteams = await db
      .select()
      .from(newTeamUnits)
      .where(
        and(
          eq(newTeamUnits.groupId, team[0].id),
          eq(newTeamUnits.status, 'active')
        )
      )
      .orderBy(newTeamUnits.teamId);

    return subteams.map(st => ({
      id: st.id,
      name: st.teamId,
      team_id: team[0].id,
      description: st.description || '',
      created_at: st.createdAt?.toISOString() || '',
    }));
  } catch (error) {
    return handleError(error, 'getSubteams');
  }
}

/**
 * Create a new subteam
 */
export async function createSubteam(teamSlug: string, data: unknown) {
  try {
    const teamValidated = teamQuerySchema.parse({ teamSlug });
    const dataValidated = createSubteamSchema.parse(data);

    const team = await db
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamValidated.teamSlug))
      .limit(1);

    if (!team.length) {
      throw new TeamsServiceError('Team not found', 'NOT_FOUND', 404);
    }

    const [newSubteam] = await db
      .insert(newTeamUnits)
      .values({
        groupId: team[0].id,
        teamId: dataValidated.name,
        description: dataValidated.description,
        captainCode: generateCode(),
        userCode: generateCode(),
        createdBy: team[0].createdBy, // TODO: Pass actual user ID
      })
      .returning();

    return newSubteam;
  } catch (error) {
    return handleError(error, 'createSubteam');
  }
}

/**
 * Update a subteam
 */
export async function updateSubteam(teamSlug: string, subteamId: string, data: unknown) {
  try {
    const teamValidated = teamQuerySchema.parse({ teamSlug });
    const dataValidated = updateSubteamSchema.parse(data);

    const [updated] = await db
      .update(newTeamUnits)
      .set({
        ...dataValidated,
        updatedAt: new Date(),
      })
      .where(eq(newTeamUnits.id, subteamId))
      .returning();

    if (!updated) {
      throw new TeamsServiceError('Subteam not found', 'NOT_FOUND', 404);
    }

    return updated;
  } catch (error) {
    return handleError(error, 'updateSubteam');
  }
}

/**
 * Delete a subteam
 */
export async function deleteSubteam(teamSlug: string, subteamId: string) {
  try {
    const teamValidated = teamQuerySchema.parse({ teamSlug });

    const [deleted] = await db
      .update(newTeamUnits)
      .set({ status: 'deleted' })
      .where(eq(newTeamUnits.id, subteamId))
      .returning();

    if (!deleted) {
      throw new TeamsServiceError('Subteam not found', 'NOT_FOUND', 404);
    }

    return { success: true };
  } catch (error) {
    return handleError(error, 'deleteSubteam');
  }
}

// ============================================================================
// Members Operations
// ============================================================================

/**
 * Get all members for a team or subteam
 */
export async function getMembers(teamSlug: string, subteamId?: string | null): Promise<TeamMember[]> {
  try {
    const validated = memberQuerySchema.parse({ teamSlug, subteamId });

    const team = await db
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, validated.teamSlug))
      .limit(1);

    if (!team.length) {
      throw new TeamsServiceError('Team not found', 'NOT_FOUND', 404);
    }

    let query = db
      .select({
        userId: newTeamMemberships.userId,
        role: newTeamMemberships.role,
        joinedAt: newTeamMemberships.joinedAt,
        subteamId: newTeamUnits.id,
        subteamName: newTeamUnits.teamId,
        userName: users.displayName,
        userEmail: users.email,
        username: users.username,
      })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .leftJoin(users, eq(newTeamMemberships.userId, users.id))
      .where(
        and(
          eq(newTeamUnits.groupId, team[0].id),
          eq(newTeamMemberships.status, 'active')
        )
      );

    if (subteamId && subteamId !== 'all') {
      query = query.where(eq(newTeamUnits.id, subteamId));
    }

    const members = await query.orderBy(newTeamMemberships.joinedAt);

    // Get roster data to find events for each member
    const rosterData = await db
      .select()
      .from(newTeamRosterData)
      .where(eq(newTeamRosterData.teamId, team[0].id));

    const memberEvents: Record<string, string[]> = {};
    rosterData.forEach(rd => {
      const data = rd.rosterData as Record<string, string[]>;
      Object.entries(data).forEach(([event, students]) => {
        students.forEach(student => {
          if (!memberEvents[student]) {
            memberEvents[student] = [];
          }
          if (!memberEvents[student].includes(event)) {
            memberEvents[student].push(event);
          }
        });
      });
    });

    return members.map(m => ({
      id: m.userId,
      user_id: m.userId,
      name: m.userName || 'Unknown',
      email: m.userEmail || null,
      username: m.username || null,
      role: m.role as 'captain' | 'member',
      joined_at: m.joinedAt?.toISOString() || null,
      subteam_id: m.subteamId || null,
      events: memberEvents[m.userName || ''] || [],
      is_pending_invitation: false,
      is_unlinked: false,
      invitation_code: null,
    }));
  } catch (error) {
    return handleError(error, 'getMembers');
  }
}

// ============================================================================
// Roster Operations
// ============================================================================

/**
 * Get roster data for a subteam
 */
export async function getRosterData(teamSlug: string, subteamId: string): Promise<RosterData> {
  try {
    const validated = rosterQuerySchema.parse({ teamSlug, subteamId });

    const [rosterRecord] = await db
      .select()
      .from(newTeamRosterData)
      .where(eq(newTeamRosterData.subteamId, validated.subteamId))
      .limit(1);

    if (!rosterRecord) {
      return { roster: {}, removed_events: [] };
    }

    return {
      roster: (rosterRecord.rosterData as Record<string, string[]>) || {},
      removed_events: (rosterRecord.removedEvents as string[]) || [],
    };
  } catch (error) {
    return handleError(error, 'getRosterData');
  }
}

/**
 * Update roster entry
 */
export async function updateRosterEntry(teamSlug: string, data: unknown) {
  try {
    const validated = rosterEntrySchema.parse(data);

    // Get or create roster record
    let [rosterRecord] = await db
      .select()
      .from(newTeamRosterData)
      .where(eq(newTeamRosterData.subteamId, validated.subteam_id))
      .limit(1);

    const currentRoster = (rosterRecord?.rosterData as Record<string, string[]>) || {};

    // Update the roster
    if (!currentRoster[validated.event_name]) {
      currentRoster[validated.event_name] = [];
    }

    // Ensure the array has enough slots
    while (currentRoster[validated.event_name].length <= validated.slot_index) {
      currentRoster[validated.event_name].push('');
    }

    currentRoster[validated.event_name][validated.slot_index] = validated.student_name;

    if (rosterRecord) {
      await db
        .update(newTeamRosterData)
        .set({
          rosterData: currentRoster,
          updatedAt: new Date(),
        })
        .where(eq(newTeamRosterData.id, rosterRecord.id));
    } else {
      // Create new roster record
      const team = await db
        .select({ id: newTeamGroups.id })
        .from(newTeamGroups)
        .where(eq(newTeamGroups.slug, teamSlug))
        .limit(1);

      if (!team.length) {
        throw new TeamsServiceError('Team not found', 'NOT_FOUND', 404);
      }

      await db
        .insert(newTeamRosterData)
        .values({
          teamId: team[0].id,
          subteamId: validated.subteam_id,
          rosterData: currentRoster,
          removedEvents: [],
        });
    }

    return { success: true };
  } catch (error) {
    return handleError(error, 'updateRosterEntry');
  }
}

/**
 * Remove roster entry
 */
export async function removeRosterEntry(teamSlug: string, data: unknown) {
  try {
    const validated = removeRosterEntrySchema.parse(data);

    if (!validated.subteam_id) {
      throw new TeamsServiceError('Subteam ID is required', 'VALIDATION_ERROR', 400);
    }

    const [rosterRecord] = await db
      .select()
      .from(newTeamRosterData)
      .where(eq(newTeamRosterData.subteamId, validated.subteam_id))
      .limit(1);

    if (!rosterRecord) {
      return { success: true, removedEntries: 0 };
    }

    const currentRoster = (rosterRecord.rosterData as Record<string, string[]>) || {};
    let removedEntries = 0;

    // Remove entries based on criteria
    Object.keys(currentRoster).forEach(event => {
      if (validated.event_name && event !== validated.event_name) {
        return;
      }

      currentRoster[event] = currentRoster[event].filter(student => {
        const shouldRemove = student === validated.student_name;
        if (shouldRemove) removedEntries++;
        return !shouldRemove;
      });

      // Remove empty events
      if (currentRoster[event].length === 0) {
        delete currentRoster[event];
      }
    });

    await db
      .update(newTeamRosterData)
      .set({
        rosterData: currentRoster,
        updatedAt: new Date(),
      })
      .where(eq(newTeamRosterData.id, rosterRecord.id));

    return { success: true, removedEntries };
  } catch (error) {
    return handleError(error, 'removeRosterEntry');
  }
}

// ============================================================================
// Stream Operations
// ============================================================================

/**
 * Get stream posts for a team/subteam
 */
export async function getStreamPosts(teamSlug: string, subteamId?: string) {
  try {
    const team = await db
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamSlug))
      .limit(1);

    if (!team.length) {
      throw new TeamsServiceError('Team not found', 'NOT_FOUND', 404);
    }

    // Get all subteams for this team
    const subteams = await db
      .select({ id: newTeamUnits.id })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, team[0].id));

    const subteamIds = subteams.map(st => st.id);

    let query = db
      .select({
        post: newTeamPosts,
        authorName: users.displayName,
        authorEmail: users.email,
      })
      .from(newTeamPosts)
      .leftJoin(users, eq(newTeamPosts.authorId, users.id))
      .where(inArray(newTeamPosts.teamId, subteamIds));

    if (subteamId) {
      query = query.where(eq(newTeamPosts.teamId, subteamId));
    }

    const posts = await query.orderBy(newTeamPosts.createdAt);

    return posts.map(p => ({
      id: p.post.id,
      content: p.post.content,
      author_name: p.authorName || 'Unknown',
      author_email: p.authorEmail || '',
      team_id: team[0].id,
      subteam_id: p.post.teamId,
      created_at: p.post.createdAt?.toISOString() || '',
    }));
  } catch (error) {
    return handleError(error, 'getStreamPosts');
  }
}

// ============================================================================
// Assignments Operations
// ============================================================================

/**
 * Get assignments for a team
 */
export async function getAssignments(teamSlug: string) {
  try {
    const team = await db
      .select({ id: newTeamGroups.id })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.slug, teamSlug))
      .limit(1);

    if (!team.length) {
      throw new TeamsServiceError('Team not found', 'NOT_FOUND', 404);
    }

    // Get all subteams for this team
    const subteams = await db
      .select({ id: newTeamUnits.id })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, team[0].id));

    const subteamIds = subteams.map(st => st.id);

    const assignments = await db
      .select()
      .from(newTeamAssignments)
      .where(inArray(newTeamAssignments.teamId, subteamIds))
      .orderBy(newTeamAssignments.dueDate);

    return assignments.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description || '',
      due_date: a.dueDate.toISOString(),
      team_id: team[0].id,
      created_by: a.createdBy,
      created_at: a.createdAt?.toISOString() || '',
      assigned_to: [],
    }));
  } catch (error) {
    return handleError(error, 'getAssignments');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
