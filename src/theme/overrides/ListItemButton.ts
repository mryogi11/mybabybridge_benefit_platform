import { Theme, alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------

export default function ListItemButton(theme: Theme) {
  return {
    MuiListItemButton: {
      styleOverrides: {
        root: {
          // Base styles matching NavItem defaults
          paddingTop: theme.spacing(1),
          paddingBottom: theme.spacing(1),
          paddingLeft: theme.spacing(2.5), // Base padding, depth handled locally if needed
          paddingRight: theme.spacing(2.5),
          minHeight: 44,
          // Explicitly set borderRadius to match the desired Minimal style
          borderRadius: theme.spacing(1), // Use theme spacing unit (e.g., 8px)
          marginBottom: theme.spacing(0.5),
          color: theme.palette.text.secondary,
          fontWeight: 400,
          // Refined Hover for non-selected items (subtle grey)
          '&:hover': {
            backgroundColor: theme.palette.action.hover, // Use theme's subtle hover grey
            // Keep color change on hover consistent if desired
            // color: theme.palette.primary.main, 
          },
          // Active state
          '&.Mui-selected': {
            color: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            fontWeight: 600,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.12), // Slightly darker hover on active
            },
            // Style for icon within active button
            '& .MuiListItemIcon-root': {
              color: theme.palette.primary.main, 
            },
          },
          // Disabled state (for navigation loading)
          '&.Mui-disabled': {
            opacity: 0.6,
            // Optionally keep text color slightly visible
            // color: theme.palette.text.disabled 
          },
        },
      },
    },
  };
} 