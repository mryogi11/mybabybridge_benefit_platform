'use client';

import React, { useState, useEffect, useMemo, createContext, useContext, useCallback } from 'react';
import { createTheme, ThemeProvider, useMediaQuery, PaletteMode } from '@mui/material';
import type { ThemeOptions, PaletteOptions } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { alpha, PaletteOptions as MuiPaletteOptions } from '@mui/material/styles';

// Import Auth context and server action
import { useAuth } from '@/contexts/AuthContext';
import { updateUserThemePreference } from '@/actions/userActions';

// Re-import fonts if needed here, or ensure they are loaded globally
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/public-sans/700.css';

// --- Copied from ThemeRegistry --- 

// 1. Define Types
export type ThemeModeSetting = 'light' | 'dark' | 'system' | 'ocean' | 'mint' | 'rose' | 'charcoal' | 'sunset';

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

// Define light and dark PALETTE BASE options (These contain the core structure)
const lightPaletteBase: PaletteOptions = {
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

const darkPaletteBase: PaletteOptions = {
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

// --- Define New Theme Palettes ---

const oceanPalette: PaletteOptions = {
    ...lightPaletteBase, // Inherit base light colors
    mode: 'light', // Explicitly set mode
    primary: { main: '#26A69A', light: '#80CBC4', dark: '#00796B', contrastText: '#fff' }, // Teal 400
    secondary: { main: '#4DD0E1', light: '#B2EBF2', dark: '#00ACC1', contrastText: '#000' }, // Cyan 400
};

const mintPalette: PaletteOptions = {
    ...lightPaletteBase,
    mode: 'light',
    primary: { main: '#66BB6A', light: '#81C784', dark: '#388E3C', contrastText: '#000' },
    secondary: { main: '#AED581', light: '#C5E1A5', dark: '#7CB342', contrastText: '#000' },
};

const rosePalette: PaletteOptions = {
    ...lightPaletteBase,
    mode: 'light',
    primary: { main: '#EC407A', light: '#F06292', dark: '#C2185B', contrastText: '#fff' },
    secondary: { main: '#F8BBD0', light: '#FCE4EC', dark: '#F48FB1', contrastText: '#000' },
};

const charcoalPalette: PaletteOptions = {
    ...darkPaletteBase, // Inherit base dark colors
    mode: 'dark', // Explicitly set mode
    primary: { main: '#616161', light: '#9E9E9E', dark: '#424242', contrastText: '#fff' }, // Grey
    secondary: { main: '#9E9E9E', light: '#E0E0E0', dark: '#757575', contrastText: '#000' }, // Lighter Grey
};

const sunsetPalette: PaletteOptions = {
    ...darkPaletteBase,
    mode: 'dark',
    primary: { main: '#FF7043', light: '#FF8A65', dark: '#F4511E', contrastText: '#000' }, // Orange
    secondary: { main: '#FFCA28', light: '#FFEE58', dark: '#FFA000', contrastText: '#000' }, // Yellow
};

// --- End New Theme Palettes ---

// Helper function to get initial theme mode
const getInitialThemeMode = (): ThemeModeSetting => {
  if (typeof window === 'undefined') {
    return 'dark'; 
  }
  try {
    const savedMode = localStorage.getItem('themeMode') as ThemeModeSetting;
    const validModes: ThemeModeSetting[] = ['light', 'dark', 'system', 'ocean', 'mint', 'rose', 'charcoal', 'sunset'];
    if (savedMode && validModes.includes(savedMode)) {
      return savedMode;
    }
    localStorage.setItem('themeMode', 'dark'); 
    return 'dark';
  } catch (error) {
    if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem('themeMode', 'dark'); } catch (e) { /* ignore */ }
    }
    return 'dark';
  }
};

