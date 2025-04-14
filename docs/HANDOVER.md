# MyBabyBridge Fertility Care Platform - Developer Handover

## Project Overview

MyBabyBridge is a comprehensive fertility care platform designed to connect patients with providers, track treatment plans, manage appointments, and provide educational resources. The application is built using Next.js 14, React, Material UI, and Supabase for the backend and authentication.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI Framework**: Material UI v5
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Migration Tool**: Drizzle Kit
- **Authentication**: Supabase Auth
- **State Management**: React Context API
- **Styling**: Material UI with custom theming
- **API**: REST endpoints with Next.js API routes & Next.js Server Actions

## Application Structure

The application follows the Next.js 14 App Router structure with route groups and layouts:

- `src/app/`: Main application code
  - `(auth)/`: Authentication-related pages (login, register)
  - `(dashboard)/`: User dashboard pages
  - `(provider)/`: Provider-specific pages
  - `(admin)/`: Admin portal pages
  - `api/`: API routes
- `src/components/`: Reusable UI components
- `src/contexts/`: React context providers
- `src/lib/`: Utility libraries and functions
  - `db/`: Drizzle ORM client (`index.ts`) and schema definition (`schema.ts`)
- `src/styles/`: Global styles and theme configuration
- `src/types/`: TypeScript type definitions (including shared types like `AppointmentStatus` in `lib/types.ts`)
- `public/`: Static assets
- `drizzle/`: Generated Drizzle ORM SQL migration files
- `drizzle.config.js`: Configuration for Drizzle Kit

## Authentication Flow

The application uses Supabase for authentication with the following key components:

1. `AuthContext.tsx`: Provides authentication state and methods
2. `middleware.ts`: Handles route protection and redirects
3. Login/register pages: User-facing auth interface

### Authentication Quirks and Issues

- **Critical**: The login redirect requires both router.push() and a fallback to window.location.href for cases where router navigation fails.
- React hooks must be called consistently at the top level of the login component to avoid the "Rendered more hooks than during the previous render" error.
- The dashboard layout has an authentication check that redirects to login if no user is found.
- Supabase session handling requires careful configuration in the middleware to avoid infinite redirect loops.

## Key Features

1. **User Dashboards**: Patient and provider dashboards with role-specific views
2. **Treatment Plans**: Creation, tracking, and analytics for fertility treatment plans
3. **Appointment Management**: Scheduling, history, and reminders
4. **Secure Messaging**: Communication between patients and providers
5. **Educational Resources**: Curated content for fertility education
6. **Analytics**: Treatment success metrics and insights
7. **Payments**: Integration with payment processing (Status: In Development / Partially Implemented)

## Development Work Completed

1. ✅ Project initialization with Next.js 14 and TypeScript
2. ✅ Integration with Supabase for authentication and data storage
3. ✅ Implementation of authentication flow (login, register, session management)
4. ✅ Creation of main application layouts and navigation
5. ✅ Development of dashboard pages for patients and providers
6. ✅ Implementation of treatment plan management features
7. ✅ Addition of appointment scheduling and history views
8. ✅ Integration of MyBabyBridge branding and logo
9. ✅ Responsive design for mobile and desktop
10. ✅ Error handling and loading states
11. ✅ Authentication middleware for route protection
12. ✅ Enhanced navigation with UI improvements for user experience
13. ✅ Implemented Gravatar support for profile images
14. ✅ Redesigned authentication pages with consistent branding
15. ✅ Optimized dashboard loading performance
16. ✅ Added visual feedback during navigation and data loading
17. ✅ Updated branding with new logo across the platform
18. ✅ Enhanced welcome page with family imagery and testimonials
19. ✅ Improved profile page with better emergency contacts and medical history sections
20. ✅ Implemented skeleton loaders for improved perceived performance

## Recent UI/UX Improvements

