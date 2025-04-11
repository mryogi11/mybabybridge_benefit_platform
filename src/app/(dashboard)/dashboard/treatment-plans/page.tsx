'use client';

import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Alert,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Assignment, ErrorOutline } from '@mui/icons-material';

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

export default function TreatmentPlansPage() {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTreatmentPlans = async () => {
      try {
        // Get the current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error fetching user:', userError);
          setError('Error fetching user data. Please try again later.');
          setLoading(false);
          return;
        }
        
        if (!userData.user) {
          console.error('No user data available');
          setError('User data not available. Try refreshing the page.');
          setLoading(false);
          return;
        }

        // Attempt to fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('patient_profiles')
          .select('id')
          .eq('user_id', userData.user.id)
          .single();

        // If the profiles table doesn't exist or there's another error, use the user's ID directly
        let patientId;
        if (profileError) {
          console.warn('Profile fetch error:', profileError.message);
          if (profileError.message.includes('relation "public.profiles" does not exist')) {
            console.log('Using mock patient ID for development');
            // Use mock data for development
            patientId = '1'; // Mock patient ID
            setError(null); // Clear any previous errors
          } else {
            setError(`Error fetching profile: ${profileError.message}`);
            setLoading(false);
            return;
          }
        } else {
          patientId = profile.id;
        }

        // Mock treatment plan data for development
        if (profileError && profileError.message.includes('relation "public.profiles" does not exist')) {
          const mockPlans: TreatmentPlan[] = [
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
          setPlans(mockPlans);
          setLoading(false);
          return;
        }

        // Only attempt to fetch from database if the table exists
        const { data, error: plansError } = await supabase
          .from('treatment_plans')
          .select(`
            *,
            provider:provider_id (
              first_name,
              last_name,
              specialization
            )
          `)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        if (plansError) {
          // If treatment_plans table doesn't exist, use mock data
          if (plansError.message.includes('relation "public.treatment_plans" does not exist')) {
            console.log('Using mock treatment plan data for development');
            const mockPlans: TreatmentPlan[] = [
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
            setPlans(mockPlans);
            setError(null);
          } else {
            setError(`Error fetching treatment plans: ${plansError.message}`);
          }
        } else {
          setPlans((data || []) as unknown as TreatmentPlan[]);
          setError(null);
        }
      } catch (err) {
        console.error('Error in fetchTreatmentPlans:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTreatmentPlans();
  }, []);

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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" gutterBottom>
            Treatment Plans
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }} icon={<ErrorOutline />}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Treatment Plans
        </Typography>

        <List>
          {plans.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Assignment sx={{ fontSize: 50, color: 'primary.light', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No treatment plans found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                You don't have any treatment plans yet. Your healthcare provider will 
                create a treatment plan during or after your initial consultation.
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => router.push('/dashboard/appointments')}
              >
                Book Appointment
              </Button>
            </Paper>
          ) : (
            plans.map((plan) => (
              <Paper key={plan.id} sx={{ 
                mb: 2, 
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 2,
                }
              }}>
                <ListItem
                  button
                  onClick={() => router.push(`/dashboard/treatment-plans/${plan.id}`)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography variant="h6" component="span">
                          {plan.type}
                        </Typography>
                        <Chip
                          label={plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                          color={getStatusColor(plan.status)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Provider: Dr. {plan.provider?.first_name} {plan.provider?.last_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {plan.description}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/treatment-plans/${plan.id}`);
                      }}
                    >
                      View Details
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            ))
          )}
        </List>
      </Box>
    </Container>
  );
} 