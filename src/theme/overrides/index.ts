import { Theme } from '@mui/material/styles';

import ListItemButton from './ListItemButton';
import Menu from './Menu';
import MenuItem from './MenuItem';
import ListItemIcon from './ListItemIcon';

// ----------------------------------------------------------------------

export default function ComponentsOverrides(theme: Theme) {
  return Object.assign(
    ListItemButton(theme),
    Menu(theme),
    MenuItem(theme),
    ListItemIcon(theme)
    // Add other component overrides here
  );
} 