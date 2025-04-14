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