export default function ClientThemeProviders({ children }: { children: React.ReactNode }) {
  const { user: authUser, profile, isProfileLoading, fetchAndSetProfile } = useAuth();

  // ssrFriendlyModeSetting: Initialized to 'dark' for SSR and first client render to match server.
  // It will be updated to the actual client theme post-hydration.
  const [ssrFriendlyModeSetting, setSsrFriendlyModeSetting] = useState<ThemeModeSetting>('dark');
  
  // This state tracks if the client-side specific theme has been applied after the initial mount.
  const [clientThemeApplied, setClientThemeApplied] = useState(false);

  // Effect 1: Runs ONCE on client mount to determine and apply the true client-side theme.
  useEffect(() => {
    const actualClientTheme = getInitialThemeMode(); // Reads from localStorage
    
    // Update the theme setting to what the client actually wants.
    // This will cause a re-render, and MUI components will adopt the new theme.
    setSsrFriendlyModeSetting(actualClientTheme);
    setClientThemeApplied(true); // Mark that the client theme has been applied.

    // Ensure data-theme and localStorage are set according to this actual client theme.
    // The inline script might have already set data-theme, this ensures consistency.
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', actualClientTheme);
      if (localStorage.getItem('themeMode') !== actualClientTheme) {
        localStorage.setItem('themeMode', actualClientTheme);
      }
    }
  }, []); // Empty dependency array ensures this runs only once on client mount.

  // Effect 2: Keeps data-theme and localStorage in sync with ssrFriendlyModeSetting changes AFTER initial client theme is applied.
  // Also handles cross-tab storage events.
  useEffect(() => {
    // Only run this effect fully if the initial client theme has been determined and applied.
    // This prevents this effect from prematurely acting based on the initial 'dark' ssrFriendlyModeSetting on the client.
    if (clientThemeApplied && typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', ssrFriendlyModeSetting);
      if (localStorage.getItem('themeMode') !== ssrFriendlyModeSetting) {
        localStorage.setItem('themeMode', ssrFriendlyModeSetting);
      }
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'themeMode' && typeof window !== 'undefined') {
        const newMode = event.newValue as ThemeModeSetting | null;
        const validModes: ThemeModeSetting[] = ['light', 'dark', 'system', 'ocean', 'mint', 'rose', 'charcoal', 'sunset'];
        if (newMode && validModes.includes(newMode) && newMode !== ssrFriendlyModeSetting) {
          setSsrFriendlyModeSetting(newMode); 
        } else if (!newMode && ssrFriendlyModeSetting !== 'dark') {
          // If theme is removed from localStorage, default to dark (or system preference if implemented fully for this case)
          setSsrFriendlyModeSetting('dark');
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [ssrFriendlyModeSetting, clientThemeApplied]);

  // Effect 3: Sync theme with user profile changes.
  useEffect(() => {
    // Only act if client theme has been established, to avoid premature changes based on initial 'dark' state.
    if (clientThemeApplied && authUser && !isProfileLoading && profile?.theme_preference) {
      const userPreference = profile.theme_preference as ThemeModeSetting;
      const validModes: ThemeModeSetting[] = ['light', 'dark', 'system', 'ocean', 'mint', 'rose', 'charcoal', 'sunset'];
      
      if (validModes.includes(userPreference) && userPreference !== ssrFriendlyModeSetting) {
          setSsrFriendlyModeSetting(userPreference); // Update React state
          // Effect 2 will handle syncing to localStorage and data-theme.
      }
    } 
  }, [authUser, profile, isProfileLoading, ssrFriendlyModeSetting, clientThemeApplied]);

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const activeMode = useMemo<PaletteMode>(() => {
    if (ssrFriendlyModeSetting === 'system') {
      return prefersDarkMode ? 'dark' : 'light';
    }
    const selectedPalette = 
        ssrFriendlyModeSetting === 'ocean' ? oceanPalette :
        ssrFriendlyModeSetting === 'mint' ? mintPalette :
        ssrFriendlyModeSetting === 'rose' ? rosePalette :
        ssrFriendlyModeSetting === 'charcoal' ? charcoalPalette :
        ssrFriendlyModeSetting === 'sunset' ? sunsetPalette :
        ssrFriendlyModeSetting === 'light' ? lightPaletteBase :
        darkPaletteBase;
    return selectedPalette.mode || 'light';
  }, [ssrFriendlyModeSetting, prefersDarkMode]);

  // Updated function to call server action
  const setModeSetting = useCallback(async (newMode: ThemeModeSetting) => {
    // Ensure client-side changes are processed only after initial setup is done.
    if (!clientThemeApplied) return;

    setSsrFriendlyModeSetting(newMode); // Update React state. Effect 2 will sync to localStorage & data-theme.

    if (!authUser) { 
        return; 
    }
    try {
      const result = await updateUserThemePreference(newMode);
      if (!result.success) {
        console.error("Failed to save theme preference to DB:", result.message);
      } else {
        if (fetchAndSetProfile) {
          await fetchAndSetProfile(authUser.id); 
        }
      }
    } catch (error) { 
        console.error("Error calling updateUserThemePreference action:", error);
    }
  }, [authUser, fetchAndSetProfile, clientThemeApplied]);

  // The theme object passed to MUI ThemeProvider now uses ssrFriendlyModeSetting.
  // On SSR and initial client render/hydration, this will be 'dark'.
  // After client mount, Effect 1 updates ssrFriendlyModeSetting, causing a re-render with the correct client theme.
  const theme = useMemo(() => {
    let activePaletteOptions: PaletteOptions;
    let resolvedPaletteMode: PaletteMode;

    switch (ssrFriendlyModeSetting) {
        case 'ocean': activePaletteOptions = oceanPalette; break;
        case 'mint': activePaletteOptions = mintPalette; break;
        case 'rose': activePaletteOptions = rosePalette; break;
        case 'charcoal': activePaletteOptions = charcoalPalette; break;
        case 'sunset': activePaletteOptions = sunsetPalette; break;
        case 'light': activePaletteOptions = lightPaletteBase; break;
        case 'dark': activePaletteOptions = darkPaletteBase; break;
        case 'system':
        default:
            resolvedPaletteMode = prefersDarkMode ? 'dark' : 'light';
            activePaletteOptions = resolvedPaletteMode === 'dark' ? darkPaletteBase : lightPaletteBase;
            break;
    }
    
    if (ssrFriendlyModeSetting !== 'system') {
        resolvedPaletteMode = activePaletteOptions.mode || 'light';
    }

    const getAppBarStylesInternal = (palette: PaletteOptions) => {
        const defaultPrimaryLight = { main: '#3366FF', contrastText: '#fff' };
        const defaultPrimaryDark = { main: '#6690FF', contrastText: '#fff' };
        const basePrimaryColors = palette.mode === 'dark' ? defaultPrimaryDark : defaultPrimaryLight;

        let mainColor = basePrimaryColors.main;
        let contrastTextColor = basePrimaryColors.contrastText;

        if (palette.primary && typeof palette.primary === 'object') {
            const primarySimple = palette.primary as import('@mui/material/styles').SimplePaletteColorOptions;
            if (primarySimple) { 
                mainColor = primarySimple.main || mainColor;
                contrastTextColor = primarySimple.contrastText || contrastTextColor;
            }
        }
        return {
            backgroundColor: mainColor,
            color: contrastTextColor,
            borderBottom: `1px solid ${alpha(contrastTextColor, 0.12)}`,
        };
    };

    const modeSpecificOverrides: ThemeOptions['components'] = {
      MuiCssBaseline: {
          styleOverrides: {
              body: {
                  backgroundColor: activePaletteOptions.background?.default,
              }
          }
      },
      MuiAppBar: {
          styleOverrides: {
              root: getAppBarStylesInternal(activePaletteOptions),
          },
      },
      MuiDrawer: {
          styleOverrides: {
              paper: {
                  backgroundColor: activePaletteOptions.background?.paper,
                  border: 'none',
              }
          }
      },
      MuiPaper: {
          styleOverrides: {
              root: {
                  border: `1px solid ${activePaletteOptions.divider}`,
              }
          }
      },
      MuiCard: {
          styleOverrides: {
              root: {
                  border: `1px solid ${activePaletteOptions.divider}`,
              }
          }
      },
    };

    return createTheme({
        ...baseThemeOptions,
        palette: activePaletteOptions, 
        components: {
            ...baseThemeOptions.components,
            ...modeSpecificOverrides,
        }
    });
  }, [ssrFriendlyModeSetting, prefersDarkMode]); 

  return (
    <ThemeModeContext.Provider value={{ modeSetting: ssrFriendlyModeSetting, setModeSetting }}>
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