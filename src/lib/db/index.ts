console.log('[db/index.ts] >>> STARTING MODULE LOAD <<<');

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema'; // Import all exports from schema.ts

console.log('[db/index.ts] Imports completed.');

// --- TEMPORARY HARDCODING TEST --- 
// Ensure DATABASE_URL is set in your environment variables
// const connectionString = process.env.DATABASE_URL; // <-- Comment out original line
const connectionString = "postgresql://postgres:Mybabybridge12%23@db.uenmvvraiamjzzgxsybf.supabase.co:5432/postgres"; // <-- Hardcode the CORRECT string here
console.log('[db/index.ts] Using HARDCODED connection string for testing.');
// --- END TEMPORARY HARDCODING TEST ---

console.log(`[db/index.ts] Retrieved ConnectionString. Found: ${connectionString ? 'Yes' : 'No'}`);
console.log(`[db/index.ts] Connection String Length: ${connectionString?.length ?? 0}`);

if (!connectionString) {
  console.error('[db/index.ts] CRITICAL: DATABASE_URL environment variable is not set or empty.');
  throw new Error('DATABASE_URL environment variable is not set or empty.');
}

let client;
try {
  console.log('[db/index.ts] Attempting to initialize postgres client...');
  // For Serverless environments recommend using `max: 1`
  client = postgres(connectionString, { 
    prepare: false, 
    // Add connection logging if supported by postgres library
    // debug: (connection, query, parameters) => {
    //   console.log('[db/index.ts] PG Debug:', { connection: connection?.id, query, parameters });
    // }
  });
  console.log('[db/index.ts] SUCCESS: Postgres client initialized.');
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