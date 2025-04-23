'use client';

import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { createTheme, ThemeProvider, useMediaQuery, PaletteMode } from '@mui/material';
import type { ThemeOptions } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Import Auth context and server action
import { useAuth } from '@/contexts/AuthContext';
import { updateThemePreference } from '@/actions/userActions';

// Re-import fonts if needed here, or ensure they are loaded globally
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/public-sans/700.css';

// --- Copied from ThemeRegistry --- 

// 1. Define Types
export type ThemeModeSetting = 'light' | 'dark' | 'system';

// 2. Create Context
interface ThemeModeContextType {
  modeSetting: ThemeModeSetting;
  setModeSetting: (mode: ThemeModeSetting) => void;
}

const ThemeModeContext = createContext<ThemeModeContextType | undefined>(undefined);

// Define BASE theme options (without mode)
const baseThemeOptions: Omit<ThemeOptions, 'palette'> = {
  typography: {
    fontFamily: '"Public Sans", sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  // Shared component overrides (can be extended)
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
        defaultProps: {
            elevation: 0, 
        },
        styleOverrides: {
            root: {
                 backgroundImage: 'none', 
                 border: '1px solid rgba(145, 158, 171, 0.2)', 
                 borderRadius: 8, 
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
                boxShadow: 'none', 
            }
        }
    },
    MuiTextField: {
        defaultProps: {
            variant: 'outlined',
            size: 'small',
        },
    },
  },
};

// Define light and dark palette options
const lightPalette: ThemeOptions['palette'] = {
    mode: 'light',
    primary: { main: '#3366FF', light: '#6690FF', dark: '#0040CC', contrastText: '#fff' },
    secondary: { main: '#00A76F', light: '#33B88A', dark: '#00754D', contrastText: '#fff' },
    error: { main: '#FF5630' },
    warning: { main: '#FFAB00' },
    info: { main: '#00B8D9' },
    success: { main: '#22C55E' },
    background: { default: '#F9FAFB', paper: '#FFFFFF' },
    text: { primary: '#212B36', secondary: '#637381', disabled: '#919EAB' },
    divider: 'rgba(145, 158, 171, 0.2)',
};

// Define a basic dark palette (customize further as needed)
const darkPalette: ThemeOptions['palette'] = {
    mode: 'dark',
    primary: { main: '#6690FF', light: '#84a9ff', dark: '#3366ff', contrastText: '#fff' }, // Adjust dark primary
    secondary: { main: '#33B88A', light: '#5eccaa', dark: '#00a76f', contrastText: '#fff' }, // Adjust dark secondary
    error: { main: '#FF8A65' }, // Lighter error for dark mode
    warning: { main: '#FFC107' }, // Standard warning yellow
    info: { main: '#29B6F6' }, // Lighter info blue
    success: { main: '#66BB6A' }, // Lighter success green
    background: { default: '#161C24', paper: '#212B36' }, // Dark background
    text: { primary: '#FFFFFF', secondary: '#919EAB', disabled: '#637381' }, // Light text
    divider: 'rgba(145, 158, 171, 0.2)', // Divider can often stay similar
};

// --- End Copied Section --- 

export default function ClientThemeProviders({ children }: { children: React.ReactNode }) {
  const { user: authUser, profile, isProfileLoading } = useAuth(); // Get authUser as well
  // Default state should ideally be 'dark' as per requirement
  const [modeSetting, setModeSettingState] = useState<ThemeModeSetting>('dark'); 
  // We don't need initialModeSet flag anymore with correct dependency handling

  // Set theme based on profile or default to dark when user/profile changes
  useEffect(() => {
    console.log("[ThemeEffect] Running. User:", authUser?.id, "Profile Loaded:", !isProfileLoading, "Current Profile Theme:", profile?.theme_preference);
    if (authUser && !isProfileLoading) {
      // User logged in and profile is loaded
      const userPreference = profile?.theme_preference;
      const initialMode = userPreference && ['light', 'dark', 'system'].includes(userPreference) 
                            ? userPreference 
                            : 'dark'; // Default to 'dark' if no preference or invalid
      console.log(`[ThemeEffect] User ${authUser.id} logged in, profile loaded. Setting theme to: ${initialMode} (from profile: ${userPreference})`);
      setModeSettingState(initialMode);
    } else if (!authUser) {
       // User logged out, reset to default
       console.log("[ThemeEffect] User logged out. Resetting theme to dark.");
       setModeSettingState('dark');
    } else {
        // Still loading profile for logged-in user, do nothing yet (state defaults to dark)
        console.log("[ThemeEffect] User logged in, but profile still loading...");
    }
  }, [authUser, profile, isProfileLoading]); // Rerun when user, profile, or loading state changes

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const activeMode = useMemo<PaletteMode>(() => {
    // Determine active mode based on current state (which reflects profile or default)
    if (modeSetting === 'system') {
      return prefersDarkMode ? 'dark' : 'light';
    }
    return modeSetting;
  }, [modeSetting, prefersDarkMode]);

  // Updated function to call server action
  const setModeSetting = async (newMode: ThemeModeSetting) => {
    if (!authUser) { 
        console.warn("[Theme] Attempted to set theme while logged out. Ignoring.");
        return; // Don't allow setting theme if logged out
    }
    // Optimistically update local state
    setModeSettingState(newMode);
    
    // Call server action to update DB
    try {
      console.log(`[Theme] User ${authUser.id} changed theme to ${newMode}. Calling updateThemePreference action...`);
      const result = await updateThemePreference(newMode);
      if (!result.success) {
        console.error("Failed to save theme preference to DB:", result.error);
        // TODO: Consider reverting optimistic update or showing error
      } else {
        console.log("[Theme] Successfully saved theme preference to DB.");
      }
    } catch (error) {
        console.error("Error calling updateThemePreference action:", error);
        // TODO: Handle error (e.g., revert, show message)
    }
  };

  const theme = useMemo(() => {
    const currentPalette = activeMode === 'dark' ? darkPalette : lightPalette;
    const modeSpecificOverrides: ThemeOptions['components'] = {
      MuiCssBaseline: {
          styleOverrides: {
              body: {
                  backgroundColor: currentPalette?.background?.default,
              }
          }
      },
      MuiAppBar: {
          styleOverrides: {
              root: {
                  backgroundColor: currentPalette?.background?.paper, // Use paper for AppBar bg
                  color: currentPalette?.text?.primary,
                  borderBottom: `1px solid ${currentPalette?.divider}`,
              }
          },
      },
      MuiDrawer: {
          styleOverrides: {
              paper: {
                  borderRight: `1px solid ${currentPalette?.divider}`,
                  backgroundColor: currentPalette?.background?.paper,
              }
          }
      },
      MuiPaper: {
          styleOverrides: {
              root: {
                  border: `1px solid ${currentPalette?.divider}`,
              }
          }
      },
      MuiCard: {
          styleOverrides: {
              root: {
                  border: `1px solid ${currentPalette?.divider}`,
              }
          }
      },
    };

    return createTheme({
        ...baseThemeOptions,
        palette: currentPalette,
        components: {
            ...baseThemeOptions.components,
            ...modeSpecificOverrides,
        }
    });
  }, [activeMode]);

  return (
    <ThemeModeContext.Provider value={{ modeSetting, setModeSetting }}>
        <ThemeProvider theme={theme}>
          <CssBaseline enableColorScheme />
          {children}
        </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

// Export Hook to use the context
export const useThemeMode = () => {
  const context = useContext(ThemeModeContext);
  if (context === undefined) {
    throw new Error('useThemeMode must be used within a ClientThemeProviders component');
  }
  return context;
}; 