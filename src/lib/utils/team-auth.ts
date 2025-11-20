import { queryCockroachDB } from "@/lib/cockroachdb";
import { dbPg } from "@/lib/db";
import { users } from "@/lib/db/schema/core";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamRosterData,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import { and, eq, sql } from "drizzle-orm";

// Simple in-memory cache for auth results to avoid repeated database queries
const authCache = new Map<string, { result: TeamAuthResult; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache TTL

// Cleanup expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of authCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      authCache.delete(key);
    }
  }
}, CACHE_TTL); // Run cleanup every 30 seconds

export interface TeamAuthResult {
  isAuthorized: boolean;
  hasMembership: boolean;
  hasRosterEntry: boolean;
  role?: string;
  error?: string;
}

/**
 * Check if a user is authorized to access a team group.
 * A user is authorized if they either:
 * 1. Have an active team membership in any subteam of the group, OR
 * 2. Have their name in the roster of any subteam in the group
 */
export async function checkTeamGroupAccess(
  userId: string,
  groupId: string
): Promise<TeamAuthResult> {
  try {
    // Check for active team membership using Drizzle ORM
    const membershipResult = await dbPg
      .select({ role: newTeamMemberships.role })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamMemberships.userId, userId),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamMemberships.status, "active")
        )
      );
    const hasMembership = membershipResult.length > 0;
    const role = hasMembership && membershipResult[0] ? membershipResult[0].role : undefined;

    // Check for roster entries (user's name appears in roster) using Drizzle ORM
    const rosterResult = await dbPg
      .select({ count: sql<number>`count(*)` })
      .from(newTeamRosterData)
      .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
      .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamRosterData.userId, userId)));

    // Also check for any roster entries by student name (in case user_id is null)
    // We need to get the user's display name first
    const userResult = await dbPg
      .select({
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, userId));

    const userDisplayName = userResult[0]?.displayName;
    const userFirstName = userResult[0]?.firstName;
    const userLastName = userResult[0]?.lastName;

    // Debug: Check what subteams exist in this group
    await dbPg
      .select({
        id: newTeamUnits.id,
        teamId: newTeamUnits.teamId,
        description: newTeamUnits.description,
      })
      .from(newTeamUnits)
      .where(eq(newTeamUnits.groupId, groupId));

    let hasRosterEntry = (rosterResult[0]?.count ?? 0) > 0;

    // If no roster entries by userId, check by name
    if (!hasRosterEntry && (userDisplayName || userFirstName || userLastName)) {
      // Try different name combinations (remove duplicates)
      const possibleNames = [
        userDisplayName,
        userFirstName,
        userLastName,
        userFirstName && userLastName ? `${userFirstName} ${userLastName}` : null,
        userLastName && userFirstName ? `${userLastName}, ${userFirstName}` : null,
      ].filter(Boolean);

      // Remove duplicates using Set
      const uniqueNames = [...new Set(possibleNames)];

      for (const name of uniqueNames) {
        if (!name) {
          continue;
        }

        const rosterByNameResult = await dbPg
          .select({ count: sql<number>`count(*)` })
          .from(newTeamRosterData)
          .innerJoin(newTeamUnits, eq(newTeamRosterData.teamUnitId, newTeamUnits.id))
          .where(and(eq(newTeamUnits.groupId, groupId), eq(newTeamRosterData.studentName, name)));
        if ((rosterByNameResult[0]?.count ?? 0) > 0) {
          hasRosterEntry = true;
          break;
        }
      }
    }

    // Special case: Team creators should maintain access even without membership or roster entries
    let isAuthorized = hasMembership || hasRosterEntry;

    if (!isAuthorized) {
      // Check if user is the creator of this team group
      const teamGroupResult = await dbPg
        .select({ createdBy: newTeamGroups.createdBy })
        .from(newTeamGroups)
        .where(eq(newTeamGroups.id, groupId));

      const isTeamCreator = teamGroupResult.length > 0 && teamGroupResult[0]?.createdBy === userId;

      if (isTeamCreator) {
        isAuthorized = true;
      }
    }

    return {
      isAuthorized,
      hasMembership,
      hasRosterEntry,
      role,
    };
  } catch (_error) {
    return {
      isAuthorized: false,
      hasMembership: false,
      hasRosterEntry: false,
      error: "Database error",
    };
  }
}

