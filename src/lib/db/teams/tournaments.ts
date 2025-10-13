/**
 * Tournament operations
 */

import { pool } from '../pool';
import type { GroupTournament } from './types';

// Ensure tournaments table exists
let tournamentsTableEnsured = false;
async function ensureGroupTournamentsTable() {
  if (tournamentsTableEnsured) return;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_group_tournaments (
        id           INT8 PRIMARY KEY DEFAULT unique_rowid(),
        group_id     INT8 NOT NULL,
        name         STRING NOT NULL,
        date_time    TIMESTAMP NOT NULL,
        created_at   TIMESTAMP NOT NULL DEFAULT now(),
        updated_at   TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS team_group_tournaments_group_idx ON team_group_tournaments (group_id);
    `);
    tournamentsTableEnsured = true;
  } finally {
    client.release();
  }
}

/**
 * List group tournaments
 * @param {string | number} groupId - Group ID
 * @returns {Promise<GroupTournament[]>} Array of tournaments
 */
export async function listGroupTournaments(groupId: string | number): Promise<GroupTournament[]> {
  await ensureGroupTournamentsTable();
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT id, group_id, name, date_time, created_at, updated_at
      FROM team_group_tournaments
      WHERE group_id = $1::INT8
      ORDER BY date_time ASC
    `, [groupId]);
    return rows.map((r) => ({
      id: r.id.toString(),
      groupId: r.group_id?.toString?.() || String(r.group_id),
      name: r.name,
      dateTime: (r.date_time instanceof Date ? r.date_time : new Date(r.date_time)).toISOString(),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } finally { client.release(); }
}

/**
 * Add group tournament
 * @param {string | number} groupId - Group ID
 * @param {string} name - Tournament name
 * @param {string} dateTimeISO - Tournament date/time in ISO format
 * @returns {Promise<GroupTournament>} Created tournament
 */
export async function addGroupTournament(groupId: string | number, name: string, dateTimeISO: string): Promise<GroupTournament> {
  await ensureGroupTournamentsTable();
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      INSERT INTO team_group_tournaments (group_id, name, date_time)
      VALUES ($1::INT8, $2, $3::TIMESTAMP)
      RETURNING id, group_id, name, date_time, created_at, updated_at
    `, [groupId, name, dateTimeISO]);
    const r = rows[0];
    return {
      id: r.id.toString(),
      groupId: r.group_id?.toString?.() || String(r.group_id),
      name: r.name,
      dateTime: (r.date_time instanceof Date ? r.date_time : new Date(r.date_time)).toISOString(),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  } finally { client.release(); }
}

/**
 * Delete group tournament
 * @param {string | number} groupId - Group ID
 * @param {string | number} id - Tournament ID
 * @returns {Promise<boolean>} True if tournament was deleted
 */
export async function deleteGroupTournament(groupId: string | number, id: string | number): Promise<boolean> {
  await ensureGroupTournamentsTable();
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(`
      DELETE FROM team_group_tournaments
      WHERE group_id=$1::INT8 AND id=$2::INT8
    `, [groupId, id]);
    return (rowCount ?? 0) > 0;
  } finally { client.release(); }
}
