'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, 
  Card, 
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  Tabs,
  Tab,
  Button,
  Snackbar,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Divider,
  Grid,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { 
  Notifications, 
  Security, 
  Language, 
  Palette,
  VisibilityOff,
  Visibility,
  Accessibility
} from '@mui/icons-material';
import { useThemeMode } from '@/components/ThemeRegistry/ClientThemeProviders';
import { updateUserPassword } from '@/actions/userActions';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <CardContent>{children}</CardContent>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const { modeSetting, setModeSetting } = useThemeMode();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: false,
    appointmentReminders: true,
    profileVisibility: true,
    twoFactorAuth: false,
    language: 'english',
    contrastMode: false,
    fontSize: 'medium',
  });
  const [localThemeSetting, setLocalThemeSetting] = useState(modeSetting);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'info' | 'warning' | 'error',
  });
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);

  useEffect(() => {
    setLocalThemeSetting(modeSetting);
  }, [modeSetting]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleToggleChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [name]: event.target.checked });
  };

  const handleThemeChange = (event: SelectChangeEvent<typeof localThemeSetting>) => {
    const newMode = event.target.value as typeof localThemeSetting;
    setLocalThemeSetting(newMode);
    setModeSetting(newMode as 'light' | 'dark' | 'system' | 'ocean' | 'mint' | 'rose' | 'charcoal' | 'sunset');
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const settingsToSave = { ...settings };
      console.log('Saving settings:', settingsToSave);
      
      setSnackbar({
        open: true,
        message: 'Settings saved successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save settings. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  const handleChangePassword = async () => {
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
      const result = await updateUserPassword({
        newPassword,
      });

      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Password updated successfully!',
          severity: 'success',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage your account settings and preferences.
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleChange}
          aria-label="settings tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<Notifications />} label="Notifications" iconPosition="start" />
          <Tab icon={<Security />} label="Security" iconPosition="start" />
          <Tab icon={<Language />} label="Language & Region" iconPosition="start" />
          <Tab icon={<Palette />} label="Appearance" iconPosition="start" />
          <Tab icon={<Accessibility />} label="Accessibility" iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* TODO: Implement Notification Preferences backend and UI interaction */}
          {/*
          <Typography variant="h6" gutterBottom>
            Notification Preferences
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.emailNotifications}
                  onChange={handleToggleChange('emailNotifications')}
                />
              }
              label="Email Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.smsNotifications}
                  onChange={handleToggleChange('smsNotifications')}
                />
              }
              label="SMS Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.marketingEmails}
                  onChange={handleToggleChange('marketingEmails')}
                />
              }
              label="Marketing Emails"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.appointmentReminders}
                  onChange={handleToggleChange('appointmentReminders')}
                />
              }
              label="Appointment Reminders"
            />
          </FormGroup>
          */}
          <Typography variant="body2" color="text.secondary">
            Notification preferences will be available in a future update.
          </Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Security Settings
          </Typography>
          <Box sx={{ mb: 3 }} component="form" onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
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
              {isPasswordChanging ? <CircularProgress size={24} /> : 'Change Password'}
            </Button>
          </Box>
          <Divider sx={{ my: 2 }} />
          <FormGroup>
            {/* TODO: Implement Two-Factor Authentication */}
            {/*
            <FormControlLabel
              control={
                <Switch
                  checked={settings.twoFactorAuth}
                  onChange={handleToggleChange('twoFactorAuth')}
                />
              }
              label="Two-Factor Authentication"
            />
            */}
            {/* TODO: Implement Profile Visibility settings */}
            {/*
            <FormControlLabel
              control={
                <Switch
                  checked={settings.profileVisibility}
                  onChange={handleToggleChange('profileVisibility')}
                />
              }
              label="Profile Visibility"
            />
            */}
          </FormGroup>
           <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Additional security settings like Two-Factor Authentication will be available in a future update.
          </Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* TODO: Implement Language & Region settings persistence */}
          {/*
          <Typography variant="h6" gutterBottom>
            Language & Region
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Language"
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                fullWidth
                margin="normal"
                SelectProps={{
                  native: true,
                }}
              >
                <option value="english">English</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
                <option value="german">German</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Time Zone"
                defaultValue="utc-8"
                fullWidth
                margin="normal"
                SelectProps={{
                  native: true,
                }}
              >
                <option value="utc-8">Pacific Time (UTC-8)</option>
                <option value="utc-7">Mountain Time (UTC-7)</option>
                <option value="utc-6">Central Time (UTC-6)</option>
                <option value="utc-5">Eastern Time (UTC-5)</option>
              </TextField>
            </Grid>
          </Grid>
          */}
          <Typography variant="body2" color="text.secondary">
            Language and region settings will be available in a future update.
          </Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* Appearance (Theme) settings are functional and should remain */}
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <Select
                  value={localThemeSetting}
                  onChange={handleThemeChange}
                  displayEmpty
                  inputProps={{ 'aria-label': 'Without label' }}
                >
                  <MenuItem value="system">System Default</MenuItem>
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="ocean">Ocean</MenuItem>
                  <MenuItem value="mint">Mint</MenuItem>
                  <MenuItem value="rose">Rose</MenuItem>
                  <MenuItem value="charcoal">Charcoal</MenuItem>
                  <MenuItem value="sunset">Sunset</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          {/* TODO: Implement Accessibility settings persistence */}
          {/*
          <Typography variant="h6" gutterBottom>
            Accessibility
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.contrastMode}
                  onChange={handleToggleChange('contrastMode')}
                />
              }
              label="High Contrast Mode"
            />
          </FormGroup>
          <Box sx={{ mt: 2 }}>
            <TextField
              select
              label="Font Size"
              value={settings.fontSize}
              onChange={(e) => setSettings({ ...settings, fontSize: e.target.value })}
              fullWidth
              margin="normal"
              SelectProps={{
                native: true,
              }}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </TextField>
          </Box>
          */}
          <Typography variant="body2" color="text.secondary">
            Accessibility settings will be available in a future update.
          </Typography>
        </TabPanel>
      </Card>

      {/* TODO: Re-enable Save Settings button when other settings are implemented */}
      {/*
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          disabled={isSaving}
          onClick={handleSaveSettings}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
      */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 