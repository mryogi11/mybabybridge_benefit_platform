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
import { User } from '@supabase/supabase-js';
import { getAppointmentsForUser } from '@/actions/appointmentActions';

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

// Define a specific type for the data structure fetched in this component
interface ProviderDashboardAppointmentData {
  id: string;
  patient_id: string;
  provider_id: string;
  appointment_date: string;
  duration?: number;
  type?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending';
  notes?: string | null;
  created_at: string;
  updated_at: string;
  patient: { // Joined users table data
    id: string;
    email: string;
    // Use explicit name matching the select query alias
    patient_profile: { // Joined patient_profiles table data via explicit FK
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
}

export default function ProviderDashboardPage() {
  const { user, profile, isLoading: isAuthLoading, isProfileLoading } = useAuth();
  const router = useRouter();

  // State for appointments - Use the specific type
  const [upcomingAppointments, setUpcomingAppointments] = useState<ProviderDashboardAppointmentData[]>([]);
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
        console.log(`Fetching provider profile ID for user ID: ${user.id}`);
        const { data: providerData, error: providerError } = await supabase
          .from('providers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle(); // Use maybeSingle() instead of single()

        // Handle potential errors from the query itself
        if (providerError) {
          console.error('Supabase error fetching provider profile:', providerError);
          throw new Error(providerError.message);
        }

        // Handle case where no provider profile is found for the user
        if (!providerData) {
            console.error(`No provider profile found for user ID: ${user.id}`);
            // Set a specific error message for the UI
            setErrorAppointments("Provider profile not found. Cannot fetch appointments.");
            setLoadingAppointments(false); // Stop loading as we can't proceed
            setUpcomingAppointments([]); // Ensure appointments are cleared
            return; // Exit the function early
        }

        const providerProfileId = providerData.id;
        console.log(`Found provider profile ID: ${providerProfileId}`);

        // 2. Fetch appointments using the found providerProfileId
        console.log(`Fetching appointments for provider profile ID: ${providerProfileId}`);
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            duration,
            type,
            patient:users!appointments_patient_id_users_id_fk (
              id,
              email,
              patient_profile:patient_profiles (
                first_name,
                last_name
              )
            )
          `)
          .eq('provider_id', providerProfileId)
          .gte('appointment_date', new Date().toISOString())
          .in('status', ['scheduled', 'pending']) // Only scheduled/pending
          .order('appointment_date', { ascending: true })
          .limit(5); // Limit for dashboard widget

        if (error) {
          console.error('Supabase error fetching appointments:', error);
          throw error;
        }
        
        console.log('Provider Dashboard: Raw appointment data fetched:', data);
        
        // Explicitly map the raw data to the ProviderDashboardAppointmentData type
        const mappedData: ProviderDashboardAppointmentData[] = (data || []).map((rawAppt: any) => {
          // Access the nested data using the select query aliases
          const patientProfileData = rawAppt.patient?.patient_profile;
          return {
            id: rawAppt.id,
            patient_id: rawAppt.patient_id,
            provider_id: rawAppt.provider_id,
            appointment_date: rawAppt.appointment_date,
            duration: rawAppt.duration,
            type: rawAppt.type,
            status: rawAppt.status ?? 'pending', 
            notes: rawAppt.notes,
            created_at: rawAppt.created_at,
            updated_at: rawAppt.updated_at,
            patient: rawAppt.patient ? { 
              id: rawAppt.patient.id,
              email: rawAppt.patient.email,
              patient_profile: patientProfileData ? { // Use patient_profile alias
                first_name: patientProfileData.first_name,
                last_name: patientProfileData.last_name,
              } : null,
            } : null,
          };
        });
        
        // Set state with the explicitly mapped data
        setUpcomingAppointments(mappedData);

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
                              Patient: {appointment.patient?.patient_profile?.first_name ? `${appointment.patient.patient_profile.first_name} ${appointment.patient.patient_profile.last_name}` : 'N/A'}
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