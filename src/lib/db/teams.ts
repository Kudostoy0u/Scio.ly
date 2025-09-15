import { Pool } from 'pg';

// Database connection pool
const pool = new Pool({
  connectionString: "postgresql://kundan:jTucKCVvP7D1cRbB8doSVg@scioly-14433.j77.aws-us-east-2.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full",
  ssl: {
    rejectUnauthorized: false
  }
});

// Team data structure
export interface TeamData {
  id: string;
  school: string;
  division: 'B' | 'C';
  teams: Array<{
    id: string;
    name: string;
    roster: Record<string, string[]>;
  }>;
  captainCode: string;
  userCode: string;
  createdAt: Date;
  updatedAt: Date;
}

// New team unit structure (one row per team)
export interface TeamUnit {
  id: string;          // sequential or UUID
  school: string;
  division: 'B' | 'C';
  teamId: string;      // display id like 'A', 'B', ...
  name: string;        // team name
  roster: Record<string, string[]>;
  captainCode: string;
  userCode: string;
  slug: string;        // unique slug for deep link /teams/[slug]
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamGroup {
  id: string;
  school: string;
  division: 'B' | 'C';
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMembership {
  id: string;
  userId: string;
  teamUnitId: string;
  role: 'captain' | 'user';
  createdAt: Date;
}

// Share code structure
export interface ShareCode {
  code: string;
  type: 'captain' | 'user';
  school: string;
  division: 'B' | 'C';
  expiresAt: Date;
  createdAt: Date;
}

// Generate a random code
function generateCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Exported helper for generating permanent captain/user codes
export function generateRandomCode(length: number = 12): string {
  return generateCode(length);
}

// Save team data
export async function saveTeamData(teamData: Omit<TeamData, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamData> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO teams (school, division, teams, captain_code, user_code)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (school, division) 
      DO UPDATE SET 
        teams = EXCLUDED.teams,
        captain_code = EXCLUDED.captain_code,
        user_code = EXCLUDED.user_code,
        updated_at = NOW()
      RETURNING *
    `, [
      teamData.school,
      teamData.division,
      JSON.stringify(teamData.teams),
      teamData.captainCode,
      teamData.userCode
    ]);

    const row = result.rows[0];
    return {
      id: row.id.toString(),
      school: row.school,
      division: row.division,
      teams: row.teams,
      captainCode: row.captain_code,
      userCode: row.user_code,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error saving team data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Load team data by school and division
export async function loadTeamData(school: string, division: 'B' | 'C'): Promise<TeamData | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM teams WHERE school = $1 AND division = $2
    `, [school, division]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id.toString(),
      school: row.school,
      division: row.division,
      teams: row.teams,
      captainCode: row.captain_code,
      userCode: row.user_code,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error loading team data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Load team data by share code
export async function loadTeamDataByCode(code: string): Promise<{ teamData: TeamData; type: 'captain' | 'user' } | null> {
  const client = await pool.connect();
  try {
    // First check if it's a permanent code
    let result = await client.query(`
      SELECT *, 'captain' as type FROM teams WHERE captain_code = $1
      UNION ALL
      SELECT *, 'user' as type FROM teams WHERE user_code = $1
    `, [code]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        teamData: {
          id: row.id.toString(),
          school: row.school,
          division: row.division,
          teams: row.teams,
          captainCode: row.captain_code,
          userCode: row.user_code,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        },
        type: row.type
      };
    }

    // Check normalized team_units permanent codes (single team)
    result = await client.query(
      `SELECT *, 'captain' as type FROM team_units WHERE captain_code = $1
       UNION ALL
       SELECT *, 'user' as type FROM team_units WHERE user_code = $1`,
      [code]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        teamData: {
          id: row.id.toString(),
          school: row.school,
          division: row.division,
          teams: [{ id: row.team_id, name: row.name, roster: row.roster }],
          captainCode: row.captain_code,
          userCode: row.user_code,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        type: row.type,
      };
    }

    // Check temporary share codes
    result = await client.query(`
      SELECT * FROM share_codes 
      WHERE code = $1 AND expires_at > NOW()
    `, [code]);

    if (result.rows.length === 0) {
      return null;
    }

    const shareCode = result.rows[0];
    const teamData = await loadTeamData(shareCode.school, shareCode.division);
    
    if (!teamData) {
      return null;
    }

    return {
      teamData,
      type: shareCode.type
    };
  } catch (error) {
    console.error('Error loading team data by code:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Create a temporary share code
export async function createShareCode(school: string, division: 'B' | 'C', type: 'captain' | 'user', expiresInHours: number = 24): Promise<string> {
  const client = await pool.connect();
  try {
    const code = generateCode(12);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await client.query(`
      INSERT INTO share_codes (code, type, school, division, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [code, type, school, division, expiresAt]);

    return code;
  } catch (error) {
    console.error('Error creating share code:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Clean up expired share codes
export async function cleanupExpiredCodes() {
  const client = await pool.connect();
  try {
    await client.query(`
      DELETE FROM share_codes WHERE expires_at <= NOW()
    `);
  } catch (error) {
    console.error('Error cleaning up expired codes:', error);
  } finally {
    client.release();
  }
}

// Close the database connection pool
export async function closePool() {
  await pool.end();
}

// Ensure a Cockroach `users` row exists for a Supabase user
export async function upsertUserProfile(params: {
  id: string;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  photoUrl?: string | null;
}): Promise<void> {
  const client = await pool.connect();
  try {
    const email = (params.email || '').toString();
    const fallbackUsername = email ? email.split('@')[0] : (params.username || 'user');
    const username = (params.username || fallbackUsername).toString();
    await client.query(
      `INSERT INTO users (id, email, username, first_name, last_name, display_name, photo_url)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         display_name = EXCLUDED.display_name,
         photo_url = EXCLUDED.photo_url,
         updated_at = NOW()`,
      [params.id, email, username, params.firstName ?? null, params.lastName ?? null, params.displayName ?? null, params.photoUrl ?? null]
    );
  } finally { client.release(); }
}

// --- Team Group Tournaments ---
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

export type GroupTournament = { id: string; groupId: string; name: string; dateTime: string; createdAt: Date; updatedAt: Date };

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

// Team Units API helpers
export async function listTeamUnits(school: string, division: 'B'|'C'): Promise<TeamUnit[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM team_units WHERE school=$1 AND division=$2 ORDER BY team_id ASC`, [school, division]);
    return rows.map((row) => ({
      id: row.id.toString(),
      school: row.school,
      division: row.division,
      teamId: row.team_id,
      name: row.name,
      roster: row.roster,
      captainCode: row.captain_code,
      userCode: row.user_code,
      slug: row.slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } finally { client.release(); }
}

// Group helpers
export async function getOrCreateTeamGroup(school: string, division: 'B'|'C'): Promise<TeamGroup> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM team_groups WHERE school=$1 AND division=$2 ORDER BY created_at ASC LIMIT 1`, [school, division]);
    if (rows.length > 0) {
      const row = rows[0];
      return { id: row.id.toString(), school: row.school, division: row.division, slug: row.slug, createdAt: row.created_at, updatedAt: row.updated_at };
    }
    const slug = generateCode(12).toLowerCase();
    const insert = await client.query(`INSERT INTO team_groups (school, division, slug) VALUES ($1,$2,$3) RETURNING *`, [school, division, slug]);
    const row = insert.rows[0];
    return { id: row.id.toString(), school: row.school, division: row.division, slug: row.slug, createdAt: row.created_at, updatedAt: row.updated_at };
  } finally { client.release(); }
}

export async function createNewTeamGroup(school: string, division: 'B'|'C'): Promise<TeamGroup> {
  const client = await pool.connect();
  try {
    const slug = generateCode(12).toLowerCase();
    const insert = await client.query(`INSERT INTO team_groups (school, division, slug) VALUES ($1,$2,$3) RETURNING *`, [school, division, slug]);
    const row = insert.rows[0];
    return { id: row.id.toString(), school: row.school, division: row.division, slug: row.slug, createdAt: row.created_at, updatedAt: row.updated_at };
  } finally { client.release(); }
}

export async function createInitialUnitForGroup(group: TeamGroup): Promise<TeamUnit> {
  const client = await pool.connect();
  try {
    const name = 'Team A';
    const teamId = 'A';
    const captainCode = generateRandomCode(12);
    const userCode = generateRandomCode(12);
    const slug = generateCode(12);
    const insert = await client.query(
      `INSERT INTO team_units (school, division, team_id, name, roster, captain_code, user_code, slug, group_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [group.school, group.division, teamId, name, {}, captainCode, userCode, slug, group.id]
    );
    const row = insert.rows[0];
    return {
      id: row.id.toString(),
      school: row.school,
      division: row.division,
      teamId: row.team_id,
      name: row.name,
      roster: row.roster,
      captainCode: row.captain_code,
      userCode: row.user_code,
      slug: row.slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } finally { client.release(); }
}

export async function loadTeamGroupBySlug(slug: string): Promise<TeamGroup | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM team_groups WHERE slug=$1 LIMIT 1`, [slug]);
    if (rows.length === 0) return null;
    const row = rows[0];
    return { id: row.id.toString(), school: row.school, division: row.division, slug: row.slug, createdAt: row.created_at, updatedAt: row.updated_at };
  } finally { client.release(); }
}

export async function listTeamUnitsForGroup(groupId: string | number): Promise<TeamUnit[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM team_units WHERE group_id=$1::INT8 ORDER BY team_id ASC`, [groupId]);
    return rows.map((row) => ({
      id: row.id.toString(),
      school: row.school,
      division: row.division,
      teamId: row.team_id,
      name: row.name,
      roster: row.roster,
      captainCode: row.captain_code,
      userCode: row.user_code,
      slug: row.slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } finally { client.release(); }
}

export async function getUserRoleForGroup(userId: string, groupId: string | number): Promise<'captain'|'user'|null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT CASE WHEN bool_or(m.role = 'captain') THEN 'captain' ELSE 'user' END AS role
       FROM team_memberships m
       JOIN team_units u ON u.id = m.team_unit_id
       WHERE m.user_id = $1 AND u.group_id = $2::INT8`,
      [userId, groupId]
    );
    if (rows.length === 0 || rows[0].role == null) return null;
    return rows[0].role as 'captain'|'user';
  } finally { client.release(); }
}

export async function getPrimaryGroupForUser(userId: string): Promise<{ group: TeamGroup; preferredTeamId: string | null } | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT u.group_id, u.team_id, g.school, g.division, g.slug, g.id AS gid, m.role, m.created_at
       FROM team_memberships m
       JOIN team_units u ON u.id = m.team_unit_id
       JOIN team_groups g ON g.id = u.group_id
       WHERE m.user_id = $1
       ORDER BY m.created_at ASC
       LIMIT 1`,
      [userId]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return { group: { id: r.gid.toString(), school: r.school, division: r.division, slug: r.slug, createdAt: r.created_at, updatedAt: r.updated_at }, preferredTeamId: r.team_id } as any;
  } finally { client.release(); }
}

export async function loadTeamUnit(school: string, division: 'B'|'C', teamId: string): Promise<TeamUnit | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM team_units WHERE school=$1 AND division=$2 AND team_id=$3 LIMIT 1`, [school, division, teamId]);
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id.toString(),
      school: row.school,
      division: row.division,
      teamId: row.team_id,
      name: row.name,
      roster: row.roster,
      captainCode: row.captain_code,
      userCode: row.user_code,
      slug: row.slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } finally { client.release(); }
}

export async function getGroupForUnit(school: string, division: 'B'|'C', teamId: string): Promise<TeamGroup | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT g.* FROM team_units u JOIN team_groups g ON g.id = u.group_id
       WHERE u.school=$1 AND u.division=$2 AND u.team_id=$3 LIMIT 1`,
      [school, division, teamId]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return { id: row.id.toString(), school: row.school, division: row.division, slug: row.slug, createdAt: row.created_at, updatedAt: row.updated_at };
  } finally { client.release(); }
}

export async function loadTeamUnitBySlug(slug: string): Promise<TeamUnit | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT * FROM team_units WHERE slug=$1 LIMIT 1`, [slug]);
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id.toString(),
      school: row.school,
      division: row.division,
      teamId: row.team_id,
      name: row.name,
      roster: row.roster,
      captainCode: row.captain_code,
      userCode: row.user_code,
      slug: row.slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } finally { client.release(); }
}

export async function createTeamUnit(school: string, division: 'B'|'C'): Promise<TeamUnit> {
  const client = await pool.connect();
  try {
    const group = await getOrCreateTeamGroup(school, division);
    return await createTeamUnitInGroup(group);
  } finally { client.release(); }
}

export async function createTeamUnitInGroup(group: TeamGroup): Promise<TeamUnit> {
  const client = await pool.connect();
  try {
    const { rows: existing } = await client.query(`SELECT team_id FROM team_units WHERE group_id=$1::INT8 ORDER BY team_id DESC LIMIT 1`, [group.id]);
    let nextId = 'A';
    if (existing.length > 0) {
      const last = existing[0].team_id as string;
      const code = last.charCodeAt(0);
      nextId = String.fromCharCode(code + 1);
    }
    const name = `Team ${nextId}`;
    const captainCode = generateRandomCode(12);
    const userCode = generateRandomCode(12);
    const slug = generateCode(12);
    const insert = await client.query(
      `INSERT INTO team_units (school, division, team_id, name, roster, captain_code, user_code, slug, group_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [group.school, group.division, nextId, name, {}, captainCode, userCode, slug, group.id]
    );
    const row = insert.rows[0];
    return {
      id: row.id.toString(),
      school: row.school,
      division: row.division,
      teamId: row.team_id,
      name: row.name,
      roster: row.roster,
      captainCode: row.captain_code,
      userCode: row.user_code,
      slug: row.slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } finally { client.release(); }
}

export async function renameTeamUnit(school: string, division: 'B'|'C', teamId: string, name: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`UPDATE team_units SET name=$1, updated_at=NOW() WHERE school=$2 AND division=$3 AND team_id=$4`, [name, school, division, teamId]);
  } finally { client.release(); }
}

