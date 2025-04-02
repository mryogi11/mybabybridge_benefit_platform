'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '@/lib/supabase/client';
import { TreatmentNote } from '@/types';
import { format } from 'date-fns';

interface MilestoneNotesProps {
  milestoneId: string;
  appointmentId?: string;
}

export default function MilestoneNotes({ milestoneId, appointmentId }: MilestoneNotesProps) {
  const theme = useTheme();
  const [notes, setNotes] = useState<TreatmentNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<TreatmentNote | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    appointment_id: appointmentId || null,
  });

  useEffect(() => {
    fetchNotes();
    const subscription = supabase
      .channel('treatment_notes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatment_notes',
          filter: `milestone_id=eq.${milestoneId}`,
        },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [milestoneId]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('treatment_notes')
      .select(`
        *,
        provider:provider_id (first_name, last_name),
        appointment:appointment_id (date)
      `)
      .eq('milestone_id', milestoneId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }

    setNotes(data);
  };

  const handleOpenDialog = (note?: TreatmentNote) => {
    if (note) {
      setSelectedNote(note);
      setFormData({
        content: note.content,
        appointment_id: note.appointment_id,
      });
    } else {
      setSelectedNote(null);
      setFormData({
        content: '',
        appointment_id: appointmentId || null,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedNote(null);
    setFormData({
      content: '',
      appointment_id: appointmentId || null,
    });
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const noteData = {
      ...formData,
      milestone_id: milestoneId,
      provider_id: user.id,
    };

    if (selectedNote) {
      const { error } = await supabase
        .from('treatment_notes')
        .update(noteData)
        .eq('id', selectedNote.id);

      if (error) {
        console.error('Error updating note:', error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('treatment_notes')
        .insert([noteData]);

      if (error) {
        console.error('Error creating note:', error);
        return;
      }
    }

    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('treatment_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting note:', error);
      return;
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Notes</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          size="small"
        >
          Add Note
        </Button>
      </Stack>

      <Stack spacing={2}>
        {notes.map((note) => (
          <Box
            key={note.id}
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {note.provider?.first_name} {note.provider?.last_name} •{' '}
                  {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {note.content}
                </Typography>
                {note.appointment && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Related to appointment on {format(new Date(note.appointment.appointment_date), 'MMM d, yyyy')}
                  </Typography>
                )}
              </Box>
              <Stack direction="row">
                <IconButton size="small" onClick={() => handleOpenDialog(note)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleDelete(note.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedNote ? 'Edit Note' : 'New Note'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Note"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              multiline
              rows={4}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedNote ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 