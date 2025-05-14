'use client';

import React, { useState, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { AccountCircle, Logout, Settings, Brightness4 as Brightness4Icon, Brightness7 as Brightness7Icon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import SideDrawerContent from './SideDrawerContent'; // Import the drawer content
import { createActivityLog } from '@/lib/actions/loggingActions'; // Corrected import path
import { updateUserThemePreference } from '@/actions/userActions'; // Import action to update theme

const DRAWER_WIDTH = 260;
const COLLAPSED_DRAWER_WIDTH = 88; // Standard for icon-only navigation

export default function DashboardMainLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false); // New state for collapse

  // User Menu State & Handlers (Moved from Navigation.tsx)
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState<null | HTMLElement>(null);
  const { user, profile, signOut, fetchAndSetProfile } = useAuth(); // Added profile and fetchAndSetProfile
  const router = useRouter();
  const [isThemeToggling, setIsThemeToggling] = useState(false); // New state

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
          description: 'User logged out via DashboardMainLayout.'
        });
      }
      } catch (error) {
      console.error('Logout error:', error);
      }
      handleCloseUserMenu();
  };

  const handleNavigate = (path: string) => {
      router.push(path);
      handleCloseUserMenu(); // Close menu after navigation
  }

  const handleThemeToggle = async () => {
    if (!user?.id || !profile || isThemeToggling) { // Added isThemeToggling check
      console.warn("Theme toggle skipped in DashboardMainLayout: User/profile not available or toggle in progress.");
      return;
    }
    setIsThemeToggling(true);
    const currentMode = theme.palette.mode;
    const newThemeMode = currentMode === 'dark' ? 'light' : 'dark';

    try {
      const result = await updateUserThemePreference(newThemeMode as 'light' | 'dark' | 'system');
      if (result.success) {
        if (fetchAndSetProfile && user.id) {
          await fetchAndSetProfile(user.id);
          if (user.email) { // user.email from refreshed profile
            await createActivityLog({
              userId: user.id,
              userEmail: user.email,
              actionType: 'THEME_CHANGE',
              status: 'SUCCESS',
              description: `User changed theme to ${newThemeMode} (DashboardMainLayout).`
            });
          }
        }
      } else {
        console.error("Failed to update theme preference (DashboardMainLayout):", result.message);
        if (user.id && user.email) { // user.id and user.email from initial state
            await createActivityLog({
                userId: user.id,
                userEmail: user.email,
                actionType: 'THEME_CHANGE_FAILED',
                status: 'FAILURE', // Already corrected
                description: `Failed to change theme to ${newThemeMode} (DashboardMainLayout). Error: ${result.message}`
            });
        }
      }
    } catch (error) {
      console.error("Error toggling theme (DashboardMainLayout):", error);
      if (user.id && user.email) { // user.id and user.email from initial state
        await createActivityLog({
            userId: user.id,
            userEmail: user.email,
            actionType: 'THEME_CHANGE_ERROR',
            status: 'FAILURE', // Already corrected
            description: `Error toggling theme to ${newThemeMode} (DashboardMainLayout). Details: ${(error as Error).message}`
          });
      }
    } finally {
        setIsThemeToggling(false);
    }
  };

  const currentDrawerWidth = isMdUp && isDrawerCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', transition: 'all 0.3s ease-in-out' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { md: `${currentDrawerWidth}px` },
          backgroundColor: theme.palette.background.default,
          boxShadow: theme.shadows[2],
          color: theme.palette.text.primary,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }} // Only show on mobile
          >
            <MenuIcon />
          </IconButton>

          {/* Spacer to push icons to the right */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Right-side Icons (Notifications, User) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Theme Toggle Button - NEW */}
            <Tooltip title={`Switch to ${theme.palette.mode === 'dark' ? 'light' : 'dark'} mode`}>
              <span>
                <IconButton
                  onClick={handleThemeToggle}
                  color="inherit"
                  aria-label="toggle theme"
                  disabled={isThemeToggling} // Disable button
                >
                  {isThemeToggling ? <CircularProgress size={24} color="inherit" /> : (theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />)}
                </IconButton>
              </span>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
               <IconButton color="inherit" onClick={handleOpenNotificationsMenu}>
                   <Badge badgeContent={4} color="error"> {/* Example badge */}
                       <NotificationsIcon />
                   </Badge>
               </IconButton>
            </Tooltip>
            <Menu
                id="menu-notifications"
                anchorEl={anchorElNotifications}
                open={Boolean(anchorElNotifications)}
                onClose={handleCloseNotificationsMenu}
                // Add styling similar to user menu if needed
            >
                {/* Replace with actual notifications */}
                <MenuItem onClick={handleCloseNotificationsMenu}>Notification 1</MenuItem>
                <MenuItem onClick={handleCloseNotificationsMenu}>Notification 2</MenuItem>
            </Menu>


            {/* User Avatar & Menu */}
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                {profile?.avatar_filename ? (
                  <Avatar 
                    alt={profile.first_name || user?.email || 'User'}
                    src={`/images/avatar/${profile.avatar_filename}`}
                  />
                ) : (
                  <Avatar 
                    alt={profile?.first_name || user?.email || 'User'}
                    // Fallback to initials or a default icon if no avatar_filename
                  >
                    {(profile?.first_name || user?.email) 
                      ? ( (profile?.first_name || user?.email || '')?.[0] || '' ).toUpperCase() 
                      : <AccountCircle />}
                  </Avatar>
                )}
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar-user"
              anchorEl={anchorElUser}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <Box sx={{ my: 1.5, px: 2.5 }}>
                <Typography variant="subtitle2" noWrap>
                  {profile?.first_name} {profile?.last_name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                  {user?.email}
                </Typography>
              </Box>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <MenuItem onClick={() => handleNavigate('/dashboard/profile')}>
                <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>
                Profile
              </MenuItem>
              <MenuItem onClick={() => handleNavigate('/dashboard/settings')}>
                 <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
                 Settings
              </MenuItem>
              <Divider sx={{ borderStyle: 'dashed' }} />
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
        sx={{ width: { md: currentDrawerWidth }, flexShrink: { md: 0 }, transition: 'width 0.3s ease-in-out' }} // Use currentDrawerWidth and add transition
        aria-label="mailbox folders"
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: DRAWER_WIDTH,
                boxShadow: theme.shadows[2],
                transition: theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
             },
          }}
        >
          <SideDrawerContent 
            isCollapsed={false} // Mobile drawer is not collapsable
            onToggleCollapse={() => {}} // No toggle needed for mobile
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
                boxShadow: theme.shadows[2],
                overflowX: 'hidden',
                transition: theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
            },
          }}
          open // Permanent drawer is always open on desktop
        >
          <SideDrawerContent 
            isCollapsed={isDrawerCollapsed} 
            onToggleCollapse={handleCollapseToggle} 
          />
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${currentDrawerWidth}px)` }, 
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
          transition: theme.transitions.create(['margin', 'width'], { 
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar /> {/* Offset content below AppBar */}
        {children}
      </Box>
    </Box>
  );
}
