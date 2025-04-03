'use client';
import * as React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import NextAppDirEmotionCacheProvider from './EmotionCache';

// Import the font (Make sure to install: npm install @fontsource/public-sans)
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/public-sans/700.css';

// Define your theme options here approximating Minimal UI style
const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      // Example using a slightly softer blue
      main: '#3366FF', // Adjust as needed based on Minimal's exact blue
      light: '#6690FF',
      dark: '#0040CC',
      contrastText: '#fff',
    },
    secondary: {
      // Example using a softer green
      main: '#00A76F', // Adjust based on Minimal's secondary/accent
      light: '#33B88A',
      dark: '#00754D',
      contrastText: '#fff',
    },
    error: {
      main: '#FF5630', // Minimal often uses a reddish-orange for error
    },
    warning: {
      main: '#FFAB00', // Minimal often uses amber/yellow for warning
    },
    info: {
      main: '#00B8D9', // Minimal often uses cyan/blue for info
    },
    success: {
      main: '#22C55E', // Minimal often uses a clear green for success
    },
    background: {
      default: '#F9FAFB', // Very light grey background
      paper: '#FFFFFF', // White paper background
    },
    text: {
      primary: '#212B36', // Darker grey for primary text
      secondary: '#637381', // Lighter grey for secondary text
      disabled: '#919EAB',
    },
    divider: 'rgba(145, 158, 171, 0.2)', // Subtle divider color
  },
  typography: {
    fontFamily: '"Public Sans", sans-serif', // Set primary font
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 }, // Adjust weights as needed
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    // Add other typography customizations (fontSize, letterSpacing, etc.) if needed
  },
  shape: {
    borderRadius: 8, // Consistent border radius
  },
  // shadows: [...], // TODO: Add custom shadows array later if needed
  components: {
    MuiCssBaseline: {
        styleOverrides: {
            body: {
                backgroundColor: '#F9FAFB', // Ensure body background matches theme
            }
        }
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                backgroundColor: '#FFFFFF',
                color: '#212B36',
                boxShadow: 'none', // Often minimal themes remove AppBar shadow
                borderBottom: '1px solid rgba(145, 158, 171, 0.2)', // Use divider color for border
            }
        },
        defaultProps: {
            elevation: 0, // Reinforce no elevation
        }
    },
    MuiDrawer: {
        styleOverrides: {
            paper: {
                borderRight: 'none', // Remove default drawer border if desired
                backgroundColor: '#FFFFFF', // Ensure drawer background is white
            }
        }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8, // Match global border radius
        },
        containedPrimary: {
          // Minimal themes might have specific hover/active states
          // Example: boxShadow: 'none', '&:hover': { boxShadow: 'none' }
        },
      },
    },
    MuiPaper: {
        defaultProps: {
            elevation: 0, // Often use border instead of shadow
        },
        styleOverrides: {
            root: {
                 backgroundImage: 'none', // Remove potential gradients
                 border: '1px solid rgba(145, 158, 171, 0.2)', // Add subtle border
                 borderRadius: 8, // Ensure consistent radius
            }
        }
    },
    MuiCard: {
        defaultProps: {
            elevation: 0,
        },
        styleOverrides: {
            root: {
                borderRadius: 8,
                border: '1px solid rgba(145, 158, 171, 0.2)',
                boxShadow: 'none', // Override potential default card shadow
            }
        }
    },
    MuiTextField: {
        defaultProps: {
            variant: 'outlined',
            size: 'small',
        },
        styleOverrides: {
            root: {
                // Minimal themes might adjust input styles
                // Example: '& .MuiOutlinedInput-root': { borderRadius: 8 }
            }
        }
    },
  },
};

const theme = createTheme(themeOptions);

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </NextAppDirEmotionCacheProvider>
  );
} 