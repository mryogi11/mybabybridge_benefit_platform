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
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountCircle as ProfileIcon,
  People as PatientsIcon,
  CalendarMonth as AppointmentsIcon,
  Message as MessagesIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Define the type for a provider menu item (can be simpler if no sub-menus planned)
interface ProviderMenuItemType {
  title: string;
  icon: React.ReactElement;
  path: string; // Path is required for provider items
  badge?: number;
}

// Define provider navigation items
const providerMenuItems: ProviderMenuItemType[] = [
  { title: 'Dashboard', path: '/provider/dashboard', icon: <DashboardIcon /> },
  { title: 'Patients', path: '/provider/patients', icon: <PatientsIcon /> },
  { title: 'Appointments', path: '/provider/appointments', icon: <AppointmentsIcon /> },
  { title: 'Messages', path: '/provider/messages', icon: <MessagesIcon /> },
];

// Reusable NavItem component replicating admin styling
interface NavItemProps {
  item: ProviderMenuItemType; // Use provider type
  onNavigate: (path: string) => void;
  isNavigating: boolean;
  currentNavPath: string | null;
}

function NavItem({ item, onNavigate, isNavigating, currentNavPath }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === item.path;
  const isCurrentNavTarget = isNavigating && currentNavPath === item.path;

  const handleClick = () => {
    onNavigate(item.path);
  };

  // Rely on theme override for styling
  return (
    <ListItemButton 
      selected={isActive} // Let theme handle selected styles
      onClick={handleClick} 
      disabled={isCurrentNavTarget}
      // No sx needed here if base padding matches
    >
      {/* Rely on ListItemIcon override for base styling */}
      <ListItemIcon> 
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
       {/* Rely on theme override for text style */}
      <ListItemText
        primary={item.title}
        primaryTypographyProps={{ variant: 'body2', fontWeight: 'inherit' }}
      />
    </ListItemButton>
  );
}

// Main ProviderSideDrawerContent component
export default function ProviderSideDrawerContent() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentNavPath, setCurrentNavPath] = useState<string | null>(null);
  const supabase = createClientComponentClient(); // Initialize supabase client

  // Placeholder Logout Handler
  const handleLogout = async () => {
    console.log("Logout clicked - implementing...");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      // Handle error appropriately (e.g., show notification)
    } else {
      // Redirect to login or home page after successful logout
      router.push('/login'); 
    }
  };

  // Prefetch links on mount
  useEffect(() => {
    providerMenuItems.forEach((item) => {
      router.prefetch(item.path);
    });
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
    // Overall structure matching admin's SideDrawerContent
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo Section */}
      <Box sx={{ px: 2.5, py: 3 }}>
        <Link href="/provider/dashboard" passHref>
          <Logo />
        </Link>
      </Box>

      {/* Navigation List */}
      <List component="nav" sx={{ flexGrow: 1, px: 2 }}>
        {providerMenuItems.map((item) => (
          <NavItem
            key={item.title}
            item={item}
            onNavigate={handleNavigation}
            isNavigating={isNavigating}
            currentNavPath={currentNavPath}
           />
        ))}
      </List>

      <Divider />

      <List component="nav">
        {/* Settings Link */}
        <ListItemButton component={Link} href="/provider/settings">
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItemButton>

        {/* Availability Link */}
        <ListItemButton component={Link} href="/provider/availability">
          <ListItemIcon>
            <EventAvailableIcon />
          </ListItemIcon>
          <ListItemText primary="Manage Availability" />
        </ListItemButton>

        {/* Logout Button */}
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon>
            <ExitToAppIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>

      {/* Optional: Footer Section (matching admin drawer if needed) */}
      <Box sx={{ px: 2, py: 2, mt: 'auto' }}>
        {/* Example placeholder */}
      </Box>
    </Box>
  );
}