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
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, isSameDay } from 'date-fns';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Provider {
  first_name: string;
  last_name: string;
  specialization: string;
}

interface Patient {
  first_name: string;
  last_name: string;
  email: string;
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
  patient?: Patient;
  provider?: Provider;
}

export default function ProviderAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) throw new Error('No profile found');

        const { data, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:profiles!patient_id (
              first_name,
              last_name,
              email
            )
          `)
          .eq('provider_id', profile.id)
          .eq('status', 'scheduled')
          .order('appointment_date');

        if (appointmentsError) throw appointmentsError;

        setAppointments(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [supabase]);

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prevAppointments =>
        prevAppointments.filter(appointment => appointment.id !== appointmentId)
      );
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating appointment');
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Today's Appointments
        </Typography>

        <Box sx={{ display: 'flex', gap: 4 }}>
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
                <ListItem>
                  <ListItemText primary="No appointments scheduled for this day" />
                </ListItem>
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
                      primary={`${appointment.patient?.first_name} ${appointment.patient?.last_name}`}
                      secondary={format(parseISO(appointment.appointment_date), 'h:mm a')}
                    />
                    <ListItemSecondaryAction>
                      <Chip label={appointment.type} color="primary" size="small" />
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
                    Patient: {selectedAppointment.patient?.first_name} {selectedAppointment.patient?.last_name}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Email: {selectedAppointment.patient?.email}
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
                    color="success"
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'completed')}
                  >
                    Mark as Completed
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'cancelled')}
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