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
- The selected organization's ID is stored using the `setSponsoringOrganization` function from the `BenefitVerificationContext`.
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
  - Address fields (line 1, city, state, zip, country)
- Address details collected here are saved to the `users` table. For users on the non-employer path, this is handled by the `updateBasicProfile` action in `src/actions/benefitActions.ts`. For users on the employer path, address details (if collected for verification) are handled by the `submitVerificationInfo` action.
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
  - If payment is required, the `createPaymentIntent` action (in `src/actions/stripeActions.ts`) is called. This action uses `await getServerStripeClient()` to initialize the Stripe client for creating Stripe customers and payment intents.
- Clear "Complete Setup" button
- Option to save payment information for future
- After successful setup (and payment, if applicable), the user is redirected to their main user dashboard (`/dashboard`).

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

### Access Control & Sequence Enforcement

To ensure users navigate the benefit verification flow correctly and prevent unauthorized access, the following logic is implemented in the `/src/app/(benefit-verification)/layout.tsx` layout component and individual step pages:

*   **Layout Checks (`layout.tsx`):**
    *   **Authentication:** Users must be logged in.
    *   **Role:** Users must have the `'patient'` role.
    *   **Benefit Status:** If the patient's `benefit_status` is already `'verified'`, they are automatically redirected to their main dashboard (`/dashboard`).
    *   Users who fail authentication or role checks are redirected to `/login` or their respective dashboards (`/admin`, `/provider`).
*   **Step Page Checks (`stepX/page.tsx`):**
    *   Each step page (`/step2` onwards) uses the `BenefitVerificationContext` to check if the required data from the *previous* step has been set.
    *   If prerequisite data is missing (e.g., accessing `/step3` without selecting an organization in `/step2`), the user is redirected back to the appropriate earlier step (`/step1` or `/step2`, etc.).
*   **Result:** This combined approach ensures that only authenticated patients with a non-verified benefit status can access the flow, and they must proceed through the steps sequentially.

This implementation provides a user-friendly approach to fertility benefit verification while offering clear upgrade paths for patients who want enhanced services beyond their employer-provided benefits.

## Benefit Verification Status (`benefit_status`)

A crucial piece of state management within the benefit verification flow is the `benefit_status` column added to the `profiles` table (`src/lib/db/schema.ts`).

This column tracks the user's current stage and outcome in the verification process. It is an enum with the following possible values:

*   `'not_started'`: The user has not yet begun the benefit verification process. Users in this state will be automatically redirected from the main dashboard (`src/app/(dashboard)/dashboard/page.tsx`, which checks `profile.benefit_status` via `useAuth`) to Step 1 (`/step1`) of the flow upon their first login or subsequent visits if the status remains `'not_started'`.
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

## Current Implementation Status (Reflecting Recent Changes)

### Implemented Features:

*   **Multi-Step Benefit Flow (Steps 1-6):** Full UI, navigation, state management (`BenefitVerificationContext`), and server actions implemented for the entire user flow.
    *   **Step 1:** Benefit source selection (`updateBenefitSource`).
    *   **Step 2:** Organization search & selection (`searchOrganizations`, `updateSponsoringOrganization` from context).
    *   **Step 3:** Personal information collection (using `submitVerificationInfo` for employer path, `updateBasicProfile` for non-employer path – both actions now correctly save address details to the `users` table).
    *   **Step 4 (Implicit in Step 3):** Work email used for basic verification in `submitVerificationInfo`.
    *   **Step 5:** Package viewing (`getBenefitPackages`) and selection (`updateSelectedPackage`).
    *   **Step 6 (Confirmation/Payment):** Displays selected package (`getUserWithSelectedPackage`), initializes Stripe Elements for paid packages (`createPaymentIntent` which correctly uses `await getServerStripeClient()`), handles Payment Element submission, and finalizes setup (`completeBenefitSetup`), redirecting to `/dashboard` upon completion.
*   **Employer & Non-Employer Paths:** Logic handles both verification through an employer and direct profile updates/package selection for other paths.
*   **Basic Email Verification:** Verification logic checks submitted work email against `organization_approved_emails` table for the employer path.
*   **Base Package Assignment:** Default employer package assigned on successful employer verification.
*   **Admin Management:** Basic UI and server actions for managing organizations and approved emails.
*   **Middleware Simplification:** The middleware (`src/middleware.ts`) has been simplified to primarily handle authentication checks (verifying a valid user session). It no longer performs database queries for `benefit_status` directly, addressing previous runtime error concerns in Edge environments.
*   **Layout-Based Benefit Status Checks:** Routing based on `benefit_status` is now handled by Server Component Layouts (e.g., `src/app/(dashboard)/layout.tsx`, `src/app/(benefit-verification)/layout.tsx`). These layouts fetch the user's `benefit_status` and perform appropriate redirects (e.g., to `/step1` if not verified, or to `/dashboard` if already verified), ensuring correct application flow post-authentication.
*   **Layout-Based Status Checks:** Initial checks implemented in layouts/pages to redirect users based on authentication and benefit status (e.g., redirecting `verified` users to dashboard, redirecting `not_started` users to `/step1`).

### Pending Items / Potential Enhancements (Review and Prioritize):

*   [ ] **Benefit Verification Logic:** 
    *   [ ] Enhance/replace basic email check with more robust verification methods if required (e.g., HRIS integration, manual review flags).
    *   [ ] Implement "No Work Email" alternative verification flow if needed beyond the current non-employer path.
*   [ ] **Dynamic Package Display:** Refine `getBenefitPackages` if filtering based on organization or verification status is needed beyond showing all available packages.
*   [ ] **Profile Data Handling:** Ensure all necessary profile fields collected during the flow are consistently saved and potentially synced with a central `patient_profiles` table if used elsewhere.
*   [ ] **Input Validation:** Further enhance validation for fields like phone numbers, addresses based on country, etc.
*   [ ] **Admin Management:**
    *   [ ] Verify/Complete **Admin Package Management** UI/API.
    *   [ ] Verify/Fix **Admin Organization Edit/Delete** UI/API.
    *   [ ] Implement **Admin Email Edit/Delete** UI/API.
*   [ ] **Stripe Integration:**
    *   [ ] Implement webhook handler (`/api/payments/webhook`) for robust payment tracking and fulfillment.
    *   [ ] Implement subscription management logic if subscription-based packages are offered.
*   [ ] **UI/UX Refinements:** Continue improving loading states, error handling, accessibility, and edge cases throughout the benefit flow and dashboard.
*   [ ] **Testing:** Conduct thorough end-to-end testing of all benefit paths, payment scenarios, and edge cases.

## Upcoming Refactoring & Features

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