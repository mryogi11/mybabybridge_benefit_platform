'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Container,
  Avatar,
  Button,
  Tooltip,
  Divider,
  ListItemIcon,
  Badge,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { 
  AccountCircle, 
  Logout, 
  Settings, 
  Notifications as NotificationsIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Assignment as AssignmentIcon,
  LocalHospital as PackagesIcon,
  Message as MessageIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Logo from './Logo';

const pages = [
  { title: 'Dashboard', path: '/dashboard', icon: <DashboardIcon fontSize="small" /> },
  { title: 'Appointments', path: '/dashboard/appointments', icon: <CalendarIcon fontSize="small" />, badge: 2 },
  { title: 'Treatment Plans', path: '/dashboard/treatment-plans', icon: <AssignmentIcon fontSize="small" /> },
  { title: 'Packages', path: '/dashboard/packages', icon: <PackagesIcon fontSize="small" /> },
  { title: 'Messages', path: '/dashboard/messages', icon: <MessageIcon fontSize="small" />, badge: 3 },
];

export default function Navigation() {
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotifications, setAnchorElNotifications] = useState<null | HTMLElement>(null);
  const [navigating, setNavigating] = useState(false);
  const [currentNavPath, setCurrentNavPath] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const theme = useTheme();

  // Prefetch all dashboard pages on component mount
  useEffect(() => {
    // Prefetch all common navigation paths
    pages.forEach(page => {
      router.prefetch(page.path);
    });
    
    // Also prefetch these common paths
    router.prefetch('/dashboard/profile');
    router.prefetch('/dashboard/settings');
    router.prefetch('/dashboard/notifications');
  }, [router]);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };
  
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleOpenNotificationsMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNotifications(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleCloseNotificationsMenu = () => {
    setAnchorElNotifications(null);
  };

  const handleNavigation = (path: string) => {
    // Show navigation state immediately
    setNavigating(true);
    setCurrentNavPath(path);
    
    // Close any open menus
    handleCloseNavMenu();
    
    // Navigate to the new path
    router.push(path);
    
    // Reset navigation state after a short delay
    setTimeout(() => {
      setNavigating(false);
      setCurrentNavPath(null);
    }, 500);
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

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{
        background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        height: { xs: '48px', md: '50px' },
      }}
    >
      <Container maxWidth="xl" sx={{ height: '100%' }}>
        <Toolbar 
          disableGutters 
          variant="dense"
          sx={{ 
            minHeight: { xs: '48px', md: '50px' },
            height: '100%',
            py: 0.75,
          }}
        >
          {/* Logo for desktop - Replace with Home button */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 2, alignItems: 'center', height: '100%' }}>
            {/* Add the Home button */}
            <Button
              onClick={() => handleNavigation('/')}
              startIcon={<HomeIcon fontSize="small" />}
              sx={{
                mx: 0.25, // Consistent spacing
                px: 1, // Consistent padding
                color: 'white',
                textTransform: 'none', // Keep 'Home' casing
                fontSize: '0.85rem', // Match other nav items
                fontWeight: pathname === '/' ? 600 : 400, // Highlight if active
                opacity: pathname === '/' ? 1 : 0.8, // Highlight if active
                borderRadius: '4px', // Consistent styling
              }}
            >
              Home
            </Button>
          </Box>

          {/* Mobile menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="small"
              aria-label="menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              sx={{ color: 'white', p: 0.5 }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
                '& .MuiPaper-root': {
                  borderRadius: 2,
                  mt: 1.5,
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                  minWidth: 180,
                }
              }}
            >
              {pages.map((page) => (
                <MenuItem
                  key={page.title}
                  onClick={() => handleNavigation(page.path)}
                  selected={pathname === page.path}
                  disabled={navigating && currentNavPath === page.path}
                  sx={{
                    borderLeft: pathname === page.path ? `3px solid ${theme.palette.primary.main}` : 'none',
                    pl: pathname === page.path ? 1.5 : 2,
                    py: 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {navigating && currentNavPath === page.path ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : page.badge ? (
                      <Badge color="error" badgeContent={page.badge} sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}>
                        {page.icon}
                      </Badge>
                    ) : (
                      page.icon
                    )}
                  </ListItemIcon>
                  <Typography variant="body2" textAlign="left">{page.title}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Logo for mobile */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' }, justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Link href="/dashboard" passHref style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <Logo height={24} />
            </Link>
          </Box>

          {/* Desktop menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, ml: 2 }}>
            {pages.map((page) => (
              <Button
                key={page.title}
                onClick={() => handleNavigation(page.path)}
                disabled={navigating && currentNavPath === page.path}
                startIcon={
                  navigating && currentNavPath === page.path ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : page.badge ? (
                    <Badge color="error" badgeContent={page.badge} sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}>
                      {page.icon}
                    </Badge>
                  ) : (
                    page.icon
                  )
                }
                sx={{
                  mx: 0.25,
                  px: 1,
                  color: 'white',
                  opacity: pathname === page.path ? 1 : 0.8,
                  fontWeight: pathname === page.path ? 600 : 400,
                  fontSize: '0.85rem',
                  position: 'relative',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                  height: '32px',
                  lineHeight: 1,
                  '&:hover': {
                    opacity: 1,
                    backgroundColor: alpha(theme.palette.common.white, 0.1),
                  },
                  ...( pathname === page.path && {
                    backgroundColor: alpha(theme.palette.common.white, 0.1),
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      width: '30%',
                      height: '2px',
                      bottom: '2px',
                      left: '35%',
                      backgroundColor: theme.palette.secondary.main,
                      borderRadius: '1px',
                    }
                  }),
                }}
              >
                {page.title}
              </Button>
            ))}
          </Box>

          {/* Notifications */}
          <Box sx={{ mr: 0.5 }}>
            <Tooltip title="Notifications">
              <IconButton 
                size="small"
                onClick={handleOpenNotificationsMenu} 
                sx={{ color: 'white', p: 0.5 }}
              >
                <Badge badgeContent={5} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 8, height: 14, minWidth: 14 } }}>
                  <NotificationsIcon sx={{ fontSize: '1.2rem' }} />
                </Badge>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ 
                mt: '40px',
                '& .MuiPaper-root': {
                  borderRadius: 2,
                  minWidth: 280,
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                }
              }}
              id="notifications-menu"
              anchorEl={anchorElNotifications}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElNotifications)}
              onClose={handleCloseNotificationsMenu}
            >
              <Box sx={{ p: 1.5, pb: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">Notifications</Typography>  
              </Box>
              <Divider />
              <MenuItem onClick={handleCloseNotificationsMenu} sx={{ py: 1 }}>
                <Box>
                  <Typography variant="body2" fontWeight="medium">New appointment confirmed</Typography>
                  <Typography variant="caption" color="text.secondary">Today at 2:30 PM</Typography>
                </Box>
              </MenuItem>
              <MenuItem onClick={handleCloseNotificationsMenu} sx={{ py: 1 }}>
                <Box>
                  <Typography variant="body2" fontWeight="medium">Treatment plan updated</Typography>
                  <Typography variant="caption" color="text.secondary">Yesterday</Typography>
                </Box>
              </MenuItem>
              <Divider />
              <Box sx={{ p: 1, textAlign: 'center' }}>
                <Button 
                  size="small" 
                  onClick={() => {
                    handleCloseNotificationsMenu();
                    router.push('/dashboard/notifications');
                  }}
                >
                  View All
                </Button>
              </Box>
            </Menu>
          </Box>

          {/* User menu */}
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Account settings">
              <IconButton 
                size="small"
                onClick={handleOpenUserMenu} 
                sx={{ 
                  p: 0.15,
                  border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    border: `1px solid ${alpha(theme.palette.common.white, 0.8)}`,
                  }
                }}
              >
                <Avatar sx={{ bgcolor: 'secondary.main', width: 24, height: 24, fontSize: '0.9rem' }}>
                  {user?.email?.charAt(0).toUpperCase() || <AccountCircle sx={{ fontSize: '1rem' }} />}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ 
                mt: '40px',
                '& .MuiPaper-root': {
                  borderRadius: 2,
                  minWidth: 200,
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                }
              }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
                <Typography variant="caption" color="text.secondary">Signed in as</Typography>
                <Typography variant="body2" fontWeight="medium" noWrap>
                  {user?.email || 'User'}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => {
                handleCloseUserMenu();
                router.push('/dashboard/profile');
              }} sx={{ py: 1 }}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Profile</Typography>
              </MenuItem>
              <MenuItem onClick={() => {
                handleCloseUserMenu();
                router.push('/dashboard/settings');
              }} sx={{ py: 1 }}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Settings</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ py: 1 }}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
} 