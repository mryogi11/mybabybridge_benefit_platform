'use client';
import * as React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import NextAppDirEmotionCacheProvider from './EmotionCache';
import type { ThemeOptions } from '@mui/material/styles';

// Define your theme options here
// Explicitly type themeOptions
const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light', // Now correctly typed as 'light'
    primary: {
      main: '#1976d2', // Example primary color
    },
    secondary: {
      main: '#dc004e', // Example secondary color
    },
    // Add other theme customizations
  },
  typography: {
    // Customize typography if needed
    fontFamily: 'inherit', // Inherit from global styles or set specific font
  },
  // Add other theme customizations like components defaults
};

const theme = createTheme(themeOptions);

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        <CssBaseline />
        {children}
      </ThemeProvider>
    </NextAppDirEmotionCacheProvider>
  );
} 