import { Theme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export default function Menu(theme: Theme) {
  return {
    MuiMenu: {
      styleOverrides: {
        paper: {
          marginTop: theme.spacing(1.5),
          overflow: 'visible',
          boxShadow: theme.shadows[3],
          border: `solid 1px ${theme.palette.divider}`,
        },
        list: {
          paddingTop: theme.spacing(1),
          paddingBottom: theme.spacing(1),
        },
      },
    },
  };
} 