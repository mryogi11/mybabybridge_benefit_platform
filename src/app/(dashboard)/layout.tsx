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

const patientNavItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Appointments', icon: <CalendarIcon />, path: '/dashboard/appointments' },
  { text: 'Benefits', icon: <BenefitsIcon />, path: '/dashboard/benefits' }, // Separate Benefits
  { text: 'Packages', icon: <CardGiftcardIcon />, path: '/dashboard/packages' }, // Separate Packages
  { text: 'Messages', icon: <MessageIcon />, path: '/dashboard/communication' }, // Updated path
  { text: 'Documents', icon: <DocumentsIcon />, path: '/dashboard/documents' },
  { text: 'Education', icon: <EducationIcon />, path: '/dashboard/education' },
  { text: 'Payments', icon: <PaymentIcon />, path: '/dashboard/payments' },
  { text: 'Profile', icon: <ProfileIcon />, path: '/dashboard/profile' },
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
  const { isLoadingPage } = usePageLoading(); // <-- ADD THIS LINE TO GET THE STATE
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasManuallyCheckedCookie, setHasManuallyCheckedCookie] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null); // Renamed from anchorEl for clarity
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Added logout loading state

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

  const drawer = (
    <div>
      {/* Apply theme colors, center content, ensure height, add Logo */}
       <Toolbar sx={{ 
         minHeight: { xs: 56, sm: 64 }, 
         display: 'flex', 
         alignItems: 'center', 
         justifyContent: 'center',
         backgroundColor: theme.palette.primary.main, // Add theme background
         color: theme.palette.primary.contrastText, // Add theme text color
        }}>
         {/* Remove Typography, Add Logo */}
         <Link href="/dashboard" passHref>
            <Logo height={logoHeight} />
         </Link>
       </Toolbar>
      {/* <Divider /> // Temporarily comment out Divider */}
      <List sx={{ p: 1 }}>
        {patientNavItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              href={item.path}
              selected={pathname === item.path}
              sx={{
                borderRadius: theme.shape.borderRadius,
                py: 1,
                px: 1.5,
                color: theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.04), // Lighter hover
                },
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08), // Lighter selected
                  color: theme.palette.primary.main,
                  fontWeight: 'fontWeightMedium', // Medium weight
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.12), // Lighter selected hover
                  },
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.main,
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: 'fontWeightMedium', // Medium weight
                  },
                },
                '& .MuiListItemIcon-root': {
                  color: theme.palette.text.secondary,
                  minWidth: 'auto',
                  marginRight: theme.spacing(1.5),
                },
                '& .MuiListItemText-primary': {
                  fontSize: '0.875rem',
                },
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
       {/* Optional: Add Settings/Logout directly in the drawer */}
      {/* <Divider sx={{ mt: 'auto' }} />
       <List sx={{ p: 1 }}>
         <ListItem disablePadding sx={{ mb: 0.5 }}>
           <ListItemButton component={Link} href="/dashboard/settings" selected={pathname === '/dashboard/settings'} sx={listItemSx}>
             <ListItemIcon sx={iconSx}><SettingsIcon /></ListItemIcon>
             <ListItemText primary="Settings" />
           </ListItemButton>
         </ListItem>
         <ListItem disablePadding>
           <ListItemButton onClick={handleLogout} sx={listItemSx}>
             <ListItemIcon sx={iconSx}><LogoutIcon /></ListItemIcon>
             <ListItemText primary="Logout" />
           </ListItemButton>
         </ListItem>
       </List> */}
    </div>
  );
  // --- End: New Side Drawer Logic ---

  // --- Start: New Layout Structure ---
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0} // Add elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          // Relying on global MuiAppBar override for colors. Add border.
           borderBottom: `1px solid ${alpha(theme.palette.primary.contrastText || '#fff', 0.12)}`,
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
            anchorEl={anchorElUser}
            open={Boolean(anchorElUser)}
            onClose={handleUserMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
                paper: {
                    sx: {
                        mt: 1.5,
                        borderRadius: '4px',
                        boxShadow: theme.shadows[3], // Use theme shadow
                        minWidth: 180,
                    },
                },
            }}
          >
            <MenuItem component={Link} href="/dashboard/profile" onClick={handleUserMenuClose} sx={{ py: 1, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}>
                <ProfileIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Profile</Typography>
            </MenuItem>
            <MenuItem component={Link} href="/dashboard/settings" onClick={handleUserMenuClose} sx={{ py: 1, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Settings</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ py: 1, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders" // Added aria-label
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
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
                width: drawerWidth, 
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
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: '56px', sm: '64px' }, 
          position: 'relative', // <-- ENSURE THIS IS PRESENT OR ADD IT
          backgroundColor: theme.palette.background.default, 
          overflowX: 'hidden', 
        }}
      >
        {/* Remove the Toolbar spacer here as mt handles the space */}
        {/* <Toolbar /> */}
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