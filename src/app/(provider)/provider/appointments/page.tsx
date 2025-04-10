'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Container, Paper, List, ListItem, ListItemText, Chip, CircularProgress, Alert, Divider, Stack, IconButton, Menu, MenuItem, Grid, Snackbar } from '@mui/material';
import { Alert as MuiAlert } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client'; // Adjust path if needed
import { format, parseISO, isSameDay } from 'date-fns';
import { Appointment } from '@/types'; // Assuming Appointment type includes nested patient/provider
import EditAppointmentModal from '@/components/appointments/EditAppointmentModal'; // Import the modal
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';

// Define structure for fetched appointment with patient details
export interface FetchedAppointment extends Omit<Appointment, 'patient' | 'provider'> {
  patient_profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

// --- Define DayWithIndicator outside the main component ---
// It receives appointments via slotProps
function DayWithIndicator(props: PickersDayProps<Date> & { appointments?: FetchedAppointment[] }) {
  // Make appointments prop optional here and check for it
  const { day, outsideCurrentMonth, appointments = [], ...other } = props; 
  
  // Check if there's an appointment on this specific day using passed state
  const hasAppointment = appointments.some(appointment => 
    appointment && appointment.appointment_date && isSameDay(parseISO(appointment.appointment_date), day)
  );

  return (
    <PickersDay 
      {...other} 
      outsideCurrentMonth={outsideCurrentMonth} 
      day={day} 
      sx={(theme) => ({
        ...(hasAppointment && !outsideCurrentMonth && { 
          border: `2px solid ${theme.palette.primary.main}`,
          borderRadius: '50%', 
        }),
      })}
    />
  );
}
// --- End DayWithIndicator definition ---

export default function ProviderAppointmentsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [appointments, setAppointments] = useState<FetchedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const menuOpen = Boolean(anchorEl);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<FetchedAppointment | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, appointmentId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedAppointmentId(appointmentId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAppointmentId(null);
  };

  const handleEdit = () => {
    const appointmentToEdit = appointments.find(a => a.id === selectedAppointmentId);
    if (appointmentToEdit) {
      setEditingAppointment(appointmentToEdit);
      setIsEditModalOpen(true);
      console.log("Opening edit modal for appointment ID:", selectedAppointmentId);
    } else {
      console.error("Could not find appointment to edit with ID:", selectedAppointmentId);
    }
    handleMenuClose();
  };

  const handleCancel = async () => {
    if (!selectedAppointmentId) {
      console.error("Cancel attempted with no appointment selected.");
      handleMenuClose();
      return;
    }

    const appointmentToCancelId = selectedAppointmentId;
    const previousAppointments = appointments;
    setAppointments(currentAppointments =>
      currentAppointments.map(app =>
        app.id === appointmentToCancelId ? { ...app, status: 'cancelled' } : app
      )
    );
    handleMenuClose();

    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentToCancelId);