export async function deleteTeamUnit(school: string, division: 'B'|'C', teamId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM team_units WHERE school=$1 AND division=$2 AND team_id=$3`, [school, division, teamId]);
  } finally { client.release(); }
}

export async function saveTeamUnitRoster(school: string, division: 'B'|'C', teamId: string, roster: Record<string, string[]>): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`UPDATE team_units SET roster=$1, updated_at=NOW() WHERE school=$2 AND division=$3 AND team_id=$4`, [roster, school, division, teamId]);
  } finally { client.release(); }
}

export async function addMemberToTeam(teamUnitId: string | number, userId: string, role: 'captain'|'user'): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO team_memberships (user_id, team_unit_id, role)
       VALUES ($1, $2::INT8, $3)
       ON CONFLICT (user_id, team_unit_id) DO UPDATE SET role=EXCLUDED.role`,
      [userId, teamUnitId, role]
    );
  } finally { client.release(); }
}

export async function getUserTeamMemberships(userId: string): Promise<Array<{ team: TeamUnit; role: 'captain'|'user' }>> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT m.role, u.* FROM team_memberships m
       JOIN team_units u ON u.id = m.team_unit_id
       WHERE m.user_id=$1
       ORDER BY u.school, u.division, u.team_id`,
      [userId]
    );
    return rows.map((row) => ({
      role: row.role,
      team: {
        id: row.id.toString(),
        school: row.school,
        division: row.division,
        teamId: row.team_id,
        name: row.name,
        roster: row.roster,
        captainCode: row.captain_code,
        userCode: row.user_code,
        slug: row.slug,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    }));
  } finally { client.release(); }
}

export async function getUserMembershipForUnit(userId: string, teamUnitId: string | number): Promise<'captain'|'user'|null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT role FROM team_memberships WHERE user_id=$1 AND team_unit_id=$2::INT8 LIMIT 1`,
      [userId, teamUnitId]
    );
    if (rows.length === 0) return null;
    return rows[0].role as 'captain'|'user';
  } finally { client.release(); }
}

