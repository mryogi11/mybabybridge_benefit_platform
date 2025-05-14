'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Badge,
  alpha,
  Backdrop,
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { AccountCircle, Logout, Settings } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import ProviderSideDrawerContent from './ProviderSideDrawerContent'; // Import the PROVIDER drawer content
import { usePageLoading } from '@/contexts/LoadingContext'; // Added import
import { createActivityLog } from '@/lib/actions/loggingActions'; // Corrected import path

const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 88; // Standard for icon-only navigation

export default function ProviderMainLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false); // New state for collapse
  const appBarToolbarRef = useRef<HTMLDivElement>(null); // Ref for AppBar Toolbar

  // User Menu State & Handlers
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState<null | HTMLElement>(null);
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Added usePathname hook
  const { isLoadingPage, setIsLoadingPage } = usePageLoading(); // Added page loading context

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorElUser(event.currentTarget);
  const handleCloseUserMenu = () => setAnchorElUser(null);
  const handleOpenNotificationsMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorElNotifications(event.currentTarget);
  const handleCloseNotificationsMenu = () => setAnchorElNotifications(null);

  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen(!mobileOpen);
    }
  };

  const handleDrawerClose = () => {
    setIsClosing(true);
    setMobileOpen(false);
  };

  const handleDrawerTransitionEnd = () => {
    setIsClosing(false);
  };

  const handleCollapseToggle = () => { // New handler for collapse
    setIsDrawerCollapsed(!isDrawerCollapsed);
  };

  const handleLogout = async () => {
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
          description: 'User logged out via ProviderMainLayout.'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleCloseUserMenu();
  };

  const handleNavigate = (path: string) => {
    if (pathname !== path) { // Used pathname from usePathname hook
        setIsLoadingPage(true);
    }
    router.push(path);
    handleCloseUserMenu();
  };

  useEffect(() => {
    if (appBarToolbarRef.current) {
      console.log('[ProviderMainLayout] AppBar Toolbar ClientHeight:', appBarToolbarRef.current.clientHeight);
      console.log('[ProviderMainLayout] AppBar Toolbar OffsetHeight:', appBarToolbarRef.current.offsetHeight);
    }
  }, []); // Log once on mount

  const currentDrawerWidth = isMdUp && isDrawerCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', transition: 'all 0.3s ease-in-out' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { md: `${currentDrawerWidth}px` },
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
          border: 'none',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }} ref={appBarToolbarRef}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} /> {/* Spacer */}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Notifications */}
            <Tooltip title="Notifications">
               <IconButton color="inherit" onClick={handleOpenNotificationsMenu}>
                   <Badge badgeContent={1} color="error"> {/* Example */}
                       <NotificationsIcon />
                   </Badge>
               </IconButton>
            </Tooltip>
            <Menu
                id="menu-notifications-provider"
                anchorEl={anchorElNotifications}
                open={Boolean(anchorElNotifications)}
                onClose={handleCloseNotificationsMenu}
            >
                <MenuItem onClick={handleCloseNotificationsMenu}>Provider Notification 1</MenuItem>
            </Menu>

            {/* User Avatar & Menu */}
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                 {/* TODO: Replace with dynamic avatar source if available */}
                <Avatar alt={profile?.first_name || user?.email} src="/static/images/avatar/provider.jpg" />
              </IconButton>
            </Tooltip>
            {/* Use theme override for Menu styling, remove local PaperProps */}
            <Menu
              sx={{ mt: '45px' }} // Keep positional sx prop
              id="menu-appbar-provider"
              anchorEl={anchorElUser}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
               // Removed PaperProps relying on theme override
            >
              {/* MenuItems should inherit styles from theme */}
              <Box sx={{ my: 1.5, px: 2.5 }}>
                <Typography variant="subtitle2" noWrap>
                  {profile?.first_name} {profile?.last_name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                  {user?.email}
                </Typography>
              </Box>
              <Divider sx={{ borderStyle: 'dashed' }} />
              {/* Link to provider-specific paths */}
              <MenuItem onClick={() => handleNavigate('/provider/profile')}>
                <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>
                Profile
              </MenuItem>
              <Divider sx={{ borderStyle: 'dashed' }} />
               {/* Keep local sx for error color as it's specific */}
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                 <ListItemIcon sx={{ color: 'error.main' }}><Logout fontSize="small" /></ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: currentDrawerWidth }, flexShrink: { md: 0 }, transition: 'width 0.3s ease-in-out' }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
                borderRight: `1px dashed ${theme.palette.divider}`,
                transition: theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
             },
          }}
        >
          <ProviderSideDrawerContent 
            isCollapsed={false}
            onToggleCollapse={() => {}}
            setIsLoadingPage={setIsLoadingPage}
          /> 
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: currentDrawerWidth,
                overflowX: 'hidden',
                borderRight: `1px dashed ${theme.palette.divider}`,
                transition: theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
            },
          }}
          open
        >
          <ProviderSideDrawerContent 
            isCollapsed={isDrawerCollapsed}
            onToggleCollapse={handleCollapseToggle}
            setIsLoadingPage={setIsLoadingPage}
          /> 
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 4.5,
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          marginLeft: { md: `${currentDrawerWidth}px` },
          marginTop: { xs: '56px', sm: '64px' },
          backgroundColor: theme.palette.background.default,
          overflow: 'auto',
          transition: theme.transitions.create(['margin', 'width', 'padding'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Removed Toolbar spacer */}
        {children}
        {/* PAGE LOADER START */}
        <Backdrop
          sx={{
            position: 'absolute', // Position relative to the parent Box
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            color: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.grey[700],
            backgroundColor: (theme) => alpha(theme.palette.background.default, 0.3),
            backdropFilter: 'blur(3px)',
            zIndex: (theme) => theme.zIndex.drawer + 10, // Ensure it's above content but below modals if any
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