import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamRosterData,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import logger from "@/lib/utils/logger";
import { and, eq } from "drizzle-orm";
import { generateDisplayName } from "./displayNameUtils";

/**
 * Clean Team Authentication System V2
 *
 * This system provides a unified, clean approach to team authorization that:
 * 1. Clearly separates team group access from subteam membership
 * 2. Properly handles team creators
 * 3. Uses consistent logic across all APIs
 * 4. Eliminates legacy inconsistencies
 */

export interface TeamAccessResult {
  /** Whether the user has any access to the team group */
  hasAccess: boolean;
  /** Whether the user is the team creator */
  isCreator: boolean;
  /** Whether the user has active subteam memberships */
  hasSubteamMembership: boolean;
  /** Whether the user has roster entries in any subteam */
  hasRosterEntries: boolean;
  /** The user's role in subteams (if any) */
  subteamRole?: string;
  /** List of subteams the user is a member of */
  subteamMemberships: Array<{
    subteamId: string;
    teamId: string;
    role: string;
  }>;
  /** List of subteams where user has roster entries */
  rosterSubteams: Array<{
    subteamId: string;
    teamId: string;
    studentName: string | null;
  }>;
}

/**
 * Get comprehensive team access information for a user
 * This is the single source of truth for team authorization
 */
export async function getTeamAccess(userId: string, groupId: string): Promise<TeamAccessResult> {
  try {
    // 1. Check if user is the team creator
    const creatorResult = await dbPg
      .select({ createdBy: newTeamGroups.createdBy })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.id, groupId));

    const isCreator = creatorResult.length > 0 && creatorResult[0]?.createdBy === userId;

    // 2. Get all subteam memberships for this user
    const membershipResult = await dbPg
      .select({
        subteamId: newTeamUnits.id,
        teamId: newTeamUnits.teamId,
        role: newTeamMemberships.role,
      })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamMemberships.userId, userId),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamMemberships.status, "active")
        )
      );

    const subteamMemberships = membershipResult.map((m) => ({
      subteamId: m.subteamId,
      teamId: m.teamId,
      role: m.role,
    }));

    const hasSubteamMembership = subteamMemberships.length > 0;
    const subteamRole =
      hasSubteamMembership && subteamMemberships[0] ? subteamMemberships[0].role : undefined;

    // 3. Get all roster entries for this user
    const rosterResult = await dbPg
      .select({
        subteamId: newTeamUnits.id,
        teamId: newTeamUnits.teamId,
        studentName: newTeamRosterData.studentName,
      })
      .from(newTeamRosterData)
      .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
      .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamRosterData.userId, userId)));

    const rosterSubteams = rosterResult.map((r) => ({
      subteamId: r.subteamId,
      teamId: r.teamId,
      studentName: r.studentName,
    }));

    const hasRosterEntries = rosterSubteams.length > 0;

    // 4. Determine overall access
    // User has access if they are:
    // - Team creator, OR
    // - Have subteam membership, OR
    // - Have roster entries
    const hasAccess = isCreator || hasSubteamMembership || hasRosterEntries;

    return {
      hasAccess,
      isCreator,
      hasSubteamMembership,
      hasRosterEntries,
      subteamRole,
      subteamMemberships,
      rosterSubteams,
    };
  } catch (error) {
    logger.error(
      "Failed to get team access",
      error instanceof Error ? error : new Error(String(error)),
      {
        userId,
        groupId,
      }
    );
    return {
      hasAccess: false,
      isCreator: false,
      hasSubteamMembership: false,
      hasRosterEntries: false,
      subteamMemberships: [],
      rosterSubteams: [],
    };
  }
}

/**
 * Check if user has leadership privileges (captain, co-captain, or creator)
 */
export async function hasLeadershipAccess(userId: string, groupId: string): Promise<boolean> {
  const access = await getTeamAccess(userId, groupId);

  // User has leadership if they are:
  // - Team creator, OR
  // - Captain/co-captain in any subteam
  return (
    access.isCreator ||
    access.subteamMemberships.some((m) => ["captain", "co_captain"].includes(m.role))
  );
}

/**
 * Check if user can access a specific subteam
 */
