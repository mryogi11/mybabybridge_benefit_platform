# 📋Project TODO List

This document tracks the features and tasks for the MyBabyBridge platform.
*Updated based on PRD/README review and recent debugging (April 2025).*

## Pending Features / Implementation Status

### Major Features (Pending / Incomplete)

*   [ ] **Benefit Verification Module:**
    *   [ ] Implement user-facing flow (Steps 1-3 mentioned as planned in README).
    *   [ ] Complete partially implemented steps (Steps 4-6 mentioned in README).
    *   [ ] Integrate verification status with package selection/dashboard.
    *   [ ] Implement "No Work Email" alternative verification flow (Step 4).
    *   [ ] *(Ref: `docs/BENEFIT_MODULE_GUIDE.md`)*
*   [ ] **Secure Messaging:**
    *   [ ] Implement UI for patient-provider communication.
    *   [ ] Implement backend logic (Server Actions/API) for sending/receiving messages.
    *   [ ] Handle message storage and retrieval.
    *   [ ] Implement real-time updates (e.g., via Supabase Realtime).
*   [ ] **Payments (Stripe Integration):**
    *   [ ] Implement UI flow for package purchase/subscription.
    *   [ ] Verify/complete Stripe Payment Intent creation logic.
    *   [ ] Implement and test Stripe Webhook handler (`/api/payments/webhook` mentioned in PRD).
    *   [ ] Handle subscription management (linking status to `PatientPackages` table).
*   [ ] **Analytics Module:**
    *   [ ] Design and implement Admin dashboard UI for analytics.
    *   [ ] Implement data collection/aggregation for required metrics (Revenue, User, Treatment).
    *   [ ] Develop backend logic/API endpoints for fetching analytics data.
    *   [ ] Implement chart/visualization components.
*   [ ] **Educational Resources:**
    *   [ ] Determine content management strategy (e.g., CMS, markdown files, database table).
    *   [ ] Implement UI for displaying curated content to patients.
    *   [ ] Develop logic for fetching/serving content.
*   [ ] **Notifications:**
    *   [ ] Implement triggers for key events (appointments, benefits, messages etc.).
    *   [ ] Set up mechanism for sending email notifications.
    *   [ ] Develop in-app notification display system (beyond basic dashboard list).
    *   [ ] Implement read/unread status management.

### Module-Specific Tasks

*   **Admin Module:**
    *   [ ] **Provider Management:** Implement UI and APIs for Provider CRUD, credentials management, monitoring (as per PRD).
    *   [ ] **User Activity Logs:** Implement mechanism for logging and viewing admin-relevant user actions.
    *   [ ] **Platform Metrics Dashboard:** Implement dashboard UI described in PRD/Analytics section.
*   **Provider Module:**
    *   [ ] **Profile Management:** Implement UI for providers to manage professional details, visibility settings (as per PRD).
    *   [ ] **Patient Communication:** Linked to Secure Messaging feature.
*   **Patient Module:**
    *   [ ] **Dashboard Refinement:** Enhance dashboard beyond upcoming appointments (e.g., treatment plan progress linked to benefits).
    *   [ ] **Profile Management:** Implement UI for patients to view/edit their profile.

### Authentication & Authorization

*   [ ] **Social Login:** Implement Google/Facebook login integration (as per PRD).
*   [ ] **Staff Role:** Define and implement permissions/access for the 'staff' role if distinct from 'admin'.
*   [ ] **Security Review:** Conduct thorough review of RLS policies and API/Server Action authorization checks.

## Technical Debt / Improvements

*   [ ] **Refactor to Server Actions:** Convert remaining direct Supabase client calls (Provider Availability management, Provider Appointment complete/edit) to Server Actions.
*   [ ] **Improve Data Fetching:** Enhance Server Actions (`getAppointmentsForUser`, etc.) to efficiently join related data (patient/provider names) needed by the UI.
*   [ ] **Refine Type Safety:** Review usage of `as any` and ensure types (e.g., `ProviderDashboardAppointmentData`) accurately reflect fetched data, especially with complex joins.
*   [ ] **Standardize Error Handling:** Improve consistency in Server Action error reporting and user-facing error messages.
*   [ ] **Update Documentation:** Keep `README.md`, `PRD.md`, `HANDOVER.md`, `CODE_INDEX.md`, and this `TODO.md` updated as work progresses.
*   [ ] **Testing:** Implement unit, integration, and end-to-end tests (Jest, Cypress mentioned in PRD).

