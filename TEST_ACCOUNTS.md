# MyBabyBridge Test Accounts

## Created Test Accounts

We've created the following test accounts in Supabase Auth:

### Admin Account
- **Email**: admin.test@mybaby.com
- **Password**: Password123!
- **Role**: admin
- **ID**: ac557d61-86b2-4550-8627-858fae63ec0a

### Provider Account
- **Email**: provider.test@mybaby.com
- **Password**: Password123!
- **Role**: provider
- **ID**: dbc9306f-1c58-4188-bd3f-ad6db3debe95

## Account Status

These accounts have been created but require email confirmation before they can be used. In a development environment, you have several options to make these accounts usable:

### Option 1: Confirm Emails in Supabase Dashboard
1. Log in to the Supabase dashboard: https://app.supabase.io
2. Navigate to Authentication → Users
3. Find the test users and confirm their email addresses manually

### Option 2: Use Service Role Key
If you have access to the service_role key (not recommended for client-side code), you can modify the confirm-test-accounts.js script to use this key instead of the anon key. This will allow you to confirm emails programmatically.

### Option 3: Create New Accounts through the UI
1. Visit http://localhost:3000/register in your browser
2. Create two new accounts:
   - Email: admin.test@example.com / Password: Password123!
   - Email: provider.test@example.com / Password: Password123!
3. Check your emails for confirmation links (or use the Supabase dashboard to confirm them)

## Setting User Roles

After confirming the email addresses, you need to set the appropriate roles:

### Through the Supabase Dashboard:
1. Navigate to the SQL Editor in Supabase dashboard
2. Run the following queries (replace with the actual user IDs):

```sql
-- For admin user
UPDATE users
SET role = 'admin'
WHERE id = 'ac557d61-86b2-4550-8627-858fae63ec0a';

-- For provider user
UPDATE users
SET role = 'provider'
WHERE id = 'dbc9306f-1c58-4188-bd3f-ad6db3debe95';
```

OR

```sql
-- For admin user
UPDATE profiles
SET role = 'admin'
WHERE id = 'ac557d61-86b2-4550-8627-858fae63ec0a';

-- For provider user
UPDATE profiles
SET role = 'provider'
WHERE id = 'dbc9306f-1c58-4188-bd3f-ad6db3debe95';
```

### Through the Application Admin Interface:
If you already have an admin user set up:
1. Log in as the admin user
2. Navigate to the admin panel's user management section
3. Find the test users and update their roles through the UI

## Using the Test Accounts

Once the accounts are confirmed and roles are set, you can log in with these accounts to access their respective interfaces:

### Admin Interface
- Log in with admin.test@mybaby.com / Password123!
- You should be redirected to the admin dashboard
- You should have access to user management, package creation, and admin-specific features

### Provider Interface
- Log in with provider.test@mybaby.com / Password123!
- You should be redirected to the provider dashboard
- You should have access to patient management, appointment scheduling, and provider-specific features

## Troubleshooting

If you encounter any issues with the test accounts:

1. **Login Fails**: Make sure the email is confirmed in Supabase
2. **Wrong Interface After Login**: Check the role assignment in the database
3. **Missing Permissions**: Verify that the role-based access control is correctly set up in the middleware 