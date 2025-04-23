'use client';
import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline'; // Keep CssBaseline if ClientThemeProviders doesn't have it
import NextAppDirEmotionCacheProvider from './EmotionCache';
import ClientThemeProviders from './ClientThemeProviders'; // Import the new component

// Removed theme creation, state, context, palettes etc.

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
      {/* Render the component that now handles context and theme */} 
      <ClientThemeProviders>
        {/* CssBaseline can be here or inside ClientThemeProviders, ensure it's applied once */} 
        {/* <CssBaseline enableColorScheme /> */}
        {children}
      </ClientThemeProviders>
    </NextAppDirEmotionCacheProvider>
  );
}

// Removed useThemeMode hook export from here (it's in ClientThemeProviders now) 