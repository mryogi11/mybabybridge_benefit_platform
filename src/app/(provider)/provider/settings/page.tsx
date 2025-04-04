'use client';

import React from 'react';
import { Box, Typography, Container, Paper, Grid, Divider, TextField, Button, Switch, FormControlLabel } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

export default function ProviderSettingsPage() {
  const { user } = useAuth(); // Get user info if needed

  // TODO: Add state and handlers for form elements

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        Account Settings
      </Typography>

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

      </Grid>
    </Container>
  );
} 