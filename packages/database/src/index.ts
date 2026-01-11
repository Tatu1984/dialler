import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Re-export schema
export * from './schema';

// Database client singleton
let db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = postgres(connectionString, {
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

/**
 * Get database instance (singleton)
 */
export function getDb() {
  if (!db) {
    db = createDb();
  }
  return db;
}

/**
 * Create a new database connection (for testing or specific use cases)
 */
export function createDbConnection(connectionString?: string) {
  const url = connectionString || process.env.DATABASE_URL;

  if (!url) {
    throw new Error('Database connection string is required');
  }

  const client = postgres(url, {
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

// Export type for the database instance
export type Database = ReturnType<typeof getDb>;
