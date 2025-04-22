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
  useTheme,
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
import {
  getAvailableSlots,
  bookAppointment,
  getAppointmentsForUser,
  updateAppointmentStatus
} from '../../../../actions/appointmentActions';
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

      // Call the server action instead of direct Supabase client call
      const fetchedAppointments = await getAppointmentsForUser(user.id, 'patient');

      // Check if the server action returned an error (though it returns empty array on error currently)
      // You might want to enhance getAppointmentsForUser to return an error object for better handling
      if (!Array.isArray(fetchedAppointments)) {
          // Handle cases where the action might return something unexpected
          // For now, assuming it returns [] on error based on its implementation
          console.error("Error fetching appointments: Server action did not return an array.");
          setError("Failed to fetch appointments.");
          setAppointments([]);
      } else {
           console.log("Fetched appointments data via server action:", fetchedAppointments);

           // Map the result from the server action.
           // The server action should already return data in the correct Appointment[] format.
           // However, the server action currently doesn't join provider details.
           // If provider details are needed here, the server action needs enhancement,
           // or a separate fetch for provider details based on provider_id is required.
           const typedAppointments: Appointment[] = fetchedAppointments.map(appt => ({
               ...appt,
               // Explicitly set provider to null/undefined if not included by server action
               provider: appt.provider || undefined, // Or fetch separately if needed
            }));

           setAppointments(typedAppointments);
           setError(null);
      }

    } catch (err) {
      console.error('Error in fetchAppointments (calling server action):', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred calling the appointment fetch action');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
    console.log(`Attempting to cancel appointment ID: ${appointmentId}`);
    try {
      // Call the server action to update the status
      const result = await updateAppointmentStatus(appointmentId, 'cancelled');

      if (result.success) {
        console.log(`Successfully cancelled appointment ID: ${appointmentId}`);
        // Refetch appointments to get the updated list including the cancelled one
        await fetchAppointments(); 
        setSnackbar({ open: true, message: 'Appointment cancelled.', severity: 'success' });
        setDialogOpen(false); // Close the dialog
      } else {
        console.error(`Failed to cancel appointment: ${result.error}`);
        setError(result.error || 'Failed to cancel appointment. Please try again.');
        setSnackbar({ open: true, message: `Error: ${result.error || 'Could not cancel appointment.'}`, severity: 'error' });
      }
    } catch (err) {
      console.error('Unexpected error during cancellation:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while cancelling the appointment';
      setError(message);
      setSnackbar({ open: true, message: `Error: ${message}`, severity: 'error' });
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
    const { day, outsideCurrentMonth, selected, ...other } = props;
    const theme = useTheme();

    const appointmentsOnDay = appointments.filter(appointment => 
        !outsideCurrentMonth && isSameDay(parseISO(appointment.appointment_date), day)
    );

    const hasAppointment = appointmentsOnDay.length > 0;
    const hasOnlyCancelled = hasAppointment && appointmentsOnDay.every(appt => appt.status === 'cancelled');
    const hasActiveAppointment = hasAppointment && !hasOnlyCancelled;
    const isSelected = selected;

    let daySx = {};
    // Apply warning (orange) style if the day only has cancelled appointments
    if (hasOnlyCancelled) {
      daySx = {
        backgroundColor: theme.palette.warning.main + ' !important', // Use warning color
        color: theme.palette.warning.contrastText + ' !important',
        borderRadius: '50%',
        border: 'none',
        '&:hover': {
          backgroundColor: theme.palette.warning.dark + ' !important', 
        }
        // Retain selection styles if needed, could override based on priority
        // '&.Mui-selected': { ... },
        // '&.Mui-selected:hover': { ... }
      };
    } else if (hasActiveAppointment) {
      // Existing styles for active appointments
      daySx = {
        backgroundColor: theme.palette.primary.main + ' !important',
        color: theme.palette.primary.contrastText + ' !important',
        borderRadius: '50%',
        border: 'none',
        '&:hover': {
          backgroundColor: theme.palette.primary.dark + ' !important',
        },
        '&.Mui-selected': {
          backgroundColor: theme.palette.primary.main + ' !important',
          color: theme.palette.primary.contrastText + ' !important',
        },
        '&.Mui-selected:hover': {
          backgroundColor: theme.palette.primary.dark + ' !important',
        },
      };
    }

    return (
      <PickersDay
        {...other}
        outsideCurrentMonth={outsideCurrentMonth}
        day={day}
        selected={isSelected} // Pass selection state
        sx={daySx}
      />
    );
  }

  // Wrapper function to adapt server action result for the modal
  const getSlotsForModal = async (providerId: string, dateStr: string): Promise<{ slots: string[] | null; error: string | null; }> => {
    try {
      // Call the server action which now returns the correct object structure
      const result = await getAvailableSlots(providerId, dateStr);
      
      // No need to adapt anymore, just return the result directly
      return result; 
    } catch (err: any) {
        console.error("Error fetching slots for modal:", err);
        return { slots: null, error: err.message || "Failed to fetch slots." };
    }
  };

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
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <DateCalendar
                    value={selectedDate}
                    onChange={(newDate) => setSelectedDate(newDate)}
                    loading={loading || fetchingProviders}
                    slots={{
                      day: DayWithIndicator,
                    }}
                  />
                </Box>
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
              <Typography gutterBottom component="div"><b>Status:</b> <Chip label={selectedAppointment.status} size="small" color={selectedAppointment.status === 'scheduled' ? 'primary' : 'default'} /></Typography>
              {selectedAppointment.notes && <Typography gutterBottom><b>Notes:</b> {selectedAppointment.notes}</Typography>}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
              {(selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'pending') && (
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
          getAvailableSlots={getSlotsForModal}
          accessToken={session?.access_token}
          patientId={user?.id || ''}
          existingAppointments={appointments}
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