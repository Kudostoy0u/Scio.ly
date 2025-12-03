import { Pool } from "pg";

/** Global CockroachDB connection pool instance */
let pool: Pool | null = null;

/**
 * Get or create the CockroachDB connection pool
 * Creates a new pool if one doesn't exist, otherwise returns the existing pool
 *
 * @returns {Pool} PostgreSQL connection pool for CockroachDB
 * @throws {Error} When DATABASE_URL environment variable is not set
 * @example
 * ```typescript
 * const pool = getCockroachDBPool();
 * const result = await pool.query('SELECT * FROM users');
 * ```
 */
export function getCockroachDBPool(): Pool {
	if (!pool) {
		const connectionString = process.env.DATABASE_URL;

		if (!connectionString) {
			throw new Error("DATABASE_URL environment variable is required");
		}

		pool = new Pool({
			connectionString,
			ssl: {
				rejectUnauthorized: false,
			},
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000,
		});
	}

	return pool;
}

/**
 * Execute a query on the CockroachDB database
 * Provides a convenient wrapper around the connection pool for database queries
 *
 * @template T - Type of the returned rows
 * @param {string} text - SQL query string
 * @param {any[]} [params] - Query parameters
 * @returns {Promise<{ rows: T[]; rowCount: number }>} Query result with rows and count
 * @throws {Error} When database query fails
 * @example
 * ```typescript
 * const result = await queryCockroachDB<User>('SELECT * FROM users WHERE id = $1', ['user-123']);
 * console.log(result.rows); // Array of User objects
 * ```
 */
export async function queryCockroachDB<T = unknown>(
	text: string,
	params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
	const pool = getCockroachDBPool();
	const client = await pool.connect();

	try {
		const result = await client.query(text, params);
		return {
			rows: result.rows,
			rowCount: result.rowCount || 0,
		};
	} finally {
		client.release();
	}
}

/**
 * Close the CockroachDB connection pool
 * Properly closes all connections and cleans up resources
 *
 * @returns {Promise<void>} Promise that resolves when pool is closed
 * @example
 * ```typescript
 * await closeCockroachDBPool();
 * console.log('Database connections closed');
 * ```
 */
export async function closeCockroachDBPool(): Promise<void> {
	if (pool) {
		await pool.end();
		pool = null;
	}
}
