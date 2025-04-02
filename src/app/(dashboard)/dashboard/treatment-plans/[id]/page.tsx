'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
  useTheme,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Divider,
} from '@mui/material';
import { supabase } from '@/lib/supabase/client';
import { TreatmentPlan, TreatmentMilestone, TreatmentNote } from '@/types';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';

export default function PatientTreatmentPlanPage() {
  const theme = useTheme();
  const params = useParams();
  const planId = params.id as string;
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [milestones, setMilestones] = useState<TreatmentMilestone[]>([]);
  const [notes, setNotes] = useState<TreatmentNote[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    fetchTreatmentPlan();
    fetchMilestones();
    fetchNotes();
    const subscription = supabase
      .channel('treatment_plan_changes')
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
        provider:provider_id (first_name, last_name, specialization)
      `)
      .eq('id', planId)
      .single();

    if (error) {
      console.error('Error fetching treatment plan:', error);
      return;
    }

    setTreatmentPlan(data);
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

    setMilestones(data);
    // Set active step to first incomplete milestone
    const firstIncompleteIndex = data.findIndex(m => m.status !== 'completed');
    setActiveStep(firstIncompleteIndex === -1 ? data.length - 1 : firstIncompleteIndex);
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('treatment_notes')
      .select(`
        *,
        provider:provider_id (first_name, last_name)
      `)
      .eq('treatment_plan_id', planId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return;
    }

    setNotes(data);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'pending':
        return <PendingIcon color="warning" />;
      case 'cancelled':
        return <CancelIcon color="error" />;
      default:
        return null;
    }
  };

  const calculateProgress = () => {
    if (milestones.length === 0) return 0;
    const completed = milestones.filter(m => m.status === 'completed').length;
    return (completed / milestones.length) * 100;
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
      <Stack spacing={3}>
        {/* Header */}
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h4">
                {treatmentPlan.title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Provider: {treatmentPlan.provider?.first_name} {treatmentPlan.provider?.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start Date: {format(new Date(treatmentPlan.start_date), 'MMM d, yyyy')}
                {treatmentPlan.end_date && ` • End Date: ${format(new Date(treatmentPlan.end_date), 'MMM d, yyyy')}`}
              </Typography>
              {treatmentPlan.description && (
                <Typography variant="body1">
                  {treatmentPlan.description}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Overall Progress</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={calculateProgress()}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Typography variant="body1" color="text.secondary">
                  {Math.round(calculateProgress())}%
                </Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Chip
                  icon={<CheckCircleIcon />}
                  label={`${milestones.filter(m => m.status === 'completed').length} Completed`}
                  color="success"
                />
                <Chip
                  icon={<PendingIcon />}
                  label={`${milestones.filter(m => m.status === 'pending').length} Pending`}
                  color="warning"
                />
                <Chip
                  icon={<CancelIcon />}
                  label={`${milestones.filter(m => m.status === 'cancelled').length} Cancelled`}
                  color="error"
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Treatment Timeline */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Treatment Timeline
            </Typography>
            <Stepper activeStep={activeStep} orientation="vertical">
              {milestones.map((milestone, index) => (
                <Step key={milestone.id}>
                  <StepLabel
                    StepIconProps={{
                      icon: getStatusIcon(milestone.status),
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle1">
                        {milestone.title}
                      </Typography>
                      <Chip
                        label={milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                        color={getStatusColor(milestone.status)}
                        size="small"
                      />
                    </Stack>
                  </StepLabel>
                  <StepContent>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Stack spacing={2}>
                        {milestone.description && (
                          <Typography variant="body2">
                            {milestone.description}
                          </Typography>
                        )}
                        {milestone.due_date && (
                          <Typography variant="body2" color="text.secondary">
                            Due Date: {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                          </Typography>
                        )}
                        {milestone.appointment_id && (
                          <Typography variant="body2" color="text.secondary">
                            Associated with an appointment
                          </Typography>
                        )}
                        {notes
                          .filter(note => note.milestone_id === milestone.id)
                          .map(note => (
                            <Box key={note.id}>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="body2" color="text.secondary">
                                {note.provider?.first_name} {note.provider?.last_name} •{' '}
                                {format(new Date(note.created_at), 'MMM d, yyyy')}
                              </Typography>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                {note.content}
                              </Typography>
                            </Box>
                          ))}
                      </Stack>
                    </Paper>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
} 