// Re-export the new CockroachDB connection
export { db, client, testConnection, closeConnection } from './db/index';

// Legacy compatibility - export a default sql function for backward compatibility
import { db, client } from './db/index';

// For backward compatibility with existing code
const sql = db;

export default sql;

// Database connection helper with error handling (legacy function)
export async function executeQuery<T = unknown>(query: string, params: unknown[] = []): Promise<T[]> {
  try {
    // Note: This is a legacy function. For new code, use the Drizzle ORM directly
    // Example: await db.select().from(bookmarks).where(eq(bookmarks.userId, userId))
    console.warn('executeQuery is deprecated. Use Drizzle ORM directly for better type safety and performance.');
    
    // For raw SQL queries, use the client directly
    const result = await client.unsafe(query, params as (string | number | boolean | null)[]);
    return result as unknown as T[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database operation failed');
  }
}