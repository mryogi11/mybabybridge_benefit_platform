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
import { isValid, format, startOfDay as dateFnsStartOfDay, isSameDay, isBefore } from 'date-fns';
import { alpha, useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Import the new server action
import { getMonthlyAvailability } from '@/actions/appointmentActions'; // Adjust path if needed

// --- Types (Consider moving to shared types file) ---
interface ProviderInfo {
  id: string; // This should be the providers.id (PK)
  user_id: string; // The auth.users id
  first_name: string | null;
  last_name: string | null;
  specialization: string | null;
}

// --- Updated Props Interface ---
interface BookAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string; // Change back to required string
  availableProviders: ProviderInfo[];
  accessToken: string | null | undefined; 
  getAvailableSlots: (providerId: string, dateStr: string, accessToken: string) => Promise<string[]>; 
  onBookAppointment: (bookingDetails: { 
      providerId: string; 
      dateTime: Date; 
      notes: string; 
      patientId: string; 
      accessToken: string; 
  }) => Promise<{ success: boolean; error?: string }>; 
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

// --- Component with Updated Props ---
export default function BookAppointmentModal({
  open,
  onClose,
  patientId, // Added patientId
  availableProviders,
  accessToken, // Destructure accessToken prop
  getAvailableSlots, // Use renamed prop
  onBookAppointment, // Use renamed prop
}: BookAppointmentModalProps) {
  // State
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- New State for Monthly Availability ---
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date()); // Track viewed month
  const [availableDatesInMonth, setAvailableDatesInMonth] = useState<Set<string>>(new Set()); // Use Set for quick lookups
  const [loadingMonthAvailability, setLoadingMonthAvailability] = useState<boolean>(false);

  // Reset state when modal opens/closes or providers change
  useEffect(() => {
    if (open) {
        setSelectedProviderId('');
        setSelectedDate(null);
        setTimeSlots([]);
        setSelectedSlot('');
        setNotes('');
        setError(null);
        setLoadingSlots(false);
        setBooking(false);
        // Reset month view and availability
        const today = new Date();
        setCurrentMonth(today); 
        setAvailableDatesInMonth(new Set());
        setLoadingMonthAvailability(false);
    } 
  }, [open]);

  // Fetch slots when provider and date are selected
  // *** This useEffect seems redundant now given the one below that depends on availableDatesInMonth ***
  // *** Let's comment it out to avoid confusion and potential double-fetching/errors ***
  /* 
  useEffect(() => {
    if (selectedProviderId && selectedDate && isValid(selectedDate) && typeof accessToken === 'string') { 
      const fetchSlots = async () => {
        setLoadingSlots(true);
        setError(null);
        setTimeSlots([]);
        setSelectedSlot('');
        try {
          const dateStr = format(selectedDate, 'yyyy-MM-dd'); // Format correctly here too
          console.log(`Modal fetching slots (Initial Effect) for ${selectedProviderId} / ${dateStr}`);
          const slots = await getAvailableSlots(selectedProviderId, dateStr, accessToken);
          setTimeSlots(slots);
          if (slots.length === 0) {
             setError('No available slots found for the selected provider and date.');
          }
        } catch (err: any) {
          console.error("Error fetching slots in modal (Initial Effect):", err);
          setError(err.message || 'Failed to fetch available slots.');
        } finally {
          setLoadingSlots(false);
        }
      };
      fetchSlots();
    } else {
        setTimeSlots([]);
        setSelectedSlot('');
        if (error === 'No available slots found for the selected provider and date.') {
            setError(null);
        }
    }
  }, [selectedProviderId, selectedDate, getAvailableSlots, accessToken]);
  */

  // --- Fetch MONTHLY availability (Updated) --- 
  useEffect(() => {
      if (!selectedProviderId) {
          setAvailableDatesInMonth(new Set()); // Clear if no provider
          return;
      }
      
      const fetchMonthData = async () => {
          setLoadingMonthAvailability(true);
          setError(null); // Clear previous errors
          setAvailableDatesInMonth(new Set()); // Clear old data
          console.log(`Fetching monthly availability for ${selectedProviderId} / ${currentMonth.toISOString()}`);
          
          // --- Check if accessToken prop exists --- 
          if (!accessToken) {
              console.error("Access token not provided to BookAppointmentModal.");
              setError("Authentication error. Cannot load availability.");
              setLoadingMonthAvailability(false);
              return;
          }
          
          try {
              // Pass access token prop to the server action
              const availableDatesResult = await getMonthlyAvailability(selectedProviderId, currentMonth, accessToken);
              
              // --- Log and Validate Result --- 
              console.log("[Client] Received from getMonthlyAvailability:", availableDatesResult);
              if (Array.isArray(availableDatesResult)) {
                  setAvailableDatesInMonth(new Set(availableDatesResult)); // Store as Set
              } else {
                  console.error("[Client] getMonthlyAvailability did not return an array:", availableDatesResult);
                  setError("Error processing monthly availability data.");
                  setAvailableDatesInMonth(new Set()); // Set empty on unexpected result
              }
              // --- End Validation --- 
              
          } catch (err: any) {
              console.error("[Client] Error calling getMonthlyAvailability:", err); // Log client-side catch
              setError("Could not load monthly availability. Please try again.");
              setAvailableDatesInMonth(new Set()); // Clear on error
          } finally {
              setLoadingMonthAvailability(false);
          }
      };

      fetchMonthData();

  }, [selectedProviderId, currentMonth, accessToken]); // Use accessToken in dependencies

  // --- Fetch DAILY slots (when date is clicked) --- 
  useEffect(() => {
    // Ensure we have a valid date AND token before proceeding
    if (selectedProviderId && selectedDate && isValid(selectedDate) && typeof accessToken === 'string') {
      const fetchSlots = async () => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // Only fetch if the selected date is potentially available
        if (!availableDatesInMonth.has(dateStr) && availableDatesInMonth.size > 0) {
             console.log("Skipping slot fetch for potentially unavailable date:", dateStr);
             setTimeSlots([]);
             setSelectedSlot('');
             return;
        }

        setLoadingSlots(true);
        setError(null); 
        setTimeSlots([]);
        setSelectedSlot('');
        try {
          console.log(`Modal fetching DAILY slots for ${selectedProviderId} / ${dateStr}`); 
          // accessToken is now guaranteed to be a string here
          const slots = await getAvailableSlots(selectedProviderId, dateStr, accessToken);
          setTimeSlots(slots);
           if (slots.length === 0) {
               // More specific error if the day was expected to have slots
               if (availableDatesInMonth.has(dateStr)) {
                    setError('No available time slots found for this date, it might be fully booked.');
               } else {
                    // Should ideally not happen due to check above, but as fallback:
                     setError('No slots available for this date.');
               }
           }
        } catch (err: any) {
          console.error("Error fetching daily slots in modal:", err);
          setError(err.message || 'Failed to fetch available slots.');
        } finally {
          setLoadingSlots(false);
        }
      };
      fetchSlots();
    } else {
        setTimeSlots([]);
        setSelectedSlot('');
        // Clear specific errors if selection becomes invalid
         if (error && error.includes('slots')) {
           setError(null);
         }
    }
    // Add accessToken to dependency array - selectedDate still triggers the effect
  }, [selectedProviderId, selectedDate, getAvailableSlots, availableDatesInMonth, accessToken]);

  // Handlers
  const handleProviderChange = (event: SelectChangeEvent<string>) => {
    setSelectedProviderId(event.target.value);
    setSelectedDate(null);
    setTimeSlots([]);
    setSelectedSlot('');
    setError(null);
    setCurrentMonth(new Date()); // Reset month view on provider change
    setAvailableDatesInMonth(new Set());
  };

  const handleDateChange = (newValue: Date | null) => {
    setSelectedDate(newValue);
    // Slot fetching is handled by the useEffect dependent on selectedDate
  };

  const handleMonthChange = (newMonth: Date) => {
      setCurrentMonth(newMonth);
      setSelectedDate(null); // Clear selected date when month changes
      setTimeSlots([]);
      setSelectedSlot('');
      setError(null);
      setAvailableDatesInMonth(new Set()); // Clear old month data while new loads
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
        // Refresh monthly availability as booking might have taken last slot for a day
        if(selectedProviderId) { 
          getMonthlyAvailability(selectedProviderId, currentMonth, accessToken)
              .then(dates => setAvailableDatesInMonth(new Set(dates)))
              .catch(e => console.error("Failed to refresh month availability after successful booking"));
        }
      } else {
        setError(result?.error || 'Booking failed. Please try again.');
        // Optionally refresh month availability even on failure
        if(selectedProviderId) { 
           getMonthlyAvailability(selectedProviderId, currentMonth, accessToken)
              .then(dates => setAvailableDatesInMonth(new Set(dates)))
              .catch(e => console.error("Failed to refresh month availability after failed booking"));
        }
      }

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during booking.');
      console.error("Booking error caught in modal:", err);
    } finally {
      setBooking(false);
    }
  };

  // --- Custom Day Renderer (Revised Logic v3) ---
  function DayWithHighlight(props: PickersDayProps<Date> & { 
    highlightedDays?: Set<string>; // Use Set for efficiency
    day: Date; // Ensure day is always passed correctly
  }) {
    const theme = useTheme(); // Get theme object
    const { day, highlightedDays, outsideCurrentMonth, selected, disabled: propDisabled, ...other } = props;

    const dateString = format(day, 'yyyy-MM-dd');
    const isHighlighted = highlightedDays?.has(dateString);
    const isSelected = selected;
    const isPast = isBefore(day, dateFnsStartOfDay(new Date()));
    const isToday = isSameDay(day, new Date()); // Keep for potential future use, but not directly in sx logic below

    // Determine if the date should be disabled:
    // Disabled if explicitly passed, or past, or NOT highlighted.
    const isDisabled = propDisabled || isPast || !isHighlighted;

    return (
      <PickersDay 
        {...other} 
        day={day} 
        selected={selected} 
        outsideCurrentMonth={outsideCurrentMonth}
        disabled={isDisabled} // Use calculated disabled state
        sx={{
          // --- Style Application Order ---

          // 1. Base hover for any clickable (not disabled, not selected) date
          ...(!isDisabled && !isSelected && {
            '&:hover': { 
              backgroundColor: alpha(theme.palette.action.hover, 0.04), 
            },
          }),

          // 2. Style for PAST or DISABLED NON-AVAILABLE dates
          ...(isDisabled && !isSelected && { // Apply if disabled (for any reason) and not selected
            color: theme.palette.text.disabled,
            pointerEvents: 'none',
            border: 'none',
            backgroundColor: 'transparent',
            '&:hover': { backgroundColor: 'transparent' },
          }),

          // 3. Style for AVAILABLE dates (highlighted, not past, not selected)
          // This applies the blue border if highlighted. Includes today if highlighted.
          ...(isHighlighted && !isPast && !isSelected && {
            border: `2px solid ${theme.palette.primary.main}`, // Blue border
            color: theme.palette.text.primary, // Normal text color
            backgroundColor: 'transparent', // Ensure no background unless hovered/selected
            '&:hover': { 
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            },
          }),
          
          // 4. Style for SELECTED dates (highest precedence, if not past)
          ...(isSelected && !isPast && {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            border: 'none',
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          }),
        }}
      />
    );
  }

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
                            value={selectedDate} // Keep using value for selected day
                            onChange={handleDateChange}
                            views={["day"]} // Only show day view
                            openTo="day"
                            // defaultCalendarMonth={currentMonth} // Control displayed month IF needed
                            onMonthChange={handleMonthChange} // Update month state when user navigates
                            disablePast // Don't allow past dates
                            disabled={!selectedProviderId || loadingMonthAvailability} // Disable if no provider or loading
                            slots={{
                                day: (dayProps) => (
                                    <DayWithHighlight 
                                        {...dayProps} 
                                        highlightedDays={availableDatesInMonth}
                                    />
                                ),
                            }}
                            loading={loadingMonthAvailability} // Show loading indicator
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