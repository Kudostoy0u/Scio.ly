import { pool } from "./pool";

export async function initExtrasDatabase() {
  const client = await pool.connect();
  try {
    // Ensure extras tables exist (do not drop unrelated tables)

    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        school VARCHAR(255) NOT NULL,
        division CHAR(1) NOT NULL CHECK (division IN ('B','C')),
        team_id VARCHAR(10) NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        assignees JSONB NOT NULL,
        params JSONB NOT NULL,
        questions JSONB NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_assignments_team ON assignments(school, division, team_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assignment_results (
        id SERIAL PRIMARY KEY,
        assignment_id INT NOT NULL,
        user_id VARCHAR(255),
        name VARCHAR(255),
        event_name VARCHAR(255),
        score NUMERIC,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        detail JSONB,
        CONSTRAINT fk_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
      );
    `);

    // New invites v2 table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invites_v2 (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        inviter_user_id VARCHAR(255) NOT NULL,
        invitee_username VARCHAR(255) NOT NULL,
        invitee_user_id VARCHAR(255),
        school VARCHAR(255) NOT NULL,
        division CHAR(1) NOT NULL CHECK (division IN ('B','C')),
        team_id VARCHAR(10) NOT NULL,
        code UUID NOT NULL DEFAULT gen_random_uuid(),
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        CONSTRAINT uq_pending_invite UNIQUE (invitee_username, school, division, team_id, status)
      );
      CREATE INDEX IF NOT EXISTS idx_invites_v2_invitee ON invites_v2(invitee_username, status);
      CREATE INDEX IF NOT EXISTS idx_invites_v2_team ON invites_v2(school, division, team_id);
    `);
  } finally {
    client.release();
  }
}

// Purged legacy notifications/linking helpers

export async function createAssignment(data: {
  school: string;
  division: "B" | "C";
  teamId: string;
  eventName: string;
  assignees: Array<{ name: string; userId?: string }>;
  params: any;
  questions: any;
  createdBy: string;
}) {
  const client = await pool.connect();
  try {
    await initExtrasDatabase();
    const res = await client.query(
      "INSERT INTO assignments (school, division, team_id, event_name, assignees, params, questions, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [
        data.school,
        data.division,
        data.teamId,
        data.eventName,
        JSON.stringify(data.assignees),
        JSON.stringify(data.params),
        JSON.stringify(data.questions),
        data.createdBy,
      ]
    );
    const assignment = res.rows[0];

    // Notification dispatch removed in new architecture

    return assignment;
  } finally {
    client.release();
  }
}

export async function listRecentAssignments(school: string, division: "B" | "C") {
  const client = await pool.connect();
  try {
    await initExtrasDatabase();
    const res = await client.query(
      "SELECT id, event_name, created_at, assignees FROM assignments WHERE school = $1 AND division = $2 ORDER BY created_at DESC LIMIT 50",
      [school, division]
    );
    return res.rows;
  } finally {
    client.release();
  }
}

export async function listRecentResults(school: string, division: "B" | "C") {
  const client = await pool.connect();
  try {
    await initExtrasDatabase();
    const res = await client.query(
      "SELECT ar.*, a.event_name FROM assignment_results ar JOIN assignments a ON a.id = ar.assignment_id WHERE a.school = $1 AND a.division = $2 ORDER BY ar.submitted_at DESC LIMIT 100",
      [school, division]
    );
    return res.rows;
  } finally {
    client.release();
  }
}

export async function deleteAssignmentResult(id: number | string) {
  const client = await pool.connect();
  try {
    await initExtrasDatabase();
    await client.query("DELETE FROM assignment_results WHERE id=$1::INT8", [id]);
    return true;
  } finally {
    client.release();
  }
}

export async function deleteAssignment(id: number | string) {
  const client = await pool.connect();
  try {
    await initExtrasDatabase();
    await client.query("DELETE FROM assignments WHERE id=$1::INT8", [id]);
    return true;
  } finally {
    client.release();
  }
}

export async function getAssignmentById(id: number | string) {
  const client = await pool.connect();
  try {
    await initExtrasDatabase();
    const res = await client.query("SELECT * FROM assignments WHERE id=$1::INT8", [id]);
    return res.rows[0] || null;
  } finally {
    client.release();
  }
}

// Invites v2 helpers
export async function createInvite(
  inviterUserId: string,
  inviteeUsername: string,
  school: string,
  division: "B" | "C",
  teamId: string
) {
  const client = await pool.connect();
  try {
    await initExtrasDatabase();
    // If a pending exists, return it; else insert
    const existing = await client.query(
      `SELECT * FROM invites_v2 WHERE invitee_username=$1 AND school=$2 AND division=$3 AND team_id=$4 AND status='pending' LIMIT 1`,
      [inviteeUsername, school, division, teamId]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
    const res = await client.query(
      "INSERT INTO invites_v2 (inviter_user_id, invitee_username, school, division, team_id) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [inviterUserId, inviteeUsername, school, division, teamId]
    );
    return res.rows[0];
  } finally {
    client.release();
  }
}

export async function listInvitesByUsername(inviteeUsername: string) {
  const client = await pool.connect();
  try {
    await initExtrasDatabase();
    const res = await client.query(
      `SELECT * FROM invites_v2 WHERE invitee_username=$1 AND status='pending' ORDER BY created_at DESC`,
      [inviteeUsername]
    );
    return res.rows;
  } finally {
    client.release();
  }
}

export async function acceptInvite(inviteId: number) {
  const client = await pool.connect();
  try {
    await initExtrasDatabase();
    await client.query("BEGIN");
    const res = await client.query("SELECT * FROM invites_v2 WHERE id=$1 FOR UPDATE", [inviteId]);
    if (res.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const inv = res.rows[0];
    if (inv.status !== "pending") {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query(`UPDATE invites_v2 SET status='accepted' WHERE id=$1`, [inviteId]);
    // decline duplicates for same user+team
    await client.query(
      `UPDATE invites_v2 SET status='declined' WHERE invitee_username=$1 AND school=$2 AND division=$3 AND team_id=$4 AND status='pending' AND id<>$5`,
      [inv.invitee_username, inv.school, inv.division, inv.team_id, inviteId]
    );
    await client.query("COMMIT");
    return inv;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}

export async function declineInvite(inviteId: number) {
  const client = await pool.connect();
  try {
    await initExtrasDatabase();
    await client.query(`UPDATE invites_v2 SET status='declined' WHERE id=$1 AND status='pending'`, [
      inviteId,
    ]);
  } finally {
    client.release();
  }
}
