import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL environment variable is required");
}

declare global {
	var __pgClient__: postgres.Sql | undefined;
	var __drizzleDb__: ReturnType<typeof drizzle<typeof schema>> | undefined;
	var __pgPool__: Pool | undefined;
	var __drizzleDbPg__: ReturnType<typeof drizzlePg<typeof schema>> | undefined;
}

// Original postgres-js client (for questions, quotes, etc.)
const client =
	globalThis.__pgClient__ ??
	postgres(connectionString, {
		// Keep footprint small in serverless and avoid connection churn
		max: 2,
		idle_timeout: 300,
		connect_timeout: 40,

		ssl: (() => {
			const b64 = process.env.PGSSLROOTCERT;
			if (!b64) {
				throw new Error("PGSSLROOTCERT (base64-encoded CA) is required");
			}
			const ca = Buffer.from(b64, "base64").toString("utf8");

			return { rejectUnauthorized: true, ca } as const;
		})(),

		prepare: true,
		max_lifetime: 60 * 30,
	});

if (!globalThis.__pgClient__) {
	globalThis.__pgClient__ = client;
}

// CockroachDB-compatible pg pool (for teams and other features)
const pool =
	globalThis.__pgPool__ ??
	new Pool({
		connectionString,
		ssl: { rejectUnauthorized: false },
		max: 20,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 2000,
	});

if (!globalThis.__pgPool__) {
	globalThis.__pgPool__ = pool;
}

// Drizzle instances
export const db = globalThis.__drizzleDb__ ?? drizzle({ client, schema });
export const dbPg =
	globalThis.__drizzleDbPg__ ?? drizzlePg({ client: pool, schema });

if (!globalThis.__drizzleDb__) {
	globalThis.__drizzleDb__ = db;
}

if (!globalThis.__drizzleDbPg__) {
	globalThis.__drizzleDbPg__ = dbPg;
}

export { client, pool };

export async function testConnection(): Promise<boolean> {
	try {
		await client`SELECT 1`;
		return true;
	} catch (error) {
		throw new Error(
			`Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

export async function closeConnection(): Promise<void> {
	await client.end();
}

// Explicit exports to avoid barrel file performance issues
// Schema exports are intentionally kept as re-exports due to large size and frequent usage
export * from "./schema";
export * from "./utils";