### Authentication Pages
- **Redesigned Login/Register Pages**: Implemented a new two-column layout with the form on the left and a branded gradient on the right
- **Improved Logo Placement**: Positioned the logo above the login/signup forms for better brand visibility
- **Reduced Login Redirect Timer**: Changed dashboard redirect countdown from 5 to 3 seconds after login
- **Enhanced Form Layout**: Optimized spacing to ensure forms are fully visible without scrolling
- **Visual Consistency**: Created cohesive styling across welcome, login, and registration pages

### Welcome Page
- **Image Integration**: Added family-oriented imagery to the welcome page
- **Brand Consistency**: Implemented theme-colored gradient background with image overlay
- **Testimonial Box**: Added compact testimonial highlighting IVF treatment success stories
- **Responsive Design**: Ensured proper mobile display of all welcome page elements

### Performance Optimizations
- **Loading States**: Added immediate visual feedback during page transitions
- **Navigation Improvements**: Enhanced the speed of menu interactions
- **Prefetching**: Implemented data prefetching for commonly accessed routes
- **Skeleton Loaders**: Added comprehensive skeleton loaders for dashboard components
- **Memoization**: Optimized component rendering with React's useMemo and useCallback

### Profile Features
- **Gravatar Integration**: Added support for Gravatar profile images as a default option
- **Fixed Profile Loading**: Resolved issues with profile page loading and state management
- **Improved Medical History**: Enhanced the display and management of medical information
- **Emergency Contact Management**: Better UI for viewing and editing emergency contacts

## Known Issues and Challenges

1. **Database Schema Synchronization (Drizzle):** If manual SQL changes are made to the Supabase database without updating the Drizzle schema (`src/lib/db/schema.ts`), or vice-versa, `drizzle-kit generate` might produce incorrect migration scripts (e.g., trying to create tables/columns that already exist, or drop things unexpectedly). Careful review of generated SQL is essential before application. The migration file `drizzle/0001_ambitious_blur.sql` required significant manual commenting-out due to initial sync issues.
2. **Historical Migration Files (`supabase/migrations`):** The project contains historical migration files in `supabase/migrations/` from the previous Supabase CLI workflow. These are **no longer used** for applying schema changes but serve as a reference for the database's intended structure. The payment-related migrations in this directory may have non-standard filenames and were likely never applied correctly.
3. **Authentication Redirect Issues**: Sometimes there can be issues with redirection after login. The code now includes fallback mechanisms.
4. **API Routes with Cookies**: Some API routes use cookies which causes warnings during build about dynamic server usage.
5. **TypeScript Errors**: Ensure careful type handling when working with Supabase responses.
6. **Data Fetching**: Dashboard pages need proper error handling during data fetching to avoid cascade failures.
7. **Missing Routes**: New pages must be added with both the correct directory structure and authentication handling.
8. **Image Handling**: Ensure proper configuration for Next.js Image component when adding new images.
9. **Session Management**: Occasional session expiration requires additional handling in some edge cases.

## Code Patterns and Best Practices

1. **'use client'** directive must be included at the top of all client-side components
2. **Authentication Checks**: Always check for user authentication before rendering protected content
3. **Error Handling**: Implement proper error boundaries and loading states in all data-fetching components
4. **Environment Variables**: Use environment variables for Supabase and other service credentials
5. **Responsive Design**: Follow Material UI breakpoint patterns for consistent responsive layouts
6. **Asset Management**: Store images in the public/images directory with proper organization
7. **Loading States**: Implement skeleton loaders for better user experience during data fetching

## Development Workflow

1. Run development server: `npm run dev`
2. Modify Drizzle schema (`src/lib/db/schema.ts`) if needed.
3. Generate SQL migration: `npx drizzle-kit generate` (may require temporary `tsconfig.json` target change to `es2016`).
4. Review generated SQL in `./drizzle/`.
5. Apply SQL migration manually via Supabase SQL Editor.
6. Build the project: `npm run build`
7. Start production server: `npm start`
8. The project uses ESLint for code quality: `npm run lint`

