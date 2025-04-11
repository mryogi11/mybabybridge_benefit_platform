'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Grid,
  CircularProgress,
  Alert,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { supabase } from '@/lib/supabase/client';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface EducationResource {
  id: string;
  title: string;
  category_id: string | null;
  difficulty_level: string | null;
}

interface PatientProgress {
  patient_id: string | null;
  resource_id: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | null;
  progress_percentage: number | null;
  last_accessed_at: string | null;
  completed_at: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function ProviderEducationProgressPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [resources, setResources] = useState<EducationResource[]>([]);
  const [progress, setProgress] = useState<PatientProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch patients
      const { data: patientsData, error: patientsError } = await supabase
        .from('patient_profiles')
        .select('id, user_id, first_name, last_name, email')
        .order('first_name');

      if (patientsError) throw patientsError;
      setPatients(patientsData as any);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('education_categories')
        .select('id, name')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData);

      // Fetch resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('education_resources')
        .select('id, title, category_id, difficulty_level')
        .order('title');

      if (resourcesError) throw resourcesError;
      setResources(resourcesData as any);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load education progress data');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatient) {
      fetchProgress();
    }
  }, [selectedPatient]);

  const fetchProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_education_progress')
        .select('*')
        .eq('patient_id', selectedPatient);

      if (error) throw error;
      setProgress(data as any);
    } catch (error) {
      console.error('Error fetching progress:', error);
      setError('Failed to load patient progress');
    }
  };

  const getPatientProgress = (resourceId: string) => {
    return progress.find((p) => p.resource_id === resourceId) || {
      status: 'not_started',
      progress_percentage: 0,
      last_accessed_at: null,
      completed_at: null,
    };
  };

  const filteredResources = selectedCategory
    ? resources.filter((resource) => resource.category_id === selectedCategory)
    : resources;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h4">Patient Education Progress</Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Select Patient</InputLabel>
            <Select
              value={selectedPatient}
              label="Select Patient"
              onChange={(e) => setSelectedPatient(e.target.value)}
            >
              {patients.map((patient) => (
                <MenuItem key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Filter by Category</InputLabel>
            <Select
              value={selectedCategory}
              label="Filter by Category"
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {selectedPatient ? (
          <Grid container spacing={3}>
            {filteredResources.map((resource) => {
              const progress = getPatientProgress(resource.id);
              const category = categories.find((c) => c.id === resource.category_id);

              return (
                <Grid key={resource.id} sx={{ width: { xs: '100%', md: '50%' } }}>
                  <Card>
                    <CardContent>
                      <Stack spacing={2}>
                        <Typography variant="h6">{resource.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Category: {category?.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Difficulty: {resource.difficulty_level}
                        </Typography>

                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Progress
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {progress.progress_percentage ?? 0}%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={progress.progress_percentage ?? 0}
                            color={progress.status === 'completed' ? 'success' : 'primary'}
                          />
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          Status: {progress.status?.replace('_', ' ') || 'not started'}
                        </Typography>
                        {progress.last_accessed_at && (
                          <Typography variant="body2" color="text.secondary">
                            Last accessed: {new Date(progress.last_accessed_at).toLocaleDateString()}
                          </Typography>
                        )}
                        {progress.completed_at && (
                          <Typography variant="body2" color="success.main">
                            Completed: {new Date(progress.completed_at).toLocaleDateString()}
                          </Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Typography variant="body1" color="text.secondary" align="center">
            Select a patient to view their education progress
          </Typography>
        )}
      </Stack>
    </Box>
  );
} 