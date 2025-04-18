console.log('[db/index.ts] >>> STARTING MODULE LOAD <<<');

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema'; // Import all exports from schema.ts

console.log('[db/index.ts] Imports completed.');

// --- REVERTING HARDCODING TEST --- 
// Ensure DATABASE_URL is set in your environment variables
const connectionString = process.env.DATABASE_URL; // <-- Uncomment original line
// const connectionString = "postgresql://postgres:Mybabybridge12%23@db.uenmvvraiamjzzgxsybf.supabase.co:5432/postgres"; // <-- Comment out hardcoded string
// console.log('[db/index.ts] Using HARDCODED connection string for testing.'); // <-- Remove temporary log
// --- END REVERTING HARDCODING TEST ---

console.log(`[db/index.ts] Retrieved ConnectionString. Found: ${connectionString ? 'Yes' : 'No'}`);
console.log(`[db/index.ts] Connection String Length: ${connectionString?.length ?? 0}`);

if (!connectionString) {
  console.error('[db/index.ts] CRITICAL: DATABASE_URL environment variable is not set or empty.');
  throw new Error('DATABASE_URL environment variable is not set or empty.');
}

let client;
try {
  console.log('[db/index.ts] Attempting to initialize postgres client...');
  // --- REVERTING IP ADDRESS TEST --- 
  // Rely solely on the connectionString, remove explicit host option
  client = postgres(connectionString, { 
    prepare: false 
    // host: resolvedHost // <-- REMOVE this line
  });
  // --- END REVERTING IP ADDRESS TEST ---
  console.log('[db/index.ts] SUCCESS: Postgres client initialized (using connectionString only).');
} catch (error) {
  console.error('[db/index.ts] CRITICAL: Failed to initialize Postgres client:', error);
  // Log details of the error, including code and hostname if available
  if (error instanceof Error) {
    console.error(`[db/index.ts] Error Details: code=${(error as any).code}, syscall=${(error as any).syscall}, hostname=${(error as any).hostname}, message=${error.message}`);
  }
  // Re-throw the error to ensure the application knows initialization failed
  throw error; 
}

console.log('[db/index.ts] Attempting to initialize Drizzle...');
// Initialize Drizzle with the client and the imported schema
export const db = drizzle(client, { schema });
console.log('[db/index.ts] SUCCESS: Drizzle instance created.');

// You might need separate clients for different connection types (e.g., pooling for server, direct for migrations)
// Example for a pooled client (if needed):
// import { Pool } from 'pg';
// import { drizzle } from 'drizzle-orm/node-postgres';
// const pool = new Pool({ connectionString });
// export const dbPool = drizzle(pool, { schema }); 