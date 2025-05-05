# MyBabyBridge Code Index

This document provides a comprehensive index of the MyBabyBridge codebase, organized by functionality and component type.

## Project Structure Overview

```
src/
├── app/                    # Main application code with Next.js App Router
│   ├── (admin)/            # Admin-specific pages
│   ├── (auth)/             # Authentication-related pages
│   │   ├── login/          # Login page
│   │   └── register/       # Registration page
│   ├── (benefit-verification)/ # Benefit Verification flow steps
│   ├── (dashboard)/        # User dashboard pages (Uses side-drawer layout)
│   │   └── dashboard/      # Dashboard content pages
│   │       ├── analytics/         # Analytics dashboards
│   │       ├── appointments/      # Appointment management
│   │       ├── communication/     # Communication center
│   │       ├── documents/         # Document management
│   │       ├── education/         # Educational resources
│   │       ├── feedback/          # User feedback system
│   │       ├── messages/          # Messaging system
│   │       ├── notifications/     # User notifications
│   │       ├── packages/          # Treatment packages
│   │       ├── payments/          # Payment management
│   │       ├── profile/           # User profile
│   │       ├── provider/          # Provider information
│   │       ├── settings/          # User settings
│   │       └── treatments/        # (Deprecated) Treatment information -> see packages
│   ├── (provider)/         # Provider-specific pages (Uses side-drawer layout)
│   └── api/                # API routes
├── components/             # Reusable UI components
│   ├── auth/               # Authentication-related components
│   ├── AppointmentCard.tsx # Appointment display component
│   ├── BenefitPackageCard.tsx # Benefit Package display component
│   ├── LoadingProvider.tsx # Loading state manager
│   ├── Logo.tsx            # Logo component
│   ├── MilestoneNotes.tsx  # (Review/Remove if unused) Treatment milestone notes
│   ├── Navigation.tsx      # Side-drawer navigation component
│   ├── Notifications.tsx   # Notifications component
│   ├── SkeletonLoader.tsx  # Loading skeleton component
│   └── ThemeRegistry/      # MUI v5 theme and Emotion cache setup
│       ├── ClientThemeProviders.tsx # Context provider for theme mode (light/dark/system)
│       └── ThemeRegistry.tsx      # Main wrapper component for theme context + cache
├── contexts/               # React context providers
│   └── AuthContext.tsx     # Authentication context (includes user profile, role, theme preference)
├── lib/                    # Utility libraries
│   ├── db/                 # Drizzle ORM client and schema
│   │   ├── index.ts        # Drizzle client initialization
│   │   └── schema.ts       # Database schema definitions
│   ├── stripe/             # Stripe payment integration
│   │   ├── client.ts       # Stripe client-side utilities (e.g., loading Stripe.js)
│   │   └── server.ts       # Stripe server-side client initialization ('use server')
│   ├── supabase/           # Supabase client utilities
│   │   ├── authSync.ts     # Auth synchronization
│   │   └── client.ts       # Supabase client (primarily for Auth)
│   └── supabase.ts         # (Deprecated?) Supabase initialization
├── styles/                 # Global styles and theme configuration
└── types/                  # TypeScript type definitions
```

## Core Components

### Authentication

- **AuthContext.tsx**: Authentication state provider with login, logout, registration methods, and user profile data (including role and theme preference).
- **Login/Register Pages**: User authentication interfaces
- **Authentication Components**: Reusable login/registration form components

### UI Components

- **Logo.tsx**: Brand logo component used throughout the application
- **Navigation.tsx**: Main side-drawer navigation component for dashboard sections
- **ThemeRegistry/ClientThemeProviders.tsx**: Manages the theme mode (light/dark/system) via React Context.
- **ThemeRegistry/ThemeRegistry.tsx**: Sets up Emotion cache and applies the selected MUI theme.
- **SkeletonLoader.tsx**: Loading skeleton for improved user experience during data loading
- **Notifications.tsx**: Notification display and management component
- **AppointmentCard.tsx**: Reusable card for displaying appointment information
- **BenefitPackageCard.tsx**: Card component for displaying benefit package information
- **LoadingProvider.tsx**: Global loading state provider

## Data Flow and State Management

The application uses a combination of React Context API and local component state to manage data and application state.

### Authentication State

```
┌──────────────────┐       ┌───────────────────┐      ┌────────────────┐
│  Supabase Auth   │──────►│   AuthContext     │─────►│ Protected Pages│
└──────────────────┘       └───────────────────┘      └────────────────┘
        ▲                           │
        │                           │
        └───────────────────────────┘
          (Sign In/Out Operations)
```

1. **Authentication Flow**:
   - When a user logs in, the credentials are sent to Supabase Auth
   - The AuthContext stores the returned session and user data
   - AuthContext provides the user state to all components that need it
   - The middleware checks the auth state for protected routes
   - Session is synchronized between tabs using authSync.ts

