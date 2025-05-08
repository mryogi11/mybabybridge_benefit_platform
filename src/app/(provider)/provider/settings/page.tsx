'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Paper, Grid, Divider, TextField, Button, Switch, FormControlLabel, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import PersonIcon from '@mui/icons-material/Person';
import PaymentsIcon from '@mui/icons-material/Payments';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useRouter } from 'next/navigation';
import { themeModeEnum } from '@/lib/db/schema';
import { useThemeMode, type ThemeModeSetting } from '@/components/ThemeRegistry/ClientThemeProviders';

export default function ProviderSettingsPage() {
  const { user, profile, isLoading: isAuthLoading, isProfileLoading } = useAuth(); 
  const { modeSetting, setModeSetting } = useThemeMode();
  const router = useRouter();

  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [themeUpdateMessage, setThemeUpdateMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
            <Box component="form" noValidate autoComplete="off">
              <TextField
                label="Current Password"
                type="password"
                fullWidth
                margin="normal"
                // TODO: Add value and onChange
              />
              <TextField
                label="New Password"
                type="password"
                fullWidth
                margin="normal"
                // TODO: Add value and onChange
              />
              <TextField
                label="Confirm New Password"
                type="password"
                fullWidth
                margin="normal"
                // TODO: Add value and onChange
              />
              <Button variant="contained" sx={{ mt: 2 }}>
                Update Password
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Section 2: Notification Preferences (Example) */}
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
        
        {/* Add more settings sections as needed */}

        {/* Other settings links */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/provider/payments')}>
            <ListItemIcon>
              <PaymentsIcon />
            </ListItemIcon>
            <ListItemText primary="Payment Settings" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/provider/notifications')}>
            <ListItemIcon>
              <NotificationsIcon />
            </ListItemIcon>
            <ListItemText primary="Notifications" />
          </ListItemButton>
        </ListItem>

      </Grid>
    </Container>
  );
} 