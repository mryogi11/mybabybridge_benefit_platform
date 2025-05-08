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
import React from 'react';

const inter = Inter({ subsets: ['latin'] })

// Note: Removed Metadata export as it should be defined directly in Server Components
// export const metadata = { ... }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/favicon.ico" />
        <title>MyBabyBridge - Fertility Care Platform</title>
      </head>
      <body className={inter.className}>
        {/* Wrap everything with AuthProvider first */}
        <AuthProvider>
          {/* Then wrap with the ThemeRegistry */}
          <ThemeRegistry>
            <LoadingProvider>
              <React.Suspense fallback={null}>
                <PageChangeHandler />
              </React.Suspense>
              {children} 
            </LoadingProvider>
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
} 