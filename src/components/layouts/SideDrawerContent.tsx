'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Collapse,
  CircularProgress,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Assignment as AssignmentIcon,
  LocalHospital as PackagesIcon,
  Message as MessageIcon,
  ExpandLess,
  ExpandMore,
  // Import icons for potential sub-menus if needed
  // Settings as SettingsIcon, 
  // AccountCircle as AccountCircleIcon,
  // ManageAccounts as ManageAccountsIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo'; // Assuming Logo component exists

// Define the type for a menu item
interface MenuItemType {
  title: string;
  icon: React.ReactElement;
  path?: string; // Path is optional if it has children
  badge?: number;
  children?: MenuItemType[]; // Optional array of children
}

// Define navigation items using the MenuItemType
const menuItems: MenuItemType[] = [
  { title: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { title: 'Appointments', path: '/dashboard/appointments', icon: <CalendarIcon />, badge: 2 }, // Example badge
  { title: 'Treatment Plans', path: '/dashboard/treatment-plans', icon: <AssignmentIcon /> },
  { title: 'Packages', path: '/dashboard/packages', icon: <PackagesIcon /> },
  { title: 'Messages', path: '/dashboard/messages', icon: <MessageIcon />, badge: 3 }, // Example badge
  // Add other top-level items here
  // Example Sub-menu structure:
  // {
  //   title: 'Settings',
  //   icon: <SettingsIcon />,
  //   children: [
  //     { title: 'Profile', path: '/dashboard/profile', icon: <AccountCircleIcon /> },
  //     { title: 'Account', path: '/dashboard/account', icon: <ManageAccountsIcon /> },
  //   ]
  // }
];

interface NavItemProps {
  item: MenuItemType; // Use the defined type
  depth?: number;
  onNavigate: (path: string) => void;
  isNavigating: boolean;
  currentNavPath: string | null;
}

function NavItem({ item, depth = 0, onNavigate, isNavigating, currentNavPath }: NavItemProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const [open, setOpen] = useState(false); // State for sub-menu collapse

  const isActive = item.path && pathname === item.path;
  // Check if any child path matches the current pathname
  const isChildActive = item.children?.some((child: MenuItemType) => child.path && pathname === child.path);
  // Explicitly cast the check to boolean for the disabled prop
  const isCurrentNavTarget = Boolean(item.path && isNavigating && currentNavPath === item.path);

  const handleToggle = () => {
    setOpen(!open);
  };

  const handleClick = () => {
    if (item.path) {
      onNavigate(item.path);
    } else if (item.children) {
      handleToggle();
    }
  };

  const itemSx = {
    py: 1,
    px: 2.5 + depth * 1.5, // Indentation for sub-menus
    minHeight: 44,
    borderRadius: 1,
    mb: 0.5,
    // Adjust active colors/background slightly for parent of active child
    color: isActive || isChildActive ? theme.palette.primary.main : theme.palette.text.secondary,
    backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.08) 
                     : isChildActive ? alpha(theme.palette.primary.main, 0.04) // Lighter for parent
                     : 'transparent',
    fontWeight: isActive || isChildActive ? 600 : 400,
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.12),
      color: theme.palette.primary.main,
    },
  };

  return (
    <>
      <ListItemButton sx={itemSx} onClick={handleClick} disabled={isCurrentNavTarget}>
        <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
          {isCurrentNavTarget ? (
            <CircularProgress size={20} color="inherit" />
          ) : item.badge ? (
             <Badge color="error" badgeContent={item.badge} sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}>
               {item.icon}
             </Badge>
          ) : (
            item.icon
          )}
        </ListItemIcon>
        <ListItemText
          primary={item.title}
          primaryTypographyProps={{ variant: 'body2', fontWeight: 'inherit' }}
        />
        {/* Show expand icon only if there are children */}
        {item.children && item.children.length > 0 && (open ? <ExpandLess /> : <ExpandMore />)}
      </ListItemButton>

      {/* Render children only if they exist */}
      {item.children && item.children.length > 0 && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map((child: MenuItemType) => ( // Use MenuItemType here
              <NavItem
                key={child.title}
                item={child}
                depth={depth + 1}
                onNavigate={onNavigate}
                isNavigating={isNavigating}
                currentNavPath={currentNavPath}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}


export default function SideDrawerContent() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentNavPath, setCurrentNavPath] = useState<string | null>(null);

  // Prefetch links on mount - Use the defined type
  useEffect(() => {
      menuItems.forEach((item: MenuItemType) => {
          if (item.path) router.prefetch(item.path);
          // Check if children exist before trying to loop
          if (item.children && item.children.length > 0) {
              item.children.forEach((child: MenuItemType) => { // Use MenuItemType
                  if (child.path) router.prefetch(child.path);
              });
          }
      });
       // Prefetch other common ones not in nav
      router.prefetch('/dashboard/profile');
      router.prefetch('/dashboard/settings');
  }, [router]);

  const handleNavigation = (path: string) => {
      setIsNavigating(true);
      setCurrentNavPath(path);
      router.push(path);
      // Consider removing timeout if route transitions are fast enough
      setTimeout(() => {
          setIsNavigating(false);
          setCurrentNavPath(null);
      }, 500);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo Section */}
      <Box sx={{ px: 2.5, py: 3 }}>
        <Link href="/dashboard" passHref>
          <Logo />
        </Link>
      </Box>

      {/* Navigation List */}
      <List component="nav" sx={{ flexGrow: 1, px: 2 }}>
        {menuItems.map((item) => (
          <NavItem
            key={item.title}
            item={item}
            onNavigate={handleNavigation}
            isNavigating={isNavigating}
            currentNavPath={currentNavPath}
           />
        ))}
      </List>

      {/* Optional: Footer or User Info Section in Drawer */}
      <Box sx={{ px: 2, py: 2, mt: 'auto' }}>
        {/* Example: Footer Content */}
        {/* <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          MyBabyBridge © 2024
        </Typography> */}
      </Box>
    </Box>
  );
}