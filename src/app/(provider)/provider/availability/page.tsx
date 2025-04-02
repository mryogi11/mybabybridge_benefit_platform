'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  MenuItem,
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '@/lib/supabase';
import { ProviderAvailability } from '@/types';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function ProviderAvailabilityPage() {
  const [availabilities, setAvailabilities] = useState<ProviderAvailability[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    fetchAvailabilities();
    const subscription = supabase
      .channel('provider_availability')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_availability' }, fetchAvailabilities)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAvailabilities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', user.id)
      .order('day_of_week', { ascending: true });

    if (error) {
      console.error('Error fetching availabilities:', error);
      return;
    }

    setAvailabilities(data || []);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDay('');
    setStartTime('');
    setEndTime('');
  };

  const handleAddAvailability = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('provider_availability')
      .insert({
        provider_id: user.id,
        day_of_week: parseInt(selectedDay),
        start_time: startTime,
        end_time: endTime,
      });

    if (error) {
      console.error('Error adding availability:', error);
      return;
    }

    handleCloseDialog();
  };

  const handleDeleteAvailability = async (id: string) => {
    const { error } = await supabase
      .from('provider_availability')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting availability:', error);
      return;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Availability Management
        </Typography>
        <Button variant="contained" onClick={handleOpenDialog}>
          Add Availability
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <List>
          {availabilities.map((availability) => (
            <ListItem key={availability.id}>
              <ListItemText
                primary={DAYS_OF_WEEK[availability.day_of_week]}
                secondary={`${availability.start_time} - ${availability.end_time}`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDeleteAvailability(availability.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add Availability</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Day of Week"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            >
              {DAYS_OF_WEEK.map((day, index) => (
                <MenuItem key={index} value={index}>
                  {day}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAddAvailability} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 