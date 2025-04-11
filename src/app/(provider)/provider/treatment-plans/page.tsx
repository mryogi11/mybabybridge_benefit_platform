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
  Grid,
  IconButton,
  MenuItem,
  Select,
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
import { TreatmentPlan, TreatmentMilestone } from '@/types';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import TimelineIcon from '@mui/icons-material/Timeline';

export default function TreatmentPlansPage() {
  const theme = useTheme();
  const router = useRouter();
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    description: '',
    start_date: null as Date | null,
    end_date: null as Date | null,
    status: 'active' as 'active' | 'completed' | 'discontinued',
  });

  useEffect(() => {
    fetchTreatmentPlans();
    const subscription = supabase
      .channel('treatment_plans_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatment_plans',
        },
        () => {
          fetchTreatmentPlans();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTreatmentPlans = async () => {
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching treatment plans:', error);
      return;
    }

    setTreatmentPlans(data as any);
  };

  const handleOpenDialog = (plan?: TreatmentPlan) => {
    if (plan) {
      setSelectedPlan(plan);
      setFormData({
        title: plan.title,
        type: plan.type || '',
        description: plan.description || '',
        start_date: plan.start_date ? new Date(plan.start_date) : null,
        end_date: plan.end_date ? new Date(plan.end_date) : null,
        status: plan.status,
      });
    } else {
      setSelectedPlan(null);
      setFormData({
        title: '',
        type: '',
        description: '',
        start_date: null,
        end_date: null,
        status: 'active',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPlan(null);
    setFormData({
      title: '',
      type: '',
      description: '',
      start_date: null,
      end_date: null,
      status: 'active',
    });
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const planData = {
      ...formData,
      provider_id: user.id,
      start_date: formData.start_date?.toISOString(),
      end_date: formData.end_date?.toISOString(),
    };

    if (selectedPlan) {
      const { error } = await supabase
        .from('treatment_plans')
        .update(planData as any)
        .eq('id', selectedPlan.id);

      if (error) {
        console.error('Error updating treatment plan:', error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('treatment_plans')
        .insert(planData as any);

      if (error) {
        console.error('Error creating treatment plan:', error);
        return;
      }
    }

    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('treatment_plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting treatment plan:', error);
      return;
    }
  };

  const handleViewMilestones = (planId: string) => {
    router.push(`/provider/treatment-plans/${planId}/milestones`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Treatment Plans</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Treatment Plan
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
        {treatmentPlans.map((plan) => (
          <Card key={plan.id}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {plan.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Patient: {plan.patient?.first_name} {plan.patient?.last_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start Date: {format(new Date(plan.start_date), 'MMM d, yyyy')}
                  </Typography>
                </Box>
                <Stack direction="row">
                  <IconButton onClick={() => handleViewMilestones(plan.id)}>
                    <TimelineIcon />
                  </IconButton>
                  <IconButton onClick={() => handleOpenDialog(plan)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(plan.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedPlan ? 'Edit Treatment Plan' : 'New Treatment Plan'}
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
              label="Start Date"
              value={formData.start_date}
              onChange={(date) => setFormData({ ...formData, start_date: date })}
              slotProps={{ textField: { fullWidth: true, required: true } }}
            />
            <DatePicker
              label="End Date"
              value={formData.end_date}
              onChange={(date) => setFormData({ ...formData, end_date: date })}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })}
              fullWidth
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="discontinued">Discontinued</MenuItem>
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedPlan ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 