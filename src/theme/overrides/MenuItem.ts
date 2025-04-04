import { Theme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export default function MenuItem(theme: Theme) {
  return {
    MuiMenuItem: {
      styleOverrides: {
        root: {
          // Basic MenuItem styling, adjust padding etc. if needed
          paddingTop: theme.spacing(1),
          paddingBottom: theme.spacing(1),
          fontSize: '0.875rem',

          // Ensure consistent icon margin if ListItemIcon override isn't enough
          '& .MuiListItemIcon-root': {
            marginRight: theme.spacing(1.5), // Example adjustment
          },

          // Error color variant (used for Logout)
          // Note: MUI doesn't have a built-in color prop for MenuItem
          // We can target a specific class or rely on local sx prop for this.
          // Alternatively, check if the theme provides a way to add variants.
          // For now, the local sx={{ color: 'error.main' }} is likely best.
        },
      },
    },
  };
} 