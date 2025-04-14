# Fertility Benefit Platform - Updated PRD

## Project Overview
**Project Name:** Fertility Benefit Platform 
**Objective:** Develop a web application for fertility patients to manage their treatment journey, including registration, package selection, and dashboard tracking. The platform will also provide administrative tools for user management and package creation.

## Technical Stack

*   **Frontend Framework:** Next.js (^15.2.4)
*   **UI Library:** Material UI (MUI) (^5.17.1) with MUI X (^7.28.3)
*   **Styling:** Emotion (^11.14.0)
*   **State Management:** React Context API (AuthContext, potentially others)
*   **Form Handling:** React Hook Form (^7.50.1) with Zod (^3.22.4) for validation
*   **Data Fetching:** Supabase Client Library, React Server Components / Server Actions, Fetch API
*   **Backend/Database:** Supabase (PostgreSQL)
*   **ORM:** Drizzle ORM (Schema defined in `src/lib/db/schema.ts`)
*   **Database Migrations:** Drizzle Kit (`drizzle-kit` via `npx drizzle-kit generate`, config: `drizzle.config.js`, output: `./drizzle`)
*   **Authentication:** Supabase Auth (@supabase/auth-helpers-nextjs ^0.9.0)
*   **Language:** TypeScript
*   **Package Manager:** npm (or Yarn - confirm from lock file if needed)
*   **Development Database:** Hosted Supabase project (not local Docker instance)
*   **Deployment:** Vercel (planned)

## Features and Functionalities

### 1. **User Registration and Login**
  - **Description:** Patients can register and log in to the platform using email and password or social media authentication.
  - **Requirements:**
    - Secure password hashing and verification via Supabase Auth
    - Email verification for new accounts
    - Social media login integration (Google, Facebook)
    - Role-Based Access Control (RBAC):
      - Admin: Full system access
      - Staff: Limited administrative access
      - Patient: Access to personal dashboard and package selection
    - **UI Guidelines:** Use Modern Material UI components for forms and buttons

### 2. **Patient Dashboard**
  - **Description:** A personalized dashboard for patients to view their treatment milestones.
  - **Requirements:**
    - Display packages purchased
    - Show ongoing treatments
    - Indicate completed treatments
    - Provide real-time updates on treatment progress
    - Treatment Milestones Tracking:
      - Patient Details
      - Initial Consultation
      - Treatment Phase
      - Prenatal Care
    - **UI Guidelines:** Utilize Material UI's grid system for layout and cards for displaying treatment milestones

### 3. **Package Selection**
  - **Description:** Patients can browse and purchase different fertility treatment packages created by admins.
  - **Requirements:**
    - Package Tiers:
      - Basic
      - Premium
      - Custom
    - Package Configuration Options:
      - Package Name
      - Description
      - Price
      - Validity Period (optional)
      - Purchase Type (Subscription/One-time)
      - Included Services
      - Terms and Conditions
    - Secure payment processing via Stripe
    - Option to add packages to cart and checkout
    - **UI Guidelines:** Implement Material UI's list and card components for package listings

### 4. **Admin Module**
  - **Description:** Administrative interface for managing users, creating packages, and monitoring platform activity.
  - **Requirements:**
    - User Management:
      - View, edit, delete user accounts
      - Assign and manage user roles
      - View user activity logs
    - Package Management:
      - Create, edit, delete packages
      - Configure package tiers and pricing
      - Set package validity periods
      - Define purchase types (subscription/one-time)
      - Manage package terms and conditions
    - Provider Management:
      - View, add, edit, and delete providers
      - Manage provider profiles and credentials
      - Monitor provider availability and appointments
      - Track provider performance metrics
    - Dashboard for monitoring platform metrics
    - **UI Guidelines:** Use Material UI's tabs and data tables for admin dashboard

### 5. **Provider Module**
  - **Description:** Interface for healthcare providers to manage their profiles, availability, and patient appointments.
  - **Requirements:**
    - Provider Profile Management:
      - Personal information (name, specialization, bio)
      - Professional details (experience, education, certifications)
      - Profile visibility settings
    - Availability Management:
      - Set weekly availability schedule
      - Manage appointment slots
      - Handle time-off requests
      - View and update calendar
    - Appointment Management:
      - View upcoming appointments
      - Update appointment status
      - Add appointment notes
      - Handle cancellations and rescheduling
    - Patient Communication:
      - Send messages to patients
      - Share treatment updates
      - Provide documentation
    - **UI Guidelines:** Use Material UI's calendar and scheduling components

