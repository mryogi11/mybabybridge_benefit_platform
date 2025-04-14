import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema'; // Import all exports from schema.ts

// Ensure DATABASE_URL is set in your environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// For Serverless environments recommend using `max: 1`
// Read more: https://github.com/drizzle-team/drizzle-orm/issues/507
const client = postgres(connectionString, { prepare: false });

// Initialize Drizzle with the client and the imported schema
export const db = drizzle(client, { schema });

// You might need separate clients for different connection types (e.g., pooling for server, direct for migrations)
// Example for a pooled client (if needed):
// import { Pool } from 'pg';
// import { drizzle } from 'drizzle-orm/node-postgres';
// const pool = new Pool({ connectionString });
// export const dbPool = drizzle(pool, { schema }); 