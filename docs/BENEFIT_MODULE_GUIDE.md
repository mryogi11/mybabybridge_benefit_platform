# Fertility Benefit Module Implementation Guide

### Phase 1: Initial Account Creation
1. **Patient creates account** through standard registration: already implemented
2. **Email verification** to confirm account: already implemented
3. **First login** automatically redirects to Employee Benefit Verification flow

### Phase 2: Employee Benefit Verification (First Login)
1. **Benefit Source Identification**
2. **Organization Verification** (if employer-sponsored)
3. **Personal Information Collection**
4. **Eligibility Verification**
5. **Package Options Presentation**
6. **Package Selection/Upgrade**

## Screen-by-Screen Implementation Guide

### Initial Account Creation Flow

#### Screen 1: Account Registration
- Simple registration form with:
  - Email address
  - Password
  - Basic contact information
  - Terms of service acceptance
- Clear messaging that benefit verification will happen after account creation

#### Screen 2: Email Verification
- Confirmation of successful account creation
- Instructions to verify email
- Option to resend verification email

### Employee Benefit Verification Flow (Post-Login)

#### Screen 1: Benefit Source Identification
- Clean, minimalist design similar to Maven's interface
- Clear heading: "Who provides your fertility benefit?"
- Subheading: "(It's usually an employer or health plan)"
- Radio button options:
  - "My employer or health plan"
  - "A partner, parent, or someone else"
  - "None of the above"
- Light mint-colored "Continue" button at bottom
- Progress indicator showing "Step 1 of 4: Benefit Verification"

#### Screen 2: Organization Search
- Heading: "Which organization sponsors your fertility benefit?"
- Subheading: "This may be your employer or health insurance company"
- Search field with organization name autocomplete
- "I'm not sure" text link below the search field
- Same progress indicator updated to show current step

#### Screen 3: Personal Information Verification
- Heading: "Let's verify your information for benefit eligibility"
- Subheading: "Please use the information your organization has on file"
- Form fields:
  - First name
  - Last name
  - Date of birth (with dropdown for month, text fields for day and year)
  - Phone number with country code selection
- "Next" button in brand color
- Progress indicator updated

#### Screen 4: Work Email Verification
- Heading: "Let's verify your information for free access"
- Subheading: "Please use the info that your sponsoring organization has on file"
- Work email input field
- "I don't have a work email" text link
- "Next" button in light mint color
- Progress indicator updated

#### Screen 5: Benefit Package Options
- Heading: "Your Fertility Benefit Options"
- For employer-sponsored users:
  - Subheading: "Your employer provides the Basic coverage. You can upgrade to enhance your benefits."
- Card layout showing 4 package options side by side:
  1. **Basic** (Employer-Sponsored): Current plan, no additional cost
  2. **Silver Upgrade**: Enhanced services with pricing
  3. **Gold Upgrade**: Comprehensive support with pricing
  4. **Platinum Upgrade**: Premium experience with pricing
- Each card includes:
  - Package name
  - Monthly cost
  - Brief description 
  - Bullet points listing key benefits
  - Appropriate call-to-action button
- Visual differentiation between current plan and upgrade options

#### Screen 6: Confirmation Screen
- Summary of selected package
- Details of employer coverage vs. personal upgrade (if applicable)
- Payment details (only if upgraded beyond employer coverage)
- Clear "Complete Setup" button
- Option to save payment information for future

## Implementation Guidelines

### User Experience Considerations
1. **First-Time User Journey**:
   - Show welcome message on first login
   - Provide clarity about the benefit verification process
   - Cannot skip benefit verification flow on first login

2. **Return User Journey**:
   - Direct access to dashboard
   - Easy access to upgrade options in account settings

3. **Verification Messaging**:
   - Clear success indicators when employer benefit is verified
   - Friendly error messages for verification issues
   - Support options if verification fails

### Data Management
1. **User Database Structure**:
   - Account status tracking (pending verification, verified, declined)
   - Employer affiliation
   - Package selection history
   - Billing information (for upgraded packages)

