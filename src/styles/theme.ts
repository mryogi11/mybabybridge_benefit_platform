'use client';

import { createTheme, ThemeOptions, responsiveFontSizes, PaletteOptions, Shadows } from '@mui/material/styles';
import ComponentsOverrides from '../theme/overrides';

// Define base palette inline (adjust colors as needed for Minimal theme)
const palette: PaletteOptions = {
  primary: {
    main: '#007bff', // Example primary color
    contrastText: '#fff',
  },
  secondary: {
    main: '#6c757d', // Example secondary color
    contrastText: '#fff',
  },
  background: {
    default: '#F9FAFB',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#212529',
    secondary: '#6c757d',
  },
  // Add other palette settings like error, warning, info, success if needed
  error: { main: '#dc3545' },
  warning: { main: '#ffc107' },
  info: { main: '#17a2b8' },
  success: { main: '#28a745' },
};

// Define base typography inline
const typography = {
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  // Add specific variant styles if needed, otherwise MUI defaults apply
  h1: { fontSize: '2.5rem', fontWeight: 700 },
  h2: { fontSize: '2rem', fontWeight: 600 },
  h3: { fontSize: '1.75rem', fontWeight: 600 },
  h4: { fontSize: '1.5rem', fontWeight: 600 },
  h5: { fontSize: '1.25rem', fontWeight: 600 },
  h6: { fontSize: '1rem', fontWeight: 600 },
};

// Define base shadows inline (MUI defaults essentially)
const shadows: Shadows = Array(25).fill('none') as Shadows;
// Add specific elevations if needed, e.g.:
shadows[1] = '0px 1px 3px rgba(0, 0, 0, 0.1)';
shadows[3] = '0px 3px 6px rgba(0, 0, 0, 0.1)'; // Used in Menu override
shadows[8] = '0px 8px 16px rgba(0, 0, 0, 0.1)';
shadows[20] = '0px 20px 40px rgba(0, 0, 0, 0.15)'; // Example for z20

// Define customShadows inline if used by overrides (or remove if not)
const customShadows = {
    z20: shadows[20], // Example referencing base shadows
    // Add other custom shadows if needed
};

// Define base theme options using inline definitions
export const baseThemeOptions: ThemeOptions = {
  palette: palette,
  typography: typography,
  shape: { borderRadius: 8 }, 
  shadows: shadows, 
  // customShadows is not a standard ThemeOption, added later via merge
};

// Function to create the full theme including overrides
export function getTheme() {
  let theme = createTheme(baseThemeOptions);
  const componentOverrides = ComponentsOverrides(theme);

  // Merge base theme, overrides, and add customShadows
  theme = createTheme(theme, {
      components: componentOverrides,
      // Add custom shadows here if needed via module augmentation
      customShadows: customShadows, 
  });

  theme = responsiveFontSizes(theme);
  return theme;
} 

// Module augmentation for custom shadows 
declare module '@mui/material/styles' {
  interface Theme {
    customShadows: typeof customShadows;
  }
  interface ThemeOptions {
    customShadows?: typeof customShadows;
  }
} 