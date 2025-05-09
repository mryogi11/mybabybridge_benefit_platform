# Updating User Roles and Managing Database Schema in Supabase

**IMPORTANT NOTE ON DATABASE MIGRATIONS & SCHEMA MANAGEMENT:**

This project now uses **Drizzle ORM** and **`drizzle-kit`** for managing database schema changes. Standard Supabase CLI migration workflows (`supabase/migrations`, `supabase db reset`, `supabase migrations up`) are **NO LONGER THE PRIMARY METHOD** for schema evolution.

- To generate schema changes based on `src/lib/db/schema.ts`, use: `npm run drizzle:generate`
- To apply these changes to your local database, use: `npm run drizzle:push`
- For production, apply the SQL generated by `drizzle:generate` manually or via your deployment pipeline.

Any steps below involving Supabase CLI for *applying schema migrations* should be **disregarded or adapted**. The Supabase SQL Editor is still valid for ad-hoc queries, role updates, and RLS/policy management as described.

---

## Critical Post-Migration Steps (Especially After Drizzle Baseline)

After significant migrations, particularly the initial Drizzle baseline (e.g., a migration like `0001_....sql`), you may find that Row Level Security (RLS) has been disabled and existing policies dropped for several tables. This is a side effect of how Drizzle introspection and generation might interact with an existing Supabase setup.

**You MUST manually restore RLS and Policies:**

1.  **Re-enable RLS for Necessary Tables:**
    *   Go to your Supabase Dashboard -> Table Editor.
    *   For each table that requires RLS (e.g., `users`, `appointments`, `patient_profiles`, `provider_profiles`, etc.), select the table.
    *   In the table view, if RLS is disabled, click the "Enable RLS" button.

2.  **Re-apply Security Policies:**
    *   The original `CREATE POLICY` statements can be found in the older migration files located in the `supabase/migrations` directory (specifically, files dated *before* the switch to Drizzle ORM).
    *   **DO NOT run these entire old migration files.** Instead, open them and carefully copy the relevant `CREATE POLICY ...` statements for each table.
    *   Execute these `CREATE POLICY` statements in the Supabase SQL Editor to restore your security rules.
    *   Example: If `supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql` contained your original policies, you would extract them from there.

**Always verify your RLS and policies are active and correct after any major schema change or migration.**

---

Follow these steps to update the roles for your test accounts using the Supabase SQL Editor:

## Step 1: Access Supabase SQL Editor

1. Log in to your [Supabase Dashboard](https://app.supabase.io)
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query" to create a new SQL query

## Step 2: Review Key Table Structures & Schemas

Key tables and recent changes to be aware of:

*   **`public.users`**: Stores core user information.
    *   Now includes `first_name` and `last_name` fields.
    *   The `role` column (e.g., 'admin', 'provider', 'patient') is managed here.
*   **`public.patient_profiles`**: Stores additional information for patients.
    *   `user_id` column in this table is now `UNIQUE` and has a foreign key to `public.users(id)`.
*   **`public.provider_profiles`**: Stores additional information for providers.
*   **`public.appointments`**:
    *   The `type` column is now an ENUM called `appointment_type` (defined in `src/lib/db/schema.ts` and the database). Valid values typically include 'consultation', 'follow-up', etc. Direct text insertions that do not match an enum value will fail.

Run this query to see all tables in your `public` schema:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

## Step 3: Check for Users

Run the following queries to check if your users exist:

```sql
-- Check for users in the 'users' table
SELECT id, email, first_name, last_name, role FROM users 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com', 'patient.test@mybaby.com');

-- Check for users in the 'auth.users' table (requires admin privilege on the database or specific policy)
-- Note: `raw_user_meta_data` might store a role if your system syncs it there, but `public.users.role` is the primary source.
SELECT id, email, raw_user_meta_data->>'role' as auth_role FROM auth.users 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com', 'patient.test@mybaby.com');
```

Make note of user IDs from the `public.users` table.

## Step 4: Update User Roles (in `public.users`)

User roles are primarily managed in the `public.users` table.

```sql
UPDATE users
SET role = CASE 
    WHEN email = 'admin.test@mybaby.com' THEN 'admin'
    WHEN email = 'provider.test@mybaby.com' THEN 'provider'
    WHEN email = 'patient.test@mybaby.com' THEN 'patient' -- Example for patient
END
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com', 'patient.test@mybaby.com');
```

If your application logic also relies on a role in `auth.users.raw_user_meta_data`, you might need to update it there as well (ensure the value is JSONB, e.g., `'"admin"'::jsonb`):

```sql
-- Optional: Update auth.users metadata if your app uses it for role checks
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb), -- Ensure raw_user_meta_data is not null
  '{role}',
  CASE 
    WHEN email = 'admin.test@mybaby.com' THEN '"admin"'
    WHEN email = 'provider.test@mybaby.com' THEN '"provider"'
    WHEN email = 'patient.test@mybaby.com' THEN '"patient"'
  END::jsonb,
  true -- Create the key if it doesn't exist
)
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com', 'patient.test@mybaby.com');
```

## Step 5: Verify the Updates

Run these queries to verify the updates:

```sql
-- Verify updates in 'users' table
SELECT id, email, role FROM users 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com', 'patient.test@mybaby.com');

-- Verify updates in 'auth.users' metadata (if updated)
SELECT id, email, raw_user_meta_data->>'role' as role FROM auth.users 
WHERE email IN ('admin.test@mybaby.com', 'provider.test@mybaby.com', 'patient.test@mybaby.com');
```

## Step 6: Test the Login

After updating the roles, test logging in with each account to ensure they have the correct access:

- **Admin**: admin.test@mybaby.com / Password123!
- **Provider**: provider.test@mybaby.com / Password123!
- **Patient**: patient.test@mybaby.com / Password123! (If you have a test patient)

Check that:
- Admin account redirects to the admin dashboard with admin privileges.
- Provider account redirects to the provider dashboard with provider privileges.
- Patient account redirects to the patient dashboard with patient privileges. 