'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  useTheme,
  Chip,
  MenuItem,
  Select,
  Autocomplete,
  Snackbar,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import { supabase } from '@/lib/supabase/client';
import { TreatmentPlan, TreatmentMilestone, MilestoneDependency } from '@/types';
import { format } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import MilestoneNotes from '@/components/MilestoneNotes';

export default function TreatmentMilestonesPage() {
  const theme = useTheme();
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [milestones, setMilestones] = useState<TreatmentMilestone[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<TreatmentMilestone | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dependencies, setDependencies] = useState<MilestoneDependency[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: null as Date | null,
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
    depends_on: [] as string[],
  });
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchTreatmentPlan();
    fetchMilestones();
    fetchDependencies();
    const subscription = supabase
      .channel('treatment_milestones_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatment_milestones',
          filter: `treatment_plan_id=eq.${planId}`,
        },
        () => {
          fetchMilestones();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [planId]);

  const fetchTreatmentPlan = async () => {
    const { data, error } = await supabase
      .from('treatment_plans')
      .select(`
        *,
        patient:patient_id (
          id,
          user_id,
          first_name,
          last_name,
          email,
          date_of_birth,
          phone,
          address,
          created_at,
          updated_at
        ),
        provider:provider_id (
          id,
          user_id,
          first_name,
          last_name,
          specialization,
          bio,
          experience_years,
          education,
          certifications,
          availability,
          created_at,
          updated_at
        )
      `)
      .eq('id', planId)
      .single();

    if (error) {
      console.error('Error fetching treatment plan:', error);
      return;
    }

    setTreatmentPlan(data as any);
  };

  const fetchMilestones = async () => {
    const { data, error } = await supabase
      .from('treatment_milestones')
      .select('*')
      .eq('treatment_plan_id', planId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching milestones:', error);
      return;
    }

    setMilestones(data as any);
  };

  const fetchDependencies = async () => {
    const { data, error } = await supabase
      .from('milestone_dependencies')
      .select('*')
      .eq('milestone_id', planId);

    if (error) {
      console.error('Error fetching dependencies:', error);
      return;
    }

    setDependencies(data as any);
  };

  const handleOpenDialog = (milestone?: TreatmentMilestone) => {
    if (milestone) {
      setSelectedMilestone(milestone);
      const milestoneDependencies = dependencies
        .filter(d => d.milestone_id === milestone.id)
        .map(d => d.depends_on_milestone_id);
      
      setFormData({
        title: milestone.title,
        description: milestone.description || '',
        due_date: milestone.due_date ? new Date(milestone.due_date) : null,
        status: milestone.status,
        depends_on: milestoneDependencies,
      });
    } else {
      setSelectedMilestone(null);
      setFormData({
        title: '',
        description: '',
        due_date: null,
        status: 'pending',
        depends_on: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMilestone(null);
    setFormData({
      title: '',
      description: '',
      due_date: null,
      status: 'pending',
      depends_on: [],
    });
  };

  const handleSubmit = async () => {
    const milestoneData = {
      ...formData,
      treatment_plan_id: planId,
      due_date: formData.due_date?.toISOString(),
    };

    let milestoneId: string;

    if (selectedMilestone) {
      const { error } = await supabase
        .from('treatment_milestones')
        .update(milestoneData as any)
        .eq('id', selectedMilestone.id);

      if (error) {
        console.error('Error updating milestone:', error);
        return;
      }
      milestoneId = selectedMilestone.id;
    } else {
      const { data, error } = await supabase
        .from('treatment_milestones')
        .insert(milestoneData as any)
        .select()
        .single();

      if (error) {
        console.error('Error creating milestone:', error);
        return;
      }
      milestoneId = data.id;
    }

    // Update dependencies
    const { error: deleteError } = await supabase
      .from('milestone_dependencies')
      .delete()
      .eq('milestone_id', milestoneId);

    if (deleteError) {
      console.error('Error deleting dependencies:', deleteError);
      return;
    }

    if (formData.depends_on.length > 0) {
      const newDependencies = formData.depends_on.map(depId => ({
        milestone_id: milestoneId,
        depends_on_milestone_id: depId,
      }));

      const { error: insertError } = await supabase
        .from('milestone_dependencies')
        .insert(newDependencies as any);

      if (insertError) {
        console.error('Error creating dependencies:', insertError);
        return;
      }
    }

    // Show success message if milestone is completed
    if (formData.status === 'completed') {
      const nextMilestone = milestones.find(m => 
        dependencies.some(d => 
          d.milestone_id === m.id && 
          d.depends_on_milestone_id === milestoneId
        )
      );

      if (nextMilestone) {
        setSuccessMessage(`Milestone completed. Patient can now proceed with "${nextMilestone.title}".`);
        setShowSuccessMessage(true);
      }
    }

    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('treatment_milestones')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting milestone:', error);
      return;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getDependencyStatus = (milestone: TreatmentMilestone) => {
    const milestoneDependencies = dependencies
      .filter(d => d.milestone_id === milestone.id)
      .map(d => d.depends_on_milestone_id);

    if (milestoneDependencies.length === 0) return 'default';

    const dependencyMilestones = milestones.filter(m => milestoneDependencies.includes(m.id));
    const allCompleted = dependencyMilestones.every(m => m.status === 'completed');
    const someCompleted = dependencyMilestones.some(m => m.status === 'completed');

    if (allCompleted) return 'success';
    if (someCompleted) return 'warning';
    return 'error';
  };

  const handleViewAnalytics = () => {
    router.push(`/provider/treatment-plans/${planId}/analytics`);
  };

  if (!treatmentPlan) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Treatment Plan: {treatmentPlan.title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Patient: {treatmentPlan.patient?.first_name} {treatmentPlan.patient?.last_name}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<AnalyticsIcon />}
            onClick={handleViewAnalytics}
          >
            View Analytics
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            New Milestone
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={2}>
        {milestones.map((milestone) => (
          <Card key={milestone.id}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <Typography variant="h6">
                      {milestone.title}
                    </Typography>
                    <Chip
                      label={milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                      color={getStatusColor(milestone.status)}
                      size="small"
                    />
                    {getDependencyStatus(milestone) !== 'default' && (
                      <Chip
                        label="Dependencies"
                        color={getDependencyStatus(milestone)}
                        size="small"
                      />
                    )}
                  </Stack>
                  {milestone.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {milestone.description}
                    </Typography>
                  )}
                  {milestone.due_date && (
                    <Typography variant="body2" color="text.secondary">
                      Due Date: {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                    </Typography>
                  )}
                  {dependencies
                    .filter(d => d.milestone_id === milestone.id)
                    .map(dep => {
                      const depMilestone = milestones.find(m => m.id === dep.depends_on_milestone_id);
                      return (
                        <Typography key={dep.id} variant="body2" color="text.secondary">
                          Depends on: {depMilestone?.title}
                        </Typography>
                      );
                    })}
                </Box>
                <Stack direction="row">
                  <IconButton onClick={() => handleOpenDialog(milestone)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(milestone.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </Stack>

              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <MilestoneNotes 
                  milestoneId={milestone.id} 
                  appointmentId={milestone.appointment_id || undefined} 
                />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedMilestone ? 'Edit Milestone' : 'New Milestone'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={4}
              fullWidth
            />
            <DatePicker
              label="Due Date"
              value={formData.due_date}
              onChange={(date) => setFormData({ ...formData, due_date: date })}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })}
              fullWidth
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
            <Autocomplete
              multiple
              options={milestones.filter(m => m.id !== selectedMilestone?.id)}
              getOptionLabel={(option) => option.title}
              value={milestones.filter(m => formData.depends_on.includes(m.id))}
              onChange={(_, newValue) => {
                setFormData({
                  ...formData,
                  depends_on: newValue.map(m => m.id),
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Dependencies"
                  placeholder="Select milestone dependencies"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.title}
                    {...getTagProps({ index })}
                    key={option.id}
                  />
                ))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedMilestone ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={6000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSuccessMessage(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
} 