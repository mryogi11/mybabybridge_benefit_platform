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
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Assignment as AssignmentIcon,
  LocalHospital as PackagesIcon,
  Message as MessageIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
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
  { title: 'Messages', path: '/dashboard/communication', icon: <MessageIcon />, badge: 3 }, // Example badge
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
  isCollapsed: boolean;
}

function NavItem({ item, depth = 0, onNavigate, isNavigating, currentNavPath, isCollapsed }: NavItemProps) {
  const pathname = usePathname();
  const theme = useTheme(); // Get theme for colors
  const isActive = item.path && pathname === item.path;
  const isChildActive = item.children?.some((child: MenuItemType) => child.path && pathname === child.path);
  const isCurrentNavTarget = Boolean(item.path && isNavigating && currentNavPath === item.path);

  // Sub-menu state
  const [open, setOpen] = useState(isChildActive); // Keep open if child is active

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

  return (
    <>
      <ListItemButton 
        selected={isActive || isChildActive} 
        onClick={handleClick} 
        disabled={isCurrentNavTarget}
        sx={{ 
          minHeight: '30px', // Materio nav item height
          height: '30px',
          py: theme.spacing(0.5), // Minimal vertical padding
          px: isCollapsed ? 1.5 : theme.spacing(2.5), // Horizontal padding (20px equivalent)
          mb: '4px', // Margin like Materio
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          transition: 'padding 0.2s ease-in-out, background-color 0.1s ease-in-out', 
          borderRadius: theme.shape.borderRadius / 2, // Slightly rounded like Materio menu items
          '&:hover': {
            backgroundColor: '#f3f3f3', // Materio hover
          },
          '&.Mui-selected': {
            color: 'white',
            backgroundColor: '#765feb', // Materio active bg
            '&:hover': {
              backgroundColor: '#765feb', // Maintain active bg on hover
            },
            '& .MuiListItemIcon-root': {
              color: 'white', // Active icon color
            },
          },
          // Adjust padding when collapsed specifically for ListItemButton
          ...(isCollapsed && {
            paddingLeft: theme.spacing(1.5),
            paddingRight: theme.spacing(1.5),
          })
        }}
      >
        <ListItemIcon sx={{
          minWidth: isCollapsed ? 'auto' : 36, // Adjusted minWidth
          justifyContent: 'center',
          color: (isActive || isChildActive) ? 'white' : 'inherit', // Icon color for active state
          mr: isCollapsed ? 0 : 1, // Margin for icon when not collapsed
        }}>
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
        {!isCollapsed && ( 
          <ListItemText
            primary={item.title}
            primaryTypographyProps={{ 
              variant: 'body2', // Materio menu item text size (0.8125rem)
              fontWeight: isActive || isChildActive ? 500 : 400, 
              whiteSpace: 'nowrap' 
            }} 
          />
        )}
        {!isCollapsed && item.children && item.children.length > 0 && (open ? <ExpandLess /> : <ExpandMore />)}
      </ListItemButton>

      {!isCollapsed && item.children && item.children.length > 0 && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map((child: MenuItemType) => (
              <NavItem
                key={child.title}
                item={child}
                depth={depth + 1} // Pass depth down
                onNavigate={onNavigate}
                isNavigating={isNavigating}
                currentNavPath={currentNavPath}
                isCollapsed={isCollapsed} // Pass down isCollapsed
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

interface SideDrawerContentProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function SideDrawerContent({ isCollapsed, onToggleCollapse }: SideDrawerContentProps) {
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

  const theme = useTheme(); // Get theme for styling the toggle button

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden', /* Prevent scrollbars during transition */
    }}>
      {/* Logo Section - Styled like Materio NavHeader */}
      <Box sx={{
          padding: '15px',
          pl: isCollapsed ? '15px' : '20px',
          display: 'flex',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          alignItems: 'center',
          transition: 'padding 0.3s ease-in-out, justify-content 0.3s ease-in-out',
          height: 64,
          boxSizing: 'border-box',
        }}>
        {/* <Typography variant="h3" color="error">FORCE CHECKPOINT ALPHA</Typography> */}
        <Link href="/dashboard" passHref>
          {isCollapsed ? <Logo height={30} collapsed /> : <Logo />}
          {/* <Typography sx={{ p: 1, border: '1px dashed red' }}>
            {isCollapsed ? 'LOGO_C' : 'LOGO_FULL'}
          </Typography> */}
        </Link>
      </Box>

      {/* Navigation List */}
      <List component="nav" sx={{ 
          flexGrow: 1, 
          px: isCollapsed ? 1 : 1.5,  // Materio seems to use around 12px (theme.spacing(1.5)) for nav list padding
          pt: 1, // Add some top padding to the list
          overflowY: 'auto', 
          overflowX: 'hidden',
          transition: 'padding 0.3s ease-in-out',
           '& .MuiListItemIcon-root': { // Ensure icons are centered when collapsed
            minWidth: 'auto',
            justifyContent: 'center',
          },
        }}>
        {menuItems.map((item) => (
          <NavItem
            key={item.title}
            item={item}
            onNavigate={handleNavigation}
            isNavigating={isNavigating}
            currentNavPath={currentNavPath}
            isCollapsed={isCollapsed} // Pass isCollapsed
           />
        ))}
      </List>

      {/* Collapse Toggle Button */}
      <Box 
        sx={{ 
          p: isCollapsed ? 1 : 2, 
          mt: 'auto', 
          display: 'flex', 
          justifyContent: isCollapsed ? 'center' : 'flex-end',
          borderTop: `1px dashed ${theme.palette.divider}`,
          transition: 'padding 0.3s ease-in-out, justify-content 0.3s ease-in-out',
        }}
      >
        <IconButton onClick={onToggleCollapse} size="small">
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
    </Box>
  );
}