/**
 * Check if a user has leadership privileges (captain/co_captain) in a team group
 */
export async function checkTeamGroupLeadership(
  userId: string,
  groupId: string
): Promise<{ hasLeadership: boolean; role?: string }> {
  try {
    const membershipResult = await dbPg
      .select({ role: newTeamMemberships.role })
      .from(newTeamMemberships)
      .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
      .where(
        and(
          eq(newTeamMemberships.userId, userId),
          eq(newTeamUnits.groupId, groupId),
          eq(newTeamMemberships.status, "active")
        )
      );

    if (membershipResult.length > 0) {
      const role = membershipResult[0]?.role;
      if (!role) {
        return { hasLeadership: false };
      }
      const hasLeadership = ["captain", "co_captain"].includes(role);
      return { hasLeadership, role };
    }

    // If no active membership, check if user is the team creator
    const teamGroupResult = await dbPg
      .select({ createdBy: newTeamGroups.createdBy })
      .from(newTeamGroups)
      .where(eq(newTeamGroups.id, groupId));

    const isTeamCreator = teamGroupResult.length > 0 && teamGroupResult[0]?.createdBy === userId;

    if (isTeamCreator) {
      return { hasLeadership: true, role: "creator" };
    }

    return { hasLeadership: false };
  } catch (_error) {
    return { hasLeadership: false };
  }
}

/**
 * Check if a user is authorized to access a team group using CockroachDB.
 * A user is authorized if they either:
 * 1. Have an active team membership in any subteam of the group, OR
 * 2. Have their name in the roster of any subteam in the group
 */
