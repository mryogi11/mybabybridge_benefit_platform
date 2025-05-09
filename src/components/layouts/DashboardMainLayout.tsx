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
import { AccountCircle, Logout, Settings } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import SideDrawerContent from './SideDrawerContent'; // Import the drawer content

const DRAWER_WIDTH = 280;
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
  const { user, profile, signOut } = useAuth(); // Added profile
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

  const handleCollapseToggle = () => { // New handler for collapse
    setIsDrawerCollapsed(!isDrawerCollapsed);
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
      handleCloseUserMenu(); // Close menu after navigation
  }

  const currentDrawerWidth = isMdUp && isDrawerCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', transition: 'all 0.3s ease-in-out' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${currentDrawerWidth}px)` }, // Use currentDrawerWidth
          ml: { md: `${currentDrawerWidth}px` }, // Use currentDrawerWidth
          backgroundColor: alpha(theme.palette.background.default, 0.8), // Adjusted for minimal feel
          backdropFilter: 'blur(6px)',
          borderBottom: `1px dashed ${theme.palette.divider}`,
          color: theme.palette.text.primary, // Ensure icons/text are visible
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
                <Avatar alt={profile?.first_name || user?.email} src="/static/images/avatar/2.jpg" />
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
                width: DRAWER_WIDTH, // Mobile drawer is not collapsable, keeps original width
                borderRight: `1px dashed ${theme.palette.divider}`,
                transition: theme.transitions.create('width', { // Add transition
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
                width: currentDrawerWidth, // Use currentDrawerWidth
                borderRight: `1px dashed ${theme.palette.divider}`,
                overflowX: 'hidden', // Hide content when collapsing
                transition: theme.transitions.create('width', { // Add transition
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
          width: { md: `calc(100% - ${currentDrawerWidth}px)` }, // Use currentDrawerWidth
          minHeight: '100vh',
          backgroundColor: theme.palette.grey[100], // Or another light background
          transition: theme.transitions.create(['margin', 'width'], { // Add transition
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
