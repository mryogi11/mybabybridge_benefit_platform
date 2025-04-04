-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'staff', 'provider', 'patient');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'patient',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Display existing users in auth.users
SELECT au.id, au.email, au.created_at 
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- Insert any auth.users users that don't exist in the users table
INSERT INTO users (id, email, role, created_at, updated_at)
SELECT 
    au.id, 
    au.email, 
    'patient', -- Default role
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- Update the admin.test@mybaby.com user to have admin role
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin.test@mybaby.com';

-- Update the provider.test@mybaby.com user to have provider role
UPDATE users 
SET role = 'provider' 
WHERE email = 'provider.test@mybaby.com';

-- Display all users after updates
SELECT * FROM users ORDER BY created_at DESC;

-- Helper function to check current user's role without recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- Runs with privileges of the function owner, safer
-- Set search_path to prevent hijacking: Adjust schema if needed
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM users
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Create any other tables needed for the admin panel
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Allow the authenticated users to read the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users with admin role to read all users" ON users;
CREATE POLICY "Allow users with admin role to read all users" ON users
    FOR SELECT USING (is_admin());
    
DROP POLICY IF EXISTS "Allow users to read their own data" ON users;
CREATE POLICY "Allow users to read their own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Allow admins to update user roles
DROP POLICY IF EXISTS "Allow admins to update user roles" ON users;
CREATE POLICY "Allow admins to update user roles" ON users
    FOR UPDATE USING (is_admin()); 