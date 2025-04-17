import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema'; // Import all exports from schema.ts

// Ensure DATABASE_URL is set in your environment variables
const connectionString = process.env.DATABASE_URL;

// Log the connection string during module initialization
console.log(`[db/index.ts] Initializing DB. ConnectionString found: ${connectionString ? 'Yes' : 'No'}`);
console.log(`[db/index.ts] Value: ${connectionString}`); // Log the actual value

if (!connectionString) {
  console.error('[db/index.ts] DATABASE_URL environment variable is not set.');
  throw new Error('DATABASE_URL environment variable is not set.');
}

let client;
try {
  // For Serverless environments recommend using `max: 1`
  // Read more: https://github.com/drizzle-team/drizzle-orm/issues/507
  client = postgres(connectionString, { prepare: false });
  console.log('[db/index.ts] Postgres client initialized successfully.');
} catch (error) {
  console.error('[db/index.ts] Failed to initialize Postgres client:', error);
  // Re-throw the error to ensure the application knows initialization failed
  throw error; 
}

// Initialize Drizzle with the client and the imported schema
export const db = drizzle(client, { schema });
console.log('[db/index.ts] Drizzle instance created.');

// You might need separate clients for different connection types (e.g., pooling for server, direct for migrations)
// Example for a pooled client (if needed):
// import { Pool } from 'pg';
// import { drizzle } from 'drizzle-orm/node-postgres';
// const pool = new Pool({ connectionString });
// export const dbPool = drizzle(pool, { schema }); 