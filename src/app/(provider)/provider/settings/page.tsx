'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Paper, Grid, Divider, TextField, Button, Switch, FormControlLabel, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert, Snackbar, InputAdornment, IconButton } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import PersonIcon from '@mui/icons-material/Person';
import PaymentsIcon from '@mui/icons-material/Payments';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useRouter } from 'next/navigation';
import { themeModeEnum } from '@/lib/db/schema';
import { useThemeMode, type ThemeModeSetting } from '@/components/ThemeRegistry/ClientThemeProviders';
import { updateUserPassword } from '@/actions/userActions';
import { Visibility, VisibilityOff } from '@mui/icons-material';

export default function ProviderSettingsPage() {
  const { user, profile, isLoading: isAuthLoading, isProfileLoading } = useAuth(); 
  const { modeSetting, setModeSetting } = useThemeMode();
  const router = useRouter();

  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [themeUpdateMessage, setThemeUpdateMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  const [passwordChangeSnackbar, setPasswordChangeSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  const currentDisplayTheme = modeSetting || (profile?.theme_preference || 'system');

  const handleThemeChange = async (event: React.ChangeEvent<{ value: unknown }>) => {
    const newTheme = event.target.value as ThemeModeSetting;
    setIsSavingTheme(true);
    setThemeUpdateMessage(null);
    try {
      await setModeSetting(newTheme);
      // The theme should apply visually from ClientThemeProviders reacting to modeSetting change.
      // AuthContext will refresh its profile on next load or if its dependencies trigger a fetch.
      setThemeUpdateMessage({ type: 'success', message: 'Theme preference updated. Refresh if UI does not update immediately.' });
    } catch (error) {
      setThemeUpdateMessage({ type: 'error', message: 'Failed to update theme.' });
      console.error("Error setting theme from settings page:", error);
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handlePasswordChangeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeSnackbar({
        open: true,
        message: 'New passwords do not match.',
        severity: 'error',
      });
      return;
    }
    if (!currentPassword || !newPassword) {
      setPasswordChangeSnackbar({
        open: true,
        message: 'All password fields are required.',
        severity: 'error',
      });
      return;
    }

    setIsPasswordChanging(true);
    setPasswordChangeSnackbar(null);
    try {
      const result = await updateUserPassword({ newPassword }); // currentPassword not needed by action
      if (result.success) {
        setPasswordChangeSnackbar({
          open: true,
          message: 'Password updated successfully!',
          severity: 'success',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setPasswordChangeSnackbar({
          open: true,
          message: result.error || 'Failed to update password. Please ensure your current password is correct.',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordChangeSnackbar({
        open: true,
        message: 'An unexpected error occurred. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsPasswordChanging(false);
    }
  };

  const handleCloseSnackbar = () => {
    if (passwordChangeSnackbar && passwordChangeSnackbar.open) {
        setPasswordChangeSnackbar({ ...passwordChangeSnackbar, open: false });
    }
    if (themeUpdateMessage) {
        setThemeUpdateMessage(null);
    }
  };
  
  if (isAuthLoading || isProfileLoading) {
    return (
        <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 128px)' }}>
            <CircularProgress />
        </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        Account Settings
      </Typography>

      {/* Theme Preference Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Theme Preference
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <FormControl fullWidth sx={{ mb: 2 }} disabled={isSavingTheme}>
          <InputLabel id="theme-select-label">Theme</InputLabel>
          <Select
            labelId="theme-select-label"
            id="theme-select"
            value={currentDisplayTheme}
            label="Theme"
            onChange={handleThemeChange as any}
          >
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
            <MenuItem value="system">System Default</MenuItem>
            {/* Add New Themes */}
            <MenuItem value="ocean">Ocean</MenuItem>
            <MenuItem value="mint">Mint</MenuItem>
            <MenuItem value="rose">Rose</MenuItem>
            <MenuItem value="charcoal">Charcoal</MenuItem>
            <MenuItem value="sunset">Sunset</MenuItem>
          </Select>
        </FormControl>
        {isSavingTheme && <CircularProgress size={24} sx={{ ml: 2 }} />}
        {themeUpdateMessage && (
          <Alert severity={themeUpdateMessage.type} sx={{ mt: 2 }}>
            {themeUpdateMessage.message}
          </Alert>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Section 1: Change Password (Example) */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box component="form" onSubmit={handlePasswordChangeSubmit} noValidate autoComplete="off">
              <TextField
                label="Current Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                margin="normal"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                margin="normal"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <TextField
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                margin="normal"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                error={newPassword !== confirmNewPassword && confirmNewPassword !== ''}
                helperText={newPassword !== confirmNewPassword && confirmNewPassword !== '' ? "Passwords do not match" : ""}
              />
              <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={isPasswordChanging || !currentPassword || !newPassword || newPassword !== confirmNewPassword}>
                {isPasswordChanging ? <CircularProgress size={24} /> : 'Update Password'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Section 2: Notification Preferences (Example) */}
        {/* TODO: Implement Notification Preferences settings for providers */}
        {/*
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Notification Preferences
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box>
              <FormControlLabel
                control={<Switch defaultChecked />} // TODO: Add state/handler
                label="Email Notifications for New Messages"
              />
              <FormControlLabel
                control={<Switch />} // TODO: Add state/handler
                label="Email Notifications for Appointment Reminders"
              />
               <FormControlLabel
                control={<Switch defaultChecked />} // TODO: Add state/handler
                label="In-App Notifications"
              />
            </Box>
          </Paper>
        </Grid>
        */}
        
        {/* Add more settings sections as needed */}

        {/* Other settings links */}
        {/*
        <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/provider/payments')}>
            <ListItemIcon>
              <PaymentsIcon />
            </ListItemIcon>
            <ListItemText primary="Payment Settings" />
          </ListItemButton>
        </ListItem>
        */}

        {/*
        <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/provider/notifications')}>
            <ListItemIcon>
              <NotificationsIcon />
            </ListItemIcon>
            <ListItemText primary="Notifications" />
          </ListItemButton>
        </ListItem>
        */}

      </Grid>
      {/* Snackbar for password change feedback */}
      {passwordChangeSnackbar && (
        <Snackbar
          open={passwordChangeSnackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={passwordChangeSnackbar.severity}
            sx={{ width: '100%' }}
          >
            {passwordChangeSnackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Container>
  );
} 