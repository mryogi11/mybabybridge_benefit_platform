# Project TODO List 📋

This document tracks the features and tasks for the MyBabyBridge platform.

## Feature Status

**Completed Features ✅**

*   [x] **Core Authentication:** User sign-up, sign-in, sign-out (Supabase Auth).
*   [x] **Basic User Roles:** Setup for Admin, Provider, Patient roles in DB.
*   [x] **Database Schema:** Initial setup for Users, Providers, Patients, Appointments, Messages (Supabase Postgres).
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

**Pending Features ⏳ / In Progress 🚧**

*   [ ] **Provider Module - Profile Management:**
    *   [ ] View/Edit own profile details (Specialization, Bio, Experience, Education, Certifications).
    *   [ ] Upload/Manage profile picture.
*   [ ] **Provider Module - Patient Management:**
    *   [ ] View assigned patient list.
    *   [ ] View individual patient details (read-only?).
*   [ ] **Provider Module - Appointments:**
    *   [ ] View upcoming/past appointments.
    *   [ ] Schedule new appointments (link to patient).
    *   [ ] Cancel/Reschedule appointments.
*   [ ] **Provider Module - Messaging:**
    *   [ ] View/Send secure messages to patients.
    *   [ ] View/Send messages to admin/staff?
*   [ ] **Provider Module - Settings:**
    *   [ ] Account settings (password change, etc.).
    *   [ ] Notification preferences.
*   [ ] **Patient Module:** (All features)
    *   [ ] Dashboard view.
    *   [ ] Profile management.
    *   [ ] View assigned provider(s).
    *   [ ] Appointment scheduling/viewing.
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
    *   [ ] Refine Row Level Security (RLS) policies for all tables.
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
    *   [ ] Update `HANDOVER.md` as features are completed.
    *   [ ] Add comprehensive code comments where necessary.
    *   [ ] User guide documentation?

**UI Connectivity Tasks 🔗**

*Track pages/sections that exist but need proper links/navigation integration.* 

*   **Patient Dashboard:**
    *   [ ] `/dashboard` (Needs linking from login/nav)
    *   [ ] `/profile` (Needs linking from patient nav)
    *   [ ] `/appointments` (Needs linking from patient nav)
    *   [ ] `/messages` (Needs linking from patient nav)
    *   [ ] `/settings` (Needs linking from patient nav)
*   **Provider Portal:**
    *   [x] `/provider/dashboard` (Accessible via login & sidebar)
    *   [ ] `/provider/profile` (Linked in sidebar, page/functionality **TODO**)
    *   [ ] `/provider/patients` (Linked in sidebar, page/functionality **TODO**)
    *   [ ] `/provider/appointments` (Linked in sidebar, page/functionality **TODO**)
    *   [ ] `/provider/messages` (Linked in sidebar, page/functionality **TODO**)
    *   [ ] `/provider/settings` (Linked in sidebar, page/functionality **TODO**)
*   **Admin Portal:**
    *   [x] `/admin` (Accessible via login)
    *   [x] `/admin/users` (Accessible via sidebar)
    *   [ ] `/admin/settings` (Needs sidebar link & page)

## Priorities (High to Low)

1.  **Provider Module Core:** Implement Profile, Patient list, Appointments, Messaging pages.
2.  **Patient Module Core:** Implement basic Dashboard, Profile, Appointments, Messaging pages.
3.  **Admin User Editing/Deletion:** Complete user management functionality.
4.  **Security Refinement:** Thoroughly review and test RLS policies.
5.  **Payment Integration:** Connect billing functionality.
6.  **Testing:** Implement basic test coverage.
7.  **Deployment Prep:** Configure environments.

*Self-reflect and critique: Prioritization might shift based on client feedback or technical blockers.*