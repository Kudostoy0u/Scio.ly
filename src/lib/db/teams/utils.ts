/**
 * Utility functions for team operations
 */

import { pool } from '../pool';

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
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  photoUrl?: string;
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO users (id, email, name, school, created_at, updated_at)
      VALUES ($1, $2, $3, $4, now(), now())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        school = COALESCE(EXCLUDED.school, users.school),
        updated_at = now()
    `, [params.id || params.userId || '', params.email, params.name, params.school]);
  } finally {
    client.release();
  }
}