---
*Previous content below might be outdated.*
<!-- 
OUTDATED CONTENT:

**Completed Features ✅**

*   [x] **Core Authentication:** User sign-up, sign-in, sign-out (Supabase Auth).
*   [x] **Basic User Roles:** Setup for Admin, Provider, Patient roles in DB.
*   [x] **Database Schema:** Initial setup for Users, Providers, Patients, Appointments, Messages (Supabase Postgres).
*   [x] **Database Logic:** Appointment notifications, RLS policies setup.
*   [x] **Basic Admin Dashboard Layout:** Sidebar, Main content area.
*   [x] **Basic Provider Dashboard Layout:** Sidebar, Main content area.
*   [x] **Basic Patient Dashboard Layout:** (Assuming similar structure)
*   [x] **Admin User Management Page:** Display list of users from DB.
*   [x] **Admin User Management Page:** Styling refinement (Minimal Theme, DataGrid).
*   [x] **Admin User Management Page:** Add Quick Filter (Search) to DataGrid Toolbar.
*   [x] **Admin User Management Page:** Add User Dialog (Basic Info + Role).
*   [x] **Admin User Management Page:** Add User functionality (including Providers with details via Server Action).
*   [x] **Provider Login/Dashboard Access:** Correct redirect and session handling.
*   [x] **Provider Navigation:** Sidebar links setup.
*   [x] **Patient Appointment History:** Page exists and fetches data.
*   [x] **Provider Appointment History:** Page exists and fetches data.
*   [x] **Admin Module - Organizations:**
    *   [x] Display list of organizations (`/admin/organizations`).
    *   [x] Create new organizations (UI + `POST /api/admin/organizations`).
    *   [x] View/Edit organization details (`/admin/organizations/[orgId]`).
    *   [x] Update organizations (UI + `PUT /api/admin/organizations/[orgId]`).
    *   [x] Delete organizations (UI + `DELETE /api/admin/organizations/[orgId]`).
    *   [x] Manage approved emails for an organization (UI + `POST/DELETE /api/admin/organizations/emails`).

**Pending Features ⏳ / In Progress 🚧**

*   [✅] **Patient Module - Appointments:**
    *   [✅] View upcoming appointments (Page exists, fetches data, displays calendar/list, has detail view).
    *   [✅] Cancel appointments (Functionality exists in detail view).
    *   [✅] Schedule new appointments (Modal exists, connects to server action, fetches provider availability, shows slots).
    *   [ ] Edit appointments (Modal exists but needs connection/logic).
    *   [✅] Calendar Styling (Booked = blue bg, Cancelled-only = orange bg).
    *   [✅] Booking Modal Calendar Styling (Booked=blue bg, Cancelled-only=orange bg, Available=blue border).
*   [✅] **Provider Module - Appointments:**
    *   [✅] View upcoming/past appointments (Page exists, fetches data, displays calendar/list).
    *   [ ] Schedule new appointments (Functionality **TODO**).
    *   [✅] Cancel/Complete appointments (Functionality exists via menu).
    *   [✅] Calendar Styling (Booked = blue bg, Cancelled-only = orange bg).
*   [🚧] **Provider Module - Profile Management:**
    *   [🚧] View/Edit own profile details (Specialization, Bio, Experience, Education, Certifications).
    *   [🚧] Upload/Manage profile picture.
*   [🚧] **Provider Module - Patient Management:**
    *   [🚧] View assigned patient list (Page exists, needs UI/fetch logic).
    *   [🚧] View individual patient details (read-only?).
*   [🚧] **Provider Module - Messaging:**
    *   [🚧] View/Send secure messages to patients (Page exists, needs UI/fetch logic).
    *   [🚧] View/Send messages to admin/staff?
*   [🚧] **Provider Module - Settings:**
    *   [🚧] Account settings (password change, etc.) (Page exists, needs functionality).
    *   [🚧] Notification preferences (Page exists, needs functionality).
*   [🚧] **Patient Module:** (Core functionality pending)
    *   [🚧] Dashboard view (Partial: shows upcoming appointments).
    *   [🚧] Profile management.
    *   [🚧] View assigned provider(s).
    *   [🚧] Secure messaging.
    *   [🚧] View medical records/documents?
    *   [🚧] Payment/Billing information?