2. **Data Caching Strategy**:
   - Package, benefit, and appointment data is cached using in-memory techniques
   - Cache expires after a configurable timeframe (typically 5 minutes)
   - Force refresh options allow bypassing the cache when needed

### Component Data Loading

```
┌────────────┐     ┌─────────────┐     ┌──────────────┐     ┌───────────┐
│ Page Load  │────►│ Show Skeleton│────►│ Fetch Data   │────►│ Render UI │
└────────────┘     └─────────────┘     └──────────────┘     └───────────┘
                                              │
                          ┌──────────────────┘
                          ▼
                   ┌─────────────┐
                   │ Error State │
                   └─────────────┘
```

1. **Dashboard Pages**:
   - Use React's useEffect for data fetching on component mount
   - Display skeleton loaders during initial loading
   - Implement error boundaries for failed data fetching
   - Cache fetched data in component state or context when appropriate

2. **Form State Management**:
   - Local component state for form data
   - Form validation before submission
   - Display submission status (loading, success, error)

### Optimistic Updates

For better user experience, the application uses optimistic updates for common operations:

1. **Creating/Updating Records**:
   - UI updates immediately with expected changes
   - If server operation fails, changes are rolled back
   - Success/error notifications inform the user of the outcome

2. **Real-time Considerations**:
   - Notification updates leverage Supabase real-time features
   - Message components subscribe to real-time events
   - User presence is tracked for active provider availability

### Performance Optimizations

1. **Component Memoization**:
   - Heavy components are wrapped with React.memo()
   - useCallback and useMemo prevent unnecessary re-renders
   - List components use virtualization for large datasets

2. **Data Prefetching**:
   - Common navigation paths prefetch data
   - Dashboard preloads essential data for quick access to sub-pages
   - Next.js route prefetching for faster page transitions

### State Management Best Practices

1. Keep state as local as possible
2. Use context only for truly global state (auth, theme)
3. Pass props for component-specific data
4. Use optimistic updates for responsive UI
5. Implement proper loading and error states for all data operations

### Theme Management

1. **Theme Context:** `ClientThemeProviders` uses React Context to manage the current theme mode (`light`, `dark`, `system`).
2. **Persistence:** The user's preferred theme is stored in the `users` table (`theme_preference` column) and loaded via `AuthContext`. Changes are saved using the `updateThemePreference` server action.
3. **Default:** Defaults to `dark` mode if no preference is set or for logged-out users.
4. **System Preference:** Uses `useMediaQuery` to detect OS preference when 'system' mode is selected.
5. **UI:** `ThemeRegistry` applies the theme using MUI's `ThemeProvider`. Settings page allows user selection.

## Pages and Routes

#### Public Pages

- **Home Page**: Landing page with application information and login/register links
- **Login Page**: User authentication page
- **Register Page**: New user registration page

#### Dashboard Pages

- **Dashboard Home**: Main dashboard with overview and quick access via side-drawer navigation.
- **Profile**: User profile information and management
- **Appointments**: Appointment scheduling and history
- **Benefit Verification**: Multi-step flow for benefit verification and package selection.
- **Packages**: Available benefit/treatment packages.
- **Communication**: Patient communication center (`/dashboard/communication/page.tsx`) for secure messaging with providers. Uses Server Actions (`src/actions/messageActions.ts`) and Supabase Realtime.
- **Notifications**: User notifications center
- **Education**: Educational resources for patients
- **Documents**: Document management and sharing
- **Settings**: User preferences and account settings (including Theme Selection).

#### Provider Pages

- **Provider Dashboard**: Provider-specific dashboard
- **Patient Management**: Provider tools for managing patient information
- **Schedule Management**: Provider appointment scheduling tools
- **Messages**: Provider secure messaging interface (`/provider/messages/page.tsx`) for communicating with patients. Uses Server Actions (`src/actions/messageActions.ts`) and Supabase Realtime.

#### Admin Pages

- **Admin Dashboard**: Administrative dashboard
- **User Management**: Admin tools for managing users

## Component Dependency Map

Below is a visual representation of the key component dependencies in the application:

```
┌─────────────────────────┐     ┌───────────────────┐
│     AuthContext.tsx     │◄────┤ Login/Register    │
│ (includes theme pref)   │     └───────────────────┘
└───────────┬─────────────┘
            │
            ▼               ┌─────────────────────────┐
┌─────────────────────────┐ │ ThemeRegistry/          │
│    Dashboard Layout     │─┤ ClientThemeProviders.tsx│
│   (Side Drawer)         │ └───────────┬─────────────┘
└───────────┬─────────────┘             │
            │                           ▼
    ┌───────┴────────┬───────────────┬───────────┐
    ▼                ▼               ▼           ▼
┌─────────┐    ┌─────────┐    ┌──────────┐  ┌─────────┐
│ Profile │    │ Package │    │ Settings │  │ Other   │
│  Page   │    │  Pages  │    │ (Theme)  │  │ Dash    │
└────┬────┘    └────┬────┘    └──────────┘  │ Pages   │
     │              │                       └─────────┘
     ▼              ▼
┌─────────┐    ┌─────────┐
│ Gravatar│    │ Package │
│ Support │    │  Cards  │
└─────────┘    └─────────┘
```

