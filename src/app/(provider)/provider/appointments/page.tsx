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
import { useTheme } from '@mui/material/styles';

// Define structure for fetched appointment with patient details
export interface FetchedAppointment extends Omit<Appointment, 'patient' | 'provider' | 'status'> {
  patient_profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  status: Appointment['status']; // Use union type
}

// --- Define DayWithIndicator outside the main component ---
// It receives appointments via slotProps
function DayWithIndicator(props: PickersDayProps<Date> & { appointments?: FetchedAppointment[] }) {
  // Make appointments prop optional here and check for it
  const { day, outsideCurrentMonth, appointments = [], selected, ...other } = props; 
  const theme = useTheme();
  // Log props received
  console.log("DayWithIndicator - Day:", day, "Appointments prop:", appointments?.length); // Log length for brevity
  
  // Check appointments on this specific day
  const appointmentsOnDay = appointments.filter(appointment => 
    !outsideCurrentMonth && appointment && appointment.appointment_date && isSameDay(parseISO(appointment.appointment_date), day)
  );
  // Log filtered results
  console.log("DayWithIndicator - Day:", day, "Filtered appointmentsOnDay:", appointmentsOnDay);
  
  const hasAppointment = appointmentsOnDay.length > 0;
  const hasOnlyCancelled = hasAppointment && appointmentsOnDay.every(appt => appt.status === 'cancelled');
  const hasActiveAppointment = hasAppointment && !hasOnlyCancelled;
  const isSelected = selected;

  let daySx = {};
  if (hasOnlyCancelled) {
    // Only cancelled appt -> Orange background
    daySx = {
      // Use theme color
      backgroundColor: theme.palette.warning.main + ' !important',
      color: theme.palette.warning.contrastText + ' !important', 
      borderRadius: '50%',
      border: 'none',
      '&:hover': {
         // Use theme color
        backgroundColor: theme.palette.warning.dark + ' !important',
      }
    };
  } else if (hasActiveAppointment) {
    // Active appt -> Blue background
     daySx = {
      backgroundColor: theme.palette.primary.main + ' !important',
      color: theme.palette.primary.contrastText + ' !important',
      borderRadius: '50%',
      border: 'none',
      '&:hover': {
        backgroundColor: theme.palette.primary.dark + ' !important',
      },
      // Keep selection style consistent if needed
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
// --- End DayWithIndicator definition ---

export default function ProviderAppointmentsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [appointments, setAppointments] = useState<FetchedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [menuTargetAppointment, setMenuTargetAppointment] = useState<FetchedAppointment | null>(null);
  const menuOpen = Boolean(anchorEl);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<FetchedAppointment | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, appointmentId: string) => {
    const targetAppointment = appointments.find(a => a.id === appointmentId);
    setAnchorEl(event.currentTarget);
    setSelectedAppointmentId(appointmentId);
    setMenuTargetAppointment(targetAppointment || null);
    console.log("Menu opened for appointment:", targetAppointment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAppointmentId(null);
    setMenuTargetAppointment(null);
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
          // Corrected nested join query syntax - Removed comment
          .select(`
            *,
            patient:users!appointments_patient_id_users_id_fk ( 
              id,
              email,
              patient_profiles ( 
                first_name,
                last_name
              )
            )
          `)
        .eq('provider_id', providerProfileId) // Keep filter by profile ID for now
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
        
        // Ensure the fetched data structure matches FetchedAppointment with safe mapping
        const typedAppointments: FetchedAppointment[] = (appointmentsData || []).map(apptInput => {
            const appt = apptInput as any; // Cast input to any to simplify

            // Restore original logic for extracting nested patient profile data
           let patientProfileData: FetchedAppointment['patient_profiles'] = null;
           
            // Check if the nested patient profile data exists and has the expected shape
            if (appt.patient && 
                appt.patient.patient_profile && 
                typeof appt.patient.patient_profile === 'object' && 
                'first_name' in appt.patient.patient_profile && 
                'last_name' in appt.patient.patient_profile) {
                
                const validPatientProfile = appt.patient.patient_profile as { 
                    first_name: string | null;
                    last_name: string | null;
                };
                patientProfileData = {
                    first_name: validPatientProfile.first_name,
                    last_name: validPatientProfile.last_name,
                };
            } else if (appt.patient) {
                console.warn("Patient/Profile data received but has unexpected structure:", appt.patient);
            }
            

            // Validate status
            let validStatus: Appointment['status'] = 'pending'; // Default if invalid/missing
            const possibleStatuses: Appointment['status'][] = ['scheduled', 'completed', 'cancelled', 'pending'];
            if (appt.status && possibleStatuses.includes(appt.status)) {
                validStatus = appt.status as Appointment['status'];
            } else if (appt.status) {
                console.warn(`Invalid status value received from DB: ${appt.status}, defaulting to 'pending'.`);
            }

            // Construct the final object conforming to FetchedAppointment
            const finalAppointment: FetchedAppointment = {
                 id: appt.id,
                 patient_id: appt.patient_id,
                 provider_id: appt.provider_id,
                 appointment_date: appt.appointment_date,
                 duration: appt.duration,
                 type: appt.type,
                 status: validStatus, // Assign validated status
                 notes: appt.notes,
                 created_at: appt.created_at,
                 updated_at: appt.updated_at,
                 patient_profiles: patientProfileData, // Assign the extracted/null data
            };
            return finalAppointment;
        }); // No final cast needed
        
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
  
  const filteredAppointments = appointments.filter(appointment => {
    // Add logging inside the filter
    const isDateSelected = !!selectedDate;
    let appointmentDateParsed: Date | null = null;
    let datesMatch = false;
    if (appointment?.appointment_date) {
      try {
        appointmentDateParsed = parseISO(appointment.appointment_date);
      } catch (e) {
        console.error('Error parsing appointment date in filter:', appointment.appointment_date, e);
      }
    }
    if (isDateSelected && appointmentDateParsed && selectedDate) {
        datesMatch = isSameDay(appointmentDateParsed, selectedDate);
    }
    // Log comparison details
    console.log(`Filtering Appt ID: ${appointment?.id}, Appt Date: ${appointment?.appointment_date}, Parsed: ${appointmentDateParsed}, Selected: ${selectedDate}, Match: ${datesMatch}`);
    
    return selectedDate && appointmentDateParsed && datesMatch;
  });

  // Add log here to check final state before render
  console.log("ProviderAppointmentsPage: Rendering with appointments state:", appointments);

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
            <MenuItem 
              onClick={handleEdit} 
              disabled={!menuTargetAppointment || menuTargetAppointment.status === 'cancelled' || menuTargetAppointment.status === 'completed'}
            >
              Edit Details
            </MenuItem>
            <MenuItem 
              onClick={handleComplete} 
              disabled={!menuTargetAppointment || menuTargetAppointment.status === 'completed' || menuTargetAppointment.status === 'cancelled'}
            >
              Mark as Complete
            </MenuItem>
            <MenuItem 
              onClick={handleCancel} 
              sx={{ color: 'error.main' }} 
              disabled={!menuTargetAppointment || menuTargetAppointment.status === 'cancelled' || menuTargetAppointment.status === 'completed'}
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