'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Button,
  Alert,
  CircularProgress,
  SelectChangeEvent,
  Snackbar,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserThemePreference } from '@/actions/userActions';
import type { ThemeModeSetting } from '@/components/ThemeRegistry/ClientThemeProviders';

export default function AdminSettingsPage() {
  const { profile, fetchAndSetProfile } = useAuth(); // Use profile from AuthContext
  const [mode, setMode] = useState<ThemeModeSetting>(profile?.theme_preference || 'system');
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (profile?.theme_preference) {
      setMode(profile.theme_preference);
    }
  }, [profile]);

  const handleThemeChange = async (event: any) => {
    const newMode = event.target.value as ThemeModeSetting;
    setMode(newMode);
    setIsSaving(true);
    try {
      const result = await updateUserThemePreference(newMode);
      if (result.success) {
        setSnackbar({ open: true, message: 'Theme preference updated!', severity: 'success' });
        if (fetchAndSetProfile) {
          await fetchAndSetProfile(); // Refresh profile to reflect change immediately in context
        }
      } else {
        setSnackbar({ open: true, message: result.message || 'Failed to update theme.', severity: 'error' });
        setMode(profile?.theme_preference || 'system');
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'An unexpected error occurred.', severity: 'error' });
      setMode(profile?.theme_preference || 'system');
    } finally {
      setIsSaving(false);
    }
  };

  if (profile === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom>
          Appearance
        </Typography>
        <FormControl fullWidth margin="normal">
          <InputLabel id="theme-preference-label">Theme Preference</InputLabel>
          <Select
            labelId="theme-preference-label"
            id="theme-preference"
            value={mode}
            label="Theme Preference"
            onChange={handleThemeChange}
            disabled={isSaving}
          >
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
            <MenuItem value="system">System Default</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
          <Button 
            variant="contained" 
            onClick={handleThemeChange} 
            disabled={isSaving || mode === (profile?.theme_preference || 'system')}
          >
            {isSaving ? <CircularProgress size={24} /> : 'Save Theme'}
          </Button>
          {snackbar && (
            <Snackbar
              open={snackbar.open}
              autoHideDuration={6000}
              onClose={() => setSnackbar(null)}
            >
              <Alert onClose={() => setSnackbar(null)} severity={snackbar.severity}>
                {snackbar.message}
              </Alert>
            </Snackbar>
          )}
        </Box>
      </Paper>
      {/* Add more settings sections here if needed */}
    </Box>
  );
} 