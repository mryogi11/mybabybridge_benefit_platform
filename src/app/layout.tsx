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

const inter = Inter({ subsets: ['latin'] })

// Note: Removed Metadata export as it should be defined directly in Server Components
// export const metadata = { ... }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/favicon.ico" />
        <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
        <title>MyBabyBridge - Fertility Care Platform</title>
      </head>
      <body className={inter.className}>
        {/* Wrap everything with AuthProvider first */}
        <AuthProvider>
          {/* Then wrap with the ThemeRegistry */}
          <ThemeRegistry>
            {children} 
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
} 