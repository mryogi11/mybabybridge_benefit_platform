# ��Project TODO List

*Updated based on detailed review and verification (May 2025). Items marked [VP] are Verified Pending.*

## Pending Features / Implementation Status

### Major Features (Pending / Incomplete)

*   [✅] **Benefit Verification Module:** *(Steps 1-6 UI/Logic Largely Completed)*
    *   [VP] **Stripe Webhook for Payment Confirmation:** Implement and test Stripe Webhook handler for robust payment status updates and `benefit_status` finalization. *(Critical for reliable payment processing)*
    *   [VP] **"No Work Email" Alternative Flow (Employer Path):** Implement if still required per product decision. *(Step 4 context)*
    *   [VP] **Robust Verification Logic:** Enhance/replace basic email list check if more advanced verification (e.g., HRIS) is needed.
    *   [ ] Review/Refine Stripe error handling and user feedback in Step 6.
    *   *(Ref: `docs/BENEFIT_MODULE_GUIDE.md`)*
*   [✅] **Secure Messaging:** *(Core functionality refactored and implemented using Server Actions)*
    *   [ ] Consider minor UI/UX refinements if feedback arises.
*   [🚧] **Payments (Stripe Integration):**
    *   [✅] Stripe Payment Intent creation logic functional (Benefit Step 6).
    *   [VP] **Stripe Webhook Handler:** *(Same as critical item in Benefit Verification)*.
    *   [VP] Subscription management logic (if applicable beyond one-time payments).
    *   [VP] Review/Implement API routes for managing payment methods/subscriptions (currently placeholders/mock data in some docs).
*   [🚧] **Analytics Module:**
    *   [VP] **Admin Analytics (`/admin/analytics`):** Needs significant rework. Currently uses client-side Supabase calls, mock data (success rates), revenue data is commented out/non-functional. Full PRD features (logs, detailed metrics, server-side aggregation) are pending.
    *   [✅] **Provider Analytics (`/provider/analytics`):** Functional dashboard using RPCs.
    *   [✅] **Patient Analytics (`/dashboard/analytics`):** Functional dashboard using `analytics_metrics` table.
    *   [✅] **Provider Education Analytics (`/dashboard/provider/education/analytics`):** Functional dashboard.
    *   [VP] **Treatment Plan Analytics (`/provider/treatment-plans/[id]/analytics`):** Placeholder exists, needs implementation.
*   [✅] **Educational Resources:**
    *   UI for displaying content to patients (`/dashboard/education`) and provider CRUD (`/dashboard/provider/education`) is **functional**, using client-side Supabase calls and tables (`education_categories`, `education_resources`).
    *   [ ] Content curation strategy and populating with comprehensive "curated content" as per PRD.
    *   [ ] Consider refactoring data access to Server Actions for consistency.
*   [🚧] **Notifications:**
    *   [✅] In-app notification display UI (`src/components/Notifications.tsx` - bell icon, `src/app/(dashboard)/dashboard/notifications/page.tsx` - dedicated page) is partially implemented.
    *   [🚧] Dedicated notifications page uses **mock data**. Real-time updates for bell icon via Supabase subscription are set up.
    *   [VP] **Notification Triggers:** Implement backend logic to create notifications for key events (appointments, benefits, messages etc.).
    *   [VP] **Email Notification System:** Design and implement email sending for notifications.
    *   [VP] User preferences for notifications need to be fully implemented (currently UI placeholders in some settings pages).

### Module-Specific Tasks

*   **Admin Module:**
    *   [🚧] **Provider Management (`/admin/providers`):** Basic CRUD for provider profiles (name, specialization, etc.) via client-side Supabase calls exists.
        *   [VP] TODO: Link new provider creation to an actual `users` table entry / Supabase Auth user.
        *   [VP] Advanced features (credentials management, monitoring as per PRD) are pending.
    *   [VP] **User Activity Logs / Platform Metrics Dashboard:** Implement mechanisms and UI as per PRD/Analytics section.
*   **Provider Module:**
    *   [✅] **Profile Management (`/provider/profile`):** View/edit core profile fields functional (client-side Supabase calls).
    *   [✅] **Patient List (`/provider/patients`):** Functional, uses `getPatientsForProvider` server action.
    *   [✅] **Patient Communication:** Linked to Secure Messaging feature (functional).
    *   [🚧] **Settings (`/provider/settings`):** Theme selection functional. Password change and detailed notification preferences are UI placeholders and need backend logic.
*   **Patient Module:**
    *   [✅] **Dashboard (`/dashboard`):** Functional, page loader implemented. Displays upcoming appointments.
    *   [VP] **Dashboard Refinement:** Enhance to show current benefit package status/details more prominently.
    *   [✅] **Profile Management (`/dashboard/profile`):** Placeholder UI exists, needs full implementation for viewing/editing.
    *   [✅] **Communication:** Linked to Secure Messaging feature (functional).

### Authentication & Authorization

*   [VP] **Social Login:** Implement Google/Facebook login (as per PRD).
*   [VP] **Staff Role:** Define and implement permissions/access if distinct from 'admin'.
*   [ ] **Security Review:** Conduct ongoing thorough reviews of RLS policies and API/Server Action authorization checks.

## Technical Debt / Improvements

*   [VP] **Refactor to Server Actions:** Convert remaining direct client-side Supabase calls to Server Actions. (Identified in Admin Analytics, Education module, Admin Provider Mgmt, Provider Profile, Provider Availability).
*   [VP] **Improve Data Fetching:** Optimize Server Actions to efficiently join/return related data where needed.
*   [VP] **Refine Type Safety:** Review widespread usage of `as any` and ensure types accurately reflect fetched data.
*   [VP] **Standardize Error Handling:** Improve consistency in Server Action error reporting and create more user-facing friendly error messages.
*   [ ] **Update Documentation:** Keep `README.md`, `PRD.md`, `HANDOVER.md`, `CODE_INDEX.md`, and this `TODO.md` updated as work progresses. *(Ongoing)*
*   [VP] **Testing:** Implement unit, integration, and end-to-end tests (Jest, Cypress mentioned in PRD). *(Helper scripts for test users exist, but no formal test suites).*
*   [VP] **Page Loader for Admin/Provider Roles:** Verify/Implement page loader for Admin and Provider main navigation if their layouts/navigation components differ from Patient dashboard and don't use `LoadingContext` yet. Admin layout has a custom drawer.

---
*Previous content below might be outdated.*
<!-- (Previous content remains commented out) -->