'use client';

import React, { useState, useEffect } from 'react';
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

// Define structure for fetched appointment with patient details
export interface FetchedAppointment extends Omit<Appointment, 'patient' | 'provider'> {
  patient_profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export default function ProviderAppointmentsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [appointments, setAppointments] = useState<FetchedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date()); // Add state for selected date

  // State for Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const menuOpen = Boolean(anchorEl);

  // State for Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<FetchedAppointment | null>(null);

  // Add state for snackbar feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, appointmentId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedAppointmentId(appointmentId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAppointmentId(null);
  };

  // Placeholder Action Handlers
  const handleEdit = () => {
    // Find the full appointment object to edit
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

  // Function to handle saving changes from the modal
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

  useEffect(() => {
    const fetchAppointments = async () => {
      if (isAuthLoading) return; // Wait for auth
      
      if (!user) { // Handle case where user is definitely not logged in after loading
        setError("Provider not authenticated.");
        setLoading(false);
        setAppointments([]); // Clear any stale data
        return;
      }

      setLoading(true);
      setError(null);
      console.log(`Fetching appointments for provider user ID: ${user.id}`);

      try {
        // First get the provider profile ID linked to the auth user ID
        // This assumes providers table has a user_id column linked to auth.users.id
        // And the primary key of providers table is 'id' (UUID)
        const { data: providerData, error: providerError } = await supabase
          .from('providers')
          .select('id') // Select the provider table's primary key
          .eq('user_id', user.id)
          .single(); // Expect exactly one provider profile per user

        if (providerError || !providerData) {
          console.error("Error fetching provider profile ID:", providerError);
          throw new Error(providerError?.message || "Could not find provider profile for logged-in user.");
        }
        
        const providerProfileId = providerData.id;
        console.log(`Found provider profile ID: ${providerProfileId}`);

        // Now fetch appointments using the provider profile ID
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
          console.error("Error fetching appointments with patient names:", fetchError);
           // Check for relation error specifically
           if (fetchError.message.includes('relation "patient_profiles" does not exist')) {
             setError('Database schema error: Relation between appointments and patient_profiles not found.');
           } else {
             setError(fetchError.message || 'Failed to fetch appointments.');
           }
           setAppointments([]); // Clear data on fetch error
        } else {
          console.log("Fetched provider appointments:", appointmentsData);
          // Ensure the fetched data structure matches FetchedAppointment
           const typedAppointments = (appointmentsData || []).map(appt => ({ 
              ...appt, 
              patient_profiles: appt.patient_profiles || null // Handle potential null join
            })) as FetchedAppointment[];
          setAppointments(typedAppointments);
        }
      } catch (err: any) {
        // Catch errors from fetching provider ID or appointments
        setError(err.message || 'An unexpected error occurred.');
        console.error("Caught error during fetch:", err);
        setAppointments([]); // Clear data on error
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user, isAuthLoading, supabase]); // Add supabase to dependencies

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

  // Filter appointments based on selectedDate
  const filteredAppointments = appointments.filter(appointment =>
    selectedDate && isSameDay(parseISO(appointment.appointment_date), selectedDate)
  );

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
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Calendar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 1 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateCalendar
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
              />
            </LocalizationProvider>
          </Paper>
        </Grid>

        {/* Appointments List */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Schedule for: {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </Typography>
              {filteredAppointments.length === 0 ? (
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 5 }}>
                No appointments scheduled for this day.
              </Typography>
            ) : (
              <List disablePadding>
                {filteredAppointments.map((appointment, index) => (
                  <React.Fragment key={appointment.id}>
                  <ListItem
                       secondaryAction={
                        <IconButton 
                           edge="end" 
                           aria-label="actions" 
                           onClick={(e) => handleMenuClick(e, appointment.id)}
                         >
                          <MoreVertIcon />
                        </IconButton>
                      }
                  >
                    <ListItemText
                        primary={`${format(parseISO(appointment.appointment_date), 'h:mm a')}`}
                        // Display Patient Name Safely
                        secondary={`Patient: ${appointment.patient_profiles?.first_name || 'N/A'} ${appointment.patient_profiles?.last_name || ''}`}
                      />
                      <Chip 
                         label={appointment.status}
                         color={getStatusColor(appointment.status)}
                         size="small" 
                         sx={{ ml: 2 }}
                       />
                  </ListItem>
                    {index < filteredAppointments.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
              )}
          </Paper>
        </Grid>
      </Grid>
    );
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Schedule
                  </Typography>
        
        {renderContent()}

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
        >
          <MenuItem
             onClick={handleEdit}
             disabled={appointments.find(a => a.id === selectedAppointmentId)?.status !== 'scheduled'}
          >
            Edit Details
          </MenuItem>
          <MenuItem
             onClick={handleComplete}
             disabled={appointments.find(a => a.id === selectedAppointmentId)?.status !== 'scheduled'}
           >
             Mark as Complete
           </MenuItem>
          <MenuItem
             onClick={handleCancel} sx={{ color: 'error.main' }}
             disabled={appointments.find(a => a.id === selectedAppointmentId)?.status !== 'scheduled'}
                  >
                    Cancel Appointment
           </MenuItem>
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

        {/* Snackbar for feedback - Conditionally render the whole Snackbar */} 
        {snackbar && (
          <Snackbar 
            open={snackbar.open} // Use the open state from the snackbar object
            autoHideDuration={6000} 
            onClose={() => setSnackbar(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            {/* Now Alert is always rendered when Snackbar is, no conditional null needed here */} 
            <MuiAlert 
                onClose={() => setSnackbar(null)} 
                severity={snackbar.severity} 
                variant="filled" 
                sx={{ width: '100%' }}
            >
            {snackbar.message}
            </MuiAlert>
          </Snackbar>
        )}
      </Box>
    </Container>
  );
} 