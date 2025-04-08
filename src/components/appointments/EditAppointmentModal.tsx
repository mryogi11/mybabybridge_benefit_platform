import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { parseISO, isValid } from 'date-fns';
import { FetchedAppointment } from '@/app/(provider)/provider/appointments/page'; // Adjust import path if needed
import { Appointment } from '@/types'; // Import the base Appointment type

interface EditAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  appointment: FetchedAppointment | null;
  onSave: (updatedAppointmentData: Partial<Appointment>) => Promise<void>; // Send partial updates
}

// Modal style
const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export default function EditAppointmentModal({
  open,
  onClose,
  appointment,
  onSave,
}: EditAppointmentModalProps) {
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointment) {
      const parsedDate = parseISO(appointment.appointment_date);
      setAppointmentDate(isValid(parsedDate) ? parsedDate : null);
      setNotes(appointment.notes || '');
      setError(null); // Clear error when modal opens with new data
    } else {
      // Reset form when no appointment is selected (e.g., modal closes)
      setAppointmentDate(null);
      setNotes('');
      setError(null);
    }
  }, [appointment]);

  const handleSaveClick = async () => {
    if (!appointment || !appointmentDate || !isValid(appointmentDate)) {
      setError('Invalid date/time provided.');
      return;
    }

    setSaving(true);
    setError(null);

    const updatedData: Partial<Appointment> = {
        id: appointment.id, // Include ID to identify which appointment to update
        appointment_date: appointmentDate.toISOString(),
        notes: notes,
        // Include other fields if they are editable
    };

    try {
      await onSave(updatedData);
      // onClose(); // Let the parent component handle closing after successful save
    } catch (err: any) {
      setError(err.message || 'Failed to save appointment.');
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="edit-appointment-modal-title"
      aria-describedby="edit-appointment-modal-description"
    >
      <Box sx={style}>
        <Typography id="edit-appointment-modal-title" variant="h6" component="h2">
          Edit Appointment
        </Typography>
        
        {appointment && (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack spacing={3} sx={{ mt: 2 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <DateTimePicker
                label="Appointment Date & Time"
                value={appointmentDate}
                onChange={(newValue) => setAppointmentDate(newValue)}
                sx={{ width: '100%' }}
              />
              <TextField
                label="Notes"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
              />
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={onClose} disabled={saving} color="secondary">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveClick} 
                  disabled={saving} 
                  variant="contained"
                >
                  {saving ? <CircularProgress size={24} /> : 'Save'}
                </Button>
              </Stack>
            </Stack>
          </LocalizationProvider>
        )}
      </Box>
    </Modal>
  );
} 