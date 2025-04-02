-- SQL Script to update user roles in Supabase
-- Run this in the SQL Editor in your Supabase dashboard

-- First, let's check what tables we have
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check if 'users' table exists and has the users we're looking for
SELECT * FROM users 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');

-- Check if 'profiles' table exists and has the users we're looking for
SELECT * FROM profiles 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');

-- Check if 'auth.users' table has our users (requires admin privilege)
SELECT * FROM auth.users 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');

-- Update roles in 'users' table (if it exists)
UPDATE users
SET role = CASE 
    WHEN email = 'admin.test@mybaby.com' THEN 'admin'
    WHEN email = 'provider.test@mybaby.com' THEN 'provider'
END
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');

-- Update roles in 'profiles' table (if it exists)
UPDATE profiles
SET role = CASE 
    WHEN email = 'admin.test@mybaby.com' THEN 'admin'
    WHEN email = 'provider.test@mybaby.com' THEN 'provider'
END
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');

-- Verify the updates in 'users' table
SELECT id, email, role FROM users 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');

-- Verify the updates in 'profiles' table
SELECT id, email, role FROM profiles 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');

-- If auth.users metadata needs to be updated (requires admin privilege)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{role}',
  CASE 
    WHEN email = 'admin.test@mybaby.com' THEN '"admin"'
    WHEN email = 'provider.test@mybaby.com' THEN '"provider"'
  END::jsonb
)
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com'); 