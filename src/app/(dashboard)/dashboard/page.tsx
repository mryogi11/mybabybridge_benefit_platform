'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  useTheme,
  Alert,
  CircularProgress,
} from '@mui/material';
import { supabase } from '@/lib/supabase/client';
import { TreatmentPlan, TreatmentMilestone, Appointment, Notification } from '@/types';
import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function PatientDashboardPage() {
  const theme = useTheme();
  const router = useRouter();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recentMilestones, setRecentMilestones] = useState<TreatmentMilestone[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Debug user state
  useEffect(() => {
    console.log('Dashboard - Auth state:', { user, session });
    
    // Redirect if no user after a short delay
    const timer = setTimeout(() => {
      if (!user && !session) {
        console.log('No user detected in dashboard, redirecting to login');
        router.push('/login');
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [user, session, router]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check for auth
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          throw new Error('Not authenticated');
        }
        
        console.log('Loading dashboard data for user:', currentUser.id);
        
        await Promise.all([
          fetchTreatmentPlans(),
          fetchUpcomingAppointments(),
          fetchRecentMilestones(),
          fetchNotifications()
        ]);
      } catch (err: any) {
        console.error('Dashboard loading error:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
    
    const subscription = supabase
      .channel('dashboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatment_milestones',
        },
        () => {
          fetchRecentMilestones();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          fetchUpcomingAppointments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTreatmentPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when fetching treatment plans');
        return;
      }

      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          provider:provider_id (first_name, last_name, specialization),
          milestones:treatment_milestones (*)
        `)
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching treatment plans:', error);
        return;
      }

      setTreatmentPlans(data || []);
    } catch (err) {
      console.error('Exception fetching treatment plans:', err);
    }
  };

  const fetchUpcomingAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        provider:provider_id (first_name, last_name, specialization)
      `)
      .eq('patient_id', user.id)
      .gte('appointment_date', new Date().toISOString())
      .order('appointment_date', { ascending: true })
      .limit(5);

    if (error) {
      console.error('Error fetching appointments:', error);
      return;
    }

    setUpcomingAppointments(data);
  };

  const fetchRecentMilestones = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('treatment_milestones')
      .select(`
        *,
        treatment_plan:treatment_plans (title)
      `)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching milestones:', error);
      return;
    }

    setRecentMilestones(data);
  };

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(data);
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

  const calculatePlanProgress = (milestones: TreatmentMilestone[] | undefined) => {
    if (!milestones?.length) return 0;
    const completed = milestones.filter(m => m.status === 'completed').length;
    return (completed / milestones.length) * 100;
  };

  const getAppointmentDateLabel = (date: string) => {
    const appointmentDate = new Date(date);
    if (isToday(appointmentDate)) return 'Today';
    if (isTomorrow(appointmentDate)) return 'Tomorrow';
    return format(appointmentDate, 'MMM d, yyyy');
  };

  const getAppointmentStatusColor = (status: string) => {
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

  // If loading, show a loading indicator
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If there was an error, show an error message
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
        <Button 
          variant="outlined" 
          size="small" 
          sx={{ ml: 2 }}
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* New improved header */}
      <Box 
        sx={{ 
          background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: 'white',
          borderRadius: 2,
          p: 3,
          mb: 4,
          boxShadow: 3,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box 
          sx={{ 
            position: 'absolute',
            top: 0,
            right: 0,
            width: '30%',
            height: '100%',
            background: 'rgba(255,255,255,0.1)',
            transform: 'skewX(-15deg)',
            transformOrigin: 'top right'
          }}
        />
        
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Welcome back, {user?.email?.split('@')[0] || 'Patient'}
        </Typography>
        
        <Typography variant="subtitle1" sx={{ mb: 2, opacity: 0.9 }}>
          Here's an overview of your treatment progress and upcoming appointments
        </Typography>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={() => router.push('/dashboard/appointments')}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.15)', 
              '&:hover': { 
                bgcolor: 'rgba(255,255,255,0.25)'
              },
              backdropFilter: 'blur(8px)'
            }}
          >
            View Appointments
          </Button>
          
          <Button 
            variant="contained" 
            color="secondary"
            onClick={() => router.push('/dashboard/treatment-plans')}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.15)', 
              '&:hover': { 
                bgcolor: 'rgba(255,255,255,0.25)'
              },
              backdropFilter: 'blur(8px)'
            }}
          >
            Treatment Plans
          </Button>
        </Stack>
      </Box>

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Treatment Plans Overview */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                      Your Treatment Plans
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AssignmentIcon />}
                      onClick={() => router.push('/dashboard/treatment-plans')}
                    >
                      View All
                    </Button>
                  </Stack>
                  <Stack spacing={2}>
                    {treatmentPlans.map((plan) => (
                      <Card key={plan.id} variant="outlined">
                        <CardContent>
                          <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="subtitle1">
                                {plan.title}
                              </Typography>
                              <Chip
                                label={`${Math.round(calculatePlanProgress(plan.milestones))}%`}
                                color="primary"
                                size="small"
                              />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              Provider: {plan.provider?.first_name} {plan.provider?.last_name}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={calculatePlanProgress(plan.milestones)}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Upcoming Appointments */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                      Upcoming Appointments
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<CalendarTodayIcon />}
                      onClick={() => router.push('/dashboard/appointments')}
                    >
                      View All
                    </Button>
                  </Stack>
                  <List>
                    {upcomingAppointments.map((appointment) => (
                      <ListItem key={appointment.id} divider>
                        <ListItemIcon>
                          <CalendarTodayIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="subtitle2">
                                {getAppointmentDateLabel(appointment.appointment_date)}
                              </Typography>
                              <Chip
                                label={format(new Date(appointment.appointment_date), 'h:mm a')}
                                size="small"
                                color={getAppointmentStatusColor(appointment.status)}
                              />
                            </Stack>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {appointment.provider?.first_name} {appointment.provider?.last_name}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Milestone Completions */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                      Recent Milestone Completions
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<TrendingUpIcon />}
                      onClick={() => router.push('/dashboard/treatment-plans')}
                    >
                      View All
                    </Button>
                  </Stack>
                  <List>
                    {recentMilestones.map((milestone) => (
                      <ListItem key={milestone.id} divider>
                        <ListItemIcon>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={milestone.title}
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {milestone.treatment_plan?.title} •{' '}
                              {milestone.completed_at ? format(new Date(milestone.completed_at), 'MMM d, yyyy') : 'Not completed'}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Notifications */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                      Recent Notifications
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<NotificationsIcon />}
                      onClick={() => router.push('/dashboard/notifications')}
                    >
                      View All
                    </Button>
                  </Stack>
                  <List>
                    {notifications.map((notification) => (
                      <ListItem key={notification.id} divider>
                        <ListItemIcon>
                          <NotificationsIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={notification.title}
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
} 