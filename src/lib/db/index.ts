import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection pooling configuration for CockroachDB
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create connection pool with best practices for scalability
const client = postgres(connectionString, {
  max: 20, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  ssl: { rejectUnauthorized: false }, // CockroachDB requires SSL
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

// Export schema and types
export * from './schema';
export * from './types';
export * from './utils'; 