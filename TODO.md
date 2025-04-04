# Project TODO List 📋

This document tracks the features and tasks for the MyBabyBridge platform.

## Feature Status

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

**Pending Features ⏳ / In Progress 🚧**

*   [🚧] **Patient Module - Appointments:**
    *   [🚧] View upcoming appointments (Page exists, fetches data, displays calendar/list, has detail view).
    *   [🚧] Cancel appointments (Functionality exists in detail view).
    *   [ ] Schedule new appointments (Functionality **TODO**).
    *   [ ] Edit appointments (Functionality **TODO**).
    *   *Note:* Page has fallback mock data logic that might need review/removal.
*   [ ] **Provider Module - Appointments:**
    *   [ ] View upcoming/past appointments (Page exists, needs UI/fetch logic).
    *   [ ] Schedule new appointments (Functionality **TODO**).
    *   [ ] Cancel/Reschedule/Complete appointments (Functionality **TODO**).
*   [ ] **Provider Module - Profile Management:**
    *   [ ] View/Edit own profile details (Specialization, Bio, Experience, Education, Certifications).
    *   [ ] Upload/Manage profile picture.
*   [ ] **Provider Module - Patient Management:**
    *   [ ] View assigned patient list (Page exists, needs UI/fetch logic).
    *   [ ] View individual patient details (read-only?).
*   [ ] **Provider Module - Messaging:**
    *   [ ] View/Send secure messages to patients (Page exists, needs UI/fetch logic).
    *   [ ] View/Send messages to admin/staff?
*   [ ] **Provider Module - Settings:**
    *   [ ] Account settings (password change, etc.) (Page exists, needs functionality).
    *   [ ] Notification preferences (Page exists, needs functionality).
*   [ ] **Patient Module:** (Core functionality pending)
    *   [ ] Dashboard view (Partial: shows upcoming appointments).
    *   [ ] Profile management.
    *   [ ] View assigned provider(s).
    *   [ ] Secure messaging.
    *   [ ] View medical records/documents?
    *   [ ] Payment/Billing information?
*   [ ] **Admin Module - Enhanced User Management:**
    *   [ ] Edit existing user details (including role change, provider details).
    *   [ ] Delete users (handle related data cascade/archival).
    *   [ ] Suspend/Activate users.
*   [ ] **Admin Module - Platform Settings:**
    *   [ ] Manage platform-wide settings (if any).
*   [ ] **Security & Permissions:**
    *   [ ] Refine Row Level Security (RLS) policies for all tables (Initial policies exist, need review).
    *   [ ] Implement proper authorization checks in API routes/Server Actions.
*   [ ] **Payment Integration:**
    *   [ ] Integrate Stripe/other provider for patient payments.
    *   [ ] Link payments to appointments/services.
*   [ ] **Deployment:**
    *   [ ] Setup production environment (Vercel/other).
    *   [ ] Configure domain, SSL.
*   [ ] **Testing:**
    *   [ ] Unit tests.
    *   [ ] Integration tests.
    *   [ ] End-to-end tests.
*   [ ] **Documentation:**
    *   [x] Update `HANDOVER.md` as features are completed.
    *   [ ] Add comprehensive code comments where necessary.
    *   [ ] User guide documentation?

**UI Connectivity Tasks 🔗**

*Track pages/sections that exist but need proper links/navigation integration.* 

*   **Patient Dashboard:**
    *   [x] `/dashboard` (Accessible via login)
    *   [ ] `/profile` (Needs linking from patient nav)
    *   [x] `/appointments` (Linked from dashboard, page partially implemented)
    *   [ ] `/messages` (Needs linking from patient nav)
    *   [ ] `/settings` (Needs linking from patient nav)
*   **Provider Portal:**
    *   [x] `/provider/dashboard` (Accessible via login & sidebar)
    *   [x] `/provider/profile` (Linked in sidebar, page exists, functionality **TODO**)
    *   [x] `/provider/patients` (Linked in sidebar, page exists, functionality **TODO**)
    *   [x] `/provider/appointments` (Linked in sidebar, page exists, functionality **TODO**)
    *   [x] `/provider/messages` (Linked in sidebar, page exists, functionality **TODO**)
    *   [x] `/provider/settings` (Linked via user menu, page exists, functionality **TODO**)
*   **Admin Portal:**
    *   [x] `/admin` (Accessible via login)
    *   [x] `/admin/users` (Accessible via sidebar)
    *   [ ] `/admin/settings` (Needs sidebar link & page)

## Priorities (High to Low)

1.  **Provider Module - Appointments:** Implement appointment viewing/scheduling/management.
2.  **Provider Module Core:** Implement Profile, Patient list, Messaging pages.
3.  **Patient Module Core:** Implement basic Dashboard, Profile, Appointments, Messaging pages (refine existing appointment page).
4.  **Admin User Editing/Deletion:** Complete user management functionality.
5.  **Security Refinement:** Thoroughly review and test RLS policies.
6.  **Payment Integration:** Connect billing functionality.
7.  **Testing:** Implement basic test coverage.
8.  **Deployment Prep:** Configure environments.

*Self-reflect and critique: Prioritization might shift based on client feedback or technical blockers.*