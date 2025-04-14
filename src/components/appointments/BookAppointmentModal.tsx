import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Grid,
  Divider,
  Badge
} from '@mui/material';
import { DatePicker, DateTimePicker, LocalizationProvider, DateCalendar, PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { isValid, format, startOfDay, isSameDay, isBefore, addDays, isAfter, parseISO } from 'date-fns';
import { alpha, useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getAvailableSlots, getAvailableDatesForProvider } from '../../actions/appointmentActions'; // Import the new action

// Import the new server action
// import { getMonthlyAvailability } from '@/actions/appointmentActions'; // Adjust path if needed

// --- Types (Consider moving to shared types file) ---
interface ProviderInfo {
  id: string; // This should be the providers.id (PK)
  user_id: string; // The auth.users id
  first_name: string | null;
  last_name: string | null;
  specialization: string | null;
}

interface Appointment {
  appointment_date: string;
  status: string; // Add status
}

// --- Updated Props Interface ---
interface BookAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string; // Change back to required string
  availableProviders: ProviderInfo[];
  accessToken: string | null | undefined; 
  getAvailableSlots: (providerId: string, dateStr: string) => Promise<{ slots: string[] | null; error: string | null }>; 
  onBookAppointment: (bookingDetails: { 
      providerId: string; 
      dateTime: Date; 
      notes: string; 
      patientId: string; 
      accessToken: string; 
  }) => Promise<{ success: boolean; error?: string }>; 
  existingAppointments: Appointment[]; // Add prop for existing appointments
}

// --- Modal Style (Same as Edit Modal) ---
const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 600, md: 700 }, // Make wider for calendar
  maxHeight: '90vh', // Prevent excessive height
  overflowY: 'auto', // Allow scrolling
  bgcolor: 'background.paper',
  border: '1px solid #ccc',
  boxShadow: 24,
  p: 4,
};

// Custom Day component for the calendar inside the modal
function ModalDayWithIndicator(props: PickersDayProps<Date> & { 
  availableDates?: Set<string>; 
  existingAppointments?: Appointment[]; // Add prop for existing appointments
}) {
  const { day, outsideCurrentMonth, availableDates = new Set(), existingAppointments = [], selected, ...other } = props;
  const theme = useTheme();
  const dayFormatted = format(startOfDay(day), 'yyyy-MM-dd');
  
  // Check availability for the selected provider
  const isAvailable = !outsideCurrentMonth && availableDates.has(dayFormatted);
  
  // Check patient's existing appointments for this day
  const appointmentsOnDay = existingAppointments.filter(appt => 
    !outsideCurrentMonth && appt && appt.appointment_date && isSameDay(parseISO(appt.appointment_date), day)
  );
  const hasBookedAppointment = appointmentsOnDay.length > 0;
  const hasOnlyCancelled = hasBookedAppointment && appointmentsOnDay.every(appt => appt.status === 'cancelled');
  const hasActiveBooked = hasBookedAppointment && !hasOnlyCancelled;

  const isSelected = selected;

  let daySx = {};
  if (hasOnlyCancelled) {
    // Priority 1: Only cancelled booked appt -> Orange background
    daySx = {
      backgroundColor: theme.palette.warning.main + ' !important',
      color: theme.palette.warning.contrastText + ' !important',
      borderRadius: '50%',
      border: 'none',
      '&:hover': {
        backgroundColor: theme.palette.warning.dark + ' !important',
      }
    };
  } else if (hasActiveBooked) {
    // Priority 2: Active booked appt -> Blue background
    daySx = {
      backgroundColor: theme.palette.primary.main + ' !important',
      color: theme.palette.primary.contrastText + ' !important',
      borderRadius: '50%',
      border: 'none',
      '&:hover': {
        backgroundColor: theme.palette.primary.dark + ' !important',
      }
    };
  } else if (isSelected) {
      // Priority 3: Selected (and not booked) -> Blue background (standard selection)
      daySx = {
        backgroundColor: theme.palette.primary.main + ' !important',
        color: theme.palette.primary.contrastText + ' !important',
        borderRadius: '50%',
        border: 'none',
     };
  } else if (isAvailable) {
    // Priority 4: Available (and not booked/selected) -> Blue border
    daySx = {
      border: `2px solid ${theme.palette.primary.main}`,
      borderRadius: '50%',
    };
  }

  return (
    <PickersDay
      {...other}
      outsideCurrentMonth={outsideCurrentMonth}
      day={day}
      selected={isSelected && !hasBookedAppointment} // Only show MUI selection style if not booked
      disabled={hasBookedAppointment} // Disable booked dates
      sx={daySx}
    />
  );
}

