/**
 * Modern Drizzle ORM-based team utility functions
 * Replaces legacy raw SQL implementations
 */

import { dbPg } from '@/lib/db';
import { 
  newTeamMemberships, 
  newTeamUnits, 
  newTeamGroups,
  users,
  shareCodes
} from '@/lib/db/schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import type { TeamMembership, ShareCode } from './types';

/**
 * Generate a random code
 * @param {number} length - Length of the code to generate
 * @returns {string} Random code
 */
function generateCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Exported helper for generating permanent captain/user codes
 * @param {number} length - Length of the code to generate
 * @returns {string} Random code
 */
export function generateRandomCode(length: number = 12): string {
  return generateCode(length);
}

/**
 * Ensure a Cockroach `users` row exists for a Supabase user
 * @param {object} params - Parameters for user profile
 * @returns {Promise<void>}
 */
export async function upsertUserProfile(params: {
  id?: string;
  userId?: string;
  email: string;
  name?: string;
  school?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  photoUrl?: string;
}): Promise<void> {
  const userId = params.id || params.userId || '';
  
  await dbPg
    .insert(users)
    .values({
      id: userId,
      email: params.email,
      displayName: params.name || params.displayName,
      firstName: params.firstName,
      lastName: params.lastName,
      username: params.username,
      // Note: school and photoUrl fields may need to be added to schema if not present
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: params.email,
        displayName: sql`COALESCE(EXCLUDED.display_name, ${users.displayName})`,
        firstName: sql`COALESCE(EXCLUDED.first_name, ${users.firstName})`,
        lastName: sql`COALESCE(EXCLUDED.last_name, ${users.lastName})`,
        username: sql`COALESCE(EXCLUDED.username, ${users.username})`,
        updatedAt: sql`now()`,
      },
    });
}

/**
 * Add user to team using Drizzle ORM
 * @param {string} userId - User ID
 * @param {string} teamUnitId - Team unit ID
 * @param {string} role - User role ('captain' or 'user')
 * @returns {Promise<TeamMembership>} Created membership
 */
export async function addUserToTeam(userId: string, teamUnitId: string, role: 'captain' | 'user'): Promise<TeamMembership> {
  const result = await dbPg
    .insert(newTeamMemberships)
    .values({
      userId,
      teamId: teamUnitId,
      role,
      status: 'active',
    })
    .returning({
      id: newTeamMemberships.id,
      userId: newTeamMemberships.userId,
      teamId: newTeamMemberships.teamId,
      role: newTeamMemberships.role,
      joinedAt: newTeamMemberships.joinedAt,
    });

  const membership = result[0];
  return {
    id: membership.id,
    userId: membership.userId,
    teamUnitId: membership.teamId,
    role: membership.role as 'captain' | 'user',
    createdAt: membership.joinedAt || new Date(),
  };
}

/**
 * Get user's team memberships using Drizzle ORM
 * @param {string} userId - User ID
 * @returns {Promise<TeamMembership[]>} Array of memberships
 */
export async function getUserTeamMemberships(userId: string): Promise<TeamMembership[]> {
  const result = await dbPg
    .select({
      id: newTeamMemberships.id,
      userId: newTeamMemberships.userId,
      teamId: newTeamMemberships.teamId,
      role: newTeamMemberships.role,
      joinedAt: newTeamMemberships.joinedAt,
    })
    .from(newTeamMemberships)
    .where(eq(newTeamMemberships.userId, userId))
    .orderBy(desc(newTeamMemberships.joinedAt));

  return result.map(row => ({
    id: row.id,
    userId: row.userId,
    teamUnitId: row.teamId,
    role: row.role as 'captain' | 'user',
    createdAt: row.joinedAt || new Date(),
  }));
}

/**
 * Check if user is member of team using Drizzle ORM
 * @param {string} userId - User ID
 * @param {string} teamUnitId - Team unit ID
 * @returns {Promise<boolean>} True if user is member
 */
