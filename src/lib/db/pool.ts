import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

/**
 * Centralized PostgreSQL connection pool
 * Used by legacy pg-based queries across the application
 * For new code, prefer using the Drizzle ORM client from ./index.ts
 *
 * @deprecated Use Drizzle ORM client from ./index.ts for new code
 * @example
 * ```typescript
 * import { pool } from '@/lib/db/pool';
 * const result = await pool.query('SELECT * FROM users');
 * ```
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Graceful shutdown
if (typeof process !== "undefined") {
  process.on("SIGTERM", async () => {
    await pool.end();
  });
}