## Database Setup (Drizzle ORM)

The database schema is managed exclusively via **Drizzle ORM**. The previous workflow using the Supabase CLI and migration files in `supabase/migrations/` is **deprecated and should not be used**.

*   **Schema Definition:** The source of truth for the database schema is `src/lib/db/schema.ts`. All table structures and relations are defined here using Drizzle's TypeScript syntax.
*   **Drizzle Client:** The database client instance (`db`) is initialized in `src/lib/db/index.ts` and uses the `DATABASE_URL` environment variable.
*   **Migration Generation:** Use `drizzle-kit` to compare the schema definition (`schema.ts`) with the database state (introspected via `DATABASE_URL`) and generate SQL migration files. Command: `npx drizzle-kit generate`.
    *   *Troubleshooting:* If `drizzle-kit` fails with errors related to `const` or `es5` target, temporarily change `compilerOptions.target` in `tsconfig.json` to `es2016`, run the command, and immediately change it back to `es5`.
*   **Migration Files:** Generated SQL files are stored in the `./drizzle` directory. They contain the SQL statements needed to synchronize the database schema with the `schema.ts` definition.
*   **Migration Application:** Generated SQL migrations **must be applied manually**. Copy the SQL content from the relevant file in `./drizzle` and execute it using the Supabase Dashboard > SQL Editor against your database.
*   **Configuration:** Drizzle Kit settings are in `drizzle.config.js`.
*   **Historical Migrations:** The `supabase/migrations/` directory contains old migration files. **Do not run `npx supabase migration up` or similar commands.** These files only serve as historical context.

**Key Tables (Defined in `src/lib/db/schema.ts`):**

*   `users`: Mirrors essential user data from `auth.users`.
*   `providers`: Provider-specific details.
*   `patient_profiles`: Patient-specific profile details.
*   `appointments`: Links providers and patients, stores appointment details.
*   `provider_weekly_schedules`: Defines provider availability.
*   `provider_time_blocks`: Defines specific unavailable times for providers.
*   Other tables related to treatments, messages, documents, etc., are also defined in the schema file.

**Important:** Always review generated SQL migrations carefully before applying them manually to avoid unintended data loss or schema conflicts.

## Next Steps and Future Work

1. Complete payment integration with Stripe
2. Implement real-time notifications
3. Enhance analytics dashboards for providers
4. Add document upload and management
5. Implement email notifications for important events
6. Create a mobile application using React Native
7. Expand treatment plan tracking features
8. Add more detailed IVF-specific workflow tracking
9. Implement two-factor authentication for enhanced security
10. Create provider-specific dashboards with patient management

## Environment Setup

The project requires the following environment variables in `.env.local` (refer also to `README.md`):

