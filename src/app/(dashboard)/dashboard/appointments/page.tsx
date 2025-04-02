'use client';

import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, isSameDay } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { EventNote } from '@mui/icons-material';

interface Provider {
  first_name: string;
  last_name: string;
  specialization: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;
  appointment_date: string;
  status: string;
  type: string;
  notes: string;
  created_at: string;
  provider?: Provider;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        // Get the current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error fetching user:', userError);
          setError('Error fetching user data. Please try again later.');
          setLoading(false);
          return;
        }
        
        if (!userData.user) {
          console.error('No user data available');
          setError('User data not available. Try refreshing the page.');
          setLoading(false);
          return;
        }

        // Attempt to fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userData.user.id)
          .single();

        // If the profiles table doesn't exist or there's another error, use the user's ID directly
        let patientId;
        if (profileError) {
          console.warn('Profile fetch error:', profileError.message);
          if (profileError.message.includes('relation "public.profiles" does not exist')) {
            console.log('Using mock patient ID for development');
            // Use mock data for development
            patientId = '1'; // Mock patient ID
            setError(null); // Clear any previous errors
          } else {
            setError(`Error fetching profile: ${profileError.message}`);
            setLoading(false);
            return;
          }
        } else {
          patientId = profile.id;
        }

        // Mock appointment data for development
        if (profileError && profileError.message.includes('relation "public.profiles" does not exist')) {
          const mockAppointments: Appointment[] = [
            {
              id: '1',
              patient_id: '1',
              provider_id: '101',
              appointment_date: new Date().toISOString(),
              status: 'scheduled',
              type: 'Initial Consultation',
              notes: 'Please arrive 15 minutes early to fill out paperwork.',
              created_at: new Date().toISOString(),
              provider: {
                first_name: 'Jane',
                last_name: 'Smith',
                specialization: 'Pediatric Therapy'
              }
            },
            {
              id: '2',
              patient_id: '1',
              provider_id: '102',
              appointment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week later
              status: 'scheduled',
              type: 'Follow-up',
              notes: '',
              created_at: new Date().toISOString(),
              provider: {
                first_name: 'Robert',
                last_name: 'Johnson',
                specialization: 'Speech Therapy'
              }
            }
          ];
          setAppointments(mockAppointments);
          setLoading(false);
          return;
        }

        // Only attempt to fetch from database if the table exists
        const { data, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            provider:profiles!provider_id (
              first_name,
              last_name,
              specialization
            )
          `)
          .eq('patient_id', patientId)
          .eq('status', 'scheduled')
          .order('appointment_date');

        if (appointmentsError) {
          // If appointments table doesn't exist, use mock data
          if (appointmentsError.message.includes('relation "public.appointments" does not exist')) {
            console.log('Using mock appointment data for development');
            const mockAppointments: Appointment[] = [
              {
                id: '1',
                patient_id: '1',
                provider_id: '101',
                appointment_date: new Date().toISOString(),
                status: 'scheduled',
                type: 'Initial Consultation',
                notes: 'Please arrive 15 minutes early to fill out paperwork.',
                created_at: new Date().toISOString(),
                provider: {
                  first_name: 'Jane',
                  last_name: 'Smith',
                  specialization: 'Pediatric Therapy'
                }
              },
              {
                id: '2',
                patient_id: '1',
                provider_id: '102',
                appointment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week later
                status: 'scheduled',
                type: 'Follow-up',
                notes: '',
                created_at: new Date().toISOString(),
                provider: {
                  first_name: 'Robert',
                  last_name: 'Johnson',
                  specialization: 'Speech Therapy'
                }
              }
            ];
            setAppointments(mockAppointments);
            setError(null);
          } else {
            setError(`Error fetching appointments: ${appointmentsError.message}`);
          }
        } else {
          setAppointments(data || []);
          setError(null);
        }
      } catch (err) {
        console.error('Error in fetchAppointments:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

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

  const filteredAppointments = appointments.filter(appointment =>
    selectedDate && isSameDay(parseISO(appointment.appointment_date), selectedDate)
  );

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
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Appointments
        </Typography>

        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
          <Paper sx={{ flex: 1, p: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateCalendar
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
              />
            </LocalizationProvider>
          </Paper>

          <Paper sx={{ flex: 2, p: 2 }}>
            <List>
              {filteredAppointments.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <EventNote sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    No appointments scheduled for this day
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try selecting a different date or book a new appointment
                  </Typography>
                </Box>
              ) : (
                filteredAppointments.map((appointment) => (
                  <ListItem
                    key={appointment.id}
                    divider
                    button
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setDialogOpen(true);
                    }}
                  >
                    <ListItemText
                      primary={`Dr. ${appointment.provider?.first_name} ${appointment.provider?.last_name}`}
                      secondary={format(parseISO(appointment.appointment_date), 'MMMM d, yyyy h:mm a')}
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        <Chip label={appointment.type} color="primary" size="small" />
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Box>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          {selectedAppointment && (
            <>
              <DialogTitle>Appointment Details</DialogTitle>
              <DialogContent>
                <Box sx={{ py: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Provider: Dr. {selectedAppointment.provider?.first_name} {selectedAppointment.provider?.last_name}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Specialization: {selectedAppointment.provider?.specialization}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Type: {selectedAppointment.type}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Date: {format(parseISO(selectedAppointment.appointment_date), 'MMMM d, yyyy h:mm a')}
                  </Typography>
                  {selectedAppointment.notes && (
                    <Typography variant="subtitle1" gutterBottom>
                      Notes: {selectedAppointment.notes}
                    </Typography>
                  )}
                </Box>
              </DialogContent>
              <DialogActions>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleCancelAppointment(selectedAppointment.id)}
                  >
                    Cancel Appointment
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>Close</Button>
                </Stack>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </Container>
  );
} 