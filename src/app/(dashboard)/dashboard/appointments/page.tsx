'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Snackbar,
  Badge,
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { format, parseISO, isSameDay } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { EventNote } from '@mui/icons-material';
import BookAppointmentModal from '@/components/appointments/BookAppointmentModal';
import { useAuth } from '@/contexts/AuthContext';
import { getAvailableSlots, bookAppointment } from '../../../../actions/appointmentActions';
import { Alert as MuiAlert } from '@mui/material';

interface ProviderInfo {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  specialization: string | null;
}

interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;
  appointment_date: string;
  status: string;
  notes?: string | null;
  created_at: string;
  provider?: ProviderInfo | null;
}

export default function AppointmentsPage() {
  const { user, session } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<ProviderInfo[]>([]);
  const [fetchingProviders, setFetchingProviders] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      setFetchingProviders(true);
      try {
        const { data, error: providerError } = await supabase
          .from('providers')
          .select('id, user_id, first_name, last_name, specialization');
        
        if (providerError) throw providerError;
        
        setAvailableProviders(data || []);
      } catch (err: any) {
        console.error("Error fetching providers:", err);
        setError('Could not load provider list. Please try again later.');
      } finally {
        setFetchingProviders(false);
      }
    };
    fetchProviders();
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user) {
        console.log("Fetch appointments waiting for user...");
        setLoading(false);
        return;
      }
      console.log("Fetching appointments for user ID:", user.id); // Auth User ID

      // 1. Get the Patient Profile ID using the Auth User ID
      const { data: patientData, error: profileError } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !patientData) {
        console.error("Error fetching patient profile ID for appointments page:", profileError);
        setError("Could not fetch patient profile information.");
        setAppointments([]);
        setLoading(false);
        return;
      }
      
      const patientProfileId = patientData.id;
      console.log("Found patient profile ID for appointments page:", patientProfileId);

      // 2. Fetch appointments using the Patient Profile ID
      const { data, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          provider_id,
          appointment_date,
          status,
          notes,
          created_at,
          provider:providers (
            id,
            user_id,
            first_name,
            last_name,
            specialization
          )
        `)
        .eq('patient_id', patientProfileId)
        .order('appointment_date');

      if (appointmentsError) {
        console.error("Error fetching appointments:", appointmentsError);
        setError(`Error fetching appointments: ${appointmentsError.message}`);
        setAppointments([]);
      } else {
        console.log("Fetched appointments data:", data);

        // Correctly map the fetched data, handling the possibility of providers being an array
        const typedAppointments: Appointment[] = (data || []).map(appt => {
          // Ensure we are accessing the aliased 'provider' field from the fetched data
          const providerRelation = appt.provider as unknown as ProviderInfo | null;
          // The check for array is likely no longer needed with the alias, but keeping for safety
          const providerData = Array.isArray(providerRelation) ? providerRelation[0] : providerRelation;
          
          return {
            id: appt.id,
            patient_id: patientProfileId,
            provider_id: appt.provider_id,
            appointment_date: appt.appointment_date,
            status: appt.status,
            notes: appt.notes, // Directly assign notes (already string | null)
            created_at: appt.created_at,
            // Assign to the 'provider' field (singular) in the typed object
            provider: providerData ? { 
              id: providerData.id,
              user_id: providerData.user_id,
              first_name: providerData.first_name,
              last_name: providerData.last_name,
              specialization: providerData.specialization
            } : null
          };
        });

        setAppointments(typedAppointments);
        setError(null);
      }
    } catch (err) {
      console.error('Error in fetchAppointments:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during appointment fetch');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]); // Add supabase to dependency array

  useEffect(() => {
    console.log("Appointments Page: useEffect for fetch triggered. User:", user);
    if(user) {
      console.log("Appointments Page: Calling fetchAppointments...");
      fetchAppointments();
    } else {
      console.log("Appointments Page: User not available yet, clearing appointments.");
      setAppointments([]);
      setLoading(false);
    }
  }, [user, fetchAppointments]);

  // Log the state whenever it changes
  useEffect(() => {
    console.log("Appointments Page: appointments state updated:", appointments);
  }, [appointments]);

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prevAppointments =>
        prevAppointments.filter(appointment => appointment.id !== appointmentId)
      );
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while cancelling appointment');
    }
  };

  const handleBookAppointment = async (bookingDetails: { 
    providerId: string; 
    dateTime: Date; 
    notes: string; 
    patientId: string;
    accessToken: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!bookingDetails.patientId || !bookingDetails.accessToken) {
        console.error("Booking handler missing patientId or accessToken");
        return { success: false, error: "Authentication details missing." };
    }

    console.log("Page requesting booking via server action (using passed details):", bookingDetails);

    try {
      const result = await bookAppointment(
          bookingDetails.patientId,    // 1. patientId (string)
          bookingDetails.providerId,   // 2. providerId (string)
          bookingDetails.dateTime.toISOString(), // 3. dateTime (pass as ISO string)
          60, // 4. duration (Assuming 60 minutes, adjust if needed)
          'consultation', // 5. appointmentType (Assuming default, adjust if needed)
          bookingDetails.notes       // 6. notes (string | null)
      );

      if (result.success) {
        setIsBookingModalOpen(false);
        setSnackbar({ open: true, message: 'Appointment booked successfully!', severity: 'success' });
        fetchAppointments();
        return { success: true };
      } else {
        console.error("Booking failed (from server action):", result.error);
        setSnackbar({ open: true, message: `Booking failed: ${result.error}`, severity: 'error' });
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      console.error("Unexpected error calling bookAppointment action:", err);
      setSnackbar({ open: true, message: `Booking failed: ${err.message || 'An unexpected server error occurred.'}`, severity: 'error' });
      return { success: false, error: err.message || 'An unexpected server error occurred.' };
    }
  };

  const filteredAppointments = appointments.filter(appointment =>
    selectedDate && isSameDay(parseISO(appointment.appointment_date), selectedDate)
  );

  // Add this function to mark dates with appointments
  const hasAppointmentOnDate = (date: Date) => {
    return appointments.some(appointment => 
      isSameDay(parseISO(appointment.appointment_date), date)
    );
  };

  // Custom Day component for the calendar
  function DayWithIndicator(props: PickersDayProps<Date>) {
    const { day, outsideCurrentMonth, ...other } = props;
    // Check if there's an appointment on this specific day
    const hasAppointment = appointments.some(appointment => 
      isSameDay(parseISO(appointment.appointment_date), day)
    );

    return (
      // Apply conditional styling directly to PickersDay
      <PickersDay 
        {...other} 
        outsideCurrentMonth={outsideCurrentMonth} 
        day={day} 
        // Apply sx prop with theme callback for dynamic styling
        sx={(theme) => ({
          // Base styles for the day can go here if needed
          // Conditional styles for the blue circle
          ...(hasAppointment && !outsideCurrentMonth && { 
            border: `2px solid ${theme.palette.primary.main}`, // Blue border using theme color
            borderRadius: '50%', // Makes the border circular
          }),
        })}
      />
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" gutterBottom>
            My Appointments
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ py: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4">My Appointments</Typography>
            <Button 
              variant="contained" 
              startIcon={<EventNote />} 
              onClick={() => setIsBookingModalOpen(true)}
              disabled={fetchingProviders || availableProviders.length === 0 || !user?.id}
            >
              Book New Appointment
            </Button>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <DateCalendar
                  value={selectedDate}
                  onChange={(newDate) => setSelectedDate(newDate)}
                  slots={{
                    day: DayWithIndicator,
                  }}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={8}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedDate ? `Appointments for ${format(selectedDate, 'MMMM d, yyyy')}` : 'Select a date to view appointments'}
                </Typography>
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <CircularProgress />
                  </Box>
                ) : filteredAppointments.length > 0 ? (
                  <List disablePadding>
                    {filteredAppointments.map((appointment) => {
                      const isCancelled = appointment.status === 'cancelled';
                      return (
                        <ListItem 
                          key={appointment.id} 
                          button 
                          onClick={() => {
                              setSelectedAppointment(appointment);
                              setDialogOpen(true);
                          }}
                          divider
                          sx={{ opacity: isCancelled ? 0.6 : 1 }}
                        >
                          <ListItemText
                            primary={
                              <Typography 
                                component="span" 
                                variant="body1"
                                sx={{ textDecoration: isCancelled ? 'line-through' : 'none' }}
                              >
                                {appointment.provider?.first_name && appointment.provider?.last_name 
                                  ? `Dr. ${appointment.provider.first_name} ${appointment.provider.last_name}`
                                  : 'Provider details unavailable'}
                              </Typography>
                            }
                            secondary={
                              <Stack component="span" direction="row" spacing={1} alignItems="center">
                                 <Typography component="span" variant="body2" color="text.secondary">
                                  {format(parseISO(appointment.appointment_date), 'p')} - {appointment.provider?.specialization || 'Specialty N/A'}
                                </Typography>
                                <Chip 
                                  label={appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                  size="small" 
                                  color={isCancelled ? 'error' : (appointment.status === 'completed' ? 'success' : 'primary')}
                                  sx={{ height: 'auto', '& .MuiChip-label': { py: 0.2, px: 0.8 } }}
                                />
                              </Stack>
                            }
                            secondaryTypographyProps={{ component: 'div' }} 
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                ) : (
                  <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
                    No appointments scheduled for this date.
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {selectedAppointment && (
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogContent dividers>
              {selectedAppointment.provider && (
                 <Typography gutterBottom><b>Provider:</b> Dr. {selectedAppointment.provider.first_name} {selectedAppointment.provider.last_name} ({selectedAppointment.provider.specialization})</Typography>
              )}
              <Typography gutterBottom><b>Date & Time:</b> {format(parseISO(selectedAppointment.appointment_date), 'PPP p')}</Typography>
              <Typography gutterBottom><b>Status:</b> <Chip label={selectedAppointment.status} size="small" color={selectedAppointment.status === 'scheduled' ? 'primary' : 'default'} /></Typography>
              {selectedAppointment.notes && <Typography gutterBottom><b>Notes:</b> {selectedAppointment.notes}</Typography>}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
              {selectedAppointment.status === 'scheduled' && (
                <Button onClick={() => handleCancelAppointment(selectedAppointment.id)} color="error">
                  Cancel Appointment
                </Button>
              )}
            </DialogActions>
          </Dialog>
        )}

        <BookAppointmentModal
          open={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          availableProviders={availableProviders}
          onBookAppointment={handleBookAppointment}
          getAvailableSlots={getAvailableSlots}
          accessToken={session?.access_token}
          patientId={user?.id || ''}
        />

        <Snackbar 
          open={snackbar?.open || false} 
          autoHideDuration={6000} 
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <MuiAlert 
              elevation={6} 
              variant="filled" 
              onClose={() => setSnackbar(null)} 
              severity={snackbar?.severity || 'info'}
              sx={{ width: '100%' }} 
          >
              {snackbar?.message}
          </MuiAlert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
} 