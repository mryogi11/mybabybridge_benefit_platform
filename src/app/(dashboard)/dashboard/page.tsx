'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
    Container,
    Grid,
    Typography,
  Card,
  CardContent,
    CircularProgress,
    Alert,
    Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  // Chip, // Removed if only used for treatment plans
    // LinearProgress // Removed if only used for treatment plans
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
// Import relevant dashboard data fetching action
import { getUserDashboardData } from '@/actions/benefitActions';
import { getAppointmentsForUser } from '@/actions/appointmentActions';
// Icons
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
// Removed AssignmentIcon if only used for treatment plans
import ErrorOutline from '@mui/icons-material/ErrorOutline';
// Removed CheckCircleIcon if only used for treatment plans
import { Appointment } from '@/types'; // Assuming Appointment type exists
// import UpgradeOptions from '@/components/UpgradeOptions'; // Removed - Component doesn't exist
// Removed: import AppointmentList from '@/components/AppointmentList'; // Component does not exist
// Removed: import BenefitPackageDisplay from '@/components/BenefitPackageDisplay'; // Component does not exist
import { useAuth } from '@/contexts/AuthContext'; // Assuming you use AuthContext

// Define types needed on the dashboard
interface DashboardPackageInfo {
    id: string;
    name: string;
    monthly_cost: number;
    description: string | null;
    key_benefits: string[] | null;
    is_base_employer_package: boolean;
}

interface DashboardErrorState {
    dashboardData: string | null;
    appointments: string | null;
}

