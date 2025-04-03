'use client';
import * as React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import NextAppDirEmotionCacheProvider from './EmotionCache';

// Import a font (optional, example using Roboto)
// Make sure to install it if needed: npm install @fontsource/roboto
// import '@fontsource/roboto/300.css';
// import '@fontsource/roboto/400.css';
// import '@fontsource/roboto/500.css';
// import '@fontsource/roboto/700.css';

// Define your theme options here
const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light', // Keep light mode for now
    primary: {
      // Example using common blue shades
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#fff',
    },
    secondary: {
      // Example using common purple shades
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
      contrastText: '#fff',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    info: {
      main: '#0288d1',
    },
    success: {
      main: '#2e7d32',
    },
    background: {
      default: '#f5f5f5', // Light grey background
      paper: '#ffffff', // White background for Paper/Card components
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
  },
  typography: {
    // fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif', // Example setting font
    fontFamily: 'inherit', // Or keep inheriting from globals.css
    h4: {
      fontWeight: 500,
    },
    h5: {
      fontWeight: 500,
    },
    // Add other typography customizations (fontSize, fontWeight, etc.)
  },
  // Example component overrides
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true, // Flatter buttons by default
      },
      styleOverrides: {
        root: {
          textTransform: 'none', // Avoid ALL CAPS buttons
        },
        containedPrimary: {
          // Specific styles for contained primary buttons
        },
      },
    },
    MuiPaper: {
        defaultProps: {
            elevation: 1, // Subtle elevation for Paper/Card
        },
        styleOverrides: {
            rounded: {
                borderRadius: 8, // Slightly more rounded corners
            }
        }
    },
    MuiTextField: {
        defaultProps: {
            variant: 'outlined', // Default to outlined variant
            size: 'small', // Default to smaller size
        }
    }
    // Add overrides for other components (AppBar, Card, etc.)
  },
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