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
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  MedicalServices,
  ExpandMore,
  CalendarMonth,
  NoteAlt,
  CheckCircle,
  DoNotDisturb,
  AccessTime,
  Download,
  ErrorOutline,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase/client';

interface Treatment {
  id: string;
  patient_id: string;
  treatment_plan_id: string | null;
  provider_id: string;
  type: string;
  description: string;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  provider: {
    first_name: string;
    last_name: string;
    specialization: string;
  };
}

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTreatments = async () => {
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
          .from('profiles')
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

        // Mock treatment data for development
        if (profileError && profileError.message.includes('relation "public.profiles" does not exist')) {
          const mockTreatments: Treatment[] = [
            {
              id: '1',
              patient_id: '1',
              treatment_plan_id: '1',
              provider_id: '101',
              type: 'Speech Therapy - Initial Assessment',
              description: 'Comprehensive assessment of speech and language abilities. Identified key areas for improvement in articulation and vocabulary development.',
              start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
              end_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'completed',
              notes: 'Patient showed good progress during the initial assessment. Recommend twice-weekly sessions.',
              created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
              provider: {
                first_name: 'Jane',
                last_name: 'Smith',
                specialization: 'Speech Therapy'
              }
            },
            {
              id: '2',
              patient_id: '1',
              treatment_plan_id: '1',
              provider_id: '101',
              type: 'Speech Therapy - Session 1',
              description: 'Focus on articulation exercises and basic phonemic awareness.',
              start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
              end_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'completed',
              notes: 'Good engagement with exercises. Homework assigned for practicing "s" and "th" sounds.',
              created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              provider: {
                first_name: 'Jane',
                last_name: 'Smith',
                specialization: 'Speech Therapy'
              }
            },
            {
              id: '3',
              patient_id: '1',
              treatment_plan_id: '1',
              provider_id: '101',
              type: 'Speech Therapy - Session 2',
              description: 'Continued articulation work with introduction of simple narrative exercises.',
              start_date: new Date().toISOString(), // today
              end_date: null,
              status: 'in progress',
              notes: null,
              created_at: new Date().toISOString(),
              provider: {
                first_name: 'Jane',
                last_name: 'Smith',
                specialization: 'Speech Therapy'
              }
            }
          ];
          setTreatments(mockTreatments);
          setLoading(false);
          return;
        }

        // Only attempt to fetch from database if the table exists
        const { data, error: treatmentsError } = await supabase
          .from('treatments')
          .select(`
            *,
            provider:profiles!provider_id (
              first_name,
              last_name,
              specialization
            )
          `)
          .eq('patient_id', patientId)
          .order('start_date', { ascending: false });

        if (treatmentsError) {
          // If treatments table doesn't exist, use mock data
          if (treatmentsError.message.includes('relation "public.treatments" does not exist')) {
            console.log('Using mock treatment data for development');
            const mockTreatments: Treatment[] = [
              {
                id: '1',
                patient_id: '1',
                treatment_plan_id: '1',
                provider_id: '101',
                type: 'Speech Therapy - Initial Assessment',
                description: 'Comprehensive assessment of speech and language abilities. Identified key areas for improvement in articulation and vocabulary development.',
                start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
                end_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed',
                notes: 'Patient showed good progress during the initial assessment. Recommend twice-weekly sessions.',
                created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                provider: {
                  first_name: 'Jane',
                  last_name: 'Smith',
                  specialization: 'Speech Therapy'
                }
              },
              {
                id: '2',
                patient_id: '1',
                treatment_plan_id: '1',
                provider_id: '101',
                type: 'Speech Therapy - Session 1',
                description: 'Focus on articulation exercises and basic phonemic awareness.',
                start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
                end_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed',
                notes: 'Good engagement with exercises. Homework assigned for practicing "s" and "th" sounds.',
                created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                provider: {
                  first_name: 'Jane',
                  last_name: 'Smith',
                  specialization: 'Speech Therapy'
                }
              },
              {
                id: '3',
                patient_id: '1',
                treatment_plan_id: '1',
                provider_id: '101',
                type: 'Speech Therapy - Session 2',
                description: 'Continued articulation work with introduction of simple narrative exercises.',
                start_date: new Date().toISOString(), // today
                end_date: null,
                status: 'in progress',
                notes: null,
                created_at: new Date().toISOString(),
                provider: {
                  first_name: 'Jane',
                  last_name: 'Smith',
                  specialization: 'Speech Therapy'
                }
              }
            ];
            setTreatments(mockTreatments);
            setError(null);
          } else {
            setError(`Error fetching treatments: ${treatmentsError.message}`);
          }
        } else {
        setTreatments(data || []);
          setError(null);
        }
      } catch (err) {
        console.error('Error in fetchTreatments:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTreatments();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'in progress':
        return 'primary';
      case 'scheduled':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle fontSize="small" />;
      case 'in progress':
        return <AccessTime fontSize="small" />;
      case 'scheduled':
        return <CalendarMonth fontSize="small" />;
      case 'cancelled':
        return <DoNotDisturb fontSize="small" />;
      default:
        return undefined;
    }
  };

  const groupTreatmentsByMonth = () => {
    const grouped: { [key: string]: Treatment[] } = {};
    
    treatments.forEach(treatment => {
      const monthYear = format(parseISO(treatment.start_date), 'MMMM yyyy');
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(treatment);
    });
    
    return grouped;
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
            Treatment History
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

  const groupedTreatments = groupTreatmentsByMonth();

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Treatment History
        </Typography>

        {treatments.length === 0 ? (
          <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <MedicalServices sx={{ fontSize: 60, color: 'primary.light', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No treatments found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You don't have any recorded treatments yet. 
              Your providers will update this section as your treatment progresses.
            </Typography>
            <Button variant="contained">
              View Treatment Plans
            </Button>
          </Card>
        ) : (
          Object.entries(groupedTreatments).map(([monthYear, monthTreatments]) => (
            <Box key={monthYear} sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                {monthYear}
              </Typography>
              
              <Stack spacing={2}>
                {monthTreatments.map((treatment) => (
                  <Accordion key={treatment.id} sx={{ borderRadius: 1, overflow: 'hidden' }}>
                    <AccordionSummary 
                      expandIcon={<ExpandMore />}
                      sx={{ 
                        '&.Mui-expanded': {
                          bgcolor: 'primary.light',
                          color: 'primary.contrastText',
                        },
                      }}
                    >
                      <Grid container alignItems="center" spacing={2}>
                        <Grid item>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <MedicalServices />
                          </Avatar>
                        </Grid>
                        <Grid item xs>
                          <Typography variant="subtitle1" fontWeight="medium">
                        {treatment.type}
                      </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Dr. {treatment.provider.first_name} {treatment.provider.last_name} - {format(parseISO(treatment.start_date), 'MMM d, yyyy')}
                          </Typography>
                        </Grid>
                        <Grid item>
                      <Chip
                            icon={getStatusIcon(treatment.status)}
                            label={treatment.status}
                            color={getStatusColor(treatment.status)}
                        size="small"
                      />
                        </Grid>
                      </Grid>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ pt: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Treatment Details
                    </Typography>
                            <Typography variant="body1" paragraph>
                        {treatment.description}
                      </Typography>
                            
                            {treatment.notes && (
                              <>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                  Provider Notes
                                </Typography>
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                                  <Typography variant="body2">
                                    {treatment.notes}
                                  </Typography>
                                </Paper>
                              </>
                            )}
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Treatment Information
                            </Typography>
                            <Stack spacing={1}>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <CalendarMonth color="action" fontSize="small" />
                                <Typography variant="body2">
                                  Started: {format(parseISO(treatment.start_date), 'MMMM d, yyyy')}
                                </Typography>
                              </Box>
                              {treatment.end_date && (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <CalendarMonth color="action" fontSize="small" />
                                  <Typography variant="body2">
                                    Completed: {format(parseISO(treatment.end_date), 'MMMM d, yyyy')}
                      </Typography>
                                </Box>
                              )}
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <MedicalServices color="action" fontSize="small" />
                                <Typography variant="body2">
                                  Provider: Dr. {treatment.provider.first_name} {treatment.provider.last_name}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <NoteAlt color="action" fontSize="small" />
                                <Typography variant="body2">
                                  Specialization: {treatment.provider.specialization}
                                </Typography>
                              </Box>
                            </Stack>
                            
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                              <Tooltip title="Download summary">
                                <IconButton size="small">
                                  <Download fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Box>
          ))
        )}
      </Box>
    </Container>
  );
} 