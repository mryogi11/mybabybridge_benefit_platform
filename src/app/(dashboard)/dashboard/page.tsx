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
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
// import PendingIcon from '@mui/icons-material/Pending';
// import CancelIcon from '@mui/icons-material/Cancel';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { User } from '@supabase/supabase-js'; // Import User type if not already imported globally

// Define local interface for appointments if needed for clarity, matching expected structure
interface DashboardAppointment extends Omit<Appointment, 'provider'> { // Omit base provider to redefine
  provider?: { // Make provider optional
    id: string; // Keep ID non-optional if always expected
    user_id: string; // Keep user_id non-optional if always expected
    first_name: string | null;
    last_name: string | null;
    specialization: string | null; // Match base type
  } | undefined; // Allow undefined, but not null if base type doesn't
}

interface DashboardMilestone extends Omit<TreatmentMilestone, 'treatment_plan'> { // Omit base treatment_plan
  treatment_plan?: {
    title: string; // Keep title non-optional if always expected
  } | undefined; // Allow undefined, but not null
}

export default function PatientDashboardPage() {
  const theme = useTheme();
  const router = useRouter();
  const { user: authUser, session } = useAuth(); // Get user directly from context
  const [localUser, setLocalUser] = useState<User | null>(null); // Local state if needed, though authUser from context is preferred
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<DashboardAppointment[]>([]);
  const [recentMilestones, setRecentMilestones] = useState<DashboardMilestone[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Debug user state from context
  useEffect(() => {
    console.log('Dashboard - Auth state from context:', { authUser, session });
    if (authUser) {
        setLocalUser(authUser); // Update local state if using it
    }
    // Redirect logic (optional, depends on your AuthProvider setup)
    const timer = setTimeout(() => {
      if (!authUser && !session) { // Check context user directly
        console.log('No user detected in dashboard (from context), redirecting to login');
        // router.push('/login'); // Uncomment if redirection is desired here
      }
    }, 1500); // Adjust delay if needed

    return () => clearTimeout(timer);
  }, [authUser, session, router]);

  // Fetch user profile, treatment plans, and appointments on component mount
   useEffect(() => {
    // Only fetch data if the user from context is available
    if (!authUser) {
        console.log("Dashboard useEffect: Waiting for authUser from context...");
        setLoading(false); // Stop loading if no user
        return;
    }

    setLoading(true);
    setError(null);
    console.log("Dashboard useEffect triggered with authUser:", authUser.id);

    const fetchData = async () => {
      try {
        // authUser is already available from the context hook
        console.log("Dashboard: Using auth user from context:", authUser.id);

        // Use Promise.all to fetch plans, appointments, milestones, notifications
        // Ensure fetch functions are defined and accept user id if needed
        await Promise.all([
          // Assuming fetchUserProfile is needed elsewhere or context provides profile
          // fetchUserProfile(authUser.id), // Removed setUser, so fetchUserProfile might not be needed here unless it sets other state
          fetchTreatmentPlans(authUser.id),
          fetchUpcomingAppointments(authUser.id), // Pass authUser.id
          fetchRecentMilestones(authUser.id), // Pass authUser.id
          fetchNotifications(authUser.id) // Pass authUser.id
        ]);

      } catch (err: any) {
        console.error("Dashboard: Error fetching initial data:", err);
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
        console.log("Dashboard: Initial data fetch sequence complete (loading set to false).");
      }
    };

    fetchData();
    // Add supabase client to dependency array if it's stable, otherwise remove if not used directly here
  }, [authUser]); // Re-run fetch if authUser changes

  // Log the state whenever it changes
  useEffect(() => {
    console.log("Dashboard: upcomingAppointments state updated:", upcomingAppointments);
  }, [upcomingAppointments]);

  const fetchTreatmentPlans = async (userId: string) => { // Accept userId
    // No need to fetch user again if passed in
    if (!userId) {
        console.error('fetchTreatmentPlans: userId not provided.');
        return;
    }
    try {
        const { data: patientProfile, error: patientProfileError } = await supabase
            .from('patient_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (patientProfileError || !patientProfile) {
             console.error('Error fetching patient profile for treatment plans:', patientProfileError);
             // Handle error appropriately, maybe set specific error state
             return;
        }
        const patientProfileId = patientProfile.id;

      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          provider:providers (id, first_name, last_name, specialization),
          milestones:treatment_milestones (*)
        `)
        .eq('patient_id', patientProfileId) // Use patient profile ID
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching treatment plans:', error);
        // Optionally set specific error state
        return;
      }
      console.log("Dashboard: Fetched treatment plans:", data);
      setTreatmentPlans(data || []);
    } catch (err) {
      console.error('Exception fetching treatment plans:', err);
      // Optionally set specific error state
    }
  };

  const fetchUpcomingAppointments = async (userId: string) => { // Accept userId
    if (!userId) {
       console.log('fetchUpcomingAppointments: No userId provided.');
       setUpcomingAppointments([]);
       return;
     }

    console.log('Fetching appointments for user:', userId);

    try {
      // 1. Get the patient profile ID
      const { data: patientData, error: patientError } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (patientError) {
        console.error('Error fetching patient profile:', patientError);
        if (patientError.code === 'PGRST116') {
          console.warn(`No patient profile found for user ${userId}. Skipping appointment fetch.`);
        } else {
          console.error('Unhandled error fetching patient profile:', patientError);
        }
        setUpcomingAppointments([]);
        return;
      }

      if (!patientData) {
        console.warn(`Patient profile data was unexpectedly null for user ${userId}. Skipping appointment fetch.`);
        setUpcomingAppointments([]);
        return;
      }

      const patientProfileId = patientData.id;
      console.log('Found patient profile ID:', patientProfileId);

      // 2. Fetch appointments using the patient profile ID
      console.log("Fetching appointments without date filter for debugging..."); // Log change
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          provider:providers (
            id,
            user_id,
            first_name,
            last_name,
            specialization
          )
        `)
        .eq('patient_id', patientProfileId)
        // .gte('appointment_date', new Date().toISOString()) // Temporarily REMOVED date filter
        .neq('status', 'cancelled') // Keep cancelled filter
        .order('appointment_date', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        setUpcomingAppointments([]);
        return;
      }

      console.log('Raw upcoming appointment data fetched:', data);
      // Ensure type compatibility
       const typedAppointments = (data || []).map(appt => ({
           ...appt,
           // Ensure provider structure matches DashboardAppointment
           provider: appt.provider ? {
               id: appt.provider.id,
               user_id: appt.provider.user_id,
               first_name: appt.provider.first_name,
               last_name: appt.provider.last_name,
               specialization: appt.provider.specialization,
           } : undefined,
       })) as DashboardAppointment[];

      setUpcomingAppointments(typedAppointments);
    } catch (err) {
      console.error('Unexpected error in fetchUpcomingAppointments:', err);
      setUpcomingAppointments([]);
    }
  };

  const fetchRecentMilestones = async (userId: string) => { // Accept userId
     if (!userId) {
        console.error('fetchRecentMilestones: No userId provided.');
        return;
     }
     try {
         const { data: patientProfile, error: patientProfileError } = await supabase
            .from('patient_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (patientProfileError || !patientProfile) {
             console.error('Error fetching patient profile for milestones:', patientProfileError);
             return;
        }
        const patientProfileId = patientProfile.id;

        // Fetch treatment plans associated with the patient
        const { data: plansData, error: plansError } = await supabase
            .from('treatment_plans')
            .select('id')
            .eq('patient_id', patientProfileId);

        if (plansError || !plansData) {
            console.error('Error fetching treatment plans for milestones:', plansError);
            return;
        }

        const planIds = plansData.map(p => p.id);
        if (planIds.length === 0) {
            setRecentMilestones([]);
            return; // No plans, so no milestones
        }

        const { data, error } = await supabase
          .from('treatment_milestones')
          .select(`
            *,
            treatment_plan:treatment_plans (title)
          `)
          .in('treatment_plan_id', planIds) // Filter by patient's plan IDs
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching milestones:', error);
          return;
        }
        console.log("Dashboard: Fetched recent milestones:", data);
        setRecentMilestones(data as DashboardMilestone[]); // Type assertion
     } catch (err) {
         console.error('Exception fetching milestones:', err);
     }
  };

  const fetchNotifications = async (userId: string) => { // Accept userId
    if (!userId) {
        console.error('fetchNotifications: No userId provided.');
        return;
    }
    try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId) // Filter by the authenticated user's ID
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching notifications:', error);
          return;
        }
        console.log("Dashboard: Fetched notifications:", data);
        setNotifications(data || []);
    } catch (err) {
        console.error('Exception fetching notifications:', err);
    }
  };

  const getStatusColor = (status: string): ('success' | 'warning' | 'error' | 'default' | 'primary' | 'secondary' | 'info') => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'scheduled': return 'primary';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const calculatePlanProgress = (milestones: TreatmentMilestone[] | undefined | null): number => {
    if (!milestones?.length) return 0;
    const completed = milestones.filter(m => m.status === 'completed').length;
    return Math.round((completed / milestones.length) * 100);
  };

  const getAppointmentDateLabel = (date: string | null | undefined): string => {
    if (!date) return 'N/A';
    try {
        const appointmentDate = parseISO(date); // Use parseISO for ISO strings
        if (isToday(appointmentDate)) return 'Today';
        if (isTomorrow(appointmentDate)) return 'Tomorrow';
        return format(appointmentDate, 'MMM d, yyyy');
    } catch (e) {
        console.error("Error formatting appointment date:", date, e);
        return "Invalid Date";
    }
  };

  const getAppointmentTimeLabel = (date: string | null | undefined): string => {
     if (!date) return '';
     try {
        const appointmentDate = parseISO(date);
        return format(appointmentDate, 'h:mm a');
     } catch (e) {
         console.error("Error formatting appointment time:", date, e);
         return "Invalid Time";
     }
  };


  // --- Render Logic ---

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

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
      {/* Header */}
      <Box
        sx={{
          background: `linear-gradient(120deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
          color: theme.palette.primary.contrastText,
          borderRadius: 2,
          p: { xs: 2, sm: 3 },
          mb: 4,
          boxShadow: theme.shadows[3],
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative element */}
        <Box
          sx={{
            position: 'absolute', top: -20, right: -20, width: 150, height: 150,
            background: 'rgba(255,255,255,0.1)', borderRadius: '50%', zIndex: 1
          }}
        />
         <Box
          sx={{
            position: 'absolute', bottom: -30, left: -30, width: 100, height: 100,
            background: 'rgba(255,255,255,0.05)', borderRadius: '50%', zIndex: 1
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 2}}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Welcome back, {authUser?.email?.split('@')[0] || 'Patient'}
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 2, opacity: 0.9 }}>
              Here's your health dashboard overview.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => router.push('/dashboard/appointments')}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, backdropFilter: 'blur(5px)' }}
              >
                Appointments
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => router.push('/dashboard/treatment-plans')}
                 sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, backdropFilter: 'blur(5px)' }}
              >
                Treatment Plans
              </Button>
            </Stack>
        </Box>
      </Box>

      {/* Main Content Grid */}
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <Grid container spacing={3}>

          {/* Treatment Plans Overview */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Your Treatment Plans</Typography>
                    <Button variant="outlined" startIcon={<AssignmentIcon />} onClick={() => router.push('/dashboard/treatment-plans')}>View All</Button>
                  </Stack>
                  {treatmentPlans.length > 0 ? (
                      <Stack spacing={2}>
                        {treatmentPlans.map((plan) => (
                          <Card key={plan.id} variant="outlined">
                            <CardContent>
                              <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography variant="subtitle1" fontWeight="medium">{plan.title}</Typography>
                                  <Chip label={`${calculatePlanProgress(plan.milestones)}%`} color="primary" size="small" />
                                </Stack>
                                <Typography variant="body2" color="text.secondary">
                                  Provider: {plan.provider?.first_name} {plan.provider?.last_name}
                                </Typography>
                                <LinearProgress variant="determinate" value={calculatePlanProgress(plan.milestones)} sx={{ height: 8, borderRadius: 4, mt: 1 }} />
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                   ) : (
                     <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No active treatment plans.</Typography>
                   )}
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
                    <Typography variant="h6">Upcoming Appointments</Typography>
                    <Button variant="outlined" startIcon={<CalendarTodayIcon />} onClick={() => router.push('/dashboard/appointments')}>View All</Button>
                  </Stack>
                  {upcomingAppointments.length > 0 ? (
                      <List disablePadding>
                        {upcomingAppointments.map((appointment) => (
                          <ListItem key={appointment.id} divider sx={{ py: 1.5 }}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              <CalendarTodayIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Typography variant="subtitle2">{getAppointmentDateLabel(appointment.appointment_date)}</Typography>
                                  <Chip label={getAppointmentTimeLabel(appointment.appointment_date)} size="small" color={getStatusColor(appointment.status)} />
                                </Stack>
                              }
                              secondary={
                                <Typography variant="body2" color="text.secondary" noWrap>
                                  Dr. {appointment.provider?.first_name} {appointment.provider?.last_name} ({appointment.provider?.specialization || 'N/A'})
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                   ) : (
                       <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No upcoming appointments.</Typography>
                   )}
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
                    <Typography variant="h6">Recent Milestones</Typography>
                    <Button variant="outlined" startIcon={<TrendingUpIcon />} onClick={() => router.push('/dashboard/treatment-plans')}>View Plans</Button>
                  </Stack>
                   {recentMilestones.length > 0 ? (
                       <List disablePadding>
                        {recentMilestones.map((milestone) => (
                          <ListItem key={milestone.id} divider sx={{ py: 1.5 }}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              <CheckCircleIcon color="success" />
                            </ListItemIcon>
                            <ListItemText
                              primary={milestone.title}
                              secondary={
                                <Typography variant="body2" color="text.secondary">
                                  {milestone.treatment_plan?.title || 'Plan N/A'} • {milestone.completed_at ? format(parseISO(milestone.completed_at), 'MMM d, yyyy') : 'N/A'}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                       </List>
                    ) : (
                       <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No recent milestone completions.</Typography>
                    )}
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
                    <Typography variant="h6">Recent Notifications</Typography>
                     <Button variant="outlined" startIcon={<NotificationsIcon />} onClick={() => router.push('/dashboard/notifications')}>View All</Button>
                  </Stack>
                  {notifications.length > 0 ? (
                      <List disablePadding>
                        {notifications.map((notification) => (
                          <ListItem key={notification.id} divider sx={{ py: 1.5 }}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              <NotificationsIcon color={notification.is_read ? 'disabled' : 'primary'} />
                            </ListItemIcon>
                            <ListItemText
                              primary={notification.title}
                              secondary={
                                <Typography variant="body2" color="text.secondary">
                                  {format(parseISO(notification.created_at), 'MMM d, yyyy h:mm a')}
                                </Typography>
                              }
                              sx={{ opacity: notification.is_read ? 0.6 : 1 }}
                            />
                          </ListItem>
                        ))}
                      </List>
                   ) : (
                     <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No recent notifications.</Typography>
                   )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
      </Box>
    </Box>
  );
}

// Helper function (ensure fetchUserProfile exists or remove its call)
async function fetchUserProfile(userId: string) {
    // Implement profile fetching logic if needed, or rely on context
    console.log("fetchUserProfile called for:", userId);
    // Example:
    // const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    // if (error) console.error("Error fetching profile:", error);
    // else console.log("Fetched profile:", data);
}
