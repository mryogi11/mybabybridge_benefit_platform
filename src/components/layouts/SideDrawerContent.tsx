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

  // Use Mui-selected class for active state, rely on theme override
  return (
    <>
      <ListItemButton 
        selected={isActive || isChildActive} // Let theme handle selected styles
        onClick={handleClick} 
        disabled={isCurrentNavTarget}
        sx={{ 
          pl: isCollapsed ? 1.5 : (2.5 + depth * 1.5), // Adjust padding when collapsed
          justifyContent: isCollapsed ? 'center' : 'flex-start', // Center icon when collapsed
          transition: 'padding 0.3s ease-in-out', // Smooth transition for padding
        }}
      >
        <ListItemIcon sx={{ minWidth: isCollapsed? 'auto' : 40, justifyContent: 'center' }}>  // Center icon
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
        {!isCollapsed && ( // Conditionally render ListItemText
          <ListItemText
            primary={item.title}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 'inherit', whiteSpace: 'nowrap' }} 
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' /* Prevent scrollbars during transition */ }}>
      {/* Logo Section */}
      <Box sx={{ 
          px: isCollapsed ? 0 : 2.5, 
          py: 3, 
          display: 'flex', 
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          alignItems: 'center', // Vertically center logo if needed
          transition: 'padding 0.3s ease-in-out, justify-content 0.3s ease-in-out',
          height: 64, // Fixed height for logo area
          boxSizing: 'border-box',
        }}>
        <Link href="/dashboard" passHref>
          {isCollapsed ? <Logo height={30} collapsed /> : <Logo />} 
        </Link>
      </Box>

      {/* Navigation List */}
      <List component="nav" sx={{ 
          flexGrow: 1, 
          px: isCollapsed ? 0.5 : 2,  // Adjust padding when collapsed
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