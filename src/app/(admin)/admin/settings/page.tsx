'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  TextField,
  Grid,
  Divider,
  InputAdornment,
  IconButton,
  Avatar,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
// Assuming updateAdminProfile will be created or exists in userActions
import { updateUserThemePreference, updateAdminProfile, updateUserPassword, getAvatarList, updateUserAvatar } from '@/actions/userActions'; 
import type { ThemeModeSetting } from '@/components/ThemeRegistry/ClientThemeProviders';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import Image from 'next/image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';

// Original component content starts here
function AdminSettingsPageComponent() {
  const { user, profile, fetchAndSetProfile } = useAuth();
  
  // State for theme
  const [themeMode, setThemeMode] = useState<ThemeModeSetting>('system');
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  
  // State for profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  // State for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);

  // State for avatar selection
  const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);
  const [selectedAvatarForUpdate, setSelectedAvatarForUpdate] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setThemeMode(profile.theme_preference || 'system');
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
    }

    // Fetch available avatars
    let isMounted = true;
    const fetchAvatars = async () => {
      try {
        const avatars = await getAvatarList();
        if (isMounted) {
          setAvailableAvatars(avatars);
        }
      } catch (err) {
        console.error("Error fetching avatar list for admin:", err);
        if (isMounted) {
          setSnackbar({ open: true, message: 'Could not load avatar choices.', severity: 'error' });
        }
      }
    };
    fetchAvatars();

    return () => {
      isMounted = false;
    }
  }, [profile]);

  const handleThemeChange = (event: SelectChangeEvent<ThemeModeSetting>) => {
    setThemeMode(event.target.value as ThemeModeSetting);
  };

  const handleSaveTheme = async () => {
    if (!user?.id) {
        setSnackbar({ open: true, message: 'User not authenticated.', severity: 'error'});
        return;
    }
    setIsSavingTheme(true);
    try {
      const result = await updateUserThemePreference(themeMode);
      if (result.success) {
        setSnackbar({ open: true, message: 'Theme preference updated!', severity: 'success' });
        if (fetchAndSetProfile && user.id) {
          await fetchAndSetProfile(user.id); 
        }
      } else {
        setSnackbar({ open: true, message: result.message || 'Failed to update theme.', severity: 'error' });
        setThemeMode(profile?.theme_preference || 'system');
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'An unexpected error occurred while saving theme.', severity: 'error' });
      setThemeMode(profile?.theme_preference || 'system');
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleProfileSave = async () => {
    if (!user?.id) {
        setSnackbar({ open: true, message: 'User not authenticated.', severity: 'error'});
        return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setSnackbar({ open: true, message: 'First name and last name are required.', severity: 'error' });
      return;
    }
    setIsSavingProfile(true);
    try {
      const result = await updateAdminProfile({ first_name: firstName, last_name: lastName });
      if (result.success) {
        setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
        if (fetchAndSetProfile && user.id) {
          await fetchAndSetProfile(user.id);
        }
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to update profile.', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'An unexpected error occurred while saving profile.', severity: 'error' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChangeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setSnackbar({
        open: true,
        message: 'New passwords do not match.',
        severity: 'error',
      });
      return;
    }
    if (!currentPassword || !newPassword) {
      setSnackbar({
        open: true,
        message: 'All password fields are required.',
        severity: 'error',
      });
      return;
    }

    setIsPasswordChanging(true);
    try {
      // The updateUserPassword action correctly handles current password verification internally
      const result = await updateUserPassword({ newPassword }); 
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Password updated successfully!',
          severity: 'success',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setShowPassword(false); // Hide password fields after successful change
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Failed to update password. Please ensure your current password is correct.',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setSnackbar({
        open: true,
        message: 'An unexpected error occurred. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsPasswordChanging(false);
    }
  };
  
  const handleCloseSnackbar = () => { // Generic snackbar close handler
    setSnackbar(null);
  };

  const handleSaveAvatar = async () => {
    if (!user?.id || !selectedAvatarForUpdate) {
      setSnackbar({ open: true, message: 'Please select an avatar first.', severity: 'error' });
      return;
    }
    setIsSavingAvatar(true);
    try {
      const result = await updateUserAvatar(user.id, selectedAvatarForUpdate);
      if (result.success) {
        setSnackbar({ open: true, message: 'Avatar updated successfully!', severity: 'success' });
        if (fetchAndSetProfile) {
            await fetchAndSetProfile(user.id); // Refresh global auth profile
        }
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to update avatar.', severity: 'error' });
      }
    } catch (err: any) {
      console.error("Error saving avatar for admin:", err);
      setSnackbar({ open: true, message: err.message || 'An unexpected error occurred.', severity: 'error' });
    } finally {
      setIsSavingAvatar(false);
    }
  };

  if (!profile && !user) {
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

      {/* Appearance Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Appearance
        </Typography>
        <Divider sx={{mb: 2}} />
        <FormControl fullWidth margin="normal">
          <InputLabel id="theme-preference-label">Theme Preference</InputLabel>
          <Select
            labelId="theme-preference-label"
            id="theme-preference"
            value={themeMode}
            label="Theme Preference"
            onChange={handleThemeChange}
            disabled={isSavingTheme}
          >
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
            <MenuItem value="system">System Default</MenuItem>
            <MenuItem value="ocean">Ocean</MenuItem>
            <MenuItem value="mint">Mint</MenuItem>
            <MenuItem value="rose">Rose</MenuItem>
            <MenuItem value="charcoal">Charcoal</MenuItem>
            <MenuItem value="sunset">Sunset</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
          <Button
            variant="contained"
            onClick={handleSaveTheme}
            disabled={isSavingTheme || themeMode === (profile?.theme_preference || 'system')}
          >
            {isSavingTheme ? <CircularProgress size={24} /> : 'Save Theme'}
          </Button>
        </Box>
      </Paper>

      {/* Profile Information Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Profile Information
        </Typography>
        <Divider sx={{mb: 2}} />
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isSavingProfile}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isSavingProfile}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              value={user?.email || ''}
              disabled 
              InputProps={{
                readOnly: true,
              }}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
          <Button 
            variant="contained" 
            onClick={handleProfileSave} 
            disabled={isSavingProfile || (firstName === (profile?.first_name || '') && lastName === (profile?.last_name || ''))}
          >
            {isSavingProfile ? <CircularProgress size={24} /> : 'Save Profile'}
          </Button>
        </Box>
      </Paper>

      {/* Profile Picture Section - NEW */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{display: 'flex', alignItems: 'center'}}>
          <PersonIcon sx={{ mr: 1, color: 'primary.main' }} /> Profile Picture
        </Typography>
        <Divider sx={{mb: 2}} />
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle2" gutterBottom>Current Avatar</Typography>
            <Avatar
              src={profile?.avatar_filename ? `/images/avatar/${profile.avatar_filename}` : undefined}
              alt={profile?.first_name || user?.email || 'Admin Avatar'}
              sx={{ width: 100, height: 100, margin: '0 auto', mb: 2, fontSize: '2.5rem' }}
            >
              {(!profile?.avatar_filename && (profile?.first_name || user?.email)) 
                ? (profile?.first_name || user?.email)?.[0].toUpperCase() 
                : null}
            </Avatar>
          </Grid>
          <Grid item xs={12} md={9}>
            <Typography variant="subtitle2" gutterBottom>Choose a new Avatar</Typography>
            {availableAvatars.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb:2 }}>
                {availableAvatars.map((avatarFile) => {
                  // Determine if this avatar should be highlighted
                  const isHighlighted = selectedAvatarForUpdate
                    ? avatarFile === selectedAvatarForUpdate
                    : profile?.avatar_filename === avatarFile;

                  return (
                    <Box 
                      key={avatarFile} 
                      onClick={() => setSelectedAvatarForUpdate(avatarFile)}
                      sx={theme => ({
                        cursor: 'pointer', 
                        position: 'relative',
                        border: isHighlighted ? `3px solid ${theme.palette.primary.main}` : `3px solid transparent`,
                        borderRadius: '50%',
                        padding: '2px',
                        transition: 'border-color 0.2s ease-in-out',
                        'img': {
                          borderRadius: '50%', display: 'block'
                        }
                      })}
                    >
                      <Image 
                        src={`/images/avatar/${avatarFile}`} 
                        alt={`Avatar ${avatarFile}`} 
                        width={70} 
                        height={70} 
                      />
                      {isHighlighted && (
                        <CheckCircleIcon 
                          sx={theme =>({
                            position: 'absolute', 
                            bottom: 0, 
                            right: 0, 
                            color: theme.palette.success.main,
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            fontSize: '1.25rem' // Slightly smaller for smaller avatars
                          })} 
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            ) : (
               <Typography color="textSecondary" sx={{mb:2}}>No other avatars available.</Typography>
            )}
            <Button
              variant="contained"
              onClick={handleSaveAvatar}
              disabled={isSavingAvatar || !selectedAvatarForUpdate || selectedAvatarForUpdate === profile?.avatar_filename}
            >
              {isSavingAvatar ? <CircularProgress size={24} /> : 'Save Avatar'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Change Password Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Change Password
        </Typography>
        <Divider sx={{mb: 2}} />
        <Box component="form" onSubmit={handlePasswordChangeSubmit} noValidate autoComplete="off">
          <TextField
            label="Current Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            margin="normal"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={isPasswordChanging}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    disabled={isPasswordChanging}
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
            disabled={isPasswordChanging}
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
            disabled={isPasswordChanging}
          />
          <Button 
            type="submit" 
            variant="contained" 
            sx={{ mt: 2 }} 
            disabled={isPasswordChanging || !currentPassword || !newPassword || newPassword !== confirmNewPassword}
          >
            {isPasswordChanging ? <CircularProgress size={24} /> : 'Update Password'}
          </Button>
        </Box>
      </Paper>

      {/* Snackbar for notifications */}
      {snackbar && (
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}

// New default export wrapping the original component with Suspense
export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><CircularProgress /></Box>}>
      <AdminSettingsPageComponent />
    </Suspense>
  );
}