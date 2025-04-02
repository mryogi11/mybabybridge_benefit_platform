-- Drop the existing users table and recreate it with the right schema for syncing
DROP TABLE IF EXISTS users CASCADE;

-- Create a new users table with id referencing auth.users id
CREATE TABLE users (
    id UUID PRIMARY KEY, -- will be the same ID as in auth.users
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'patient',
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create a simple view that does not use RLS
CREATE OR REPLACE VIEW users_view AS
SELECT id, email, role, first_name, last_name, created_at, updated_at
FROM users;

-- Make the view accessible to all authenticated users
GRANT SELECT ON users_view TO authenticated;
GRANT SELECT ON users_view TO anon;

-- Disable RLS for the users table for now
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Insert demo users if they don't exist in auth
INSERT INTO users (id, email, role, first_name, last_name)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin.test@mybaby.com', 'admin', 'Admin', 'User'),
    ('00000000-0000-0000-0000-000000000002', 'provider.test@mybaby.com', 'provider', 'Provider', 'User')
ON CONFLICT (id) DO NOTHING; 