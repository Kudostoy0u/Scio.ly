const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('Initializing database...');
    
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
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(school, division)
      )
    `);
    console.log('✓ Teams table created/verified');
    
    // Check if unique constraint exists, add if missing
    const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'teams' 
      AND constraint_type = 'UNIQUE' 
      AND constraint_name LIKE '%school%'
    `);
    
    if (constraintCheck.rows.length === 0) {
      console.log('⚠️  Adding missing unique constraint on (school, division)...');
      await client.query(`
        ALTER TABLE teams 
        ADD CONSTRAINT teams_school_division_unique 
        UNIQUE (school, division)
      `);
      console.log('✓ Added unique constraint on (school, division)');
    } else {
      console.log('✓ Unique constraint on (school, division) already exists');
    }

    // Check if share_codes table exists and has the wrong structure
    const checkTable = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'share_codes' 
      AND column_name = 'type'
    `);
    
    if (checkTable.rows.length === 0) {
      console.log('⚠️  Existing share_codes table has wrong structure, recreating...');
      
      // Drop the existing table
      await client.query('DROP TABLE IF EXISTS share_codes CASCADE');
      console.log('✓ Dropped old share_codes table');
      
      // Create new share_codes table for team sharing
      await client.query(`
        CREATE TABLE share_codes (
          id SERIAL PRIMARY KEY,
          code VARCHAR(255) UNIQUE NOT NULL,
          type VARCHAR(10) NOT NULL CHECK (type IN ('captain', 'user')),
          school VARCHAR(255) NOT NULL,
          division CHAR(1) NOT NULL CHECK (division IN ('B', 'C')),
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✓ Created new share_codes table with correct structure');
    } else {
      console.log('✓ Share codes table already has correct structure');
    }

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_teams_school_division ON teams(school, division);
      CREATE INDEX IF NOT EXISTS idx_teams_captain_code ON teams(captain_code);
      CREATE INDEX IF NOT EXISTS idx_teams_user_code ON teams(user_code);
      CREATE INDEX IF NOT EXISTS idx_share_codes_code ON share_codes(code);
      CREATE INDEX IF NOT EXISTS idx_share_codes_expires ON share_codes(expires_at);
    `);
    console.log('✓ Indexes created/verified');

    console.log('\n🎉 Database initialized successfully!');
    console.log('\nYou can now:');
    console.log('1. Use the team sharing functionality in the app');
    console.log('2. Generate and share team codes');
    console.log('3. Join teams using shared codes');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the initialization
initDatabase().catch(console.error);
