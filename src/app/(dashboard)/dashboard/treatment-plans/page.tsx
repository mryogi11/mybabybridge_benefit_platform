// Remove 'use client' - This will be a Server Component

import React from 'react'; // No need for useState, useEffect etc. here
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Chip,
  CircularProgress, // Keep for potential client component loading state
  Alert,
  Card, // Use Card for better structure
  CardContent,
  Divider
} from '@mui/material';
// Remove client-side imports no longer needed at page level
// import { useRouter } from 'next/navigation';
// import { supabase } from '@/lib/supabase/client';
import { Assignment, ErrorOutline, WorkspacePremium, Upgrade } from '@mui/icons-material';

// Import the server action to fetch data
import { getUserDashboardData } from '@/actions/benefitActions';
import UpgradeOptions from './_components/UpgradeOptions'; // Assume we create this client component later

// Define types directly or import if defined elsewhere
interface Provider {
  first_name: string;
  last_name: string;
  specialization: string;
}

interface TreatmentPlan {
  id: string;
  patient_id: string | null;
  provider_id: string | null;
  type: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  title: string;
  updated_at: string;
  provider?: Provider | null;
}

// TODO: Fetch actual treatment plans from DB using a server action
// For now, keeping mock data logic
const getMockTreatmentPlans = (): TreatmentPlan[] => [
   {
      id: '1',
      patient_id: '1',
      provider_id: '101',
      type: 'Speech Therapy',
      title: 'Speech Development Plan',
      description: 'Comprehensive speech therapy plan focusing on articulation and language development.',
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days later
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      provider: {
        first_name: 'Jane',
        last_name: 'Smith',
        specialization: 'Speech Therapy'
      }
    } as TreatmentPlan,
    {
      id: '2',
      patient_id: '1',
      provider_id: '102',
      type: 'Physical Therapy',
      title: 'Motor Skills Development',
      description: 'Physical therapy plan to improve motor skills and coordination.',
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days later
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      provider: {
        first_name: 'Robert',
        last_name: 'Johnson',
        specialization: 'Physical Therapy'
      }
    } as TreatmentPlan
];

// Make the component async to use await for data fetching
export default async function TreatmentPlansPage() {
  // Fetch dashboard data (packages etc.) using the server action
  const { success: dataSuccess, data: dashboardData, message: dataMessage } = await getUserDashboardData();

  // Fetch actual treatment plans (using mock for now)
  // TODO: Replace mock data with actual data fetching, potentially combining with getUserDashboardData or a separate action
  const plans: TreatmentPlan[] = getMockTreatmentPlans();
  let error: string | null = null;

  if (!dataSuccess) {
    // Handle error fetching dashboard data - show message but maybe still render page?
    console.error("Failed to fetch dashboard data:", dataMessage);
    error = `Could not load benefit plan details: ${dataMessage}. Treatment plans may still be visible.`;
    // Depending on requirements, you might want to return early or show a specific error state
  }

  const currentPackage = dashboardData?.currentPackage;
  const allPackages = dashboardData?.allPackages || [];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'primary';
      case 'completed':
        return 'success';
      case 'discontinued':
        return 'error';
      default:
        return 'default';
    }
  };

  // Error handling for benefit data fetch
  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" gutterBottom>
            Treatment Plans
          </Typography>
          <Alert severity="warning" sx={{ mb: 3 }} icon={<ErrorOutline />}>
            {error} 
          </Alert>
           {/* Display treatment plans even if package info failed? Or hide? */}
           {/* Current implementation will show error and then plans */} 
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Treatment Plans & Benefits
        </Typography>

        {/* Current Benefit Plan Section */} 
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
               <WorkspacePremium sx={{ mr: 1 }} color="primary" /> Your Current Benefit Plan
            </Typography>
            {currentPackage ? (
              <Box>
                <Typography variant="h5" component="div" gutterBottom>
                  {currentPackage.name}
                </Typography>
                <Chip 
                    label={currentPackage.monthly_cost > 0 ? `$${currentPackage.monthly_cost.toFixed(2)}/month` : 'Included / Sponsored'}
                    color={currentPackage.monthly_cost > 0 ? 'default' : 'success'} 
                    size="small" 
                    sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {currentPackage.description || 'No description available.'}
                </Typography>
                {currentPackage.key_benefits && currentPackage.key_benefits.length > 0 && (
                   <Box>
                        <Typography variant="subtitle2">Key Benefits:</Typography>
                        <List dense>
                            {currentPackage.key_benefits.map((benefit, index) => (
                                <ListItem key={index} sx={{ py: 0.5 }}>
                                    <ListItemText primary={`- ${benefit}`} />
                                </ListItem>
                            ))}
                        </List>
                   </Box>
                )}
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No benefit package currently selected or active.
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Upgrade Options Section (Client Component) */} 
        {currentPackage && (
             <UpgradeOptions currentPackage={currentPackage} allPackages={allPackages} />
        )}
       
        <Divider sx={{ my: 4 }} />

        {/* Existing Treatment Plans List */}
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          Your Treatment Plans
        </Typography>
        {plans.length > 0 ? (
          <Paper elevation={2}>
            <List disablePadding>
              {plans.map((plan, index) => (
                <React.Fragment key={plan.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={plan.title || `Plan ID: ${plan.id}`}
                      secondary={
                        <React.Fragment>
                          <Typography
                            sx={{ display: 'inline' }}
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {plan.type} {plan.provider ? `- Dr. ${plan.provider.last_name} (${plan.provider.specialization})` : ''}
                          </Typography>
                          {` — ${plan.description || 'No description provided.'}`}
                          <br />
                          <Chip label={plan.status} color={getStatusColor(plan.status)} size="small" sx={{ mt: 1 }} />
                        </React.Fragment>
                      }
                    />
                    <ListItemSecondaryAction>
                      {/* TODO: Implement navigation to detailed plan view */}
                      <Button 
                        variant="outlined" 
                        size="small" 
                        // onClick={() => router.push(`/dashboard/treatment-plans/${plan.id}`)}
                        disabled // Disable for now until detail page exists
                      >
                        View Details
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < plans.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        ) : (
          <Typography variant="body1" color="text.secondary">
            You currently have no active treatment plans.
          </Typography>
        )}
      </Box>
    </Container>
  );
} 