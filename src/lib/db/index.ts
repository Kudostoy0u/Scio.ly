import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection pooling configuration for CockroachDB
const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: 20, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  // Enforce base64 CA via PGSSLROOTCERT for all environments (treat as production)
  ssl: (() => {
    const b64 = process.env.PGSSLROOTCERT;
    if (!b64) {
      throw new Error('PGSSLROOTCERT (base64-encoded CA) is required');
    }
    const ca = Buffer.from(b64, 'base64').toString('utf8');

    return { rejectUnauthorized: true, ca } as const;
  })(),
  // CockroachDB specific optimizations
  prepare: true, // Enable prepared statements for better performance
  max_lifetime: 60 * 30, // Close connections after 30 minutes
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export the client for direct access if needed
export { client };

// Helper function to test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Helper function to close the connection pool
export async function closeConnection(): Promise<void> {
  await client.end();
}

// Export schema and utilities
export * from './schema';
export * from './utils';