*   [🚧] **Admin Module - Enhanced User Management:**
    *   [🚧] Edit existing user details (including role change, provider details).
    *   [🚧] Delete users (handle related data cascade/archival).
    *   [🚧] Suspend/Activate users.
*   [🚧] **Admin Module - Platform Settings:**
    *   [🚧] Manage platform-wide settings (if any).
*   [🚧] **Security & Permissions:**
    *   [🚧] Refine Row Level Security (RLS) policies for all tables (Initial policies exist, need review).
    *   [🚧] Implement proper authorization checks in API routes/Server Actions.
*   [🚧] **Payment Integration:**
    *   [🚧] Integrate Stripe/other provider for patient payments.
    *   [🚧] Link payments to appointments/services.
*   [🚧] **Deployment:**
    *   [🚧] Setup production environment (Vercel/other).
    *   [🚧] Configure domain, SSL.
*   [🚧] **Testing:**
    *   [🚧] Unit tests.
    *   [🚧] Integration tests.
    *   [🚧] End-to-end tests.
*   [🚧] **Documentation:**
    *   [✅] Update `HANDOVER.md` & `TODO.md` as features are completed.
    *   [🚧] Add comprehensive code comments where necessary.
    *   [🚧] User guide documentation?

**UI Connectivity Tasks 🔗**

*Track pages/sections that exist but need proper links/navigation integration.* 

*   **Patient Dashboard:**
    *   [✅] `/dashboard` (Accessible via login)
    *   [🚧] `/profile` (Needs linking from patient nav)
    *   [✅] `/appointments` (Linked from dashboard, page implemented)
    *   [🚧] `/messages` (Needs linking from patient nav)
    *   [🚧] `/settings` (Needs linking from patient nav)
*   **Provider Portal:**
    *   [✅] `/provider/dashboard` (Accessible via login & sidebar)
    *   [x] `/provider/profile` (Linked in sidebar, page exists, functionality **TODO**)
    *   [x] `/provider/patients` (Linked in sidebar, page exists, functionality **TODO**)
    *   [✅] `/provider/appointments` (Linked in sidebar, page implemented)
    *   [x] `/provider/messages` (Linked in sidebar, page exists, functionality **TODO**)
    *   [x] `/provider/settings` (Linked via user menu, page exists, functionality **TODO**)
*   **Admin Portal:**
    *   [x] `/admin` (Accessible via login)
    *   [x] `/admin/users` (Accessible via sidebar)
    *   [🚧] `/admin/settings` (Needs sidebar link & page)

## Priorities (High to Low)

1.  **Refine Appointment Error Handling:** Improve user feedback for various error scenarios (booking, fetching slots, etc.).
2.  **Implement Appointment Editing:** Connect edit modal logic for Patient/Provider.
3.  **Implement Provider Appointment Scheduling:** Allow providers to book appointments.
4.  **Provider Module Core:** Implement Profile, Patient list, Messaging pages.
5.  **Patient Module Core:** Implement basic Dashboard refinement, Profile, Messaging pages.
6.  **Admin User Editing/Deletion:** Complete user management functionality.
7.  **Security Refinement:** Thoroughly review and test RLS policies.
8.  **Payment Integration:** Connect billing functionality.
9.  **Testing:** Implement basic test coverage.
10. **Deployment Prep:** Configure environments.

*Self-reflect and critique: Prioritization might shift based on client feedback or technical blockers.*

## Completed

*   Core Auth & User Roles (Patient, Provider, Admin, Staff)
*   Database Schema Setup & Migration to Drizzle ORM
*   Drizzle ORM Client & Migration Workflow Setup
*   Supabase Project Linking & Basic Config
*   Auth Trigger Function (`handle_new_user`)
*   RLS Policies (Basic select/insert for users/profiles/appointments)
*   Admin User Creation Page
*   Patient Appointment Page (View, Book, Cancel, Calendar Styling)
*   Provider Appointment Page (View, Update Status, Calendar Styling)
*   Appointment Booking Modal (Provider/Date/Slot selection, Availability Fetching, Calendar Styling)
*   Provider Availability Management Page (Basic UI + Weekly Schedule Add)
*   Fixes for appointment booking/fetching logic (Server Actions & Supabase Client Hints).

## Backlog / Future Enhancements

*   Provider configurable timezone.
*   Refactor Supabase joins in `appointmentActions.ts` (currently simplified due to errors).
*   Patient ability to cancel/reschedule appointments.
*   Notifications for appointment changes.
*   More robust validation for availability/booking logic.

-->