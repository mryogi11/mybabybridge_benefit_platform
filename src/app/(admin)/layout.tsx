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
  Group as GroupIcon, // Added for Providers
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
// Link component is not directly used in the provided final version of dropdown, but kept for general use
// import Link from 'next/link'; 
import BusinessIcon from '@mui/icons-material/Business';
import Logo from '@/components/Logo';
import { usePageLoading } from '@/contexts/LoadingContext';
import { createActivityLog } from '@/lib/actions/loggingActions';

const drawerWidth = 240;
const COLLAPSED_DRAWER_WIDTH = 88;

// adminNavItems still includes a "Settings" main navigation item
const adminNavItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { text: 'Analytics', icon: <BarChartIcon />, path: '/admin/analytics' },
  { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
  { text: 'Organizations', icon: <BusinessIcon />, path: '/admin/organizations' },
  { text: 'Providers', icon: <GroupIcon />, path: '/admin/providers' }, // Added Providers link
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
      // Add activity log after successful logout
      if (user) {
        await createActivityLog({
          userId: user.id,
          userEmail: user.email,
          actionType: 'USER_LOGOUT',
          status: 'SUCCESS',
          description: 'User logged out via AdminLayout.'
        });
      }
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
        <Box 
          onClick={() => handleNavigation('/admin')} 
          sx={{ 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            pl: !(isCollapsedMode && isDesktop) ? 1.5 : 0 // ADJUSTED to 1.5 for expanded
          }}
        >
          <Logo height={logoHeight} collapsed={isCollapsedMode && isDesktop} />
        </Box>
      </Toolbar>
      <List sx={{
        py: 1,
        px: 0,
        flexGrow: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        '& .MuiListItemIcon-root': {
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
              sx={{
                borderRadius: theme.shape.borderRadius,
                py: 1,
                px: 3.5,
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
                  backgroundColor: theme.palette.primary.main, 
                  color: theme.palette.primary.contrastText, 
                  fontWeight: 'fontWeightMedium', 
                  borderRadius: '0 22px 22px 0',
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.contrastText, 
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                },
                '& .MuiListItemText-primary': {
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                },
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              {!(isCollapsedMode && isDesktop) && <ListItemText primary={item.text} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${currentEffectiveDrawerWidth}px)` },
          ml: { sm: `${currentEffectiveDrawerWidth}px` },
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary, 
          border: 'none',
          boxShadow: 'none',
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
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            onClick={handleMenuOpen}
            sx={{ p: 0 }}
          >
            <Avatar alt={user?.email || 'Admin'} sx={{ width: 32, height: 32 }}>
              {user?.email ? user.email[0].toUpperCase() : <AccountCircle />}
            </Avatar>
          </IconButton>
          <Menu
            sx={{ mt: '45px' }}
            id="menu-appbar-admin"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            MenuListProps={{
              'aria-labelledby': 'user-menu-button',
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ my: 1.5, px: 2.5 }}>
              <Typography variant="subtitle2" noWrap>
                {user?.user_metadata?.first_name || user?.email?.split('@')[0]} {user?.user_metadata?.last_name || ''}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                {user?.email}
              </Typography>
            </Box>
            <Divider sx={{ borderStyle: 'dashed' }} />
            <MenuItem onClick={() => handleNavigation('/admin/settings')}>
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}><AccountCircle fontSize="small" /></ListItemIcon>
              <Typography variant="body2">Profile Settings</Typography>
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
        <Drawer
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
            },
          }}
        >
          {drawerContent(false)} 
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: currentEffectiveDrawerWidth, 
                overflowX: 'hidden', 
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
          p: 4.5,
          width: { sm: `calc(100% - ${currentEffectiveDrawerWidth}px)` },
          mt: { xs: '56px', sm: '64px' },
          position: 'relative',
          backgroundColor: theme.palette.background.default,
          overflowX: 'hidden',
          transition: theme.transitions.create(['width', 'padding'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {children}
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
      </Box>
    </Box>
  );
}