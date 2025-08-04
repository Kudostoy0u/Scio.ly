import { neon } from '@neondatabase/serverless';

// Neon database connection using the provided connection string
const sql = neon(process.env.DATABASE_URL || '');

export default sql;

// Database connection helper with error handling
export async function executeQuery<T = unknown>(query: string, params: unknown[] = []): Promise<T[]> {
  try {
    // Convert conventional SQL with placeholders to tagged template literal
    const result = await sql.query(query, params);
    return result as T[];
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database operation failed');
  }
}

// Helper function to check database connection
export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}