```
# Drizzle ORM Database Connection (REQUIRED for server-side operations)
DATABASE_URL=your-supabase-connection-pooling-uri

# Supabase Client Configuration (REQUIRED for client-side auth, etc.)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe Configuration (if payments are used)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deployment

The project is configured for deployment to Vercel with the following considerations:

1. Environment variables must be configured in the Vercel project settings
2. Production builds should pass all type checks and linting
3. The project uses Next.js' Image Optimization and requires proper configuration for production

## Final Notes

This project implements a comprehensive fertility care platform with multiple user roles and complex workflows. The key to successful development is understanding the authentication and data flow patterns throughout the application. Pay special attention to authentication state management and proper error handling during data fetching operations.

The codebase is structured to be maintainable and scalable, with clear separation of concerns between components, contexts, and API routes. Continue following the established patterns when adding new features or modifying existing ones. 

## Recent Changes and Updates (as of April 2025)

The platform has undergone significant UI/UX improvements focused on brand consistency, performance optimization, and user experience enhancements. Key updates include:

1. **Brand Refresh**: Implemented new logo and consistent color scheme across all pages
2. **Authentication Experience**: Redesigned login and registration pages with improved layout and branding
3. **Welcome Page**: Enhanced with family imagery, testimonials, and professional styling
4. **Profile Features**: Added Gravatar support and improved profile management
5. **Performance**: Reduced page load times and added visual feedback during transitions
6. **Mobile Responsiveness**: Improved adaptability across different device sizes

These changes have significantly enhanced the platform's professional appearance and user experience, establishing a strong foundation for future feature development. 

## Project Status

*   **Overall:** Development in progress. Core authentication and basic layouts for Admin and Provider are functional. Admin user listing and creation (including detailed provider creation via Server Action) is implemented. Provider login and dashboard access issues have been resolved.
*   **Auth:** Supabase Auth is used. Basic sign-up/sign-in/sign-out works. Role handling is implemented via `users` table.
*   **Database:** Supabase Postgres. Schema is managed via **Drizzle ORM** (`src/lib/db/schema.ts`) and manual application of migrations generated by `drizzle-kit` (stored in `./drizzle`). Historical Supabase CLI migrations exist in `supabase/migrations` but are **not used**.
*   **Admin Module:** User list page with search/filter implemented. User creation dialog allows adding all roles, including providers with specific details. Edit/Delete functionality is pending.
*   **Provider Module:** Basic layout and sidebar navigation implemented. Dashboard is accessible after login. Appointments page shows provider's schedule with status updates (complete/cancel). Patient list, Profile, Messages, Settings need content/functionality.
*   **Patient Module:** Layout exists. Appointments page allows viewing, booking (via modal with provider availability), and cancelling appointments. Profile, Messages, Settings need content/functionality.
*   **Appointments:** 
    *   Patient can view appointments, book new ones (selecting provider, date, time slot based on Drizzle-fetched availability), and cancel.
    *   Provider can view their appointments and update status (Complete, Cancel).
    *   Calendars on patient/provider dashboards and booking modal visually indicate booked (blue), available (blue border - modal only), and cancelled-only (orange) dates.
*   **UI/UX:** Using Material UI (MUI) with a custom Minimal theme, aiming for consistency. 
    *   **Visual Target:** Component styling aims to emulate the Minimal UI Kit free demo ([https://free.minimals.cc/](https://free.minimals.cc/)). Theme overrides are used to centralize styles.
*   **Payments:** Stripe integration is planned but not started.

## Key Code Locations

*   **Authentication:** `src/contexts/AuthContext.tsx`, `src/app/(auth)/login/page.tsx`, Supabase client helpers.
*   **Layouts:** `src/components/layouts/`, `src/app/(admin)/layout.tsx`, `src/app/(provider)/layout.tsx`.
*   **Admin User Management:** `src/app/(admin)/admin/users/page.tsx`, `src/actions/userActions.ts` (for creation).
*   **Provider Components:** `src/app/(provider)/...` (Dashboard, Sidebar Content).
*   **Database Schema:** `src/lib/db/schema.ts` (Drizzle schema definition)
*   **Database Client:** `src/lib/db/index.ts` (Drizzle client initialization)
*   **Migrations:** `./drizzle/` (Generated SQL migration files), `drizzle.config.js`
*   **Server Actions (using DB):** e.g., `src/actions/appointmentActions.ts`
*   **Supabase Client (client-side):** `src/lib/supabase/client.ts` (Path needs confirmation if still used heavily outside Auth)

## Next Steps / Priorities

1.  **Implement Provider Module Pages:** Build out the functionality for Profile, Patients, Appointments, Messages, Settings.
2.  **Implement Patient Module Pages:** Build out core patient functionality.
3.  **Admin User Edit/Delete:** Add remaining CRUD operations for users.
4.  **Refine RLS/Security:** Ensure database security is robust.
5.  See `TODO.md` for detailed task breakdown.

## Potential Issues / Blockers

*   Ensuring Drizzle schema (`schema.ts`), generated migrations (`./drizzle`), and the actual database state remain synchronized. Careful review of generated SQL is critical.
*   Complexity in Drizzle queries involving multiple relations or advanced filtering.
*   Ensuring all Supabase client initializations (client-side, server components, server actions) use appropriate keys and handle sessions correctly, especially distinguishing between Supabase client usage (Auth) and Drizzle client usage (DB operations).
*   Further RLS policy refinement might be complex depending on requirements and how they interact with Drizzle queries.

## Handover Checklist

*   [x] Environment variables (`.env.local`) configured correctly.
*   [x] Database schema applied via `npx supabase db reset --linked` using corrected migrations.
*   [x] Clear understanding of the current feature set and limitations.
*   [ ] Familiarity with the key code locations listed above.
*   [ ] Review `TODO.md` for pending tasks and priorities. 

## Technical Stack Overview

*   **Framework:** Next.js (^15.2.4)
*   **Language:** TypeScript
*   **UI:** Material UI (MUI Core ^5.17.1, MUI X ^7.28.3)
*   **Styling:** Emotion (^11.14.0)
*   **Backend/DB:** Supabase (Postgres, Auth)
*   **Auth Helper:** @supabase/auth-helpers-nextjs (^0.9.0)
*   **Forms:** React Hook Form (^7.50.1) + Zod (^3.22.4)
*   **State:** React Context API
*   **Deployment Target:** Vercel 

## Database Management (Drizzle ORM)

**IMPORTANT:** This project utilizes **Drizzle ORM** for managing the database schema and performing migrations, replacing the standard Supabase CLI migration workflow.

### Overview:

*   Database interactions in the application code are handled via the Drizzle client (`db`).
*   The database schema is defined as TypeScript code in `src/lib/db/schema.ts`.
*   The Drizzle client is initialized in `src/lib/db/index.ts`.
*   Database schema migrations are generated using `drizzle-kit` based on changes to `schema.ts`.

### Key Files & Directories:

*   `src/lib/db/schema.ts`: Source of truth for database table structures.
*   `src/lib/db/index.ts`: Drizzle client initialization.
*   `drizzle.config.js`: Configuration file for `drizzle-kit`.
*   `./drizzle/`: Directory containing generated SQL migration files.
*   `.env.local`: Must contain the `DATABASE_URL` for the Supabase connection pooler.

### Environment Setup:

Ensure the `.env.local` file has the correct `DATABASE_URL` pointing to your Supabase **connection pooling URI**:

```env
DATABASE_URL="postgres://<user>:<password>@<host>:<port>/postgres?pgbouncer=true&connection_limit=1"
```

Find this in your Supabase Dashboard > Project Settings > Database > Connection string (Use URI).

### Workflow for Schema Changes:

1.  **Modify Schema:** Edit the table definitions in `src/lib/db/schema.ts`.
2.  **Generate Migration:** Run the following command in your terminal:
    ```bash
    npx drizzle-kit generate
    ```
    *   **Troubleshooting:** If you encounter errors related to `const` or `es5` target during generation, you may need to temporarily edit `tsconfig.json`, change `compilerOptions.target` to `es2016`, run `npx drizzle-kit generate`, and then **immediately change the target back to `es5`** in `tsconfig.json`.
3.  **Review Migration:** A new `.sql` file will be created in the `./drizzle` directory. Carefully review this file to ensure the generated SQL commands are correct and expected.
4.  **Apply Migration:** 
    *   Go to your Supabase project dashboard.
    *   Navigate to the **SQL Editor**.
    *   Copy the **entire content** of the newly generated `.sql` migration file.
    *   Paste the SQL into the editor.
    *   Click **RUN**.

**Crucial Note:** Do **NOT** use the Supabase CLI commands like `supabase db reset`, `supabase migrations up`, or `supabase db push`. These commands interact with the `supabase/migrations` system, which is **not** synchronized with the Drizzle schema defined in this project. Applying schema changes *only* through the Drizzle workflow described above is essential for maintaining consistency. 