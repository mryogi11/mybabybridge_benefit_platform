'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Inter } from 'next/font/google'
import { themeOptions } from '@/styles/theme'
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

// Create theme instance on the client side
const theme = createTheme(themeOptions)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/favicon.ico" />
        <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
        <title>MyBabyBridge - Fertility Care Platform</title>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <AppRouterCacheProvider>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              {children}
            </ThemeProvider>
          </AppRouterCacheProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 