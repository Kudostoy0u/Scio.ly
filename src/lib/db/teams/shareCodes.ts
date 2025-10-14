/**
 * Share code operations
 */

import { pool } from '../pool';
import type { ShareCode } from './types';

/**
 * Create a temporary share code
 * @param {string} school - School name
 * @param {string} division - Division ('B' or 'C')
 * @param {string} type - Code type ('captain' or 'user')
 * @param {number} expiresInHours - Hours until expiration (default 24)
 * @returns {Promise<string>} Created share code
 */
export async function createShareCode(school: string, division: 'B' | 'C', type: 'captain' | 'user', expiresInHours: number = 24): Promise<string> {
  const client = await pool.connect();
  try {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    await client.query(`
      INSERT INTO share_codes (school, division, type, code, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, now())
    `, [school, division, type, code, expiresAt]);
    
    return code;
  } finally { client.release(); }
}

/**
 * Validate share code
 * @param {string} code - Share code to validate
 * @returns {Promise<{school: string; division: string; type: string} | null>} Code info or null if invalid
 */
export async function validateShareCode(code: string): Promise<{ school: string; division: string; type: string } | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT school, division, type
      FROM share_codes
      WHERE code = $1 AND expires_at > now()
      LIMIT 1
    `, [code]);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      school: row.school,
      division: row.division,
      type: row.type
    };
  } finally { client.release(); }
}

/**
 * Clean up expired share codes
 */
export async function cleanupExpiredCodes() {
  const client = await pool.connect();
  try {
    await client.query(`
      DELETE FROM share_codes
      WHERE expires_at <= now()
    `);
  } finally { client.release(); }
}

/**
 * List share codes for a school and division
 * @param {string} school - School name
 * @param {string} division - Division ('B' or 'C')
 * @returns {Promise<ShareCode[]>} Array of share codes
 */
export async function listShareCodes(school: string, division: 'B' | 'C'): Promise<ShareCode[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT id, school, division, type, code, expires_at, created_at
      FROM share_codes
      WHERE school = $1 AND division = $2
      ORDER BY created_at DESC
    `, [school, division]);
    
    return rows.map(row => ({
      id: row.id.toString(),
      school: row.school,
      division: row.division,
      type: row.type,
      code: row.code,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    }));
  } finally { client.release(); }
}

/**
 * Delete share code
 * @param {string} code - Share code to delete
 * @returns {Promise<boolean>} True if code was deleted
 */
export async function deleteShareCode(code: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(`
      DELETE FROM share_codes
      WHERE code = $1
    `, [code]);
    return (rowCount ?? 0) > 0;
  } finally { client.release(); }
}
