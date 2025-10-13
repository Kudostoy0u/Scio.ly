import { dbPg } from '@/lib/db';
import { newTeamGroups, newTeamUnits, newTeamMemberships } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Team group information interface
 * Contains identifiers for team groups and their associated units
 */
export interface TeamGroupInfo {
  /** Unique identifier for the team group */
  groupId: string;
  /** Array of team unit IDs belonging to this group */
  teamUnitIds: string[];
}

/**
 * Resolves a team slug to team group and unit IDs
 * Looks up a team group by its slug and returns all associated team units
 * 
 * @param {string} slug - The team group slug (e.g., 'neuqua-valley-high-school-c')
 * @returns {Promise<TeamGroupInfo>} Team group and unit IDs
 * @throws {Error} When team group is not found or has no units
 * @example
 * ```typescript
 * const info = await resolveTeamSlugToUnits('neuqua-valley-high-school-c');
 * console.log(info.groupId); // Team group ID
 * console.log(info.teamUnitIds); // Array of team unit IDs
 * ```
 */
export async function resolveTeamSlugToUnits(slug: string): Promise<TeamGroupInfo> {
  // First, resolve the slug to team group using Drizzle ORM
  const groupResult = await dbPg
    .select({ id: newTeamGroups.id })
    .from(newTeamGroups)
    .where(eq(newTeamGroups.slug, slug));

  if (groupResult.length === 0) {
    throw new Error('Team group not found');
  }

  const groupId = groupResult[0].id;

  // Get team units for this group using Drizzle ORM
  const unitsResult = await dbPg
    .select({ id: newTeamUnits.id })
    .from(newTeamUnits)
    .where(eq(newTeamUnits.groupId, groupId));

  if (unitsResult.length === 0) {
    throw new Error('No team units found for this group');
  }

  const teamUnitIds = unitsResult.map(row => row.id);

  return {
    groupId,
    teamUnitIds
  };
}

/**
 * Checks if a user is a member of any team unit in a group
 * Queries the database to find all team units where the user is a member
 * 
 * @param {string} userId - The user ID to check memberships for
 * @param {string[]} teamUnitIds - Array of team unit IDs to check
 * @returns {Promise<any[]>} Array of team memberships for the user
 * @throws {Error} When database query fails
 * @example
 * ```typescript
 * const memberships = await getUserTeamMemberships('user-123', ['unit-1', 'unit-2']);
 * console.log(memberships.length); // Number of team memberships
 * ```
 */
export async function getUserTeamMemberships(userId: string, teamUnitIds: string[]) {
  // Using Drizzle ORM to get user team memberships
  const membershipResult = await dbPg
    .select({
      id: newTeamMemberships.id,
      role: newTeamMemberships.role,
      team_id: newTeamMemberships.teamId
    })
    .from(newTeamMemberships)
    .where(
      and(
        eq(newTeamMemberships.userId, userId),
        inArray(newTeamMemberships.teamId, teamUnitIds),
        eq(newTeamMemberships.status, 'active')
      )
    );

  return membershipResult;
}

/**
 * Checks if a user is a captain of any team unit in a group
 * @param userId The user ID
 * @param teamUnitIds Array of team unit IDs
 * @returns True if user is a captain of any team unit
 */
export async function isUserCaptain(userId: string, teamUnitIds: string[]): Promise<boolean> {
  const memberships = await getUserTeamMemberships(userId, teamUnitIds);
  return memberships.some(m => ['captain', 'co_captain'].includes(m.role));
}
