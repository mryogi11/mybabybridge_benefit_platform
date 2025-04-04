import { Theme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export default function ListItemIcon(theme: Theme) {
  return {
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          // Base styles for icons in lists/menus
          minWidth: 'auto', // Allow shrinking
          marginRight: theme.spacing(2), // Consistent margin
          color: theme.palette.text.secondary, // Default icon color
          alignItems: 'center', // Ensure vertical alignment
          justifyContent: 'center', // Ensure horizontal alignment if needed

          // Styles for icons within selected/active ListItemButton (handled there)
          // '.Mui-selected &': {
          //   color: theme.palette.primary.main,
          // },
        },
      },
    },
  };
} 