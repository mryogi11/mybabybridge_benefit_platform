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
import { WorkspacePremium } from '@mui/icons-material';
import { cookies } from 'next/headers'; // Keep this if you need cookies at request time

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

// Force dynamic rendering because we use cookies or other dynamic data
export const dynamic = 'force-dynamic';

// Make the component async to use await for data fetching
export default async function BenefitPackagePage() {
  // Fetch dashboard data (packages etc.) using the server action
  const { success: dataSuccess, data: dashboardData, message: dataMessage } = await getUserDashboardData();

  // Fetch actual treatment plans (using mock for now)
  // TODO: Replace mock data with actual data fetching, potentially combining with getUserDashboardData or a separate action
  const plans: TreatmentPlan[] = getMockTreatmentPlans();
  let error: string | null = null;

  if (!dataSuccess) {
    // Handle error fetching dashboard data - show message but maybe still render page?
    console.error("Failed to fetch dashboard data:", dataMessage);
    error = `Could not load benefit plan details: ${dataMessage}.`;
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
            Your Benefit Plan
          </Typography>
          <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Your Benefit Plan
        </Typography>

        {/* Current Benefit Plan Section */} 
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
               <WorkspacePremium sx={{ mr: 1 }} color="primary" /> Current Plan Details
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
                {/* Display Key Benefits */} 
                {currentPackage.key_benefits && currentPackage.key_benefits.length > 0 && (
                   <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">Key Benefits:</Typography>
                        <List dense sx={{ pl: 2 }}> {/* Indent list slightly */} 
                            {currentPackage.key_benefits.map((benefit, index) => (
                                <ListItem key={index} sx={{ py: 0.2, px: 0 }}>
                                    <ListItemText primary={`• ${benefit}`} />
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
        {/* Render UpgradeOptions only if user has a package AND there are other packages available */}
        {currentPackage && allPackages.length > 1 && (
             <UpgradeOptions currentPackage={currentPackage} allPackages={allPackages} />
        )}
       
        {/* Remove divider if there are no upgrade options shown? */} 
        {/* <Divider sx={{ my: 4 }} /> */} 

        {/* Space for potential future content related to benefits */} 

      </Box>
    </Container>
  );
} 