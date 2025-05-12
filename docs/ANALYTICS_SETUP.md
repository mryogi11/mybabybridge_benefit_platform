# Google Analytics (GA4) Implementation Guide

This document outlines the steps to implement Google Analytics 4 (GA4) in the Next.js application using `gtag.js`.

## 1. Prerequisites

*   Create a Google Analytics 4 property for the application on the [Google Analytics website](https://analytics.google.com/).
*   Obtain the **Measurement ID** (e.g., `G-XXXXXXXXXX`) from your GA4 property settings (Admin -> Data Streams -> Select your web stream).

## 2. Configuration

*   **Environment Variable:** Add the Measurement ID to your environment variables. Create/update `.env.local` with:
    ```
    NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
    ```
    *(Replace `G-XXXXXXXXXX` with your actual ID. The `NEXT_PUBLIC_` prefix is crucial for client-side access.)*
*   **Reload Environment:** Restart your development server (`npm run dev`) after adding the environment variable to load it.

## 3. Core GA Logic (`gtag.js` Utilities)

*   **Create Utility File:** Create `src/lib/gtag.ts`.
*   **Add Helper Functions:** Populate this file with helper functions:

    ```typescript
    // src/lib/gtag.ts
    export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

    // Log the page view
    export const pageview = (url: URL | string): void => {
      if (!GA_MEASUREMENT_ID) return; // Don't run if ID is not set
      if (typeof window.gtag !== 'function') {
        console.warn('gtag function not found. GA might be blocked or not loaded.');
        return;
      }
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: url,
      });
    };

    // Log specific events
    interface GtagEvent {
      action: string;
      category: string;
      label: string;
      value?: number; // Optional value
      [key: string]: any; // Allow other parameters
    }

    export const event = ({ action, category, label, value, ...rest }: GtagEvent): void => {
       if (!GA_MEASUREMENT_ID) return; // Don't run if ID is not set
       if (typeof window.gtag !== 'function') {
         console.warn('gtag function not found. GA might be blocked or not loaded.');
         return;
       }
       window.gtag('event', action, {
         event_category: category,
         event_label: label,
         value: value,
         ...rest, // Send any other parameters
       });
    };

    // Helper to set user properties (like user_id)
    export const setUserId = (userId: string | null): void => {
        if (!GA_MEASUREMENT_ID || !userId) return;
        if (typeof window.gtag !== 'function') {
          console.warn('gtag function not found. GA might be blocked or not loaded.');
          return;
        }
        window.gtag('config', GA_MEASUREMENT_ID, {
            user_id: userId
        });
        console.log(`GA User ID set: ${userId}`); // For debugging
    };
    ```

## 4. Initialize GA and Track Page Views

*   **Use Root Layout:** The best place to initialize GA and track page views is within the root layout (`src/app/layout.tsx`) or a client component rendered by it.
*   **Script Inclusion:** Add the `gtag.js` script snippet using the Next.js `<Script>` component within the root layout. Ensure this integrates correctly with existing providers (like `ThemeRegistry`).
*   **Page View Tracking:** Use `useEffect` and the Next.js `usePathname` and `useSearchParams` hooks within a client component to detect route changes and call the `pageview` utility function.

    *Example Structure (adapt to your layout):*

    ```tsx
    // In src/app/layout.tsx or a client component rendered by it
    'use client';

    import Script from 'next/script';
    import { usePathname, useSearchParams } from 'next/navigation';
    import { useEffect } from 'react';
    import * as gtag from '@/lib/gtag'; // Adjust import path
    import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
    import { Suspense } from 'react'; // Import Suspense

    // Component that includes the logic
    function GoogleAnalyticsInitializer() {
      const pathname = usePathname();
      const searchParams = useSearchParams();

      useEffect(() => {
        // Construct the full URL path including search parameters
        const url = pathname + searchParams.toString();
        gtag.pageview(url);
      }, [pathname, searchParams]); // Re-run on route changes

      return (
        <>
          {/* Google Analytics Scripts - Render only if ID is present */}
          {gtag.GA_MEASUREMENT_ID && (
            <>
              <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_MEASUREMENT_ID}`}
              />
              <Script
                id="gtag-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${gtag.GA_MEASUREMENT_ID}', {
                      page_path: window.location.pathname,
                    });
                  `,
                }}
              />
            </>
          )}
        </>
      );
    }

    // In your RootLayout:
    export default function RootLayout({ children }: { children: React.ReactNode }) {
      return (
        <html lang="en">
          <body>
            {/* Your other providers (ThemeRegistry, AuthContext, etc.) */}
            {children}
            {/* Wrap GA Initializer in Suspense */}
            <Suspense fallback={null}>
              <GoogleAnalyticsInitializer />
            </Suspense>
          </body>
        </html>
      );
    }
    ```

## 5. Track Custom Events

*   Identify key user actions (e.g., registration, login, package selection, form submission, important button clicks).
*   Import the `event` function from `src/lib/gtag.ts`.
*   Call `gtag.event({...})` when the action occurs. Use clear `action`, `category`, and `label` values.

    *Example: Tracking Login*
    ```typescript
    import { event as trackEvent } from '@/lib/gtag';

    // Inside login handler after successful login
    trackEvent({
      action: 'login',
      category: 'Engagement',
      label: 'User Logged In Email',
      method: 'Email/Password' // Example custom parameter
    });
    ```

## 6. User Identification

*   **Link User ID:** When a user logs in, get their Supabase `user.id` (e.g., via `useAuth` context).
*   **Call `setUserId`:** Call the `setUserId` utility function from `gtag.ts` within a client component that runs after login (e.g., in dashboard layout `useEffect`).
    ```tsx
    // Example in a layout component's useEffect
    'use client';
    import { useEffect } from 'react';
    import { useAuth } from '@/contexts/AuthContext'; // Adjust path
    import { setUserId as setGaUserId } from '@/lib/gtag'; // Adjust path

    const { user } = useAuth();

    useEffect(() => {
      if (user?.id) {
        setGaUserId(user.id);
      }
    }, [user]);
    ```
*   **Privacy:** Ensure compliance with your privacy policy and GA's terms regarding PII.

## 7. Consent Management (CRITICAL)

*   **Requirement:** Implement a cookie consent mechanism (e.g., banner using `react-cookie-consent` or similar) to comply with GDPR/CCPA.
*   **Conditional Logic:** The GA scripts (`<Script>` tags) and the tracking calls within `gtag.ts` functions **must** be made conditional based on user consent. This typically involves:
    *   Storing consent status (e.g., in localStorage or a cookie).
    *   Checking this status before rendering scripts or calling `window.gtag(...)`.
*   **Note:** Detailed implementation depends heavily on the chosen consent tool and strategy. This guide assumes consent will be handled separately.
*   **Current Status:** A basic implicit consent notice ("By signing in, you agree...") has been added to the login page (`src/app/(auth)/login/page.tsx`). This may not meet strict GDPR/CCPA requirements, and a dedicated consent banner/tool is recommended for production.

## 8. Testing

*   Use **GA Realtime** reports to see live page views and events.
*   Install and use the **"Google Analytics Debugger"** browser extension to enable DebugView in GA for detailed event inspection.
*   Perform key actions and verify they are tracked correctly in Realtime/DebugView. 