2. **Organization Database**:
   - Company information
   - Benefit tier offered
   - Domain verification for email validation
   - HR contacts for verification issues

### Security and Privacy
1. **Verification Data Handling**:
   - Secure transmission of personal information
   - Minimum required data collection
   - Clear privacy notices during verification

2. **Employer Data Integration**:
   - Secure API connections to employer benefit systems
   - Automated verification where possible
   - Manual verification fallback processes

### Package Management
1. **Package Differentiation**:
   - Clear visual hierarchy of package benefits
   - Consistent feature comparison
   - Value proposition for each upgrade tier

2. **Upgrade/Downgrade Paths**:
   - Seamless upgrade process from account dashboard
   - Prorated billing for mid-cycle changes
   - Grace period for package switches

This implementation provides a user-friendly approach to fertility benefit verification while offering clear upgrade paths for patients who want enhanced services beyond their employer-provided benefits.

## Current Implementation Status (As of April 15, 2025)

### Implemented Features:

*   **Multi-Step Flow:** Basic UI and navigation structure for Steps 1-6.
*   **State Management:** `BenefitVerificationContext` used for shared state.
*   **Step 1:** Benefit source selection and update (`updateBenefitSource`).
*   **Step 2:** Organization search (`searchOrganizations`) and selection (`updateSponsoringOrganization`).
*   **Step 3 & 4:** Personal info and work email submission (`submitVerificationInfo`).
*   **Basic Verification:** Verification logic checks submitted work email against `organization_approved_emails` table.
*   **Base Package Assignment:** Default employer package assigned on successful basic verification.
*   **Step 5:** Package viewing (`getBenefitPackages` - basic) and selection (`updateSelectedPackage`).
*   **Step 6 (Confirmation/Payment):**
    *   Displays selected package details (`getUserWithSelectedPackage`).
    *   Initializes Stripe Elements for paid packages (`createPaymentIntent`).
    *   Handles Payment Element submission.
    *   Creates/retrieves Stripe Customer ID and associates it with the Payment Intent.
    *   Finalizes setup by setting `benefit_status` to `verified` (`completeBenefitSetup`).
*   **Admin Management:** Basic UI and server actions for adding organizations and approved emails.

### Pending Items / Potential Enhancements:

*   **Layout-Based Status Checks:** Implement the planned routing logic based on `benefit_status` within Server Component layouts (`/dashboard/layout.tsx`, `/benefit-verification/layout.tsx`) as outlined in "Upcoming Refactoring".
*   **Admin Package Management:** Implement the planned UI and API for package management as outlined in "Upcoming Refactoring".
*   **Re-implement Admin Org Edit/Delete:** Fix or refactor API routes and UI for editing/deleting organizations.
*   **Implement Admin Email Edit:** Add UI and API functionality for editing approved emails.
*   **Real Verification Logic:** Replace the basic email check with a robust verification process in `submitVerificationInfo`.
*   **Dynamic Package Filtering:** Update `getBenefitPackages` to use actual user data for filtering.
*   **Stripe Webhooks:** Implement webhook handler for reliable payment tracking.
*   **User Profile Data:** Ensure correct handling/updating of user profile data (e.g., in `patient_profiles` or `users` table) after verification.
*   **"No Work Email" Flow:** Implement the user flow for the "I don't have a work email" option on Step 4.
*   **Input Validation Refinement:** Improve country code selection and phone number validation (Step 3).
*   **UI/UX Refinements:** Continue improving loading states, error handling, and edge case management.
*   **Thorough Testing:** Conduct end-to-end testing of all implemented features and user paths.

## Benefit Verification Status (`benefit_status`)

A crucial piece of state management within the benefit verification flow is the `benefit_status` column added to the `profiles` table (`src/lib/db/schema.ts`).

This column tracks the user's current stage and outcome in the verification process. It is an enum with the following possible values:

