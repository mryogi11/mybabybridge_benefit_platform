'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Paper, Grid, Card, CardContent, CircularProgress, Avatar, List, ListItem, ListItemIcon, ListItemText, Chip, Button, Stack, Alert } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MessageIcon from '@mui/icons-material/Message';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { supabase } from '@/lib/supabase/client';
import { Appointment } from '@/types';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { useRouter } from 'next/navigation';

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

// --- Helper functions from patient dashboard (can be moved to utils) ---
const getAppointmentDateLabel = (date: string | null | undefined): string => {
    if (!date) return 'N/A';
    try {
        const appointmentDate = parseISO(date);
        if (isToday(appointmentDate)) return 'Today';
        if (isTomorrow(appointmentDate)) return 'Tomorrow';
        return format(appointmentDate, 'MMM d, yyyy');
    } catch (e) {
        console.error("Error formatting appointment date:", date, e);
        return "Invalid Date";
    }
};

const getAppointmentTimeLabel = (date: string | null | undefined): string => {
    if (!date) return '';
    try {
        const appointmentDate = parseISO(date);
        return format(appointmentDate, 'h:mm a');
    } catch (e) {
        console.error("Error formatting appointment time:", date, e);
        return "Invalid Time";
    }
};

const getStatusColor = (status: string): ('success' | 'warning' | 'error' | 'default' | 'primary' | 'secondary' | 'info') => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'scheduled': return 'primary';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
};
// --- End Helper Functions ---

export default function ProviderDashboardPage() {
  const { user, profile, isLoading: isAuthLoading, isProfileLoading } = useAuth();
  const router = useRouter();

  // State for appointments
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [errorAppointments, setErrorAppointments] = useState<string | null>(null);

  // Combined loading state for initial page load (excluding appointments)
  const pageLoading = isAuthLoading || isProfileLoading;

  // Fetch appointments when user/auth loading state changes
  useEffect(() => {
    if (!user || isAuthLoading) {
        if (!isAuthLoading) {
             setLoadingAppointments(false);
             setErrorAppointments("Provider not authenticated.");
        }
        return; // Don't fetch if no user or auth is loading
    }

    const fetchUpcomingAppointments = async () => {
      setLoadingAppointments(true);
      setErrorAppointments(null);
      console.log('Provider Dashboard: Fetching appointments for user:', user.id);

      try {
        // 1. Get provider profile ID
        const { data: providerData, error: providerError } = await supabase
          .from('providers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (providerError || !providerData) {
          throw new Error(providerError?.message || "Could not find provider profile.");
        }
        const providerProfileId = providerData.id;

        // 2. Fetch appointments
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:patient_profiles (
              id,
              first_name,
              last_name
            )
          `)
          .eq('provider_id', providerProfileId)
          .gte('appointment_date', new Date().toISOString())
          .in('status', ['scheduled', 'pending']) // Only scheduled/pending
          .order('appointment_date', { ascending: true })
          .limit(5); // Limit for dashboard widget

        if (error) {
          throw error;
        }
        
        console.log('Provider Dashboard: Raw appointment data fetched:', data);
        // Type assertion might not be needed if select matches Appointment type
        setUpcomingAppointments(data || []); // Directly set using base Appointment type

      } catch (err: any) {
        console.error('Provider Dashboard: Error fetching appointments:', err);
        setErrorAppointments(err.message || "Failed to load appointments.");
        setUpcomingAppointments([]); // Clear on error
      } finally {
        setLoadingAppointments(false);
      }
    };

    fetchUpcomingAppointments();

  }, [user, isAuthLoading, supabase]); // Depend on user and loading state

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

        {/* Upcoming Appointments Widget */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Upcoming Appointments</Typography>
                  <Button variant="outlined" startIcon={<CalendarTodayIcon />} onClick={() => router.push('/provider/appointments')}>View All</Button>
                </Stack>
                {loadingAppointments ? (
                   <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                      <CircularProgress size={24} />
                   </Box>
                ) : errorAppointments ? (
                   <Alert severity="warning" sx={{ mt: 1 }}>{errorAppointments}</Alert>
                ) : upcomingAppointments.length > 0 ? (
                   <List disablePadding>
                    {upcomingAppointments.map((appointment) => (
                      <ListItem key={appointment.id} divider sx={{ py: 1.5 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <CalendarTodayIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="subtitle2">{getAppointmentDateLabel(appointment.appointment_date)}</Typography>
                              <Chip label={getAppointmentTimeLabel(appointment.appointment_date)} size="small" color={getStatusColor(appointment.status)} />
                            </Stack>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary" noWrap>
                              Patient: {appointment.patient?.first_name} {appointment.patient?.last_name || 'N/A'}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                   </List>
                ) : (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No upcoming appointments found.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Placeholder Quick Links */}
        <Grid item xs={12} md={6}>
           <Paper sx={{ p: 3, mt: 0 }}>
               <Typography variant="h6" gutterBottom>
                   Quick Links / Actions
               </Typography>
               <Typography sx={{ color: 'text.secondary' }}>
                   Placeholder for buttons linking to Manage Availability, View Patients, etc.
               </Typography>
           </Paper>
        </Grid>

      </Grid>
    </Container>
  );
} 