export async function canAccessSubteam(
  userId: string,
  groupId: string,
  subteamId: string
): Promise<boolean> {
  const access = await getTeamAccess(userId, groupId);

  // User can access subteam if they are:
  // - Team creator, OR
  // - Member of that specific subteam, OR
  // - Have roster entries in that subteam
  return (
    access.isCreator ||
    access.subteamMemberships.some((m) => m.subteamId === subteamId) ||
    access.rosterSubteams.some((r) => r.subteamId === subteamId)
  );
}

/**
 * Get user's display information for team contexts with comprehensive fallbacks
 */
export async function getUserDisplayInfo(userId: string): Promise<{
  name: string;
  email: string;
  username?: string;
  needsNamePrompt?: boolean;
}> {
  try {
    const userResult = await dbPg
      .select({
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResult.length === 0) {
      return {
        name: "@unknown",
        email: `user-${userId.substring(0, 8)}@example.com`,
        needsNamePrompt: true,
      };
    }

    const user = userResult[0];
    if (!user) {
      return {
        name: "@unknown",
        email: `user-${userId.substring(0, 8)}@example.com`,
        username: undefined,
        needsNamePrompt: true,
      };
    }

    // Use the centralized display name generation utility
    const { name, needsNamePrompt } = generateDisplayName(user, userId);

    return {
      name,
      email: user.email || `user-${userId.substring(0, 8)}@example.com`,
      username: user.username || undefined,
      needsNamePrompt,
    };
  } catch {
    return {
      name: "@unknown",
      email: `user-${userId.substring(0, 8)}@example.com`,
      needsNamePrompt: true,
    };
  }
}

/**
 * CockroachDB version of getTeamAccess for APIs that use CockroachDB
 * Now uses Drizzle ORM instead of raw SQL
 */
export async function getTeamAccessCockroach(
  userId: string,
  groupId: string
): Promise<TeamAccessResult> {
  try {
    // 1. Check if user is the team creator
    const creatorResult = await dbPg
      .select({ createdBy: newTeamGroups.createdBy })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.id, groupId));

    const isCreator = creatorResult.length > 0 && creatorResult[0]?.createdBy === userId;

    // 2. Get all subteam memberships for this user
    const membershipResult = await dbPg
      .select({
        subteamId: newTeamUnits.id,
        teamId: newTeamUnits.teamId,
        role: newTeamMemberships.role,
      })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamMemberships.userId, userId),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamMemberships.status, "active")
        )
      );

    const subteamMemberships = membershipResult.map((m) => ({
      subteamId: m.subteamId,
      teamId: m.teamId,
      role: m.role,
    }));

    const hasSubteamMembership = subteamMemberships.length > 0;
    const subteamRole =
      hasSubteamMembership && subteamMemberships[0] ? subteamMemberships[0].role : undefined;

    // 3. Get all roster entries for this user
    const rosterResult = await dbPg
      .select({
        subteamId: newTeamUnits.id,
        teamId: newTeamUnits.teamId,
        studentName: newTeamRosterData.studentName,
      })
      .from(newTeamRosterData)
      .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
      .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamRosterData.userId, userId)));

    const rosterSubteams = rosterResult.map((r) => ({
      subteamId: r.subteamId,
      teamId: r.teamId,
      studentName: r.studentName,
    }));

    const hasRosterEntries = rosterSubteams.length > 0;

    // 4. Determine overall access
    const hasAccess = isCreator || hasSubteamMembership || hasRosterEntries;

    return {
      hasAccess,
      isCreator,
      hasSubteamMembership,
      hasRosterEntries,
      subteamRole,
      subteamMemberships,
      rosterSubteams,
    };
  } catch (error) {
    logger.error(
      "Failed to get team access",
      error instanceof Error ? error : new Error(String(error)),
      {
        userId,
        groupId,
      }
    );
    return {
      hasAccess: false,
      isCreator: false,
      hasSubteamMembership: false,
      hasRosterEntries: false,
      subteamMemberships: [],
      rosterSubteams: [],
    };
  }
}

/**
 * CockroachDB version of hasLeadershipAccess
 */
export async function hasLeadershipAccessCockroach(
  userId: string,
  groupId: string
): Promise<boolean> {
  const access = await getTeamAccessCockroach(userId, groupId);
  return (
    access.isCreator ||
    access.subteamMemberships.some((m) => ["captain", "co_captain"].includes(m.role))
  );
}
