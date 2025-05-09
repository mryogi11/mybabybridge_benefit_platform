# MyBabyBridge Fertility Care Platform

A comprehensive fertility care platform for connecting patients with providers, managing benefits, and providing educational resources.

## Deployment to Vercel

### Prerequisites

- A [Vercel](https://vercel.com) account
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account (for payment features)

### Environment Variables

Set up the following environment variables in your Vercel project settings:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Application Configuration (Vercel automatically sets this)
NEXT_PUBLIC_APP_URL=https://your-project-url.vercel.app
```

### Deployment Steps

1. Connect your GitHub repository to Vercel
2. Configure the environment variables
3. Deploy with the default settings
4. Vercel will automatically detect the Next.js project and use the appropriate build settings

### Using Our Deployment Tools

We've created several tools to make deployment easier:

1. **Verify Deployment Readiness**:
   ```bash
   npm run verify-deployment
   ```
   This will check that your project is properly configured and run a test build without deploying.

2. **Automated Deployment Helper**:
   ```bash
   npm run deploy
   ```
   This script checks your project for proper configuration and guides you through the deployment process.

3. **Pre-Deployment Verification**:
   ```bash
   npm run prepare-vercel
   ```
   This script verifies that your project is ready for Vercel deployment by checking required files and running a test build.

4. **Quick Reference Guide**:
   See `DEPLOYMENT_SUMMARY.md` for a quick reference to deployment steps.

5. **Detailed Deployment Guide**:
   See `DEPLOYMENT.md` for comprehensive deployment instructions and troubleshooting.

### Post-Deployment Configuration

1. **Set up Supabase webhooks** to point to your new Vercel URL
2. **Configure Stripe webhooks** to use your new Vercel URL
3. **Test the application** thoroughly after deployment

### Troubleshooting

*   **`getaddrinfo ENOTFOUND db.<...>.supabase.co` Error:** If you encounter DNS resolution errors like this during deployment or runtime on Vercel, it usually means the API routes cannot connect to the database.
    *   **Cause:** This often occurs when the `DATABASE_URL` environment variable in Vercel is set to the *direct* database connection string instead of the **Connection Pooling URI**.
    *   **Solution:** Ensure the `DATABASE_URL` environment variable in your Vercel project settings uses the **Connection Pooling URI** found in your Supabase project settings (Project Settings -> Database -> Connection Pooling). Redeploy Vercel after updating the variable.

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

### Building for Production

```bash
# Create a production build
npm run build

# Start the production server
npm start
```

## Database Setup & Migrations (Drizzle ORM)

The source of truth for the database schema is `src/lib/db/schema.ts`.
This project uses **Drizzle ORM** and **`drizzle-kit`** for managing database schema changes.

**Key Drizzle Commands:**

1.  **Generate Migrations:** After making changes to `src/lib/db/schema.ts`, generate the SQL migration file:
    ```bash
    npm run drizzle:generate 
    # Or your specific script, e.g., npm run generate
    ```
    This will create a new SQL file in the `drizzle` directory (or your configured output directory).

2.  **Apply Migrations (Local Development):** To apply the generated migrations to your local Supabase instance:
    ```bash
    npm run drizzle:push
    # Or your specific script, e.g., npm run push
    ```
    *Note: `drizzle:push` directly applies schema changes based on `schema.ts` without using the generated SQL files. For a workflow that uses the SQL files, you would typically apply them manually or via another script against your database.* 

3.  **Applying Migrations (Staging/Production):** For staging or production environments, it is recommended to review and then manually apply the SQL migration script generated by `drizzle:generate` via the Supabase SQL Editor or your deployment pipeline. 

**Important - RLS and Policies Post-Migration:**

After significant migrations (especially an initial Drizzle baseline), Row Level Security (RLS) might be disabled and existing policies dropped for some tables. 
**You MUST manually restore RLS and policies.** Refer to `docs/SUPABASE_ROLE_INSTRUCTIONS.md` for detailed instructions on how to re-enable RLS and re-apply security policies.

*Deprecated Supabase CLI steps for schema migration have been removed from general setup instructions. The Supabase SQL Editor remains useful for direct queries and RLS/policy management.*

## Additional Resources

- See `HANDOVER.md` for complete project documentation
- See `CODE_INDEX.md` for a comprehensive code overview

## Features

*   **User Dashboards**: Implemented basic dashboards for Patients (`/dashboard`), Providers (`/provider/dashboard`) and Admins (`/admin`) with role-specific widgets (e.g., upcoming appointments, current benefit package) and a side-drawer navigation layout.
*   **Authentication**: Implemented basic email/password login & registration via Supabase Auth. Role checks are used in RLS/APIs. Social login and specific 'staff' role implementation status needs verification.
*   **Appointment Management**: Core functionality implemented.
    *   Patients: Can book, view list/calendar, and cancel appointments (using Server Actions).
    *   Providers: Can view list/calendar, cancel, complete, and edit appointments (edit/complete use direct Supabase client calls - *improvement needed*).
    *   The `appointments.type` column now uses an ENUM (`appointment_type`) for values like 'consultation', 'follow-up', etc.
*   **Provider Availability Management**: Implemented UI (`/provider/availability`) allowing providers to set weekly schedules and block specific times (uses direct Supabase client calls - *improvement needed*).
*   **Admin - User Management**: Implemented UI (`/admin/users`) and APIs for viewing, editing (name, role, first name, last name), and deleting users. `patient_profiles.user_id` now has a UNIQUE constraint.
*   **Admin - Organization Management**: Implemented UI (`/admin/organizations`, `/admin/organizations/[orgId]`) and APIs for CRUD operations on organizations and managing approved email domains.
*   **Admin - Benefit Package Management**: Implemented UI (`/admin/packages`) and APIs for CRUD operations on benefit packages linked to organizations.
*   **Benefit Verification & Package Selection**: Implemented user-facing flow (Steps 1-6) allowing users to identify their benefit source (Employer, Partner/Parent, None), verify eligibility (currently via work email for employer path), provide personal info, select a benefit package, and complete setup (including Stripe payment for non-sponsored packages). Handles both employer-sponsored and direct purchase paths.
*   **Secure Messaging**: Refactored Patient (`/dashboard/communication`) and Provider (`/provider/messages`) messaging modules to use Server Actions (`src/actions/messageActions.ts`) for improved security and maintainability. Implemented logic for initiating conversations based on appointments (patients) and handling existing threads. Includes real-time updates via Supabase and database storage.
*   **Payments (Stripe)**: Integrated Stripe Elements for package purchases in the benefit flow (Step 6). Webhook handling and full subscription management require review/completion. Stripe Elements integrated for payment *initiation* (Step 6 via `createPaymentIntent`). Critical **webhook handling** for payment confirmation/subscription updates is **missing**. APIs for managing payment methods/subscriptions are placeholders.
*   **Analytics**: *Implementation status needs verification; PRD outlines detailed requirements.*
    *   Admin (`/admin/analytics`): Basic UI with charts exists; uses client-side Supabase calls, mock data for success rates, revenue data non-functional. Lacks full PRD features (server-side aggregation, logs, detailed metrics).
    *   Provider (`/provider/analytics`) & Patient (`/dashboard/analytics`): More functional dashboards using RPCs/dedicated tables respectively.
    *   Education-specific analytics (`/dashboard/provider/education/analytics`) also exist.
    *   Treatment plan analytics are pending.
*   **Educational Resources**: *Implementation status needs verification; PRD requires curated content.*
    *   Functional UI for patients to view content (`/dashboard/education`) and providers to manage it (`/dashboard/provider/education`) exists, using client-side Supabase calls to `education_categories` and `education_resources` tables.
    *   Patient progress tracking is implemented.
    *   Content curation and population as per PRD are ongoing.
*   **Admin - Provider Management**: *Implementation status needs verification; PRD requires admin functionality for provider CRUD, credentials, monitoring.*
    *   Basic CRUD UI/API (`/admin/providers`) for provider profiles (name, specialization, etc.) exists, using client-side Supabase calls.
    *   Linking new providers to Auth users needs to be finalized (currently a TODO).
    *   Advanced features from PRD (credentials, monitoring) are likely pending.
*   **Admin - User Activity Logs / Metrics**: *Implementation status needs verification.* PRD requires viewing logs and a metrics dashboard. Partially covered by basic Admin Analytics, but full PRD requirements pending.
*   **Provider - Profile Management**: *Implementation status needs verification; PRD requires UI for managing professional details, visibility.*
    *   Implemented at `/provider/profile` allowing providers to manage details like specialization, bio, education, certifications (uses client-side Supabase calls).
*   **Notifications**: *Implementation status needs verification; `notifications` table exists, but full system pending.*
    *   In-app UI (bell icon via `src/components/Notifications.tsx`, dedicated page `/dashboard/notifications/page.tsx` which uses mock data) is partially implemented.
    *   Real-time updates for bell icon via Supabase subscription exist.
    *   Backend triggers for creating notifications for key events and email notification system are pending.
*   **Dynamic Theme Switching**: Users can select between Light, Dark, System, Ocean, Mint, Rose, Charcoal, and Sunset themes via their respective Settings page (e.g., Patient Dashboard Settings, Provider Settings, Admin Settings). Preference is saved to the user's profile (`theme_preference` column in `users` table).

*(Note: See 'Recent Updates & Fixes (Appointments)' section below for details on recent appointment module work)*

### Areas for Improvement / Technical Debt
*   **Server Actions:** Refactor remaining direct Supabase client calls (e.g., provider availability management, provider appointment updates) to use Server Actions for consistency and security.
*   **Data Fetching:** Enhance Server Actions (like `getAppointmentsForUser`) to efficiently join and return related data (e.g., provider/patient names) where needed by the UI.
*   **Type Safety:** Review and refine TypeScript types, especially for data involving complex joins, to minimize `as any` usage and improve accuracy.
*   **Error Handling:** Standardize error reporting from Server Actions and improve user-facing error messages.

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Supabase account and project
- Drizzle Kit (`npm install -D drizzle-kit` or ensure it's a project dependency)
- Stripe account (for payment processing)

## Environment Setup

1. Copy the environment variables file:
   ```bash
   cp .env.example .env.local
   ```

2. Update the following variables in `.env.local`:
   - `DATABASE_URL`: Your Supabase **connection pooling URI** (used by Drizzle ORM on the server). Find this in Supabase Dashboard > Project Settings > Database > Connection string (Use URI format, e.g., `postgres://<user>:<password>@<host>:<port>/postgres?pgbouncer=true&connection_limit=1`). **This is crucial for database operations.**
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (used by Supabase client library, e.g., for Auth).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key (used by Supabase client library).
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key.
   - `STRIPE_SECRET_KEY`: Your Stripe secret key.
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret.
   - `NEXT_PUBLIC_APP_URL`: Your application URL (default: http://localhost:3000).
   - `NODE_ENV`: Environment (development/production).

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. **Database Schema Setup**: Ensure your `.env.local` is configured, then follow the "Database Setup & Migrations (Drizzle ORM)" section above.

## Database Migrations and Schema (Post-Drizzle Kit Setup)

The database schema is primarily managed using Drizzle ORM and Drizzle Kit for generating migration SQL. However, after initial Drizzle Kit setup, manual SQL execution or scripted migrations might be necessary.

### Notable Migration: `drizzle/0009_illegal_terror.sql`

This migration was generated by Drizzle Kit to align the database with significant schema changes in `src/lib/db/schema.ts`. Due to the complexity of prior manual schema adjustments and the Drizzle Kit generation process, the raw generated SQL (`0009_illegal_terror.sql`) required manual modifications to ensure it could run reliably, especially in environments where parts of the migration might have already been partially applied or where certain objects might not exist as expected.

Key modifications included adding `IF EXISTS` or `IF NOT EXISTS` clauses to:
- `CREATE TABLE` statements (e.g., `CREATE TABLE IF NOT EXISTS "packages" (...)`)
- `DROP CONSTRAINT`, `DROP INDEX`, `DROP COLUMN`, `DROP TYPE` statements (e.g., `ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_domain_unique";`)
- `ADD COLUMN` statements (e.g., `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "selected_package_id" uuid;`)
- Handling for pre-existing primary keys before adding new ones (e.g., for `organization_approved_emails` and `organization_packages`).

This approach makes the migration script more idempotent and resilient to different database states.

### Key Schema Changes in Migration `0009_illegal_terror.sql`

This migration introduced several important changes:

*   **`providers` Table:**
    *   Added a `UNIQUE` constraint to the `user_id` column (`CONSTRAINT "providers_user_id_unique" UNIQUE("user_id")`). This was crucial for fixing issues related to upserting provider user details.

*   **`packages` Table (New):**
    *   A new table `packages` was created to manage benefit packages centrally.
    *   Fields include `id`, `name`, `tier`, `monthly_cost`, `description`, `key_benefits`, `is_base_employer_package`, `created_at`, `updated_at`.

*   **`organization_packages` Table (Restructured):**
    *   This table was significantly restructured to act as a junction table between `organizations` and the new `packages` table.
    *   A composite primary key `("organization_id", "package_id")` was established.
    *   A new column `package_id` (UUID, FK to `packages.id`) was added.
    *   Several columns were **dropped** as their responsibilities were moved to the `packages` table or became obsolete: `id` (old PK), `name`, `description`, `monthly_price`, `features`, `currency`, `stripe_product_id`, `stripe_price_id`, `is_active`, `updated_at`.

*   **`users` Table:**
    *   Added a new column `selected_package_id` (UUID, FK to `packages.id`, `ON DELETE SET NULL`).
    *   Dropped the `package_status` column. The associated custom type `user_package_status` was also dropped. Benefit status management is now typically handled by the `benefit_status` column (enum `benefitStatusEnum`).

*   **`organizations` Table:**
    *   Dropped the unique constraint `organizations_domain_unique`.

*   **`organization_approved_emails` Table:**
    *   Reaffirmed the primary key `("organization_id", "email")` and dropped a potentially conflicting unique index (`organization_approved_emails_org_email_uq`).

These changes were part of a larger effort to streamline package management and resolve database integrity issues.

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Dashboard routes
│   └── api/               # API routes
├── components/            # Reusable components
├── lib/                   # Utility functions and configurations
└── types/                 # TypeScript type definitions
```

## API Routes

The following API routes are available (primarily for admin or server-side use):

### Admin

All admin routes require the user to be authenticated and have the 'admin' role.

*   **Organizations**
    *   `POST /api/admin/organizations`: Creates a new organization.
        *   Body: `{ name: string, domain?: string | null, hr_contact_info?: string | null }`
    *   `GET /api/admin/organizations`: Retrieves all organizations.
    *   `GET /api/admin/organizations/[orgId]`: Retrieves a specific organization.
    *   `PUT /api/admin/organizations/[orgId]`: Updates a specific organization.
        *   Body: `{ name?: string, domain?: string | null, hr_contact_info?: string | null }`
    *   `DELETE /api/admin/organizations/[orgId]`: Deletes a specific organization.
    *   `POST /api/admin/organizations/emails`: Adds an approved email address to an organization.
        *   Body: `{ organizationId: string, email: string }`
    *   `DELETE /api/admin/organizations/emails`: Removes an approved email address from an organization.
        *   Body: `{ organizationId: string, email: string }`
*   **Packages (Benefit)**
    *   `POST /api/admin/packages`: Creates a new benefit package and links it to an organization.
        *   Body: `{ name: string, tier: string, monthly_cost: number, organization_id: string, description?: string, key_benefits?: string[], is_base_employer_package?: boolean }`
    *   `GET /api/admin/packages`: Retrieves all benefit packages, including linked organization ID and name.
    *   `PUT /api/admin/packages/[packageId]`: Updates a specific benefit package and/or its organization link.
        *   Body: (Partial of create body, `organization_id` is optional)
    *   `DELETE /api/admin/packages/[packageId]`: Deletes a specific benefit package.
*   **Users**
    *   `POST /api/admin/create-user`: Creates a new user (requires careful handling).
    *   `PUT /api/admin/update-role`: Updates a user's role.
    *   `PUT /api/admin/users/[userId]`: Updates a specific user's details (e.g., first name, last name, role).
        * Body: `{ first_name?: string, last_name?: string, role?: UserRole }`
    *   `DELETE /api/admin/users/[userId]`: Deletes a specific user from both the database and Supabase Auth.

### Authentication

*   `POST /api/auth/sync-users`: (Potentially for syncing Supabase auth users with the public users table).

### Payments (Stripe)

*   `GET /api/payment-methods`: Retrieves the user's saved payment methods.
*   `POST /api/payment-methods/attach`: Attaches a new payment method.
*   `POST /api/payment-methods/default`: Sets a default payment method.
*   `POST /api/payment-methods/delete`: Deletes a payment method.
*   `GET /api/subscriptions`: Retrieves the user's subscription status.

### Other

*   `GET /api/test-db`: A simple route for testing database connectivity.

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More 

### Recent Updates & Fixes (Appointments)

*   **Database Schema & Constraints:** Resolved inconsistencies in the `appointments` table related to patient identification. Ensured the `patient_id` column correctly references the `users.id` (Auth User ID) and removed legacy/conflicting columns (`patient_profile_id`). Updated the foreign key constraint (`appointments_patient_id_fkey`) to reflect this correct relationship.
*   **Row Level Security (RLS):** Corrected RLS policies on the `appointments` table for the `authenticated` role:
    *   **SELECT:** Updated the `USING` expression for the `"Patients can view their own appointments"` policy to `(auth.uid() = patient_id)`.
    *   **UPDATE:** Added a new policy `"Patients can update their own appointments"` with `USING (auth.uid() = patient_id)` and `WITH CHECK (auth.uid() = patient_id)` to allow patients to cancel their appointments.
*   **Server Actions & Frontend Fetching:**
    *   Refactored appointment fetching logic (`getAppointmentsForUser_Supabase`, `fetchAppointments` in patient dashboard/appointments pages) to consistently use the patient's **Auth User ID** instead of profile IDs.
    *   Updated frontend components (`/dashboard/appointments/page.tsx`, `/dashboard/page.tsx`) to call the `getAppointmentsForUser` server action.
    *   Refactored appointment cancellation (`handleCancelAppointment` in patient appointments page) to use the `updateAppointmentStatus` server action instead of direct client-side updates.
*   **Provider Appointment Viewing:**
    *   Resolved Supabase query errors ("Could not embed", "Could not find relationship") on provider pages (`/provider/appointments/page.tsx`, `/provider/dashboard/page.tsx`) by explicitly specifying the foreign key constraint name (`patient:users!appointments_patient_id_fkey(...)`) when joining `appointments` to `users` for fetching patient details.
    *   Corrected nested join syntax for fetching `patient_profiles` data.
*   **UI Fixes:**
    *   Resolved React hydration error (`<div> cannot be a descendant of <p>`) in the appointment details dialog by setting `component="div"` on the relevant MUI `Typography` component.
    *   Enabled clicking on dates with appointments in the provider calendar view by removing the `disabled` prop.
    *   Made action menu items (Cancel, Complete) in the provider appointments page conditionally disabled based on the current appointment status. 