// Returns the user_id of the earliest-created captain for a given unit
export async function getEarliestCaptainUserIdForUnitById(teamUnitId: string | number): Promise<string | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT user_id FROM team_memberships WHERE team_unit_id=$1::INT8 AND role='captain' ORDER BY created_at ASC LIMIT 1`,
      [teamUnitId]
    );
    if (rows.length === 0) return null;
    return rows[0].user_id as string;
  } finally { client.release(); }
}

export async function listUnitMembers(school: string, division: 'B'|'C', teamId: string): Promise<Array<{ userId: string, username: string | null, displayName: string | null, firstName: string | null, lastName: string | null, role: 'captain'|'user' }>> {
  const client = await pool.connect();
  try {
    const unit = await loadTeamUnit(school, division, teamId);
    if (!unit) return [];
    const { rows } = await client.query(
      `SELECT m.user_id as user_id, m.role as role, u.username as username, u.display_name as display_name, u.first_name as first_name, u.last_name as last_name
       FROM team_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.team_unit_id = $1::INT8
       ORDER BY m.created_at ASC`,
      [unit.id]
    );
    return rows.map((r) => ({ userId: r.user_id as string, username: r.username ?? null, displayName: r.display_name ?? null, firstName: r.first_name ?? null, lastName: r.last_name ?? null, role: r.role as 'captain'|'user' }));
  } finally { client.release(); }
}

export async function setUnitMemberRole(school: string, division: 'B'|'C', teamId: string, targetUserId: string, role: 'captain'|'user'): Promise<boolean> {
  const client = await pool.connect();
  try {
    const unit = await loadTeamUnit(school, division, teamId);
    if (!unit) return false;
    const { rowCount } = await client.query(
      `UPDATE team_memberships SET role=$1, updated_at=NOW()
       WHERE team_unit_id=$2::INT8 AND user_id=$3`,
      [role, unit.id, targetUserId]
    );
    return (rowCount ?? 0) > 0;
  } finally { client.release(); }
}

export async function removeUnitMember(school: string, division: 'B'|'C', teamId: string, targetUserId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const unit = await loadTeamUnit(school, division, teamId);
    if (!unit) return false;
    const { rowCount } = await client.query(
      `DELETE FROM team_memberships WHERE team_unit_id=$1::INT8 AND user_id=$2`,
      [unit.id, targetUserId]
    );
    return (rowCount ?? 0) > 0;
  } finally { client.release(); }
}

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
