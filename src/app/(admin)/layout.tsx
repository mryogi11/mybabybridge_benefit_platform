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
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AccountCircle,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import BusinessIcon from '@mui/icons-material/Business';
import Logo from '@/components/Logo';

const drawerWidth = 240;
const COLLAPSED_DRAWER_WIDTH = 88;

const adminNavItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
  { text: 'Organizations', icon: <BusinessIcon />, path: '/admin/organizations' },
  { text: 'Packages', icon: <ShoppingCartIcon />, path: '/admin/packages' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
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
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);

  const logoHeight = isMobile ? 46 : 48;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapseToggle = () => {
    if (isDesktop) { // Only allow collapse/expand on desktop
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
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const currentEffectiveDrawerWidth = isDesktop && isDrawerCollapsed ? COLLAPSED_DRAWER_WIDTH : drawerWidth;

  const drawer = (isCollapsedMode: boolean) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Toolbar
        sx={{
          minHeight: { xs: 56, sm: 64 },
          backgroundColor: theme.palette.primary!.main,
          color: theme.palette.primary!.contrastText,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: isCollapsedMode && isDesktop ? 0 : 1,
          transition: theme.transitions.create(['padding', 'justify-content'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Link href="/admin" passHref>
          <Logo height={logoHeight} collapsed={isCollapsedMode && isDesktop} />
        </Link>
      </Toolbar>
      <List sx={{
        p: isCollapsedMode && isDesktop ? 0.5 : 1,
        flexGrow: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: theme.transitions.create('padding', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
         '& .MuiListItemIcon-root': {
            minWidth: 'auto',
            justifyContent: 'center',
          },
      }}>
        {adminNavItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{
            mb: 0.5,
            display: 'flex',
            justifyContent: isCollapsedMode && isDesktop ? 'center' : 'initial'
          }}>
            <ListItemButton
              component={Link}
              href={item.path}
              selected={pathname === item.path}
              sx={{
                borderRadius: theme.shape.borderRadius,
                py: 1,
                px: 1.5, // Keep consistent padding for items
                color: theme.palette.text.secondary,
                justifyContent: isCollapsedMode && isDesktop ? 'center' : 'flex-start',
                transition: theme.transitions.create(['padding', 'justify-content'], {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                }),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.16),
                  color: theme.palette.primary.main,
                  fontWeight: 'fontWeightBold',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.24),
                  },
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.main,
                  },
                  '& .MuiListItemText-primary': {
                    fontWeight: 'fontWeightBold',
                  },
                },
                '& .MuiListItemIcon-root': {
                  marginRight: isCollapsedMode && isDesktop ? 0 : theme.spacing(1.5),
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
            p: isDrawerCollapsed ? 1 : 2, // Use isDrawerCollapsed for the button container directly
            mt: 'auto',
            display: 'flex',
            justifyContent: isDrawerCollapsed ? 'center' : 'flex-end',
            borderTop: `1px dashed ${theme.palette.divider}`,
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
    <Box sx={{ display: 'flex' }}>
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
            Admin Dashboard
          </Typography>
          <IconButton
            onClick={handleMenuOpen}
            sx={{ p: 0 }}
          >
            <Avatar alt={user?.email || 'Admin'} sx={{ width: 32, height: 32 }}>
              {user?.email ? user.email[0].toUpperCase() : <AccountCircle />}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
                paper: {
                    sx: {
                        mt: 1.5,
                        borderRadius: theme.shape.borderRadius,
                        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                    },
                },
            }}
          >
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
        sx={{ width: { sm: currentEffectiveDrawerWidth }, flexShrink: { sm: 0 },
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
        }}
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
                transition: theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                }),
            },
          }}
        >
          {drawer(false)}
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
          {drawer(isDrawerCollapsed)}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${currentEffectiveDrawerWidth}px)` },
          backgroundColor: theme.palette.background.default,
          minHeight: '100vh',
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
        {children}
      </Box>
    </Box>
  );
}