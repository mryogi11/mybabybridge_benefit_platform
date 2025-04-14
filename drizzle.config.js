// Convert to CommonJS for potentially easier drizzle-kit compatibility
const { defineConfig } = require('drizzle-kit');
const dotenv = require('dotenv');

// Load environment variables from .env.local (or other .env files)
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set or empty in your .env file.');
}

module.exports = defineConfig({
  schema: './src/lib/db/schema.ts', // Path to your schema file
  out: './drizzle', // Directory to output migrations
  dialect: 'postgresql', // Specify the database dialect
  dbCredentials: {
    // Provide the connection string from the environment variable
    url: connectionString,
  },
  // Recommended for TypeScript projects
  verbose: true,
  strict: true,
}); 