export async function isUserMemberOfTeam(userId: string, teamUnitId: string): Promise<boolean> {
  const result = await dbPg
    .select({ id: newTeamMemberships.id })
    .from(newTeamMemberships)
    .where(
      and(
        eq(newTeamMemberships.userId, userId),
        eq(newTeamMemberships.teamId, teamUnitId),
        eq(newTeamMemberships.status, 'active')
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Get team members using Drizzle ORM
 * @param {string} teamUnitId - Team unit ID
 * @returns {Promise<TeamMembership[]>} Array of team members
 */
export async function getTeamMembers(teamUnitId: string): Promise<TeamMembership[]> {
  const result = await dbPg
    .select({
      id: newTeamMemberships.id,
      userId: newTeamMemberships.userId,
      teamId: newTeamMemberships.teamId,
      role: newTeamMemberships.role,
      joinedAt: newTeamMemberships.joinedAt,
    })
    .from(newTeamMemberships)
    .where(
      and(
        eq(newTeamMemberships.teamId, teamUnitId),
        eq(newTeamMemberships.status, 'active')
      )
    )
    .orderBy(desc(newTeamMemberships.role), asc(newTeamMemberships.joinedAt));

  return result.map(row => ({
    id: row.id,
    userId: row.userId,
    teamUnitId: row.teamId,
    role: row.role as 'captain' | 'user',
    createdAt: row.joinedAt || new Date(),
  }));
}

/**
 * Remove user from team using Drizzle ORM
 * @param {string} userId - User ID
 * @param {string} teamUnitId - Team unit ID
 * @returns {Promise<boolean>} True if user was removed
 */
export async function removeUserFromTeam(userId: string, teamUnitId: string): Promise<boolean> {
  const result = await dbPg
    .update(newTeamMemberships)
    .set({ status: 'inactive' })
    .where(
      and(
        eq(newTeamMemberships.userId, userId),
        eq(newTeamMemberships.teamId, teamUnitId)
      )
    )
    .returning({ id: newTeamMemberships.id });

  return result.length > 0;
}

/**
 * Delete user memberships using Drizzle ORM
 * @param {string} userId - User ID
 * @param {string | number} teamUnitId - Optional team unit ID
 * @returns {Promise<number>} Number of deleted memberships
 */
export async function deleteUserMemberships(userId: string, teamUnitId?: string | number): Promise<number> {
  if (teamUnitId !== undefined && teamUnitId !== null) {
    const result = await dbPg
      .update(newTeamMemberships)
      .set({ status: 'inactive' })
      .where(
        and(
          eq(newTeamMemberships.userId, userId),
          eq(newTeamMemberships.teamId, String(teamUnitId))
        )
      )
      .returning({ id: newTeamMemberships.id });
    
    return result.length;
  }

  const result = await dbPg
    .update(newTeamMemberships)
    .set({ status: 'inactive' })
    .where(eq(newTeamMemberships.userId, userId))
    .returning({ id: newTeamMemberships.id });

  return result.length;
}

/**
 * Check if user is captain of school division using Drizzle ORM
 * @param {string} userId - User ID
 * @param {string} school - School name
 * @param {string} division - Division ('B' or 'C')
 * @returns {Promise<boolean>} True if user is captain
 */
export async function isUserCaptainOfSchoolDivision(userId: string, school: string, division: 'B'|'C'): Promise<boolean> {
  const result = await dbPg
    .select({ id: newTeamMemberships.id })
    .from(newTeamMemberships)
    .innerJoin(newTeamUnits, eq(newTeamMemberships.teamId, newTeamUnits.id))
    .innerJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
    .where(
      and(
        eq(newTeamMemberships.userId, userId),
        eq(newTeamGroups.school, school),
        eq(newTeamGroups.division, division),
        eq(newTeamMemberships.role, 'captain'),
        eq(newTeamMemberships.status, 'active')
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Create a temporary share code using Drizzle ORM
 * @param {string} school - School name
 * @param {string} division - Division ('B' or 'C')
 * @param {string} type - Code type ('captain' or 'user')
 * @param {number} expiresInHours - Hours until expiration (default 24)
 * @returns {Promise<string>} Created share code
 */
export async function createShareCode(school: string, division: 'B' | 'C', type: 'captain' | 'user', expiresInHours: number = 24): Promise<string> {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  
  await dbPg
    .insert(shareCodes)
    .values({
      school,
      division,
      type,
      code,
      expiresAt,
    });
  
  return code;
}

/**
 * Validate share code using Drizzle ORM
 * @param {string} code - Share code to validate
 * @returns {Promise<{school: string; division: string; type: string} | null>} Code info or null if invalid
 */
export async function validateShareCode(code: string): Promise<{ school: string; division: string; type: string } | null> {
  const result = await dbPg
    .select({
      school: shareCodes.school,
      division: shareCodes.division,
      type: shareCodes.type,
    })
    .from(shareCodes)
    .where(
      and(
        eq(shareCodes.code, code),
        sql`${shareCodes.expiresAt} > now()`
      )
    )
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    school: row.school,
    division: row.division,
    type: row.type,
  };
}

/**
 * Clean up expired share codes using Drizzle ORM
 */
export async function cleanupExpiredCodes(): Promise<void> {
  await dbPg
    .delete(shareCodes)
    .where(sql`${shareCodes.expiresAt} <= now()`);
}

/**
 * List share codes for a school and division using Drizzle ORM
 * @param {string} school - School name
 * @param {string} division - Division ('B' or 'C')
 * @returns {Promise<ShareCode[]>} Array of share codes
 */
export async function listShareCodes(school: string, division: 'B' | 'C'): Promise<ShareCode[]> {
  const result = await dbPg
    .select({
      id: shareCodes.id,
      school: shareCodes.school,
      division: shareCodes.division,
      type: shareCodes.type,
      code: shareCodes.code,
      expiresAt: shareCodes.expiresAt,
      createdAt: shareCodes.createdAt,
    })
    .from(shareCodes)
    .where(
      and(
        eq(shareCodes.school, school),
        eq(shareCodes.division, division)
      )
    )
    .orderBy(desc(shareCodes.createdAt));

  return result.map(row => ({
    id: row.id,
    school: row.school,
    division: row.division,
    type: row.type,
    code: row.code,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }));
}

/**
 * Delete share code using Drizzle ORM
 * @param {string} code - Share code to delete
 * @returns {Promise<boolean>} True if code was deleted
 */
export async function deleteShareCode(code: string): Promise<boolean> {
  const result = await dbPg
    .delete(shareCodes)
    .where(eq(shareCodes.code, code))
    .returning({ id: shareCodes.id });

  return result.length > 0;
}
