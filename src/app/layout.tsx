'use client';

// Remove old MUI v5 provider
// import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter' 

// Remove old ThemeProvider/createTheme imports if they were here
// import { ThemeProvider, createTheme } from '@mui/material/styles'
// import CssBaseline from '@mui/material/CssBaseline'

import { AuthProvider } from '@/contexts/AuthContext';
import { Inter } from 'next/font/google'
import './globals.css'

// Import the new ThemeRegistry
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { PageChangeHandler } from '@/components/globals/PageChangeHandler';
import React, { useEffect } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import * as gtag from '@/lib/gtag';
import { useAuth } from '@/contexts/AuthContext';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] })

// Script to avoid theme flash (IIFE)
const setInitialThemeScript = `
(function() {
  console.log('[Script] Running theme init script...');
  try {
    const theme = localStorage.getItem('themeMode');
    console.log('[Script] Read from localStorage:', theme);
    const validThemes = ['light', 'dark', 'system', 'ocean', 'mint', 'rose', 'charcoal', 'sunset'];
    let finalTheme = 'dark'; // Default

    if (theme && validThemes.includes(theme)) {
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        finalTheme = prefersDark ? 'dark' : 'light';
        console.log('[Script] Theme is system, OS prefers dark:', prefersDark, 'Setting theme:', finalTheme);
      } else {
        finalTheme = theme;
        console.log('[Script] Valid theme found in localStorage. Setting theme:', finalTheme);
      }
    } else {
      console.log('[Script] No valid theme in localStorage or theme is null. Setting default theme:', finalTheme);
    }
    document.documentElement.setAttribute('data-theme', finalTheme);
  } catch (e) {
    console.error('[Script] Error initializing theme:', e);
    // Fallback in case of error
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

// Component that includes the GA logic
function GoogleAnalyticsInitializer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!gtag.GA_MEASUREMENT_ID) return; // Don't track if ID is missing
    // Construct the full URL path including search parameters
    const url = pathname + searchParams.toString();
    gtag.pageview(url);
  }, [pathname, searchParams]); // Re-run on route changes

  // Set User ID when auth state changes
  const { user } = useAuth(); // Assuming useAuth is available here or passed down

  useEffect(() => {
    if (user?.id) {
      gtag.setUserId(user.id);
    } else {
      // Optional: Clear user_id if user logs out
      gtag.setUserId(null);
    }
  }, [user]);

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

// Note: Removed Metadata export as it should be defined directly in Server Components
// export const metadata = { ... }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/favicon.ico" />
        <title>MyBabyBridge - Fertility Care Platform</title>
      </head>
      <body className={inter.className}>
        {/* Inject script to run before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: setInitialThemeScript }} />
        {/* Wrap everything with AuthProvider first */}
        <AuthProvider>
          {/* Then wrap with the ThemeRegistry */}
          <ThemeRegistry>
            <LoadingProvider>
              <React.Suspense fallback={null}>
                <PageChangeHandler />
              </React.Suspense>
              {children}
              {/* Wrap GA Initializer in Suspense to prevent build errors */}
              <Suspense fallback={null}> 
                <GoogleAnalyticsInitializer />
              </Suspense>
            </LoadingProvider>
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
} 