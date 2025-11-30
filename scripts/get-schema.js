const { Pool } = require('pg');
require('dotenv').config();

async function getSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔍 Querying CockroachDB for key tables...');
    
    // Focus on key tables we need
    const keyTables = [
      'users',
      'new_team_groups', 
      'new_team_units',
      'new_team_memberships',
      'new_team_roster_data',
      'new_team_posts',
      'new_team_assignments',
      'new_team_events'
    ];
    
    for (const tableName of keyTables) {
      console.log(`\n🔍 Schema for table: ${tableName}`);
      
      const columnsResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position;
      `, [tableName]);
      
      if (columnsResult.rows.length === 0) {
        console.log('  Table not found');
        continue;
      }
      
      console.log('  Columns:');
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const precision = col.numeric_precision ? `(${col.numeric_precision}${col.numeric_scale ? ',' + col.numeric_scale : ''})` : '';
        
        console.log(`    ${col.column_name}: ${col.data_type}${length}${precision} ${nullable}${defaultVal}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error querying schema:', error);
  } finally {
    await pool.end();
  }
}

getSchema();