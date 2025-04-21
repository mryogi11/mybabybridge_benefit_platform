# MyBabyBridge Fertility Care Platform

A comprehensive fertility care platform for connecting patients with providers, tracking treatment plans, and providing educational resources.

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

## Additional Resources

- See `HANDOVER.md` for complete project documentation
- See `CODE_INDEX.md` for a comprehensive code overview

## Features

- **User Dashboards**: Patient and provider dashboards with role-specific views
- **Appointment Management**: Scheduling, history, and reminders
- **Secure Messaging**: Communication between patients and providers
- **Educational Resources**: Curated content for fertility education
- **Analytics**: Treatment success metrics and insights
- **Payments**: Integration with payment processing
- **Benefit Verification**: Employer/health plan benefit verification and package management (replaces previous Treatment Plans concept)
    - Includes an admin UI at `/admin/packages` for managing benefit packages.
- **User Management (Admin)**: Interface for administrators to add, view, edit (name, role), and delete users.
    - Admin UI located at `/admin/users`.

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Supabase account and project (for Auth and potentially other services)
- Drizzle Kit (`npm install -D drizzle-kit`)
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

2. **Database Schema Setup**: See the "Database Setup (Drizzle ORM)" section below. The schema is managed via Drizzle ORM and migrations applied manually via the Supabase SQL Editor.
   *Deprecated Supabase CLI steps removed.* 

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
    *   `GET /api/admin/organizations`: Retrieves all organizations.
    *   `GET /api/admin/organizations/[orgId]`: Retrieves a specific organization.
    *   `PUT /api/admin/organizations/[orgId]`: Updates a specific organization.
    *   `DELETE /api/admin/organizations/[orgId]`: Deletes a specific organization.
    *   `POST /api/admin/organizations/emails`: Adds an approved email address to an organization.
    *   `DELETE /api/admin/organizations/emails`: Removes an approved email address from an organization.
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

## Database Setup (Drizzle ORM)

This project uses **Drizzle ORM** to manage the database schema and interact with the Supabase PostgreSQL database. The Supabase CLI migration system (`supabase/migrations`) is **no longer used** for applying schema changes; use the Drizzle workflow described here.

### Key Components:

*   **Schema Definition:** The database schema is defined in TypeScript at `src/lib/db/schema.ts`.
*   **Drizzle Client:** The database client instance is configured in `src/lib/db/index.ts`.
*   **Migration Tool:** `drizzle-kit` is used to generate SQL migrations based on schema changes.
*   **Configuration:** Drizzle Kit configuration is in `drizzle.config.js`.
*   **Migrations:** Generated SQL migration files are stored in the `./drizzle` directory.

### Environment Variables:

Ensure your `.env.local` file contains the `DATABASE_URL` variable pointing to your Supabase **connection pooling URI** (as described in the "Environment Setup" section).

```env
DATABASE_URL="postgres://<user>:<password>@<host>:<port>/postgres?pgbouncer=true&connection_limit=1"
```

**Important:** Do *not* use the standard Supabase CLI migration commands (`npx supabase db reset`, `npx supabase migration up`, `npx supabase link`, etc.) as they are incompatible with the Drizzle workflow used in this project and may cause issues.

## Learn More 