import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';


const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,

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


export const db = drizzle(client, { schema });


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