export async function checkTeamGroupAccessCockroach(
  userId: string,
  groupId: string
): Promise<TeamAuthResult> {
  try {
    // Check cache first
    const cacheKey = `${userId}:${groupId}`;
    const cached = authCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result;
    }

    // Only log in development
    if (process.env.NODE_ENV === "development") {
    }

    // Check for active team membership
    const membershipResult = await queryCockroachDB<{ role: string }>(
      `SELECT tm.role 
       FROM new_team_memberships tm
       JOIN new_team_units tu ON tm.team_id = tu.id
       WHERE tm.user_id = $1::uuid AND tu.group_id = $2::uuid AND tm.status = 'active'`,
      [userId, groupId]
    );

    // Only log in development
    if (process.env.NODE_ENV === "development") {
    }
    const hasMembership = membershipResult.rows.length > 0;
    const role = hasMembership && membershipResult.rows[0] ? membershipResult.rows[0].role : undefined;

    // Check for roster entries (user's name appears in roster)
    const rosterResult = await queryCockroachDB<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM new_team_roster_data r
       JOIN new_team_units tu ON r.team_unit_id = tu.id
       WHERE tu.group_id = $1::uuid AND r.user_id = $2::uuid`,
      [groupId, userId]
    );

    // Only log in development
    if (process.env.NODE_ENV === "development") {
    }
    let hasRosterEntry = rosterResult.rows[0] ? Number.parseInt(rosterResult.rows[0].count) > 0 : false;

    // If no roster entries by userId, check by name with a single optimized query
    if (!hasRosterEntry) {
      // Get user names from CockroachDB
      const userResult = await queryCockroachDB<{
        display_name: string;
        first_name: string;
        last_name: string;
      }>("SELECT display_name, first_name, last_name FROM users WHERE id = $1::uuid", [userId]);

      const userDisplayName = userResult.rows[0]?.display_name;
      const userFirstName = userResult.rows[0]?.first_name;
      const userLastName = userResult.rows[0]?.last_name;
      // Only log in development
      if (process.env.NODE_ENV === "development") {
      }

      if (userDisplayName || userFirstName || userLastName) {
        // Use a single optimized query to check for roster entries
        // This replaces the multiple permutation approach with a single efficient query
        const rosterByNameResult = await queryCockroachDB<{ count: string }>(
          `SELECT COUNT(*) as count
           FROM new_team_roster_data r
           JOIN new_team_units tu ON r.team_unit_id = tu.id
           WHERE tu.group_id = $1::uuid 
           AND (
             r.student_name = $2 OR 
             r.student_name = $3 OR 
             r.student_name = $4 OR
             r.student_name = $5 OR
             r.student_name = $6
           )`,
          [
            groupId,
            userDisplayName,
            userFirstName,
            userLastName,
            userFirstName && userLastName ? `${userFirstName} ${userLastName}` : null,
            userLastName && userFirstName ? `${userLastName}, ${userFirstName}` : null,
          ]
        );

        // Only log in development
        if (process.env.NODE_ENV === "development") {
        }
        if (rosterByNameResult.rows[0] && Number.parseInt(rosterByNameResult.rows[0].count) > 0) {
          hasRosterEntry = true;
        }
      }
    }

    // Special case: Team creators should maintain access even without membership or roster entries
    let isAuthorized = hasMembership || hasRosterEntry;

    if (!isAuthorized) {
      // Check if user is the creator of this team group (CockroachDB)
      const teamGroupResult = await queryCockroachDB<{ created_by: string }>(
        "SELECT created_by FROM new_team_groups WHERE id = $1::uuid",
        [groupId]
      );

      const isTeamCreator =
        teamGroupResult.rows.length > 0 && teamGroupResult.rows[0]?.created_by === userId;
      // Only log in development
      if (process.env.NODE_ENV === "development") {
      }

      if (isTeamCreator) {
        isAuthorized = true;
        // Only log in development
        if (process.env.NODE_ENV === "development") {
        }
      }
    }

    // Only log in development
    if (process.env.NODE_ENV === "development") {
    }

    const result = {
      isAuthorized,
      hasMembership,
      hasRosterEntry,
      role,
    };

    // Cache the result
    authCache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  } catch (_error) {
    return {
      isAuthorized: false,
      hasMembership: false,
      hasRosterEntry: false,
      error: "Database error",
    };
  }
}

/**
 * Check if a user has leadership privileges (captain/co_captain) in a team group using CockroachDB
 */
export async function checkTeamGroupLeadershipCockroach(
  userId: string,
  groupId: string
): Promise<{ hasLeadership: boolean; role?: string }> {
  try {
    const membershipResult = await queryCockroachDB<{ role: string }>(
      `SELECT tm.role 
       FROM new_team_memberships tm
       JOIN new_team_units tu ON tm.team_id = tu.id
       WHERE tm.user_id = $1::uuid AND tu.group_id = $2::uuid AND tm.status = 'active'`,
      [userId, groupId]
    );

    if (membershipResult.rows.length > 0) {
      const row = membershipResult.rows[0];
      if (!row) {
        return { hasLeadership: false, role: "member" };
      }
      const role = row.role;
      const hasLeadership = ["captain", "co_captain"].includes(role);
      return { hasLeadership, role };
    }

    // If no active membership, check if user is the team creator
    const teamGroupResult = await queryCockroachDB<{ created_by: string }>(
      "SELECT created_by FROM new_team_groups WHERE id = $1::uuid",
      [groupId]
    );

    const isTeamCreator =
      teamGroupResult.rows.length > 0 && teamGroupResult.rows[0]?.created_by === userId;

    if (isTeamCreator) {
      return { hasLeadership: true, role: "creator" };
    }

    return { hasLeadership: false };
  } catch (_error) {
    return { hasLeadership: false };
  }
}
