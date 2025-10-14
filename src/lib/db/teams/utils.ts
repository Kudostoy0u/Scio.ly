/**
 * Utility functions for team operations
 */

import { dbPg, pool } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import logger from '@/lib/utils/logger';

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
 * Close the database connection pool
 */
export async function closePool() {
  await pool.end();
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
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  photoUrl?: string | null;
}): Promise<void> {
  const startedAt = Date.now();
  try {
    const id = params.id || params.userId || '';
    if (!id || typeof id !== 'string') {
      throw new Error('upsertUserProfile: missing or invalid id');
    }
    if (!params.email || typeof params.email !== 'string') {
      throw new Error('upsertUserProfile: missing or invalid email');
    }

    // Map legacy 'name' to display_name if displayName not provided
    const resolvedDisplayName = (params.displayName ?? params.name);

    // Ensure username (non-nullable in Drizzle schema). Fallback from email local part.
    const fallbackUsername = ((): string => {
      if (typeof params.username === 'string' && params.username.trim()) return params.username.trim();
      const local = params.email.split('@')[0] || 'user';
      return local;
    })();

    // Prepare insert values
    const insertValues: typeof schema.users.$inferInsert = {
      id,
      email: params.email,
      username: fallbackUsername,
      // Use undefined for optional columns when not provided to avoid TS null issues
      displayName: resolvedDisplayName !== undefined ? resolvedDisplayName : undefined,
      firstName: params.firstName !== undefined ? params.firstName : undefined,
      lastName: params.lastName !== undefined ? params.lastName : undefined,
      photoUrl: params.photoUrl !== undefined ? params.photoUrl : undefined,
    };

    // Prepare update set only for provided (non-undefined) fields to avoid overwriting with nulls
    const updateSet: Partial<typeof schema.users.$inferInsert> & { updatedAt?: Date } = {
      email: params.email,
      updatedAt: new Date(),
    };
    if (params.username !== undefined && typeof params.username === 'string' && params.username.trim()) {
      updateSet.username = params.username.trim();
    }
    if (resolvedDisplayName !== undefined) updateSet.displayName = resolvedDisplayName;
    if (params.firstName !== undefined) updateSet.firstName = params.firstName;
    if (params.lastName !== undefined) updateSet.lastName = params.lastName;
    if (params.photoUrl !== undefined) updateSet.photoUrl = params.photoUrl;

    logger.dev.db('UPSERT', 'users (drizzle)', 'insert ... onConflictDoUpdate(id)', [
      { insertValues },
      { updateSet },
    ]);

    await dbPg.insert(schema.users)
      .values(insertValues)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: updateSet as any,
      });

    logger.dev.timing('upsertUserProfile', startedAt, { id });
  } catch (err: any) {
    logger.error('upsertUserProfile failed', err);
    logger.dev.error('upsertUserProfile failed', err instanceof Error ? err : new Error(String(err)), {
      id: params.id || params.userId,
      hasEmail: !!params.email,
      hasUsername: !!params.username,
      hasDisplayName: !!params.displayName,
    });
    throw err;
  }
}
