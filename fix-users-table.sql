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

-- Display all users after updates
SELECT * FROM users ORDER BY created_at DESC;

-- Now carefully enable RLS and create policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for admins to see all users
CREATE POLICY "admins_can_see_all_users" 
ON users FOR SELECT 
USING (
    (SELECT users.role FROM users WHERE users.id = auth.uid()) = 'admin'::user_role
);

-- Policy for users to see their own data
CREATE POLICY "users_can_read_own_data" 
ON users FOR SELECT 
USING (auth.uid() = id);

-- Create index for faster lookups
CREATE INDEX idx_users_id ON users(id);
CREATE INDEX idx_users_email ON users(email);

-- Create additional metadata table if needed
CREATE TABLE IF NOT EXISTS user_metadata (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
); 