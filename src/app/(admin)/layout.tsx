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
  Backdrop,
  CircularProgress,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  Settings as SettingsIcon, // Keep for adminNavItems if needed elsewhere
  Logout as LogoutIcon,
  AccountCircle, // Used for profile icon in dropdown
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
// Link component is not directly used in the provided final version of dropdown, but kept for general use
// import Link from 'next/link'; 
import BusinessIcon from '@mui/icons-material/Business';
import Logo from '@/components/Logo';
import { usePageLoading } from '@/contexts/LoadingContext';

const drawerWidth = 240;
const COLLAPSED_DRAWER_WIDTH = 88;

// adminNavItems still includes a "Settings" main navigation item
const adminNavItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
  { text: 'Organizations', icon: <BusinessIcon />, path: '/admin/organizations' },
  { text: 'Packages', icon: <ShoppingCartIcon />, path: '/admin/packages' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' }, // Main page for settings
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));
  const { user, signOut } = useAuth(); // 'profile' is not directly from useAuth here
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const { isLoadingPage, setIsLoadingPage } = usePageLoading();

  const logoHeight = isMobile ? 46 : 48;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapseToggle = () => {
    if (isDesktop) {
      setIsDrawerCollapsed(!isDrawerCollapsed);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    // Optionally, set a global loading state for logout if desired
    // setIsLoadingPage(true); 
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      // setIsLoadingPage(false); // Reset if global loader was used
    }
  };

  const handleNavigation = (path: string) => {
    if (pathname !== path) {
      setIsLoadingPage(true);
      router.push(path);
    }
    if (isMobile && mobileOpen) { // Close mobile drawer on navigation
      handleDrawerToggle();
    }
     // Close user menu if navigation is triggered from there
    if (anchorEl) {
        handleMenuClose();
    }
  };

  const currentEffectiveDrawerWidth = isDesktop && isDrawerCollapsed ? COLLAPSED_DRAWER_WIDTH : drawerWidth;

  const drawerContent = (isCollapsedMode: boolean) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Toolbar
        sx={{
          minHeight: { xs: 56, sm: 64 },
          backgroundColor: theme.palette.primary.main, // Ensure primary is used
          color: theme.palette.primary.contrastText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsedMode && isDesktop ? 'center' : 'flex-start', // Match patient
          px: isCollapsedMode && isDesktop ? 0 : 2, // Match patient px for logo
          transition: theme.transitions.create(['padding', 'justify-content'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Use handleNavigation for logo click for consistency */}
        <Box onClick={() => handleNavigation('/admin')} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Logo height={logoHeight} collapsed={isCollapsedMode && isDesktop} />
        </Box>
      </Toolbar>
      <List sx={{
        p: 1, // Match patient
        flexGrow: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        // Removed transition for padding from List to match patient
        '& .MuiListItemIcon-root': { // Copied from patient for consistency
          color: theme.palette.text.secondary,
          minWidth: 'auto',
          marginRight: isCollapsedMode && isDesktop ? 0 : theme.spacing(1.5),
          justifyContent: 'center',
          transition: theme.transitions.create(['margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}>
        {adminNavItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{ // Styles from patient dashboard for consistency
                borderRadius: theme.shape.borderRadius,
                py: 1,
                px: 1.5,
                justifyContent: isCollapsedMode && isDesktop ? 'center' : 'flex-start',
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
                  '& .MuiListItemIcon-root': { // Ensure selected icon color matches text
                    color: theme.palette.primary.main,
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: 'fontWeightMedium',
                  },
                },
                // GeneralListItemIcon styles moved to parent List sx for non-selected items
                '& .MuiListItemText-primary': {
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap', // Keep text on one line
                },
              }}
            >
              <ListItemIcon> {/* Specific icon styling handled by parent List sx and .Mui-selected */}
                {item.icon}
              </ListItemIcon>
              {!(isCollapsedMode && isDesktop) && <ListItemText primary={item.text} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {isDesktop && ( // Collapse button for desktop
        <Box
          sx={{
            p: isDrawerCollapsed ? 1 : 2,
            mt: 'auto',
            display: 'flex',
            justifyContent: isDrawerCollapsed ? 'center' : 'flex-end',
            borderTop: `1px solid ${theme.palette.divider}`, // Match patient
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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}> {/* Added minHeight to match patient */}
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${currentEffectiveDrawerWidth}px)` },
          ml: { sm: `${currentEffectiveDrawerWidth}px` },
          borderBottom: `1px solid ${alpha(theme.palette.primary.contrastText || '#fff', 0.12)}`,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
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
            {adminNavItems.find(item => item.path === pathname)?.text || 'Admin Dashboard'}
          </Typography>
          <IconButton
            onClick={handleMenuOpen}
            sx={{ p: 0 }}
          >
            <Avatar alt={user?.email || 'Admin'} sx={{ width: 32, height: 32 }}> {/* Use user email for alt */}
              {user?.email ? user.email[0].toUpperCase() : <AccountCircle />}
            </Avatar>
          </IconButton>
          <Menu
            sx={{ mt: '45px' }} // Match Provider/Patient positioning
            id="menu-appbar-admin" // Consistent ID
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            MenuListProps={{ // Use MenuListProps like other layouts
              'aria-labelledby': 'user-menu-button',
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            // Optional: Add slotProps for paper if specific styling is needed, else rely on theme
            // slotProps={{ paper: { sx: { mt: 1.5, borderRadius: '4px', boxShadow: theme.shadows[3], minWidth: 180 }}}}
          >
            {/* User Info Box */}
            <Box sx={{ my: 1.5, px: 2.5 }}>
              <Typography variant="subtitle2" noWrap>
                {user?.user_metadata?.first_name || user?.email?.split('@')[0]} {user?.user_metadata?.last_name || ''}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                {user?.email}
              </Typography>
            </Box>
            <Divider sx={{ borderStyle: 'dashed' }} />
            {/* Admin Profile link - pointing to /admin/settings */}
            <MenuItem onClick={() => handleNavigation('/admin/settings')}>
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}><AccountCircle fontSize="small" /></ListItemIcon>
              <Typography variant="body2">Profile Settings</Typography>
            </MenuItem>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <MenuItem onClick={handleLogout} sx={{ py: 1, px: 2, color: 'error.main' }}> {/* Matched patient/provider sx */}
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: 'error.main' }}><LogoutIcon fontSize="small" /></ListItemIcon>
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ 
          width: { sm: currentEffectiveDrawerWidth }, 
          flexShrink: { sm: 0 }, 
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
        aria-label="mailbox folders"
      >
        <Drawer // Mobile Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth, 
                // borderRight: 'none' // Keep or remove based on desired theme
            },
          }}
        >
          {drawerContent(false)} 
        </Drawer>
        <Drawer // Desktop Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: currentEffectiveDrawerWidth, 
                overflowX: 'hidden', 
                // borderRight: 'none', // Keep or remove based on desired theme
                transition: theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                }),
            },
          }}
          open 
        >
          {drawerContent(isDrawerCollapsed)}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${currentEffectiveDrawerWidth}px)` },
          mt: { xs: '56px', sm: '64px' }, // Match patient
          position: 'relative', // Match patient
          backgroundColor: theme.palette.background.default, // Match patient
          overflowX: 'hidden', // Match patient
          transition: theme.transitions.create(['width', 'padding'], { // Match patient (added padding)
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} /> Removed to match patient (mt handles spacing) */}
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
    </Box>
  );
}