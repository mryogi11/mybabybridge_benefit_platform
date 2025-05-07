'use client';

import React, { useState } from 'react';
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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { AccountCircle, Logout, Settings } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProviderSideDrawerContent from './ProviderSideDrawerContent'; // Import the PROVIDER drawer content

const DRAWER_WIDTH = 280;

export default function ProviderMainLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // User Menu State & Handlers
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState<null | HTMLElement>(null);
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

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

  const handleLogout = async () => {
      try {
      await signOut();
      router.push('/login');
      } catch (error) {
      console.error('Logout error:', error);
      }
      handleCloseUserMenu();
  };

  const handleNavigate = (path: string) => {
      router.push(path);
      handleCloseUserMenu();
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: alpha(theme.palette.background.default, 0.8),
          backdropFilter: 'blur(6px)',
          borderBottom: `1px dashed ${theme.palette.divider}`,
          color: theme.palette.text.primary,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
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
              <MenuItem onClick={() => handleNavigate('/provider/settings')}>
                 <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
                 Settings
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
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
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
                borderRight: `1px dashed ${theme.palette.divider}`
             },
          }}
        >
          <ProviderSideDrawerContent /> {/* Use Provider Content */}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
                borderRight: `1px dashed ${theme.palette.divider}`
            },
          }}
          open
        >
          <ProviderSideDrawerContent /> {/* Use Provider Content */}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Toolbar /> {/* Offset content below AppBar */}
        {children}
      </Box>
    </Box>
  );
}