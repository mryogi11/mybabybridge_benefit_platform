const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local file');
  process.exit(1);
}

console.log('Initializing Supabase client with URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

// Path to migration files
const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

async function runMigrations() {
  try {
    // Get all migration files and sort them by name
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    console.log(`Found ${migrationFiles.length} migration files to run`);

    // Run each migration
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        // Split sql into statements by semicolons
        // This is a simple approach and might not work for all complex SQL scripts
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (let i = 0; i < statements.length; i++) {
          const stmt = statements[i].trim();
          if (stmt) {
            try {
              const { error } = await supabase.rpc('exec_sql', { 
                sql_string: stmt + ';' 
              });
              
              if (error) {
                console.error(`Error executing statement ${i+1} in ${file}:`, error.message);
                // Continue with next statement even if there's an error
              }
            } catch (stmtError) {
              console.error(`Error with statement ${i+1} in ${file}:`, stmtError.message);
              // Continue with next statement
            }
          }
        }
        
        console.log(`Completed migration: ${file}`);
      } catch (fileError) {
        console.error(`Error running migration ${file}:`, fileError.message);
        // Continue with next file
      }
    }
    
    console.log('All migrations completed.');
    
    // After all migrations, try the original fix for users table
    console.log('Applying special fix for users table...');
    try {
      const fixUsersTableSql = `
      -- Drop the table first to remove problematic policies
      DROP TABLE IF EXISTS users CASCADE;
      
      -- Create enum types if they don't exist
      DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('admin', 'staff', 'provider', 'patient');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
      
      -- Create users table without initially enabling RLS
      CREATE TABLE users (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT NOT NULL UNIQUE,
          role user_role NOT NULL DEFAULT 'patient',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );
      
      -- Insert auth.users data into users table
      INSERT INTO users (id, email, role, created_at, updated_at)
      SELECT 
          id, 
          email, 
          'patient'::user_role, 
          created_at,
          NOW()
      FROM auth.users;
      
      -- Update specific users with their correct roles
      UPDATE users SET role = 'admin' WHERE email = 'admin.test@mybaby.com';
      UPDATE users SET role = 'provider' WHERE email = 'provider.test@mybaby.com';
      
      -- Create index for faster lookups
      CREATE INDEX idx_users_id ON users(id);
      CREATE INDEX idx_users_email ON users(email);
      
      -- Create public policy for all users to select from users table
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow all users to view users" ON users;
      CREATE POLICY "Allow all users to view users" ON users
          FOR SELECT
          TO public
          USING (true);
      `;
      
      // Split the fix script into statements and execute them
      const fixStatements = fixUsersTableSql.split(';').filter(stmt => stmt.trim());
      
      for (let i = 0; i < fixStatements.length; i++) {
        const stmt = fixStatements[i].trim();
        if (stmt) {
          try {
            const { error } = await supabase.rpc('exec_sql', { 
              sql_string: stmt + ';' 
            });
            
            if (error) {
              console.error(`Error executing fix statement ${i+1}:`, error.message);
            }
          } catch (stmtError) {
            console.error(`Error with fix statement ${i+1}:`, stmtError.message);
          }
        }
      }
      
      console.log('Special fix for users table applied.');
    } catch (fixError) {
      console.error('Error applying fix for users table:', fixError.message);
    }
    
    console.log('Migration process completed.');
  } catch (error) {
    console.error('Error running migrations:', error.message);
    process.exit(1);
  }
}

runMigrations().catch(err => {
  console.error('Unhandled error during migration:', err);
  process.exit(1);
}); 