      if (updateError) {
        console.error("Error updating appointment status to cancelled:", updateError);
        setError(`Failed to cancel appointment: ${updateError.message}`);
        setSnackbar({ open: true, message: `Error: ${updateError.message}`, severity: 'error' });
        setAppointments(previousAppointments); // Revert
      } else {
        console.log("Appointment cancelled successfully in DB:", appointmentToCancelId);
        setSnackbar({ open: true, message: 'Appointment cancelled.', severity: 'success' });
      }
    } catch (err: any) {
      console.error("Caught exception during cancellation:", err);
      setError(err.message || 'An unexpected error occurred during cancellation.');
      setSnackbar({ open: true, message: `Error: ${err.message || 'Unexpected error'}`, severity: 'error' });
      setAppointments(previousAppointments); // Revert
    }
  };

  const handleComplete = async () => {
    if (!selectedAppointmentId) {
      handleMenuClose();
      return;
    }
    const appointmentToCompleteId = selectedAppointmentId;
    const previousAppointments = appointments;
    
    // Optimistic UI Update
    setAppointments(currentAppointments =>
      currentAppointments.map(app =>
        app.id === appointmentToCompleteId ? { ...app, status: 'completed' } : app
      )
    );
     handleMenuClose();

    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentToCompleteId);

      if (updateError) {
        console.error("Error marking appointment as complete:", updateError);
        setError(`Failed to update appointment: ${updateError.message}`);
        setSnackbar({ open: true, message: `Error: ${updateError.message}`, severity: 'error' });
        setAppointments(previousAppointments); // Revert
      } else {
        console.log("Appointment marked as complete:", appointmentToCompleteId);
        setSnackbar({ open: true, message: 'Appointment marked as complete.', severity: 'success' });
      }
    } catch (err: any) {
      console.error("Caught exception during complete:", err);
      setError(err.message || 'An unexpected error occurred.');
      setSnackbar({ open: true, message: `Error: ${err.message || 'Unexpected error'}`, severity: 'error' });
      setAppointments(previousAppointments); // Revert
    }
  };

  const handleSaveChanges = async (updatedData: Partial<Appointment>) => {
    if (!updatedData.id) {
        const errorMsg = "Cannot save changes: Appointment ID missing.";
        console.error(errorMsg);
        setError(errorMsg);
        setSnackbar({ open: true, message: errorMsg, severity: 'error' });
        return; // Or throw error for modal
    }
    const originalAppointment = appointments.find(a => a.id === updatedData.id);
    if (!originalAppointment) {
        const errorMsg = "Error updating appointment state: Cannot find original appointment.";
        console.error(errorMsg);
        setError(errorMsg);
        setSnackbar({ open: true, message: errorMsg, severity: 'error' });
        return; // Or throw
    }

    // Optimistic update handled before calling this potentially now
    setIsEditModalOpen(false); // Close modal first

    try {
        const { error: updateError } = await supabase
            .from('appointments')
            .update({
                appointment_date: updatedData.appointment_date,
                notes: updatedData.notes
            })
            .eq('id', updatedData.id);

        if (updateError) {
            console.error("Error saving appointment changes:", updateError);
             // Revert optimistic update by resetting state
             setAppointments(currentAppointments =>
                 currentAppointments.map(app => app.id === updatedData.id ? originalAppointment : app)
             );
             setSnackbar({ open: true, message: `Error saving: ${updateError.message}`, severity: 'error' });
             // Maybe reopen modal? For now, just show snackbar
             // setIsEditModalOpen(true); 
            // Throw error for modal to potentially handle as well
             throw updateError; 
        }
        console.log("Appointment updated successfully:", updatedData.id);
         // Update local state definitively on success (already done optimistically)
        setAppointments(currentAppointments =>
            currentAppointments.map(app => 
                app.id === updatedData.id 
                ? { 
                    ...app, 
                    appointment_date: updatedData.appointment_date || app.appointment_date, 
                    notes: updatedData.notes !== undefined ? updatedData.notes : app.notes 
                  }
                : app
            )
        );
        setSnackbar({ open: true, message: 'Appointment details updated.', severity: 'success' });
        // Modal already closed optimistically
    } catch (err: any) {
        console.error("Caught exception during save changes:", err);
        // Revert if not already done by updateError block
        setAppointments(currentAppointments =>
            currentAppointments.map(app => app.id === updatedData.id ? originalAppointment : app)
        );
        setSnackbar({ open: true, message: `Error saving: ${err.message || 'Unexpected error'}`, severity: 'error' });
        // Re-throw the error so the modal might display it too, if it catches
        throw err; 
    }
  };

  const fetchAppointments = useCallback(async () => {
    if (!user) {
      console.log("fetchAppointments (Provider): User not available yet.");
      // Don't set loading to false here if auth is still loading
      if (!isAuthLoading) {
          setError("Provider not authenticated.");
          setAppointments([]);
          setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`Fetching appointments for provider user ID: ${user.id}`);

    try {
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
          .select('id')
          .eq('user_id', user.id)
          .single();

      if (providerError || !providerData) {
        console.error("Error fetching provider profile ID:", providerError);
        throw new Error(providerError?.message || "Could not find provider profile.");
      }

      const providerProfileId = providerData.id;
      console.log(`Found provider profile ID: ${providerProfileId}`);

      const { data: appointmentsData, error: fetchError } = await supabase
          .from('appointments')
          .select(`
            *,
          patient_profiles ( 
              first_name,
            last_name
          )
        `)
        .eq('provider_id', providerProfileId)
        .order('appointment_date', { ascending: true });

      if (fetchError) {
        console.error("Error fetching provider appointments:", fetchError);
        if (fetchError.message.includes('relation "patient_profiles" does not exist')) {
            setError('Database schema error: Relation between appointments and patient_profiles not found.');
        } else {
            setError(fetchError.message || 'Failed to fetch appointments.');
        }
        setAppointments([]);
      } else {
        // Log the raw data BEFORE mapping
        console.log("Fetched provider appointments data (raw from Supabase):", appointmentsData);
        
        // Ensure the fetched data structure matches FetchedAppointment
        const typedAppointments = (appointmentsData || []).map(appt => ({
          ...appt,
          // Ensure patient_profiles is correctly handled (might be null if join fails)
          patient_profiles: appt.patient_profiles || null 
        })) as FetchedAppointment[];
        
        console.log("Mapped appointments for state:", typedAppointments); // Log after mapping too
        setAppointments(typedAppointments);
        setError(null); // Clear previous errors on success
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred fetching appointments.');
      console.error("Caught error during provider appointment fetch:", err);
      setAppointments([]); // Clear data on error
      } finally {
        setLoading(false);
      }
  }, [user, isAuthLoading, supabase]);

  useEffect(() => {
    if (!isAuthLoading && user) {
        console.log("Auth loaded, user available. Triggering fetchAppointments.");
    fetchAppointments();
    } else if (!isAuthLoading && !user) {
        console.log("Auth loaded, no user. Setting error.");
        setError("Provider not authenticated.");
        setLoading(false);
        setAppointments([]);
    }
  }, [user, isAuthLoading, fetchAppointments]);

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

  const hasAppointmentOnDate = (date: Date) => {
    return appointments.some(appointment => 
      isSameDay(parseISO(appointment.appointment_date), date)
    );
  };

  if (loading || isAuthLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }
  
  const filteredAppointments = appointments.filter(appointment =>
    selectedDate && isSameDay(parseISO(appointment.appointment_date), selectedDate)
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom mb={3}>Provider Appointments</Typography>
        
        <Grid container spacing={3}>
          {/* Calendar */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <DateCalendar
                value={selectedDate}
                  onChange={(newDate) => setSelectedDate(newDate)}
                  slots={{
                     day: DayWithIndicator, // Reference the top-level component
                  }}
                  slotProps={{
                     day: { 
                       appointments: appointments 
                     } as any 
                  }}
                />
          </Paper>
          </Grid>

          {/* Appointments List */}
          <Grid item xs={12} md={8}>
             <Paper elevation={2} sx={{ p: 2 }}>
               <Typography variant="h6" gutterBottom>
                 Appointments for {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'selected date'}
               </Typography>
               <Divider sx={{ mb: 2 }}/>
               {filteredAppointments.length > 0 ? (
                 <List disablePadding>
                   {filteredAppointments.map((appointment) => (
                  <ListItem
                    key={appointment.id}
                    divider
                       secondaryAction={
                         <IconButton 
                            aria-label="actions"
                            aria-controls={`actions-menu-${appointment.id}`}
                            aria-haspopup="true"
                            onClick={(e) => handleMenuClick(e, appointment.id)}
                         >
                           <MoreVertIcon />
                         </IconButton>
                       }
                  >
                    <ListItemText
                         primary={
                           <Typography component="span" variant="body1">
                             {appointment.patient_profiles?.first_name} {appointment.patient_profiles?.last_name || 'Patient Name Unavailable'}
                           </Typography>
                         }
                         secondary={
                           <Stack component="span" direction="row" spacing={1} alignItems="center">
                             <Typography component="span" variant="body2" color="text.secondary">
                               {format(parseISO(appointment.appointment_date), 'p')}
                             </Typography>
                             <Chip 
                                label={appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                size="small" 
                                color={getStatusColor(appointment.status)}
                                sx={{ height: 'auto', '& .MuiChip-label': { py: 0.2, px: 0.8 } }}
                              />
                           </Stack>
                         }
                         secondaryTypographyProps={{ component: 'div' }}
                       />
                  </ListItem>
                   ))}
            </List>
               ) : (
                 <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
                   No appointments scheduled for this date.
                    </Typography>
                  )}
             </Paper>
          </Grid>
        </Grid>
        
         {/* Action Menu */}
         <Menu
            id="actions-menu"
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            MenuListProps={{
              'aria-labelledby': 'actions-button',
            }}
          >
            <MenuItem onClick={handleEdit}>Edit Details</MenuItem>
            <MenuItem onClick={handleComplete}>Mark as Complete</MenuItem>
            <MenuItem onClick={handleCancel} sx={{ color: 'error.main' }}>Cancel Appointment</MenuItem>
          </Menu>

        {/* Edit Modal */}
        {editingAppointment && (
           <EditAppointmentModal
             open={isEditModalOpen}
             onClose={() => setIsEditModalOpen(false)}
             appointment={editingAppointment} 
             onSave={handleSaveChanges} 
           />
         )}

         {/* Snackbar for feedback */}
         <Snackbar 
            open={snackbar?.open}
            autoHideDuration={6000} 
            onClose={() => setSnackbar(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} 
         >
            <MuiAlert 
               onClose={() => setSnackbar(null)} 
               severity={snackbar?.severity || 'info'} 
               sx={{ width: '100%' }} 
               variant="filled"
            >
               {snackbar?.message}
            </MuiAlert>
         </Snackbar>

    </Container>
    </LocalizationProvider>
  );
} 