// --- Component with Updated Props ---
export default function BookAppointmentModal({
  open,
  onClose,
  patientId, // Added patientId
  availableProviders,
  accessToken, // Destructure accessToken prop
  getAvailableSlots, // Use renamed prop
  onBookAppointment, // Use renamed prop
  existingAppointments, // Destructure existingAppointments prop
}: BookAppointmentModalProps) {
  // State
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(addDays(new Date(), 1)); // Default to tomorrow
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // State for available dates in the modal calendar
  const [modalAvailableDates, setModalAvailableDates] = useState<Set<string>>(new Set());
  const [fetchingModalAvailability, setFetchingModalAvailability] = useState(false);

  // Reset state when modal opens/closes or providers change
  useEffect(() => {
    if (open) {
        setSelectedProviderId('');
        setSelectedDate(addDays(new Date(), 1));
        setTimeSlots([]);
        setSelectedSlot('');
        setNotes('');
        setError(null);
        setLoadingSlots(false);
        setBooking(false);
        setModalAvailableDates(new Set());
        setFetchingModalAvailability(false);
    } 
  }, [open]);

  // Fetch slots when provider and date are selected
  useEffect(() => {
    if (selectedProviderId && selectedDate && isValid(selectedDate)) { 
      const fetchSlots = async () => {
        setLoadingSlots(true);
        setError(null);
        setTimeSlots([]);
        setSelectedSlot('');
        try {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          console.log(`Modal fetching slots (Restored Effect) for ${selectedProviderId} / ${dateStr}`);
          // Rename variable to avoid confusion
          const slotResult = await getAvailableSlots(selectedProviderId, dateStr);
          
          // Throw error if the action returned one
          if (slotResult.error) throw new Error(slotResult.error);

          // Use the .slots property from the result object
          const actualSlots = slotResult.slots || [];
          setTimeSlots(actualSlots);

          // Check the length of the actual slots array
          if (actualSlots.length === 0) { 
             setError('No available slots found for the selected provider and date.');
          }
        } catch (err: any) {
          console.error("Error fetching slots in modal (Restored Effect):", err);
          setError(err.message || 'Failed to fetch available slots.');
        } finally {
          setLoadingSlots(false);
        }
      };
      fetchSlots();
    } else {
        setTimeSlots([]);
        setSelectedSlot('');
        // Clear specific error if selection becomes invalid
        if (error && error.includes('slots')) { 
            setError(null);
        }
    }
  }, [selectedProviderId, selectedDate, getAvailableSlots]); 

  // --- Fetch Available DATES for the selected provider --- 
  const fetchAvailableDatesForProvider = useCallback(async (providerId: string) => {
      if (!providerId) return;
      setFetchingModalAvailability(true);
      setError(null); // Clear previous errors
      console.log(`Modal: Fetching available DATES for provider ${providerId}`);
      try {
          // --- Call the actual server action (only needs providerId) ---
          const result = await getAvailableDatesForProvider(providerId);
          
          if (result.error) throw new Error(result.error);
          
          // Format the dates into 'yyyy-MM-dd' strings before creating the Set
          const formattedDates = (result.availableDates || []).map(date => {
              try {
                  return format(startOfDay(date), 'yyyy-MM-dd');
              } catch (formatError) {
                  console.error("Error formatting date:", date, formatError);
                  return null; // Handle potential date formatting errors
              }
          }).filter((dateStr): dateStr is string => dateStr !== null); // Filter out nulls

          const fetchedDatesSet = new Set(formattedDates);
          console.log("Modal: Setting available dates (formatted strings) from server action:", fetchedDatesSet);
          setModalAvailableDates(fetchedDatesSet); // Now passing Set<string>
          // --- End server action call --- 
      } catch (err: any) {
          console.error("Modal: Error fetching available dates:", err);
          setError("Could not load available dates for the provider.");
          setModalAvailableDates(new Set()); // Clear on error
      } finally {
          setFetchingModalAvailability(false);
      }
  }, []); 

  // Fetch available dates when provider or viewed month changes
  useEffect(() => {
    if (selectedProviderId) {
        console.log("Modal: Provider selected, fetching available dates...");
        fetchAvailableDatesForProvider(selectedProviderId);
    }
  }, [selectedProviderId, fetchAvailableDatesForProvider]); // Removed selectedDate dependency here

  // Function to handle month change in modal calendar
  const handleModalMonthChange = (date: Date) => {
      console.log("Modal: Month changed, fetching available dates...");
      if (selectedProviderId) {
        fetchAvailableDatesForProvider(selectedProviderId);
      }
  };

  // --- Fetch Available SLOTS for the selected provider and date --- 
  useEffect(() => {
    // Only fetch slots if date is valid and *after* today (since minDate is tomorrow)
    if (selectedProviderId && selectedDate && isValid(selectedDate) && isAfter(startOfDay(selectedDate), startOfDay(new Date()))) {
      const fetchSlots = async () => {
        setLoadingSlots(true);
        setTimeSlots([]); // Clear previous slots
        setSelectedSlot(''); // Clear selected time
        setError(null);
        console.log(`Modal: Fetching available SLOTS for provider ${selectedProviderId} on date ${format(selectedDate, 'yyyy-MM-dd')}`);
        try {
          // Use the prop function (which now returns the object)
          const result = await getAvailableSlots(selectedProviderId, format(selectedDate, 'yyyy-MM-dd'));
          
          // Handle the new return structure { slots: string[] | null, error: string | null }
          if (result.error) throw new Error(result.error);

          console.log("Modal: Fetched Slots:", result.slots);
          setTimeSlots(result.slots || []);
        } catch (err: any) {
          console.error("Modal: Error fetching available slots:", err);
          setError("Could not load available time slots for this date.");
        }
        setLoadingSlots(false);
      };
      fetchSlots();
    } else {
      setTimeSlots([]); // Clear slots if no provider/date selected or date is invalid/past
      setSelectedSlot(''); 
    }
    // Depend only on provider and date for fetching slots
  }, [selectedProviderId, selectedDate, getAvailableSlots]);

  // Handlers
  const handleProviderChange = (event: SelectChangeEvent<string>) => {
    setSelectedProviderId(event.target.value);
    setSelectedDate(null);
    setTimeSlots([]);
    setSelectedSlot('');
    setError(null);
  };

  const handleDateChange = (newValue: Date | null) => {
    setSelectedDate(newValue);
    // Slot fetching is handled by the useEffect dependent on selectedDate
  };

  const handleSlotChange = (event: SelectChangeEvent<string>) => {
    setSelectedSlot(event.target.value);
  };

  // --- Updated handleBookClick to use server action result ---
  const handleBookClick = async () => {
    if (!selectedProviderId || !selectedDate || !selectedSlot) {
      setError('Please select a provider, date, and time slot.');
      return;
    }
    // Remove the explicit check for patientId, rely on prop type and parent component's check
    /*
    if (!patientId || typeof patientId !== 'string' || patientId === '') {
        setError('Authentication error (Patient ID missing). Unable to book appointment.');
        return;
    }
    */
    // Check for accessToken remains
    if (!accessToken || typeof accessToken !== 'string') {
        setError('Authentication error (Token missing). Unable to book appointment.');
        return;
    }

    setBooking(true);
    setError(null);

    try {
      const [hour, minute] = selectedSlot.split(':').map(Number);
      const finalDateTime = new Date(selectedDate);
      finalDateTime.setHours(hour, minute, 0, 0);

      console.log('Modal booking attempt (passing props):', { providerId: selectedProviderId, dateTime: finalDateTime, notes, patientId });
      
      // Pass patientId and accessToken props directly to the handler
      const result = await onBookAppointment({ 
        providerId: selectedProviderId,
        dateTime: finalDateTime,
        notes: notes,
        patientId: patientId,       // Pass patientId prop
        accessToken: accessToken    // Pass accessToken prop
      });

      if (result && result.success) {
        console.log("Booking successful via modal, closing.");
        onClose(); // Close the modal on success (parent handles snackbar)
      } else {
        setError(result?.error || 'Booking failed. Please try again.');
      }

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during booking.');
      console.error("Booking error caught in modal:", err);
    } finally {
      setBooking(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="book-appointment-modal-title">
      <Box sx={style}>
        <Typography id="book-appointment-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
          Book New Appointment
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>{error}</Alert>}
        
        <Grid container spacing={3}>
            {/* Left Side: Provider Select & Calendar */} 
            <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                    {/* Provider Selection */}
                    <FormControl fullWidth required>
                    <InputLabel id="modal-provider-select-label">Provider</InputLabel>
                    <Select
                        labelId="modal-provider-select-label"
                        value={selectedProviderId}
                        label="Provider"
                        onChange={handleProviderChange}
                    >
                        <MenuItem value="" disabled><em>Select a Provider</em></MenuItem>
                        {availableProviders.map((provider) => (
                        <MenuItem key={provider.id} value={provider.id}>
                            {`${provider.first_name || ''} ${provider.last_name || ''} (${provider.specialization || 'N/A'})`}
                        </MenuItem>
                        ))}
                    </Select>
                    </FormControl>

                    {/* Calendar */}
                     <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <DateCalendar
                            value={selectedDate}
                            onChange={handleDateChange}
                            onMonthChange={handleModalMonthChange} // Handle month change
                            minDate={addDays(new Date(), 1)} // Can't book for today or past
                            loading={fetchingModalAvailability}
                            slots={{
                                day: ModalDayWithIndicator,
                            }}
                            slotProps={{
                                day: { 
                                    availableDates: modalAvailableDates,
                                    existingAppointments: existingAppointments // Pass existing appointments here
                                } as any, // Use 'as any' to bypass strict type check if needed
                            }}
                        />
                    </Box>
                </Stack>
            </Grid>

            {/* Right Side: Time Slots & Notes */}
            <Grid item xs={12} md={6}>
                 {/* Only show this section if date is selected */}
                {selectedProviderId && selectedDate && (
                    <Stack spacing={3}>
                        {/* Time Slot Selection */}
                        <FormControl fullWidth required disabled={loadingSlots || timeSlots.length === 0}>
                            <InputLabel id="modal-slot-select-label">Available Time Slots</InputLabel>
                            <Select
                            labelId="modal-slot-select-label"
                            value={selectedSlot}
                            label="Available Time Slots"
                            onChange={handleSlotChange}
                            renderValue={(selected) => selected || <em>{loadingSlots ? 'Loading...' : (timeSlots.length === 0 ? 'No slots' : 'Select time')}</em>}
                            >
                            <MenuItem value="" disabled>
                                <em>{loadingSlots ? 'Loading...' : (timeSlots.length === 0 ? 'No slots available' : 'Select a time')}</em>
                            </MenuItem>
                            {timeSlots.map((slot) => (
                                <MenuItem key={slot} value={slot}>
                                {slot} 
                                </MenuItem>
                            ))}
                            </Select>
                        </FormControl>

                        {/* Notes */}
                        <TextField
                            label="Reason/Notes (Optional)"
                            multiline
                            rows={4}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            fullWidth
                        />
                    </Stack>
                )}
                 {/* Show placeholder if date not yet selected */}
                 {!selectedDate && selectedProviderId && (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                          <Typography>Select a date to see available times.</Typography>
                      </Box>
                 )}
            </Grid>
        </Grid>

         {/* Actions (at the bottom) */}
        <Divider sx={{ my: 3 }}/>
        <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={onClose} disabled={booking} color="secondary">
            Cancel
            </Button>
            <Button 
            onClick={handleBookClick} 
            disabled={booking || !selectedProviderId || !selectedDate || !selectedSlot}
            variant="contained"
            >
            {booking ? <CircularProgress size={24} /> : 'Book Appointment'}
            </Button>
        </Stack>
        
      </Box>
    </Modal>
  );
} 