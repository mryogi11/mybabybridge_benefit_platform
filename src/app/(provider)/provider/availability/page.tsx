'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
  Alert,
  Divider,
  Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { supabase } from '@/lib/supabase/client';
import { ProviderAvailability, ProviderTimeBlock } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { format, isValid } from 'date-fns';

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
  const { user, isLoading: isAuthLoading } = useAuth();
  const [providerProfileId, setProviderProfileId] = useState<string | null>(null);
  
  // State for Weekly Schedule
  const [availabilities, setAvailabilities] = useState<ProviderAvailability[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // State for Time Blocks
  const [timeBlocks, setTimeBlocks] = useState<ProviderTimeBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [blockError, setBlockError] = useState<string | null>(null);

  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [openBlockDialog, setOpenBlockDialog] = useState(false);
  const [startBlockDateTime, setStartBlockDateTime] = useState<Date | null>(null);
  const [endBlockDateTime, setEndBlockDateTime] = useState<Date | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  // --- Refactored Fetching Functions --- 
  const fetchAvailabilities = useCallback(async () => {
    if (!providerProfileId) return; // Don't fetch if no provider ID
    console.log("Fetching availabilities for provider ID:", providerProfileId);
    setLoadingSchedule(true); 
    setScheduleError(null);
    try {
        const { data, error: fetchError } = await supabase
          .from('provider_weekly_schedules')
          .select('*')
          .eq('provider_id', providerProfileId)
          .order('day_of_week', { ascending: true });

        if (fetchError) throw fetchError;
        
        setAvailabilities(data || []);
    } catch (err: any) {
        console.error('Error fetching availabilities:', err);
        setScheduleError(err.message || 'Failed to fetch availabilities.');
    } finally {
        setLoadingSchedule(false);
    }
  }, [providerProfileId]); // Dependency: providerProfileId

  const fetchTimeBlocks = useCallback(async () => {
      if (!providerProfileId) return; // Don't fetch if no provider ID
      console.log("Fetching time blocks for provider ID:", providerProfileId);
      setLoadingBlocks(true);
      setBlockError(null);
      try {
          const { data, error: fetchError } = await supabase
            .from('provider_time_blocks')
            .select('*')
            .eq('provider_id', providerProfileId)
            .order('start_datetime', { ascending: true });

          if (fetchError) throw fetchError;
          
          setTimeBlocks(data || []);
      } catch (err: any) {
          console.error('Error fetching time blocks:', err);
          setBlockError(err.message || 'Failed to fetch time blocks.');
      } finally {
          setLoadingBlocks(false);
      }
  }, [providerProfileId]); // Dependency: providerProfileId

  // --- useEffect to get Provider Profile ID --- 
  useEffect(() => {
    const fetchProviderProfile = async () => {
      if (isAuthLoading || !user) {
        if (!isAuthLoading) setScheduleError("User not authenticated.");
        setLoadingSchedule(false);
        setLoadingBlocks(false);
        return;
      }
      
      setLoadingSchedule(true);
      setLoadingBlocks(true);
      setScheduleError(null);
      setBlockError(null);
      try {
        const { data: providerData, error: providerError } = await supabase
          .from('providers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (providerError) throw providerError;
        
        if (providerData) {
          setProviderProfileId(providerData.id);
        } else {
           setScheduleError("Provider profile not found for this user.");
           setLoadingSchedule(false); 
           setLoadingBlocks(false);
        }
      } catch (err: any) {
          console.error('Error fetching provider profile:', err);
          setScheduleError(err.message || 'Failed to fetch provider profile.');
          setBlockError(err.message || 'Failed to fetch provider profile.');
          setLoadingSchedule(false);
          setLoadingBlocks(false);
      }
    };
    
    fetchProviderProfile();
  }, [user, isAuthLoading]);

  // --- useEffects to fetch initial data and subscribe to changes --- 
  useEffect(() => {
    if (providerProfileId) {
      fetchAvailabilities(); // Initial fetch
    }
    // Setup realtime subscription (optional, keep if desired)
     const scheduleChannel = supabase
      .channel('provider_weekly_schedules_changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'provider_weekly_schedules', filter: `provider_id=eq.${providerProfileId}` }, 
          (payload) => {
             console.log('Realtime: Schedule change detected', payload);
             fetchAvailabilities(); // Re-fetch on realtime event
          }
      )
      .subscribe();
    return () => { supabase.removeChannel(scheduleChannel); };
  }, [providerProfileId, fetchAvailabilities]); // Add fetchAvailabilities to dependency array

  useEffect(() => {
    if (providerProfileId) {
      fetchTimeBlocks(); // Initial fetch
    }
     // Setup realtime subscription (optional, keep if desired)
     const blockChannel = supabase
      .channel('provider_time_blocks_changes')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'provider_time_blocks', filter: `provider_id=eq.${providerProfileId}` }, 
          (payload) => { 
             console.log('Realtime: Block change detected', payload);
             fetchTimeBlocks(); // Re-fetch on realtime event
          }
      )
      .subscribe();
    return () => { supabase.removeChannel(blockChannel); };
  }, [providerProfileId, fetchTimeBlocks]); // Add fetchTimeBlocks to dependency array

  // --- Handlers for Dialogs --- 
  const handleOpenScheduleDialog = () => setOpenScheduleDialog(true);
  const handleCloseScheduleDialog = () => {
    setOpenScheduleDialog(false);
    // Reset dialog state
    setSelectedDay('');
    setStartTime('');
    setEndTime('');
    setScheduleError(null); // Clear dialog-specific errors
  };

  // --- Updated Add Weekly Schedule Handler --- 
  const handleAddWeeklySchedule = async () => {
    if (!providerProfileId) {
        setScheduleError("Cannot add availability: Provider profile ID not found.");
        return;
    }
    const dayOfWeekInt = parseInt(selectedDay, 10);
    if (isNaN(dayOfWeekInt) || !startTime || !endTime) { 
        setScheduleError("Please select a day and enter both start and end times.");
        return;
    }
    // Basic time validation (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        setScheduleError("Invalid time format. Please use HH:MM (e.g., 09:00).");
        return;
    }
    if (startTime >= endTime) {
        setScheduleError("End time must be after start time.");
        return;
    }

    const dataToInsert = {
        provider_id: providerProfileId,
        day_of_week: dayOfWeekInt,
        start_time: startTime,
        end_time: endTime,
    };
    
    setIsSubmittingSchedule(true);
    setScheduleError(null);
    try {
        const { error: insertError } = await supabase
          .from('provider_weekly_schedules') 
          .insert(dataToInsert); 

        if (insertError) throw insertError;
        
        handleCloseScheduleDialog();
        await fetchAvailabilities(); // Re-fetch the list after successful add

    } catch (err: any) {
        console.error('Error adding availability:', err);
        // Display error in dialog or as main page error
        setScheduleError(err.message || 'Failed to add weekly schedule slot.'); 
    } finally {
        setIsSubmittingSchedule(false); 
    }
  };

  // --- Updated Delete Weekly Schedule Handler ---
  const handleDeleteWeeklySchedule = async (id: string) => {
    const originalAvailabilities = [...availabilities]; // Clone for potential revert
    // Optimistic UI update
    setAvailabilities(current => current.filter(av => av.id !== id)); 
    setScheduleError(null); // Clear previous errors

    try {
        const { error: deleteError } = await supabase
          .from('provider_weekly_schedules')
          .delete()
          .eq('id', id);

        if (deleteError) {
            console.error("Error deleting weekly schedule:", deleteError);
            setScheduleError(deleteError.message || 'Failed to delete schedule.');
            setAvailabilities(originalAvailabilities); // Revert optimistic update
        } else {
             console.log("Weekly schedule deleted successfully:", id);
             // No need to explicitly re-fetch if optimistic update is sufficient
             // await fetchAvailabilities(); // Uncomment if fetch is preferred over optimistic
        }
    } catch (err: any) {
        console.error("Caught error deleting weekly schedule:", err);
        setScheduleError(err.message || 'An unexpected error occurred during deletion.');
        setAvailabilities(originalAvailabilities); // Revert optimistic update
    }
  };

  // --- Handlers for Time Block Dialog --- 
  const handleOpenBlockDialog = () => setOpenBlockDialog(true);
  const handleCloseBlockDialog = () => {
    setOpenBlockDialog(false);
    // Reset dialog state
    setStartBlockDateTime(null);
    setEndBlockDateTime(null);
    setBlockReason('');
    setBlockError(null); // Clear dialog-specific errors
  };

  // --- Implement handleAddTimeBlock --- 
  const handleAddTimeBlock = async () => {
    // 1. Validate inputs
    if (!providerProfileId) {
        setBlockError("Provider profile ID not found.");
        return;
    }
    if (!startBlockDateTime || !endBlockDateTime || !isValid(startBlockDateTime) || !isValid(endBlockDateTime)) {
        setBlockError("Please select valid start and end date/times.");
        return;
    }
    if (endBlockDateTime <= startBlockDateTime) {
        setBlockError("End time must be after start time.");
        return;
    }

    // 2. Prepare data (Assuming DB expects ISO strings)
    const dataToInsert = {
        provider_id: providerProfileId,
        start_datetime: startBlockDateTime.toISOString(),
        end_datetime: endBlockDateTime.toISOString(),
        reason: blockReason || null,
        is_unavailable: true // Explicitly set block as unavailable time
    };

    // 3. Set loading state
    setIsSubmittingBlock(true);
    setBlockError(null);

    try {
        // 4. Call supabase insert
        const { error: insertError } = await supabase
          .from('provider_time_blocks')
          .insert(dataToInsert);

        if (insertError) {
            // 5. Handle errors
            console.error("Error adding time block:", insertError);
            throw insertError;
        }
        
        // 6. Call fetchTimeBlocks() on success
        await fetchTimeBlocks(); 
        // 8. Close dialog
        handleCloseBlockDialog();

    } catch (err: any) {
        console.error('Caught error adding time block:', err);
        setBlockError(err.message || 'Failed to add time block');
    } finally {
        // 7. Set loading state off
        setIsSubmittingBlock(false);
    }
  };

  // --- Implement handleDeleteTimeBlock --- 
  const handleDeleteTimeBlock = async (id: string) => {
    const originalTimeBlocks = [...timeBlocks]; // Clone for revert
    
    // 1. Optimistic UI update
    setTimeBlocks(current => current.filter(block => block.id !== id));
    setBlockError(null);

    try {
        // 2. Call supabase delete
        const { error: deleteError } = await supabase
          .from('provider_time_blocks')
          .delete()
          .eq('id', id);

        if (deleteError) {
             // 3. Handle errors
            console.error('Error deleting time block:', deleteError);
            setBlockError(deleteError.message || 'Failed to delete time block');
            setTimeBlocks(originalTimeBlocks); // Revert
        } else {
            console.log("Time block deleted successfully:", id);
            // 4. Maybe call fetchTimeBlocks() - Optional if optimistic is fine
            // await fetchTimeBlocks(); 
        }
    } catch (err: any) {
         // 3. Handle errors
        console.error('Caught error deleting time block:', err);
        setBlockError(err.message || 'An unexpected error occurred during deletion.');
        setTimeBlocks(originalTimeBlocks); // Revert
    }
  };

  const isLoading = loadingSchedule || loadingBlocks || isAuthLoading;
  const displayError = scheduleError || blockError;

  if (isLoading) { 
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  }
  if (displayError && !providerProfileId) {
    return <Alert severity="error" sx={{ m: 2 }}>{displayError}</Alert>;
  }
  if (!providerProfileId) {
      return <Typography sx={{ p: 3 }}>Loading user data or provider profile not found...</Typography>;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Availability Management</Typography>
            </Box>
            
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Weekly Schedule</Typography>
                            <Button 
                                variant="outlined" 
                                size="small" 
                                startIcon={<AddCircleOutlineIcon />} 
                                onClick={handleOpenScheduleDialog}
                            >
                                Add Weekly Slot
                            </Button>
                        </Box>
                        {scheduleError && <Alert severity="warning" sx={{my: 1}}>{scheduleError}</Alert>}
                        {loadingSchedule ? <CircularProgress size={24} /> : 
                        availabilities.length === 0 ? (
                            <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>
                                No weekly schedule set.
                            </Typography>
                        ) : (
                            <List dense>
                                {availabilities.map((availability) => (
                                <ListItem key={availability.id} disableGutters>
                                    <ListItemText
                                    primary={DAYS_OF_WEEK[availability.day_of_week]}
                                    secondary={`${availability.start_time} - ${availability.end_time}`}
                                    />
                                    <ListItemSecondaryAction>
                                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteWeeklySchedule(availability.id)} size="small">
                                        <DeleteIcon fontSize="small"/>
                                    </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Time Off / Specific Blocks</Typography>
                             <Button 
                                variant="outlined" 
                                size="small" 
                                startIcon={<AddCircleOutlineIcon />} 
                                onClick={handleOpenBlockDialog}
                            >
                                Add Time Block
                            </Button>
                        </Box>
                         {blockError && <Alert severity="warning" sx={{my: 1}}>{blockError}</Alert>}
                        {loadingBlocks ? <CircularProgress size={24} /> : 
                        timeBlocks.length === 0 ? (
                            <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>
                                No specific time blocks added.
                            </Typography>
                        ) : (
                            <List dense>
                                {timeBlocks.map((block) => (
                                <ListItem key={block.id} disableGutters>
                                    <ListItemText
                                        primary={format(new Date(block.start_datetime), 'MMM d, yyyy h:mm a') + ' - ' + format(new Date(block.end_datetime), 'h:mm a')}
                                        secondary={block.reason || 'Blocked'}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteTimeBlock(block.id)} size="small">
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            <Dialog open={openScheduleDialog} onClose={handleCloseScheduleDialog}>
                 <DialogTitle>Add Weekly Availability Slot</DialogTitle>
                <DialogContent>
                <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}> 
                     <TextField
                        select
                        fullWidth
                        required
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
                        required
                        label="Start Time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                        fullWidth
                        required
                        label="End Time"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        />
                </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseScheduleDialog} disabled={isSubmittingSchedule}>Cancel</Button>
                    <Button onClick={handleAddWeeklySchedule} variant="contained" disabled={isSubmittingSchedule}>
                        {isSubmittingSchedule ? <CircularProgress size={20} /> : 'Add Slot'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openBlockDialog} onClose={handleCloseBlockDialog}>
                <DialogTitle>Add Time Block / Time Off</DialogTitle>
                <DialogContent>
                    {blockError && <Alert severity="error" sx={{mb: 2}}>{blockError}</Alert>}
                    <Stack spacing={2} sx={{ mt: 1, minWidth: 400 }}>
                        <DateTimePicker
                            label="Block Start Time"
                            value={startBlockDateTime}
                            onChange={setStartBlockDateTime}
                            ampm={true} 
                            sx={{ width: '100%' }}
                        />
                        <DateTimePicker
                            label="Block End Time"
                            value={endBlockDateTime}
                            onChange={setEndBlockDateTime}
                            ampm={true}
                             sx={{ width: '100%' }}
                        />
                        <TextField
                            label="Reason (Optional)"
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseBlockDialog} disabled={isSubmittingBlock}>Cancel</Button>
                    <Button onClick={handleAddTimeBlock} variant="contained" disabled={isSubmittingBlock}>
                        {isSubmittingBlock ? <CircularProgress size={20} /> : 'Add Block'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    </LocalizationProvider>
  );
} 