### Key Dependencies

1. **AuthContext.tsx**
   - Used by: Login/Register pages, all protected routes
   - Depends on: Supabase client

2. **Navigation.tsx**
   - Used by: Dashboard layout, Provider layout (as side-drawer)
   - Depends on: AuthContext (for user role information)

3. **LoadingProvider.tsx**
   - Used by: App layout
   - Consumed by: All pages requiring loading state management

4. **Logo.tsx**
   - Used by: Navigation, Login/Register pages, Home page
   - Independent component with minimal dependencies

5. **SkeletonLoader.tsx**
   - Used by: Various dashboard pages during data loading
   - Depends on: Material UI components

6. **Profile Page**
   - Depends on: AuthContext, Supabase client, Gravatar integration

7. **Dashboard Home**
   - Depends on: AuthContext, Navigation, various card components (AppointmentCard, BenefitPackageCard)

8. **Theme Management**
   - `ClientThemeProviders`: Depends on `AuthContext` (to get/set preference).
   - `ThemeRegistry`: Wraps `ClientThemeProviders`.
   - Settings Page: Consumes theme context from `ClientThemeProviders`.

## Backend Integration

### Supabase Integration

- **supabase/client.ts**: Supabase client configuration and initialization
- **authSync.ts**: Handles synchronization of authentication state
- **API Routes**: Backend API endpoints for data operations

### Stripe Integration

- **stripe/**: Stripe payment processing integration

## Recent Updates

The following components have been recently updated:

1. **Logo.tsx** (Updated: 04/01/2025): Updated to use new brand logo
2. **Navigation.tsx** (Updated: 04/01/2025): Enhanced for better performance and UI
3. **LoadingProvider.tsx** (Updated: 04/01/2025): Improved loading state management
4. **SkeletonLoader.tsx** (Updated: 04/01/2025): Added comprehensive skeleton loaders
5. **Profile Page** (Updated: 04/01/2025): Added Gravatar support and enhanced UI
6. **Login/Register Pages** (Updated: 04/01/2025): Redesigned with improved layout and branding
7. **Home Page** (Updated: 04/01/2025): Enhanced with family imagery and testimonials

## Key Files for Developers

When starting development on this project, these are the key files to understand:

1. **AuthContext.tsx**: Understand how authentication works throughout the application
2. **Navigation.tsx**: Main navigation component that controls user movement through the app
3. **Layout files**: Next.js layout files that provide the structure for each section
4. **supabase/client.ts**: How the application connects to the Supabase backend
5. **dashboard/page.tsx**: Main dashboard page structure and functionality

## Additional Resources

- See HANDOVER.md for complete project documentation
- Check package.json for dependencies and scripts

## Conclusion

The MyBabyBridge application is structured around a modular, component-based architecture that leverages Next.js 14's App Router for efficient page rendering and routing. The codebase follows modern React patterns with a focus on performance, maintainability, and user experience.

### Key Architectural Decisions

1. **Component-Based Architecture**: The application is built using reusable components that encapsulate specific functionality, making the code more maintainable and enabling component reuse across different sections.

2. **Context API for Global State**: Rather than introducing additional state management libraries, the application uses React's Context API for global state management, primarily for authentication and theming.

3. **Server Components with Client Islands**: The application leverages Next.js 14's hybrid rendering approach, using server components for static content and client components ('use client') for interactive elements.

4. **Performance-First Approach**: Recent optimizations have focused on perceived performance through skeleton loaders, data caching, and visual feedback during state transitions.

### Development Workflow

The recommended workflow for developing with this codebase is:

1. Understand the component dependencies and data flow
2. Make isolated changes to specific components when possible
3. Follow established patterns for consistency
4. Test across different user roles (patient, provider, admin)
5. Ensure mobile responsiveness is maintained

### Future Architecture Considerations

As the application grows, consider these architectural improvements:

1. Implement state management libraries like Redux or Zustand if global state becomes more complex
2. Add a comprehensive testing strategy with unit and integration tests
3. Consider migration to a monorepo structure if adding mobile applications
4. Implement feature flags for controlled rollouts of new functionality

This code index serves as a living document that should be updated as the codebase evolves, ensuring that all developers have a clear understanding of the project structure and architectural decisions. 