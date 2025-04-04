'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Paper, List, ListItem, ListItemText, Chip, CircularProgress, Alert, Divider, Stack } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client'; // Adjust path if needed
import { format, parseISO } from 'date-fns';
import { Appointment } from '@/types'; // Assuming Appointment type includes nested patient/provider

// Define structure for fetched appointment with patient details
// Temporarily simplified: no patient details fetched
interface FetchedAppointment extends Omit<Appointment, 'patient' | 'provider'> {
  // No patient/user details for now
}

export default function ProviderAppointmentsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [appointments, setAppointments] = useState<FetchedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      // Wait for auth loading to finish and user object to be available
      if (isAuthLoading || !user) {
        // If auth isn't ready yet, don't proceed with fetching
        // If no user after loading, handle appropriately (e.g., set error or wait)
        if (!isAuthLoading && !user) {
          setError("User not authenticated.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      console.log(`Fetching appointments for provider ID: ${user.id}`);

      try {
        // Temporarily remove the join to isolate the issue
        const { data, error: fetchError } = await supabase
          .from('appointments')
          .select(`*`) // Fetch all columns from appointments only
          .eq('provider_id', user.id)
          .order('appointment_date', { ascending: true }); // Order by date

        if (fetchError) {
          console.error("Error fetching appointments:", fetchError);
          throw fetchError;
        }

        console.log("Fetched raw appointments:", data); // Log raw data
        // Cast might be needed depending on how Appointment type is defined
        setAppointments((data as FetchedAppointment[]) || []); 
      } catch (err: any) {
        setError(err.message || 'Failed to fetch appointments.');
        console.error("Caught error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
    // Re-fetch if user changes (e.g., re-login)
  }, [user, isAuthLoading]);

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'scheduled':
        return 'primary';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  // Render Logic
  const renderContent = () => {
    if (loading || isAuthLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      );
    }

    if (appointments.length === 0) {
      return (
        <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 5 }}>
          No appointments found.
        </Typography>
      );
    }

    return (
      <List disablePadding>
        {appointments.map((appointment, index) => (
          <React.Fragment key={appointment.id}>
            <ListItem sx={{ py: 2, px: 0 }}>
              <ListItemText
                primary={
                  <Typography variant="subtitle1">
                    {/* Temporarily show Patient ID instead of name */}
                    Patient ID: {appointment.patient_id || 'N/A'}
                  </Typography>
                }
                secondary={
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      {format(parseISO(appointment.appointment_date), 'MMMM d, yyyy \'at\' h:mm a')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Type: {appointment.type || 'N/A'}
                    </Typography>
                  </Stack>
                }
              />
              <Chip
                label={appointment.status}
                color={getStatusColor(appointment.status)}
                size="small"
              />
              {/* TODO: Add Action Button/Menu (Edit/Cancel/Complete) */}
            </ListItem>
            {index < appointments.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        Appointments
      </Typography>

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Upcoming Schedule
        </Typography>
        {renderContent()}
      </Paper>
    </Container>
  );
} 