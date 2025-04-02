-- Drop any existing users table
DROP TABLE IF EXISTS users CASCADE;

-- Create a simple users table without complex foreign keys or policies
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'patient',
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insert demo users
INSERT INTO users (email, role, first_name, last_name)
VALUES 
    ('admin.test@mybaby.com', 'admin', 'Admin', 'User'),
    ('provider.test@mybaby.com', 'provider', 'Provider', 'User');

-- Create a simple view that does not use RLS
CREATE OR REPLACE VIEW users_view AS
SELECT id, email, role, first_name, last_name, created_at, updated_at
FROM users;

-- Make the view accessible to all authenticated users
GRANT SELECT ON users_view TO authenticated;
GRANT SELECT ON users_view TO anon;

-- Disable RLS for the users table for now
ALTER TABLE users DISABLE ROW LEVEL SECURITY; 