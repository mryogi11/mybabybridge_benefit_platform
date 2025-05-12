'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase'; // If you use generated types
import React, { useState, useEffect, useRef } from 'react';
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
  useMediaQuery,
  alpha,
  Divider,
  IconButton,
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
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { createActivityLog } from '@/lib/actions/loggingActions';

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
  isCollapsed: boolean;
}

function NavItem({ item, onNavigate, isNavigating, currentNavPath, isCollapsed }: NavItemProps) {
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
      sx={{ 
        pl: isCollapsed ? 1.5 : 2.5,
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        transition: 'padding 0.3s ease-in-out',
      }}
    >
      <ListItemIcon sx={{ minWidth: isCollapsed? 'auto' : 40, justifyContent: 'center' }}> 
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
          primaryTypographyProps={{ variant: 'body2', fontWeight: 'inherit', whiteSpace: 'nowrap' }}
        />
      )}
    </ListItemButton>
  );
}

interface ProviderSideDrawerContentProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  setIsLoadingPage: (isLoading: boolean) => void;
}

// Main ProviderSideDrawerContent component
export default function ProviderSideDrawerContent({ 
    isCollapsed, 
    onToggleCollapse, 
    setIsLoadingPage
}: ProviderSideDrawerContentProps) {
  const router = useRouter();
  const theme = useTheme(); // Get the theme object
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // Check for mobile breakpoint
  const logoBoxRef = useRef<HTMLDivElement>(null); // Ref for the Logo Box
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentNavPath, setCurrentNavPath] = useState<string | null>(null);
       // Use createBrowserClient from @supabase/ssr
       const [supabase] = useState(() => createBrowserClient<Database>( // Remove <Database> if you don't have the type
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ));

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
      // Add activity log after successful logout
      const user = await supabase.auth.getUser();
      if (user && user.data && user.data.user) {
        await createActivityLog({
          userId: user.data.user.id,
          userEmail: user.data.user.email,
          actionType: 'USER_LOGOUT',
          status: 'SUCCESS',
          description: 'User logged out via ProviderSideDrawer.'
        });
      }
    }
  };

  // Prefetch links on mount
  useEffect(() => {
    providerMenuItems.forEach((item) => {
      router.prefetch(item.path);
    });
  }, [router]);

  // New effect specifically for logging the Logo Box height
  useEffect(() => {
    if (logoBoxRef.current) {
      console.log('[ProviderSideDrawerContent] Logo Box ClientHeight:', logoBoxRef.current.clientHeight);
      console.log('[ProviderSideDrawerContent] Logo Box OffsetHeight:', logoBoxRef.current.offsetHeight);
    }
  }, []); // Empty dependency array: runs once after initial mount

  const logoHeight = isMobile ? 46 : 48; // Calculate responsive logo height
  const pathname = usePathname(); // Get current pathname

  const handleNavigation = (path: string) => {
    if (pathname !== path) { // Check if already on the path
        setIsLoadingPage(true); // Use the passed-in setter
    }
    router.push(path);
    // No longer manage isNavigating and currentNavPath here, as loader is global
    // setIsNavigating(true);
    // setCurrentNavPath(path);
    // setTimeout(() => {
    //     setIsNavigating(false);
    //     setCurrentNavPath(null);
    // }, 500); 
  };

  return (
    // Overall structure matching admin's SideDrawerContent
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Logo Section - Styled like a Toolbar top */}
      <Box 
        ref={logoBoxRef} // Added ref
        sx={{
          height: { xs: 56, sm: 64 }, // Use explicit height instead of minHeight
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start', 
          px: isCollapsed ? 0 : 2.5, 
          py: 0, 
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText, 
          boxSizing: 'border-box',
          overflow: 'hidden', // Add overflow:hidden to clip potential overflow
          transition: 'padding 0.3s ease-in-out, justify-content 0.3s ease-in-out',
        }}
      >
        <Link href="/provider/dashboard" passHref>
          {isCollapsed ? <Logo height={logoHeight} collapsed /> : <Logo height={logoHeight} />}
        </Link>
      </Box>

      {/* Navigation List */}
      <List component="nav" sx={{ 
          flexGrow: 1, 
          px: isCollapsed ? 0.5 : 2,
          overflowY: 'auto', 
          overflowX: 'hidden',
          transition: 'padding 0.3s ease-in-out',
          '& .MuiListItemIcon-root': {
            minWidth: 'auto',
            justifyContent: 'center',
          },
        }}>
        {providerMenuItems.map((item) => (
          <NavItem
            key={item.title}
            item={item}
            onNavigate={handleNavigation}
            isNavigating={isNavigating}
            currentNavPath={currentNavPath}
            isCollapsed={isCollapsed}
           />
        ))}
      </List>

      <Divider />

      <List component="nav" sx={{ 
          px: isCollapsed ? 0.5 : 2,
          transition: 'padding 0.3s ease-in-out',
          '& .MuiListItemIcon-root': {
            minWidth: 'auto',
            justifyContent: 'center',
          },
        }}>
        {/* Settings Link */}
        <ListItemButton onClick={() => handleNavigation('/provider/settings')} sx={{ pl: isCollapsed ? 1.5 : 2.5, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <ListItemIcon sx={{ minWidth: isCollapsed? 'auto' : 40, justifyContent: 'center' }}>
            <SettingsIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Settings" primaryTypographyProps={{ whiteSpace: 'nowrap' }} />}
        </ListItemButton>

        {/* Availability Link */}
        <ListItemButton onClick={() => handleNavigation('/provider/availability')} sx={{ pl: isCollapsed ? 1.5 : 2.5, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <ListItemIcon sx={{ minWidth: isCollapsed? 'auto' : 40, justifyContent: 'center' }}>
            <EventAvailableIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Manage Availability" primaryTypographyProps={{ whiteSpace: 'nowrap' }} />}
        </ListItemButton>
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