export default function PatientDashboardPage() {
    const theme = useTheme();
    const router = useRouter();
    const { user: authUser, isLoading: authLoading } = useAuth(); // Get user from context
    const [dashboardData, setDashboardData] = useState<{ currentPackage: DashboardPackageInfo | null, allPackages: DashboardPackageInfo[] } | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<DashboardErrorState>({ dashboardData: null, appointments: null });

    // Fetch all necessary data
  useEffect(() => {
        const loadDashboard = async () => {
            if (!authUser || authLoading) {
                 console.log("Dashboard Effect: Waiting for auth user...");
                 return; // Wait for authentication
            }
             console.log("Dashboard Effect: Auth user loaded, starting data fetch...");
             setIsLoading(true);
             setError({ dashboardData: null, appointments: null }); // Reset errors
             let dataError: string | null = null;
             let apptError: string | null = null;

            try {
                 console.log("Dashboard Effect: Calling getUserDashboardData...");
                 // Uncomment the original call
                 
                 const dataResult = await getUserDashboardData();
                 if (dataResult.success && dataResult.data) {
                     console.log("Dashboard Effect: getUserDashboardData SUCCESS");
                     setDashboardData(dataResult.data);
                 } else {
                     console.error("Dashboard Effect: getUserDashboardData FAILED:", dataResult.message);
                     dataError = dataResult.message || 'Failed to load benefit information.';
                 }
                 
                 // console.log("Dashboard Effect: SKIPPED getUserDashboardData call."); // Remove skip log
                 // setDashboardData(null); // Remove null setting

                 console.log("Dashboard Effect: Attempting to fetch appointments...");
                 // Fetch appointments - Corrected error handling
                 try {
                     console.log(`Dashboard Effect: Calling getAppointmentsForUser with userId: ${authUser.id}, role: patient`);
                     // Adding 'patient' role as the likely missing second argument
                     const fetchedAppointments = await getAppointmentsForUser(authUser.id, 'patient'); 
                     // Assuming success if no error is thrown, directly set the array
                     console.log("Dashboard Effect: getAppointmentsForUser SUCCESS. Count:", fetchedAppointments.length);
                     console.log("Dashboard Effect: Fetched Appointments Data:", fetchedAppointments); // Log the actual data
                     setAppointments(fetchedAppointments);
                 } catch (fetchApptError: any) {
                     // Catch errors specifically from getAppointmentsForUser
                     console.error("Dashboard Effect: getAppointmentsForUser FAILED:", fetchApptError?.message || fetchApptError);
                     apptError = fetchApptError?.message || 'Failed to load appointments.';
                     setAppointments([]); // Clear appointments on error
                 }

            } catch (err) {
                 console.error("Dashboard Effect: General catch block error:", err);
                 // Set a general error if specific fetches didn't catch it
                 if (!dataError) dataError = "An unexpected error occurred loading benefit data.";
                 // apptError should be set by the inner try/catch if appointment fetch failed
                 if (!apptError) apptError = "An unexpected error occurred loading appointments.";
             } finally {
                 console.log("Dashboard Effect: Fetch completed. Setting final state.");
                 setError({ dashboardData: dataError, appointments: apptError });
                 setIsLoading(false);
            }
        };

        loadDashboard();

    }, [authUser, authLoading]); // Rerun when auth state changes

    // Loading State
    if (isLoading || authLoading) {
    return (
            <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
            </Container>
    );
  }

    // Error State (display specific errors)
    if (error.dashboardData || error.appointments) {
    return (
            <Container maxWidth="lg">
                <Box sx={{ py: 4 }}>
                    <Typography variant="h4" gutterBottom>Dashboard</Typography>
                    {error.dashboardData && (
                        <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorOutline />}>
                            {error.dashboardData}
                        </Alert>
                    )}
                    {error.appointments && (
                        <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorOutline />}>
                            {error.appointments}
      </Alert>
                    )}
                    {/* Optionally add a refresh button or guidance */}
                </Box>
            </Container>
    );
  }

    // --- Render Dashboard ---
    const currentPackage = dashboardData?.currentPackage;
    const allPackages = dashboardData?.allPackages || [];

  return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                Welcome Back!
            </Typography>
            <Grid container spacing={3}>
                 {/* Current Benefit Package Display - Placeholder */}
                 <Grid item xs={12}>
                    {/* Removed: <BenefitPackageDisplay currentPackage={currentPackage} /> */}
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6">Current Benefit Plan</Typography>
                            {currentPackage ? (
                                <Typography>You are enrolled in: {currentPackage.name}</Typography>
                            ) : (
                                <Typography>No benefit plan selected.</Typography>
                            )}
                        </CardContent>
                    </Card>
                 </Grid>

                {/* Upcoming Appointments - Updated */}
                <Grid item xs={12} md={7}>
                     <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">Upcoming Appointments</Typography>
                                <Button variant="outlined" startIcon={<EventIcon />} onClick={() => router.push('/dashboard/appointments')}>View All</Button>
                             </Stack>
                             {appointments.length > 0 ? (
                                 <List disablePadding>
                                     {appointments.slice(0, 3).map((appt, index) => (
                                         <React.Fragment key={appt.id}>
                                             <ListItem disableGutters sx={{ py: 1.5 }}>
                                                 <ListItemIcon sx={{ minWidth: 32 }}>
                                                     <EventIcon fontSize="small" color="action" />
                                                 </ListItemIcon>
                                                 <ListItemText 
                                                     primary={
                                                        <Typography variant="body2">
                                                            {new Date(appt.appointment_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                            {' at '}
                                                            {new Date(appt.appointment_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                        </Typography>
                                                    }
                                                     secondary={`With ${appt.provider?.first_name || ''} ${appt.provider?.last_name || 'Provider'} (${appt.provider?.specialization || 'Specialist'})`}
                                                     secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                                                 />
                                             </ListItem>
                                             {index < Math.min(appointments.length, 3) - 1 && <Divider component="li" variant="inset" sx={{ ml: 0 }} />}
                                         </React.Fragment>
                                     ))}
                                 </List>
                             ) : (
                                 <Typography color="text.secondary">No upcoming appointments scheduled.</Typography>
                             )}
                         </CardContent>
                     </Card>
                </Grid>

                {/* Benefit / Package Management Section */}
                <Grid item xs={12} md={5}>
                     <Card sx={{ height: '100%' }}>
                         <CardContent>
                             <Stack spacing={2}>
                                 <Typography variant="h6">Manage Your Benefits</Typography>
                                {currentPackage ? (
                                    <Typography variant="body2" color="text.secondary">
                                         You are currently enrolled in the {currentPackage.name} plan.
                                    </Typography>
                                 ) : (
                                     <Typography variant="body2" color="text.secondary">
                                         Review available benefit packages or enroll.
            </Typography>
                                 )}
                                 {/* Removed: <UpgradeOptions currentPackage={currentPackage} allPackages={allPackages} /> */}
                                 {/* Link to view all benefits/packages if needed */}
              <Button
                                     variant="text"
                                     onClick={() => router.push('/step5')} // Or a dedicated benefits page?
                                     sx={{ alignSelf: 'flex-start' }}
                                 >
                                     View/Change Package Options
              </Button>
            </Stack>
                         </CardContent>
                    </Card>
                </Grid>

                {/* REMOVED Treatment Plans Overview Section */}

        </Grid>
        </Container>
    );
}