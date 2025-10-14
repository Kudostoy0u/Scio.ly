/**
 * Team membership operations
 */

import { pool } from '../pool';
import type { TeamMembership } from './types';

/**
 * Add user to team
 * @param {string} userId - User ID
 * @param {string} teamUnitId - Team unit ID
 * @param {string} role - User role ('captain' or 'user')
 * @returns {Promise<TeamMembership>} Created membership
 */
export async function addUserToTeam(userId: string, teamUnitId: string, role: 'captain' | 'user'): Promise<TeamMembership> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      INSERT INTO team_memberships (user_id, team_unit_id, role, created_at)
      VALUES ($1, $2::INT8, $3, now())
      RETURNING id, user_id, team_unit_id, role, created_at
    `, [userId, teamUnitId, role]);
    
    const row = rows[0];
    return {
      id: row.id.toString(),
      userId: row.user_id,
      teamUnitId: row.team_unit_id.toString(),
      role: row.role,
      createdAt: row.created_at
    };
  } finally { client.release(); }
}

/**
 * Get user's team memberships
 * @param {string} userId - User ID
 * @returns {Promise<TeamMembership[]>} Array of memberships
 */
export async function getUserTeamMemberships(userId: string): Promise<TeamMembership[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT id, user_id, team_unit_id, role, created_at
      FROM team_memberships
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    return rows.map(row => ({
      id: row.id.toString(),
      userId: row.user_id,
      teamUnitId: row.team_unit_id.toString(),
      role: row.role,
      createdAt: row.created_at
    }));
  } finally { client.release(); }
}

/**
 * Check if user is member of team
 * @param {string} userId - User ID
 * @param {string} teamUnitId - Team unit ID
 * @returns {Promise<boolean>} True if user is member
 */
export async function isUserMemberOfTeam(userId: string, teamUnitId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT 1 FROM team_memberships
      WHERE user_id = $1 AND team_unit_id = $2::INT8
      LIMIT 1
    `, [userId, teamUnitId]);
    return rows.length > 0;
  } finally { client.release(); }
}

/**
 * Get team members
 * @param {string} teamUnitId - Team unit ID
 * @returns {Promise<TeamMembership[]>} Array of team members
 */
export async function getTeamMembers(teamUnitId: string): Promise<TeamMembership[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT id, user_id, team_unit_id, role, created_at
      FROM team_memberships
      WHERE team_unit_id = $1::INT8
      ORDER BY role DESC, created_at ASC
    `, [teamUnitId]);
    
    return rows.map(row => ({
      id: row.id.toString(),
      userId: row.user_id,
      teamUnitId: row.team_unit_id.toString(),
      role: row.role,
      createdAt: row.created_at
    }));
  } finally { client.release(); }
}

/**
 * Remove user from team
 * @param {string} userId - User ID
 * @param {string} teamUnitId - Team unit ID
 * @returns {Promise<boolean>} True if user was removed
 */
export async function removeUserFromTeam(userId: string, teamUnitId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(`
      DELETE FROM team_memberships
      WHERE user_id = $1 AND team_unit_id = $2::INT8
    `, [userId, teamUnitId]);
    return (rowCount ?? 0) > 0;
  } finally { client.release(); }
}

/**
 * Delete user memberships
 * @param {string} userId - User ID
 * @param {string | number} teamUnitId - Optional team unit ID
 * @returns {Promise<number>} Number of deleted memberships
 */
export async function deleteUserMemberships(userId: string, teamUnitId?: string | number): Promise<number> {
  const client = await pool.connect();
  try {
    if (teamUnitId !== undefined && teamUnitId !== null) {
      const { rowCount } = await client.query(`DELETE FROM team_memberships WHERE user_id=$1 AND team_unit_id=$2::INT8`, [userId, teamUnitId]);
      return rowCount ?? 0;
    }
    const { rowCount } = await client.query(`DELETE FROM team_memberships WHERE user_id=$1`, [userId]);
    return rowCount ?? 0;
  } finally { client.release(); }
}

/**
 * Check if user is captain of school division
 * @param {string} userId - User ID
 * @param {string} school - School name
 * @param {string} division - Division ('B' or 'C')
 * @returns {Promise<boolean>} True if user is captain
 */
export async function isUserCaptainOfSchoolDivision(userId: string, school: string, division: 'B'|'C'): Promise<boolean> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT 1
       FROM team_memberships m
       JOIN team_units u ON u.id = m.team_unit_id
       WHERE m.user_id = $1 AND u.school = $2 AND u.division = $3 AND m.role = 'captain'
       LIMIT 1`,
      [userId, school, division]
    );
    return rows.length > 0;
  } finally { client.release(); }
}