*   `'not_started'`: The user has not yet begun the benefit verification process. Users in this state will be automatically redirected from the main dashboard (`src/app/(dashboard)/dashboard/page.tsx`) to Step 1 (`/step1`) of the flow.
*   `'in_progress'`: The user has started the flow but has not yet completed all steps or received a final verification outcome. The `BenefitVerificationContext` (`src/components/benefit-verification/BenefitVerificationContext.tsx`) manages navigation between steps while the status is `in_progress`.
*   `'verified'`: The user has successfully completed the verification process and their benefits have been confirmed (currently simulated). Step 3 (`src/app/(benefit-verification)/step3/page.tsx`) uses this status to determine navigation to subsequent steps (like Step 5). The final outcome page (Step 5, `src/app/(benefit-verification)/step5/page.tsx`) will display confirmation based on this status.
*   `'not_verified'`: The user completed the process, but their benefits could not be verified (currently simulated). Step 3 and Step 5 will adapt their presentation and navigation based on this status.

**Key Integration Points:**

*   **Database Schema:** `src/lib/db/schema.ts` (Defines the `benefit_status` enum and its use in the `profiles` table).
*   **Dashboard Redirect:** `src/app/(dashboard)/dashboard/page.tsx` (Checks status on load and redirects if `'not_started'`).
*   **Context Management:** `src/components/benefit-verification/BenefitVerificationContext.tsx` (Holds and updates the status during the flow).
*   **Conditional Logic/Navigation:**
    *   `src/app/(benefit-verification)/step3/page.tsx` (Simulates verification and sets status, uses status for navigation).
    *   `src/app/(benefit-verification)/step5/page.tsx` (Displays outcome based on status).

Understanding `benefit_status` is key to tracing the user's journey through the benefit verification module and how different components react to their progress.

## Upcoming Refactoring & Features

### Middleware Simplification

**Goal:** Address runtime errors and improve separation of concerns.

*   **Problem:** Current middleware (`src/middleware.ts`) attempts database queries to check `benefit_status`, causing runtime errors because the required Node.js modules (`net`) are unavailable in the default Edge Runtime.
*   **Solution:** The middleware will be simplified to **only** handle authentication checks (verifying a valid user session). It will no longer query the database or make routing decisions based on `benefit_status`.
*   **Reasoning:** This fixes the runtime errors and delegates status-based routing to components better suited for database access (Server Component Layouts).

### Admin Package Management

**Goal:** Allow administrators to manage benefit packages via the UI.

*   **Problem:** Benefit packages currently need to be added directly to the database via SQL, which is not user-friendly for administrators.
*   **Solution:** Implement new UI sections and API endpoints within the `/admin` area:
    *   A page to list existing packages (`packages` table).
    *   Functionality to create new packages (with fields like name, cost, description, benefits, tier, is_base_employer_package).
    *   Functionality to edit existing packages.
    *   Functionality to delete packages (consider implications for users already assigned).
    *   Associated API routes (e.g., `POST`, `PUT`, `DELETE` under `/api/admin/packages`) with appropriate validation and admin authorization.
*   **Reasoning:** Provides a necessary administrative interface for managing benefit offerings.

### Layout-Based Benefit Status Checks

**Goal:** Implement robust routing based on user benefit status after middleware simplification.

*   **Problem:** With the middleware only checking authentication, logged-in users aren't automatically routed based on their benefit setup progress (e.g., verified users can still access step pages).
*   **Solution:** Implement status checks within Server Component Layouts:
    *   **Dashboard Layout (`src/app/(dashboard)/layout.tsx`):** Fetch user's `benefit_status`. If status is *not* `'verified'`, redirect to `/step1` or `/benefit-status-error` as appropriate. Otherwise, render children.
    *   **Benefit Steps Layout (`src/app/(benefit-verification)/layout.tsx`):** Fetch user's `benefit_status`. If status *is* `'verified'`, redirect to `/dashboard`. If status requires error handling (e.g. `'declined'`), redirect to `/benefit-status-error`. Otherwise, render children (step pages).
*   **Reasoning:** Correctly enforces application flow based on user state using Server Components capable of database access, compensating for the simplified middleware. 