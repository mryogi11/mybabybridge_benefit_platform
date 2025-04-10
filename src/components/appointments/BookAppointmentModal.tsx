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
// import { getMonthlyAvailability } from '@/actions/appointmentActions'; // Adjust path if needed

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
  getAvailableSlots: (providerId: string, dateStr: string) => Promise<string[]>; 
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
          const dateStr = format(selectedDate, 'yyyy-MM-dd'); // Format correctly here too
          console.log(`Modal fetching slots (Restored Effect) for ${selectedProviderId} / ${dateStr}`);
          const slots = await getAvailableSlots(selectedProviderId, dateStr); 
          setTimeSlots(slots);
          if (slots.length === 0) {
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
                            value={selectedDate} // Keep using value for selected day
                            onChange={handleDateChange}
                            views={["day"]} // Only show day view
                            openTo="day"
                            disablePast // Don't allow past dates
                            disabled={!selectedProviderId} // Simple disable if no provider
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