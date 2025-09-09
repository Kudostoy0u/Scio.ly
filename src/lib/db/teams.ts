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

// Share code structure
export interface ShareCode {
  code: string;
  type: 'captain' | 'user';
  school: string;
  division: 'B' | 'C';
  expiresAt: Date;
  createdAt: Date;
}

// Initialize database tables
export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create teams table
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        school VARCHAR(255) NOT NULL,
        division CHAR(1) NOT NULL CHECK (division IN ('B', 'C')),
        teams JSONB NOT NULL DEFAULT '[]',
        captain_code VARCHAR(255) UNIQUE NOT NULL,
        user_code VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create share_codes table for temporary sharing
    await client.query(`
      CREATE TABLE IF NOT EXISTS share_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('captain', 'user')),
        school VARCHAR(255) NOT NULL,
        division CHAR(1) NOT NULL CHECK (division IN ('B', 'C')),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_teams_school_division ON teams(school, division);
      CREATE INDEX IF NOT EXISTS idx_teams_captain_code ON teams(captain_code);
      CREATE INDEX IF NOT EXISTS idx_teams_user_code ON teams(user_code);
      CREATE INDEX IF NOT EXISTS idx_share_codes_code ON share_codes(code);
      CREATE INDEX IF NOT EXISTS idx_share_codes_expires ON share_codes(expires_at);
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
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
