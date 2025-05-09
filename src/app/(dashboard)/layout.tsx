'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Container, 
  CircularProgress, 
  Button, // Keep for potential future use or if needed by auth checks
  useTheme,
  alpha,
  Tooltip,
  Backdrop,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  CardGiftcard as BenefitsIcon, // Using CardGiftcard for Benefits/Packages
  AccountCircle as ProfileIcon,
  Chat as MessageIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon, // Keep for notifications if needed
  Payment as PaymentIcon,             // Added
  Folder as DocumentsIcon,            // Added
  School as EducationIcon,            // Added
  Feedback as FeedbackIcon,           // Added
  CardGiftcard as CardGiftcardIcon, // Added for Packages specifically
  ChevronLeft as ChevronLeftIcon, // For collapse button
  ChevronRight as ChevronRightIcon, // For collapse button
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client'; // Keep for auth checks
import { usePageLoading } from '@/contexts/LoadingContext'; // <-- ADD THIS IMPORT
import Logo from '@/components/Logo'; // Import Logo

// Helper function to check if the loggedIn cookie exists
const hasLoggedInCookie = () => {
  if (typeof window === 'undefined') return false;
  return document.cookie.split(';').some(item => item.trim().startsWith('loggedIn='));
};

// Force set the loggedIn cookie
const setLoggedInCookie = () => {
  if (typeof window === 'undefined') return;
  document.cookie = 'loggedIn=true; path=/;';
};

const drawerWidth = 240;
const COLLAPSED_DRAWER_WIDTH = 88; // Standard for icon-only navigation

const patientNavItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Appointments', icon: <CalendarIcon />, path: '/dashboard/appointments' },
  { text: 'Benefits', icon: <BenefitsIcon />, path: '/dashboard/benefits' }, // Separate Benefits
  { text: 'Packages', icon: <CardGiftcardIcon />, path: '/dashboard/packages' }, // Separate Packages
  { text: 'Messages', icon: <MessageIcon />, path: '/dashboard/communication' }, // Updated path
  { text: 'Documents', icon: <DocumentsIcon />, path: '/dashboard/documents' },
  { text: 'Education', icon: <EducationIcon />, path: '/dashboard/education' },
  { text: 'Payments', icon: <PaymentIcon />, path: '/dashboard/payments' },
  // { text: 'Profile', icon: <ProfileIcon />, path: '/dashboard/profile' }, // This line is commented out
  { text: 'Settings', icon: <SettingsIcon />, path: '/dashboard/settings' },
  { text: 'Feedback', icon: <FeedbackIcon />, path: '/dashboard/feedback' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, signOut, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // Add breakpoint check
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm')); // For desktop-specific collapse behavior
  const { isLoadingPage } = usePageLoading(); // <-- ADD THIS LINE TO GET THE STATE
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasManuallyCheckedCookie, setHasManuallyCheckedCookie] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null); // Renamed from anchorEl for clarity
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Added logout loading state
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false); // State for drawer collapse

  const logoHeight = isMobile ? 46 : 48; // Calculate logo height

  // --- Start: Existing Auth Check Logic ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLoggedInCookie();
      console.log('Dashboard layout - Force set loggedIn cookie');
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      console.log('Dashboard layout - Checking authentication');
      try {
        if (typeof window !== 'undefined') {
          const hasLoginCookie = hasLoggedInCookie();
          console.log('Dashboard layout - Login cookie exists:', hasLoginCookie);
          if (hasLoginCookie) {
            console.log('Dashboard layout - Login cookie found, allowing access');
            setHasManuallyCheckedCookie(true);
            setIsCheckingAuth(false);
            return;
          }
          const hasAccessToken = localStorage.getItem('sb-access-token');
          if (hasAccessToken) {
            console.log('Dashboard layout - Access token found in localStorage');
            setLoggedInCookie();
            setHasManuallyCheckedCookie(true);
            setIsCheckingAuth(false);
            return;
          }
        }
        const { data } = await supabase.auth.getSession();
        console.log('Dashboard layout - Session check result:', !!data.session);
        if (data.session) {
          if (typeof window !== 'undefined') {
            setLoggedInCookie();
            console.log('Dashboard layout - Set loggedIn cookie based on session');
          }
          setIsCheckingAuth(false);
          return;
        }
        console.log('Dashboard layout - No authentication found, redirecting to login');
        router.push('/login');
      } catch (error) {
        console.error('Dashboard layout - Error checking auth:', error);
        // Consider redirecting on error as well
        // router.push('/login'); 
         setIsCheckingAuth(false); // Ensure loading stops on error
      }
    }
    checkAuth();
  }, [router]);

  if (isLoading || isCheckingAuth) {
    return (
      <Container>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 4 }}>
            Verifying your authentication...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!user && !hasManuallyCheckedCookie) {
     // Maybe show a message or redirect directly from here
     // router.push('/login'); // Consider redirecting immediately
    return (
      <Container>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 4 }}>
            Redirecting to login...
          </Typography>
        </Box>
      </Container>
    );
  }
  // --- End: Existing Auth Check Logic ---


  // --- Start: New Side Drawer Logic ---
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapseToggle = () => {
    if (isDesktop) { // Collapse only on desktop
      setIsDrawerCollapsed(!isDrawerCollapsed);
    }
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorElUser(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    setIsLoggingOut(true); // Set loading state TRUE immediately
    try {
      console.log("handleLogout: Attempting signOut...");
      await signOut();
      console.log("handleLogout: signOut complete.");
      // Clear the manual cookie check on logout (optional, but good practice)
      if (typeof window !== 'undefined') {
        document.cookie = 'loggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      // Redirect AFTER signOut completes
      router.push('/login'); 
    } catch (error) {
      console.error('Error logging out:', error);
      // Optionally redirect even if signout fails, or show an error
      router.push('/login'); 
    } 
    // Note: We don't set isLoggingOut back to false as we are navigating away.
  };

  const effectiveDrawerWidth = isDesktop && isDrawerCollapsed ? COLLAPSED_DRAWER_WIDTH : drawerWidth;

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Apply theme colors, center content, ensure height, add Logo */}
       <Toolbar sx={{ 
         minHeight: { xs: 56, sm: 64 }, 
         display: 'flex', 
         alignItems: 'center', 
         // Adjust justifyContent and padding for collapsed state on desktop
         justifyContent: isDesktop && isDrawerCollapsed ? 'center' : 'flex-start',
         px: isDesktop && isDrawerCollapsed ? 0 : 2, 
         backgroundColor: theme.palette.primary.main, 
         color: theme.palette.primary.contrastText,
         transition: theme.transitions.create(['justify-content', 'padding'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
         }),
        }}>
         <Link href="/dashboard" passHref>
            <Logo height={logoHeight} collapsed={isDesktop && isDrawerCollapsed} />
         </Link>
       </Toolbar>
      <List sx={{ p: 1, flexGrow: 1, overflowY: 'auto' }}>
        {patientNavItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              href={item.path}
              selected={pathname === item.path}
              sx={{
                borderRadius: theme.shape.borderRadius,
                py: 1,
                px: isDesktop && isDrawerCollapsed ? 1.5 : 1.5, // Adjust padding if needed for collapsed
                justifyContent: isDesktop && isDrawerCollapsed ? 'center' : 'flex-start',
                color: theme.palette.text.secondary,
                transition: theme.transitions.create(['padding', 'justify-content'], {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                }),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.04), 
                },
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08), 
                  color: theme.palette.primary.main,
                  fontWeight: 'fontWeightMedium', 
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.12), 
                  },
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.main,
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: 'fontWeightMedium', 
                  },
                },
                '& .MuiListItemIcon-root': {
                  color: theme.palette.text.secondary,
                  minWidth: 'auto',
                  marginRight: isDesktop && isDrawerCollapsed ? 0 : theme.spacing(1.5),
                  justifyContent: 'center',
                  transition: theme.transitions.create(['margin'], {
                      easing: theme.transitions.easing.sharp,
                      duration: theme.transitions.duration.enteringScreen,
                  }),
                },
                '& .MuiListItemText-primary': {
                  fontSize: '0.875rem',
                },
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              {/* Hide text when collapsed on desktop */}
              {(!isDrawerCollapsed || !isDesktop) && <ListItemText primary={item.text} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {/* Collapse Toggle Button - Only on Desktop */}
      {isDesktop && (
        <Box
          sx={{
            p: isDrawerCollapsed ? 1 : 2,
            mt: 'auto',
            display: 'flex',
            justifyContent: isDrawerCollapsed ? 'center' : 'flex-end',
            borderTop: `1px solid ${theme.palette.divider}`,
            transition: theme.transitions.create(['padding', 'justify-content'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
          }}
        >
          <IconButton onClick={handleCollapseToggle} size="small">
            {isDrawerCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Box>
      )}
    </Box>
  );
  // --- End: New Side Drawer Logic ---

  // --- Start: New Layout Structure ---
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0} 
        sx={{
          // Adjust width and ml for collapsed state on desktop
          width: { sm: `calc(100% - ${effectiveDrawerWidth}px)` },
          ml: { sm: `${effectiveDrawerWidth}px` },
           borderBottom: `1px solid ${alpha(theme.palette.primary.contrastText || '#fff', 0.12)}`,
           transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
           }),
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, justifyContent: 'space-between' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {/* Dynamically set title based on route? */}
             {patientNavItems.find(item => item.path === pathname)?.text || 'Dashboard'}
          </Typography>
          {/* Notifications Icon Button - Added */}
          <Tooltip title="Notifications">
            <IconButton
                color="inherit"
                sx={{ mr: 1.5 }} // Added margin to separate from profile icon
                component={Link} // Link to notifications page
                href="/dashboard/notifications"
            >
                 {/* Optional: Add Badge later for count */}
                 {/* <Badge badgeContent={4} color="error"> */}
                     <NotificationsIcon />
                 {/* </Badge> */}
            </IconButton>
          </Tooltip>
          {/* End Notifications Icon Button */}
          <Tooltip title="Account settings">
            <IconButton
              onClick={handleUserMenuOpen}
              sx={{ p: 0 }}
              size="small"
            >
              <Avatar alt={user?.email || 'Patient'} sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                {user?.email ? user.email[0].toUpperCase() : <ProfileIcon fontSize="small" />}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            sx={{ mt: '45px' }} // Match Provider positioning
            id="menu-appbar-patient" // Add an ID
            anchorEl={anchorElUser}
            open={Boolean(anchorElUser)}
            onClose={handleUserMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            // Keep slotProps for now, can be removed if global theme handles Paper styling adequately
            slotProps={{
                paper: {
                    sx: {
                        mt: 1.5, // This mt might conflict with sx={{ mt: '45px' }} on Menu. Let's keep outer one.
                        borderRadius: '4px',
                        boxShadow: theme.shadows[3], 
                        minWidth: 180,
                    },
                },
            }}
          >
            {/* User Info Box */}
            <Box sx={{ my: 1.5, px: 2.5 }}>
              <Typography variant="subtitle2" noWrap>
                {profile?.first_name || user?.email?.split('@')[0]} {profile?.last_name || ''}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                {user?.email}
              </Typography>
            </Box>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <MenuItem component={Link} href="/dashboard/profile" onClick={handleUserMenuClose} sx={{ py: 1, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}><ProfileIcon fontSize="small" /></ListItemIcon>
              <Typography variant="body2">Profile</Typography>
            </MenuItem>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <MenuItem onClick={handleLogout} sx={{ py: 1, px: 2, color: 'error.main' }}>
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: 'error.main' }}><LogoutIcon fontSize="small" /></ListItemIcon>
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        // Adjust width for collapsed state on desktop
        sx={{ width: { sm: effectiveDrawerWidth }, flexShrink: { sm: 0 },
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
        }}
        aria-label="mailbox folders" 
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, 
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: effectiveDrawerWidth, // Use effectiveDrawerWidth
                overflowX: 'hidden', // Prevent horizontal scroll when collapsing
                transition: theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                }),
             }, 
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 }, 
          // Adjust width for collapsed state on desktop
          width: { sm: `calc(100% - ${effectiveDrawerWidth}px)` },
          mt: { xs: '56px', sm: '64px' }, 
          position: 'relative', 
          backgroundColor: theme.palette.background.default, 
          overflowX: 'hidden', 
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Remove the Toolbar spacer here as mt handles the space */}
        {children}
        {/* PAGE LOADER START */}
        <Backdrop
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            color: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.grey[700],
            backgroundColor: (theme) => alpha(theme.palette.background.default, 0.3),
            backdropFilter: 'blur(3px)',
            zIndex: (theme) => theme.zIndex.drawer + 10, 
          }}
          open={isLoadingPage}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
        {/* PAGE LOADER END */}
      </Box>

      {/* Logout Loading Overlay */} 
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} // Ensure it's above other elements
        open={isLoggingOut}
      >
        <CircularProgress color="inherit" sx={{ mr: 2 }}/>
        <Typography>Logging out...</Typography>
      </Backdrop>
    </Box>
  );
  // --- End: New Layout Structure ---
} 