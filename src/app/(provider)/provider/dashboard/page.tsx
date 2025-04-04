'use client';

import React from 'react';
import { Box, Typography, Container, Paper, Grid, Card, CardContent, CircularProgress, Avatar } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MessageIcon from '@mui/icons-material/Message';
import PeopleIcon from '@mui/icons-material/People';

// Simple stat card component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color?: string; // Optional color for icon/value
}

function StatCard({ title, value, icon, color = 'primary.main' }: StatCardProps) {
  return (
    <Card sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
      <Avatar sx={{ bgcolor: color, width: 56, height: 56, mr: 2 }}>
        {icon}
      </Avatar>
      <Box>
        <Typography variant="h4" component="div">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Box>
    </Card>
  );
}

export default function ProviderDashboardPage() {
  const { user, profile, isLoading, isProfileLoading } = useAuth();

  // Combined loading state
  const pageLoading = isLoading || isProfileLoading;

  if (pageLoading) {
    return (
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}> 
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        Welcome, {profile?.first_name || user?.email || 'Provider'}!
      </Typography>

      <Grid container spacing={3}>
        {/* Placeholder Stat Cards */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Appointments Today" 
            value="0" // Placeholder value
            icon={<CalendarMonthIcon />} 
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Unread Messages" 
            value="0" // Placeholder value
            icon={<MessageIcon />} 
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Active Patients" 
            value="-" // Placeholder value - maybe fetch later
            icon={<PeopleIcon />} 
            color="success.main"
          />
        </Grid>

        {/* Add more widgets or quick links here as needed */}
        <Grid item xs={12}>
           <Paper sx={{ p: 3, mt: 2 }}>
               <Typography variant="h6" gutterBottom>
                   Quick Links / Actions
               </Typography>
               <Typography sx={{ color: 'text.secondary' }}>
                   Placeholder for buttons linking to Manage Availability, View Patients, etc.
               </Typography>
               {/* TODO: Add Buttons/Links here */}
           </Paper>
        </Grid>

      </Grid>
    </Container>
  );
} 