### 6. **Security and Compliance**
  - **Description:** Ensure the platform adheres to healthcare data privacy standards.
  - **Requirements:**
    - Implement GDPR and HIPAA compliance for patient data
    - Use HTTPS for secure data transmission
    - Regular security audits and updates
    - Role-based access control for sensitive data

### 7. **Notifications and Communication**
  - **Description:** Automated notifications for patients and admins regarding important events.
  - **Requirements:**
    - Email notifications for key events
    - In-app notifications for logged-in users
    - Treatment milestone notifications
    - Package expiry notifications
    - **UI Guidelines:** Use Material UI's snackbar for in-app notifications

### 8. **Future Module Development**
  - **Description:** Allow for easy integration of additional modules in the future.
  - **Requirements:**
    - Modular architecture to facilitate new feature additions
    - API endpoints designed for extensibility

### 9. **Benefit Verification Module**
  - **Description:** Allows patients to verify their employer or health plan-sponsored fertility benefits and manage package options.
  - **Requirements:**
    - Guided verification flow for first-time users.
    - Integration with organization data (where available).
    - Presentation of base coverage and upgrade options.
    - Secure handling of verification data.
  - **Details:** See `docs/BENEFIT_MODULE_GUIDE.md` for detailed implementation steps.

## Analytics Module

### Overview
The analytics module provides comprehensive insights into the platform's performance, user engagement, and business metrics. This module is accessible only to administrators and staff members with appropriate permissions.

### Key Features

#### 1. Dashboard Overview
- Real-time statistics display
- Key performance indicators (KPIs)
- Customizable time range selection (1 month, 3 months, 6 months, 1 year)
- Export functionality for reports

#### 2. Revenue Analytics
- Monthly revenue trends
- Revenue by treatment type
- Revenue by location/clinic
- Payment method distribution
- Revenue forecasting

#### 3. User Analytics
- User growth trends
- User demographics
- User engagement metrics
- User retention rates
- User acquisition channels

#### 4. Treatment Analytics
- Treatment type distribution
- Success rates by treatment type
- Treatment duration analysis
- Treatment completion rates
- Treatment abandonment rates

#### 5. Performance Metrics
- Platform usage statistics
- Response time monitoring
- Error rate tracking
- System uptime
- Resource utilization

### Technical Requirements

#### Data Collection
- Real-time data processing
- Historical data storage
- Data aggregation capabilities
- Data retention policies

#### Visualization
- Interactive charts and graphs
- Customizable dashboards
- Drill-down capabilities
- Export options (CSV, PDF, Excel)

#### Security
- Role-based access control
- Audit logging
- Data encryption
- Compliance with data protection regulations

### User Interface

#### Dashboard Layout
- Grid-based layout
- Drag-and-drop widget placement
- Responsive design
- Dark/light mode support

#### Chart Types
- Line charts for trends
- Bar charts for comparisons
- Pie charts for distributions
- Heat maps for patterns
- Scatter plots for correlations

#### Filtering Options
- Date range selection
- Treatment type filtering
- Location filtering
- User segment filtering

### Reporting

#### Standard Reports
- Daily summary reports
- Weekly performance reports
- Monthly business reports
- Quarterly trend analysis
- Annual comprehensive reports

#### Custom Reports
- Report builder interface
- Custom metric selection
- Custom date ranges
- Custom grouping options

### Integration Requirements
- Integration with existing database
- API endpoints for data access
- Export functionality
- Third-party analytics tools integration

### Performance Requirements
- Dashboard load time < 2 seconds
- Real-time data updates
- Support for large datasets
- Efficient data caching

### Future Enhancements
- Predictive analytics
- Machine learning models
- Automated reporting
- Custom alert system
- Advanced visualization options

#### UI/UX Goals

