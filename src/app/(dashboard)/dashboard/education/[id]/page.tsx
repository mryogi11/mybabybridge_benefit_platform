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
  Chip,
  Button,
  LinearProgress,
  useTheme,
  useMediaQuery,
  IconButton,
  Paper,
  Divider,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface EducationResource {
  id: string;
  category_id?: string | null;
  title: string;
  description?: string | null;
  content: string;
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'document' | null;
  reading_time?: number | null;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | null;
}

interface PatientProgress {
  status?: 'not_started' | 'in_progress' | 'completed' | null;
  progress_percentage?: number | null;
  last_accessed_at?: string | null;
  completed_at?: string | null;
}

export default function EducationResourcePage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState<EducationResource | null>(null);
  const [progress, setProgress] = useState<PatientProgress>({});
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    const resourceId = params.id;
    if (typeof resourceId === 'string') {
      fetchData(resourceId);
    }
  }, [params.id]);

  const fetchData = async (resourceId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    setError(null);

    if (!resourceId || typeof resourceId !== 'string') {
      setError('Invalid resource ID.');
      setLoading(false);
      return;
    }

    try {
      const { data: patientData, error: patientError } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (patientError) throw patientError;
      setPatientId(patientData.id);

      const { data: resourceData, error: resourceError } = await supabase
        .from('education_resources')
        .select('*')
        .eq('id', resourceId)
        .single();

      if (resourceError) throw resourceError;
      
      const typedResource: EducationResource = {
        id: resourceData.id,
        category_id: resourceData.category_id,
        title: resourceData.title,
        description: resourceData.description,
        content: resourceData.content,
        media_url: resourceData.media_url,
        media_type: (
          resourceData.media_type === 'image' ||
          resourceData.media_type === 'video' ||
          resourceData.media_type === 'document'
        ) ? resourceData.media_type : null,
        reading_time: resourceData.reading_time,
        difficulty_level: (
          resourceData.difficulty_level === 'beginner' ||
          resourceData.difficulty_level === 'intermediate' ||
          resourceData.difficulty_level === 'advanced'
        ) ? resourceData.difficulty_level : null,
      };
      setResource(typedResource);

      const { data: progressData, error: progressError } = await supabase
        .from('patient_education_progress')
        .select('*')
        .eq('patient_id', patientData.id)
        .eq('resource_id', resourceId)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }

      if (progressData) {
        const typedProgress: PatientProgress = {
          status: progressData.status as PatientProgress['status'],
          progress_percentage: progressData.progress_percentage,
          last_accessed_at: progressData.last_accessed_at,
          completed_at: progressData.completed_at,
        };
        setProgress(typedProgress);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load education resource');
      setLoading(false);
    }
  };

  const handleUpdateProgress = async (newStatus: 'not_started' | 'in_progress' | 'completed') => {
    if (!patientId || !resource) return;

    try {
      const now = new Date().toISOString();
      const progressData = {
        patient_id: patientId,
        resource_id: resource.id,
        status: newStatus,
        progress_percentage: newStatus === 'completed' ? 100 : 50,
        last_accessed_at: now,
        completed_at: newStatus === 'completed' ? now : null,
      };

      const { error } = await supabase
        .from('patient_education_progress')
        .upsert(progressData);

      if (error) throw error;

      setProgress(progressData);
    } catch (error) {
      console.error('Error updating progress:', error);
      setError('Failed to update progress');
    }
  };

  const getDifficultyColor = (level: string | null | undefined) => {
    switch (level) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!resource) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Resource not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton onClick={() => router.back()}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
            {resource?.title}
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {resource && (
          <Grid container spacing={3}>
            {/* Resource Content */}
            <Grid sx={{ width: { xs: '100%', md: '70%' } }}>
              <Card>
                <CardContent>
                  <Stack spacing={3}>
                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                      <Chip
                        icon={<AccessTimeIcon />}
                        label={`${resource.reading_time} min`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<SchoolIcon />}
                        label={resource.difficulty_level || 'N/A'}
                        size="small"
                        color={getDifficultyColor(resource.difficulty_level)}
                      />
                      <Chip
                        icon={
                          resource.media_type === 'video' ? (
                            <PlayCircleIcon />
                          ) : resource.media_type === 'image' ? (
                            <ImageIcon />
                          ) : (
                            <DescriptionIcon />
                          )
                        }
                        label={resource.media_type || 'Text'}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>

                    {resource.media_url && (
                      <Box sx={{ width: '100%', aspectRatio: '16/9' }}>
                        {resource.media_type === 'video' ? (
                          <video
                            controls
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            src={resource.media_url}
                          />
                        ) : resource.media_type === 'image' ? (
                          <img
                            src={resource.media_url}
                            alt={resource.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <iframe
                            src={resource.media_url}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title={resource.title}
                          />
                        )}
                      </Box>
                    )}

                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {resource.content}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Progress Section */}
            <Grid sx={{ width: { xs: '100%', md: '30%' } }}>
              <Card>
                <CardContent>
                  <Stack spacing={3}>
                    <Typography variant="h6">Your Progress</Typography>

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
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>

                    <Stack spacing={2}>
                      <Typography variant="body2" color="text.secondary">
                        Status: {progress.status?.replace('_', ' ')}
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

                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={progress.status === 'completed' ? <CheckCircleIcon /> : <PlayCircleIcon />}
                      onClick={() => handleUpdateProgress(progress.status === 'completed' ? 'not_started' : 'completed')}
                    >
                      {progress.status === 'completed' ? 'Mark as Incomplete' : 'Mark as Complete'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Stack>
    </Box>
  );
} 