const { Pool } = require("pg");
require("dotenv").config();

async function getSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Focus on key tables we need
    const keyTables = [
      "users",
      "new_team_groups",
      "new_team_units",
      "new_team_memberships",
      "new_team_roster_data",
      "new_team_posts",
      "new_team_assignments",
      "new_team_events",
    ];

    for (const tableName of keyTables) {
      const columnsResult = await pool.query(
        `
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
      `,
        [tableName]
      );

      if (columnsResult.rows.length === 0) {
        continue;
      }
      columnsResult.rows.forEach((col) => {
        const _nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
        const _defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : "";
        const _length = col.character_maximum_length ? `(${col.character_maximum_length})` : "";
        const _precision = col.numeric_precision
          ? `(${col.numeric_precision}${col.numeric_scale ? `,${col.numeric_scale}` : ""})`
          : "";
      });
    }
  } catch (_error) {
  } finally {
    await pool.end();
  }
}

getSchema();
