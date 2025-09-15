import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';


const connectionString = process.env.DATABASE_URL!;

declare global {
  var __pgClient__: ReturnType<typeof postgres> | undefined;
  var __drizzleDb__: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

const client = globalThis.__pgClient__ ?? postgres(connectionString, {
  // Keep footprint small in serverless and avoid connection churn
  max: 2,
  idle_timeout: 300,
  connect_timeout: 40,

  ssl: (() => {
    const b64 = process.env.PGSSLROOTCERT;
    if (!b64) {
      throw new Error('PGSSLROOTCERT (base64-encoded CA) is required');
    }
    const ca = Buffer.from(b64, 'base64').toString('utf8');

    return { rejectUnauthorized: true, ca } as const;
  })(),

  prepare: true,
  max_lifetime: 60 * 30,
});

if (!globalThis.__pgClient__) {
  globalThis.__pgClient__ = client;
}

export const db = globalThis.__drizzleDb__ ?? drizzle(client, { schema });

if (!globalThis.__drizzleDb__) {
  globalThis.__drizzleDb__ = db;
}

export { client };


export async function testConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}


export async function closeConnection(): Promise<void> {
  await client.end();
}


export * from './schema';
export * from './utils';