*   Clean, modern, and intuitive interface.
*   Minimalist design aesthetic, focusing on clarity and ease of use.
*   Responsive design for desktop and potentially tablet use.
*   Consistent styling across all user roles (Admin, Provider, Patient).
*   **Visual Reference:** The overall look and feel of UI components should aim to align with the style presented in the Minimal UI Kit free demo: [https://free.minimals.cc/](https://free.minimals.cc/).

## Project Structure Schema

### Directory Structure
```plaintext
fertility-care-platform/
├── src/
│   ├── app/                    # Next.js 13+ App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (dashboard)/       # Dashboard routes
│   │   ├── (admin)/           # Admin routes
│   │   └── api/               # API routes
│   ├── components/            # Reusable components
│   │   ├── auth/             # Authentication components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── admin/            # Admin components
│   │   └── shared/           # Shared components
│   ├── lib/                   # Utility functions
│   │   ├── supabase/         # Supabase client and utilities
│   │   ├── stripe/           # Stripe integration
│   │   └── auth/             # Authentication utilities
│   ├── hooks/                # Custom React hooks
│   ├── styles/               # Global styles and theme
│   └── types/                # TypeScript types
├── public/                   # Static assets
├── .env.example             # Example environment variables
├── .gitignore              # Git ignore rules
├── package.json            # Project dependencies
├── tsconfig.json           # TypeScript configuration
└── next.config.js          # Next.js configuration
```

### Database Schema
- **Users Table:**
  - `id` (primary key)
  - `email`
  - `role` (enum: 'admin', 'staff', 'patient')
  - `created_at`
  - `updated_at`

- **Packages Table:**
  - `id` (primary key)
  - `name`
  - `description`
  - `price`
  - `tier` (enum: 'basic', 'premium', 'custom')
  - `validity_period` (nullable)
  - `purchase_type` (enum: 'subscription', 'one-time')
  - `created_at`
  - `updated_at`

- **PatientPackages Table:**
  - `id` (primary key)
  - `patient_id` (foreign key referencing Users)
  - `package_id` (foreign key referencing Packages)
  - `status` (enum: 'purchased', 'active', 'expired', 'completed')
  - `start_date`
  - `end_date`
  - `created_at`
  - `updated_at`

- **Treatments Table:**
  - `id` (primary key)
  - `patient_package_id` (foreign key referencing PatientPackages)
  - `milestone` (enum: 'patient_details', 'initial_consultation', 'treatment_phase', 'prenatal_care')
  - `status` (enum: 'pending', 'in_progress', 'completed')
  - `start_date`
  - `end_date`
  - `notes`
  - `created_at`
  - `updated_at`

### API Endpoints
- **Authentication Endpoints:**
  - `POST /api/auth/register`: Create a new user account
  - `POST /api/auth/login`: Authenticate a user
  - `POST /api/auth/logout`: Logout user
  - `GET /api/auth/session`: Get current session

- **Package Endpoints:**
  - `GET /api/packages`: List all available packages
  - `POST /api/packages`: Create a new package (admin only)
  - `PUT /api/packages/:id`: Update package (admin only)
  - `DELETE /api/packages/:id`: Delete package (admin only)

- **Patient Dashboard Endpoints:**
  - `GET /api/patient/dashboard`: Get patient dashboard data
  - `POST /api/patient/packages`: Purchase a package
  - `GET /api/patient/treatments`: Get patient treatments
  - `PUT /api/patient/treatments/:id`: Update treatment status

- **Admin Endpoints:**
  - `GET /api/admin/users`: List all users
  - `PUT /api/admin/users/:id`: Update user role
  - `GET /api/admin/metrics`: Get platform metrics

- **Payment Endpoints:**
  - `POST /api/payments/create-intent`: Create Stripe payment intent
  - `POST /api/payments/webhook`: Handle Stripe webhooks

## Testing Strategy
- **Database:** Use Supabase Cloud for all testing environments
- **Test Cases:**
  - Unit tests for backend logic
  - Integration tests for API endpoints
  - UI tests for frontend components
  - Authentication and authorization tests
- **Tools:**
  - Jest for unit and integration testing
  - Cypress for UI testing

## Deployment
- **Platform:** Vercel
- **Requirements:**
  - Configure Vercel for automatic deployment from the main branch
  - Ensure environment variables are securely managed
  - Set up proper CORS and security headers

## Development Roadmap
1. **Setup Project Structure:**
   - Initialize Next.js project with TypeScript
   - Set up Supabase client and authentication
   - Configure Material UI with theme
   - Implement RBAC system

2. **Implement Authentication:**
   - Set up Supabase Auth
   - Implement social login
   - Create protected routes
   - Set up role-based access control

3. **Create Admin Module:**
   - Design admin dashboard UI
   - Implement user management
   - Create package management system
   - Set up analytics dashboard

4. **Develop Patient Dashboard:**
   - Create dashboard UI
   - Implement treatment milestone tracking
   - Set up package purchase flow
   - Create notification system

5. **Integrate Payment Gateway:**
   - Set up Stripe integration
   - Implement subscription handling
   - Create payment webhooks
   - Set up invoice generation

6. **Testing and Deployment:**
   - Write comprehensive tests
   - Perform security audit
   - Deploy to Vercel
   - Set up monitoring and logging

7. **Benefit Module Implementation:**
   - Implement verification flow UI
   - Develop backend logic for verification
   - Integrate with package selection
   - Update database schema 