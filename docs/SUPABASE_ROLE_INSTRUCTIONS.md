# Updating User Roles in Supabase

**IMPORTANT NOTE ON DATABASE MIGRATIONS:**

This project now uses **Drizzle ORM** and **`drizzle-kit`** for managing database schema changes, not the standard Supabase CLI migration workflow (`supabase/migrations`, `supabase db reset`, `supabase migrations up`).

The instructions below regarding Supabase roles and permissions are likely still relevant, but any steps involving the Supabase CLI for applying schema migrations should be **disregarded**. 

Please refer to the project `README.md` or `HANDOVER.md` for the correct Drizzle-based migration workflow.

---

Follow these steps to update the roles for your test accounts:

## Step 1: Access Supabase SQL Editor

1. Log in to your [Supabase Dashboard](https://app.supabase.io)
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query" to create a new SQL query

## Step 2: Determine Your Database Structure

Run this query to see what tables exist in your database:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

## Step 3: Check for Users

Run the following queries to check if your users exist:

```sql
-- Check for users in the 'users' table (if it exists)
SELECT * FROM users 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');

-- Check for users in the 'profiles' table (if it exists)
SELECT * FROM profiles 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');

-- Check for users in the 'auth.users' table (requires admin privilege)
SELECT * FROM auth.users 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');
```

Make note of which table contains your users and their IDs.

## Step 4: Update User Roles

Based on which table contains your users, run one of the following update queries:

### If your users are in the 'users' table:

```sql
UPDATE users
SET role = CASE 
    WHEN email = 'admin.test@mybaby.com' THEN 'admin'
    WHEN email = 'provider.test@mybaby.com' THEN 'provider'
END
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');
```

### If your users are in the 'profiles' table:

```sql
UPDATE profiles
SET role = CASE 
    WHEN email = 'admin.test@mybaby.com' THEN 'admin'
    WHEN email = 'provider.test@mybaby.com' THEN 'provider'
END
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');
```

### If you need to update user metadata in 'auth.users':

```sql
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
```

## Step 5: Verify the Updates

Run these queries to verify the updates:

```sql
-- Verify updates in 'users' table
SELECT id, email, role FROM users 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');

-- Verify updates in 'profiles' table
SELECT id, email, role FROM profiles 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');

-- Verify updates in 'auth.users' metadata
SELECT id, email, raw_user_meta_data->>'role' as role FROM auth.users 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com');
```

## Step 6: Test the Login

After updating the roles, test logging in with each account to ensure they have the correct access:

- **Admin**: admin.test@mybaby.com / Password123!
- **Provider**: provider.test@mybaby.com / Password123!

Check that:
- Admin account redirects to the admin dashboard with admin privileges
- Provider account redirects to the provider dashboard with provider privileges 