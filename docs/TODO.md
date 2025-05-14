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
    *   [🚧] **Admin Analytics (`/admin/analytics`):** Needs significant rework. Currently uses client-side Supabase calls, mock data (success rates), revenue data is commented out/non-functional. Full PRD features (detailed metrics, server-side aggregation) are pending. *(Activity Log backend/DB/basic logging implemented)*
    *   [✅] **Google Analytics (GA4) Basic Setup:** Pageview and User ID tracking implemented via `RootLayout`. *(Ref: `docs/ANALYTICS_SETUP.md`)*
        *   [VP] Implement Custom Event Tracking for key actions (login, registration, form submission, etc.).
        *   [VP] Implement robust Cookie Consent Management (Current implementation uses implicit consent on login).
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
        *   [✅] **DONE (Partially Addressed/Reframed):** The "Add Provider" form on the `/admin/providers` page (which used a placeholder `user_id` and didn't create auth users) has been removed. This page is now for listing/editing existing provider profiles. New provider creation (which correctly creates auth users and links them) is handled separately (e.g., via `/admin/users` which uses the `/api/admin/create-user` endpoint).
        *   [VP] Advanced features (credentials management, monitoring as per PRD) are pending.
    *   [✅] **User Activity Logs:** Implemented backend logging (`activity_logs` table, `createActivityLog` action). Basic UI for viewing/filtering logs at `/admin/analytics/logs`. *(Platform Metrics Dashboard part still pending)*
    *   [✅] **Settings (`/admin/admin/settings`):** Theme selection, profile information editing (first/last name), and password change are functional. Review for any other common admin-specific settings if needed.
*   **Provider Module:**
    *   [✅] **Profile Management (`/provider/profile`):** View/edit core profile fields functional (client-side Supabase calls).
    *   [✅] **Patient List (`/provider/patients`):** Functional, uses `getPatientsForProvider` server action.
    *   [✅] **Patient Communication:** Linked to Secure Messaging feature (functional).
    *   [🚧] **Settings (`/provider/settings`):**
        *   [✅] Theme selection functional.
        *   [✅] Password change functional.
        *   [VP] Implement Notification Preferences (Currently UI section hidden, placeholder links removed, requires backend and UI reinstatement).
        *   [VP] Review if Payment Settings link/section is needed for Providers (Currently UI hidden/removed).
*   **Patient Module:**
    *   [✅] **Dashboard (`/dashboard`):** Functional, page loader implemented. Displays upcoming appointments. "Profile" link removed from side drawer, access via user menu.
    *   [VP] **Dashboard Refinement:** Enhance to show current benefit package status/details more prominently.
    *   [VP] **Profile Management (`/dashboard/profile`):** Placeholder UI exists, needs full implementation for viewing/editing.
    *   [✅] **Communication:** Linked to Secure Messaging feature (functional).
    *   [🚧] **Settings (`/dashboard/settings`):**
        *   [✅] Theme selection functional.
        *   [✅] Password change functional.
        *   [VP] Implement Notification Preferences (Currently UI hidden, requires backend and UI reinstatement).
        *   [VP] Implement Language & Region settings (Currently UI hidden, requires backend and UI reinstatement).
        *   [VP] Implement Accessibility settings (Currently UI hidden, requires backend and UI reinstatement).
        *   [VP] Implement Two-Factor Authentication (Currently UI hidden, requires backend and UI reinstatement).
        *   [VP] Implement Profile Visibility settings (Currently UI hidden, requires backend and UI reinstatement).

### Authentication & Authorization

*   [VP] **Social Login:** Implement Google/Facebook login (as per PRD).
*   [VP] **Staff Role:** Define and implement permissions/access if distinct from 'admin'.
*   [ ] **Security Review:** Conduct ongoing thorough reviews of RLS policies and API/Server Action authorization checks.

## Technical Debt / Improvements

*   [VP] **Refactor to Server Actions:** Convert remaining direct client-side Supabase calls to Server Actions. (Identified in Admin Analytics, Education module, Admin Provider Mgmt, Provider Profile, Provider Availability).
*   [VP] **Improve Data Fetching:** Optimize Server Actions to efficiently join/return related data where needed.
*   [VP] **Refine Type Safety:** Review widespread usage of `as any` and ensure types accurately reflect fetched data.
*   [VP] **Standardize Error Handling:** Improve consistency in Server Action error reporting and create more user-facing friendly error messages.
*   [ ] **Update Documentation:** Keep `README.md`, `PRD.md`, `HANDOVER.md`, `CODE_INDEX.md`, `docs/MATERIO_UI_UPGRADE_PLAN.md`, and this `TODO.md` updated as work progresses. *(Ongoing)*
*   [VP] **Testing:** Implement unit, integration, and end-to-end tests (Jest, Cypress mentioned in PRD). *(Helper scripts for test users exist, but no formal test suites).*
*   [✅] **Page Loader for Admin/Provider Roles:** (Implemented and verified across all dashboards)

## Recently Completed UI/UX Enhancements (May 2025)
*   [✅] **Materio UI Upgrade - Phase 1 Complete:** Dashboard shell (Navigation & Main Layout) restyled for improved look and feel, aligning with Materio design principles. *(Ref: `docs/MATERIO_UI_UPGRADE_PLAN.md`)*
*   [✅] **Collapsible Side Drawers:** Implemented for Patient, Provider, and Admin dashboards, providing a consistent, space-saving UI feature on desktop.
*   [✅] **Standardized Profile Dropdown Menus:** The user profile dropdown (avatar click) UI is now consistent across Patient, Provider, and Admin dashboards, including user info, profile link, and styled logout.
*   [✅] **Global Page Loader Extended:** Ensured the main navigation page loader is functional and consistent across Patient, Provider, and Admin dashboards.

## [VP] Educational Resources:
*   [ ] **DONE - Implemented with RSS Feed:** Design and implement a module for patients to access educational materials (articles, videos, FAQs) - Now pulls from ScienceDaily fertility RSS feed.
    *   [ ] ~~Categorization and tagging of resources.~~ (Handled by RSS feed structure if applicable, otherwise removed for simplicity with RSS)
    *   [ ] ~~Tracking patient progress through materials.~~ (Removed as RSS feed is external and doesn't support this directly)
    *   [ ] Potentially link to external reputable sources. (Achieved via "Original Source" link on each post)

---
*Previous content below might be outdated.*
<!-- (Previous content remains commented out) -->