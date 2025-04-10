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
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import BookIcon from '@mui/icons-material/Book';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import MenuIcon from '@mui/icons-material/Menu';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface EducationCategory {
  id: string;
  name: string;
  description?: string | null;
  icon_url?: string | null;
}

interface EducationResource {
  id: string;
  category_id?: string | null;
  title: string;
  description?: string | null;
  content?: string | null;
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'document' | null;
  reading_time?: number | null;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | null;
}

interface PatientProgress {
  resource_id?: string | null;
  status?: 'not_started' | 'in_progress' | 'completed' | null;
  progress_percentage?: number | null;
  last_accessed_at?: string | null;
  completed_at?: string | null;
}

export default function EducationPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<EducationCategory[]>([]);
  const [resources, setResources] = useState<EducationResource[]>([]);
  const [progress, setProgress] = useState<Record<string, PatientProgress>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Fetch patient ID
      const { data: patientData, error: patientError } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (patientError) throw patientError;
      setPatientId(patientData.id);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('education_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Explicitly map categoriesData
      const typedCategories: EducationCategory[] = (categoriesData || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        icon_url: cat.icon_url,
      }));
      setCategories(typedCategories);

      // Fetch resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('education_resources')
        .select('*')
        .order('title');

      if (resourcesError) throw resourcesError;

      // Explicitly map resourcesData
      const typedResources: EducationResource[] = (resourcesData || []).map(res => ({
        id: res.id,
        category_id: res.category_id,
        title: res.title,
        description: res.description,
        content: res.content,
        media_url: res.media_url,
        media_type: res.media_type as EducationResource['media_type'],
        reading_time: res.reading_time,
        difficulty_level: res.difficulty_level as EducationResource['difficulty_level'],
      }));
      setResources(typedResources);

      // Fetch progress
      const { data: progressData, error: progressError } = await supabase
        .from('patient_education_progress')
        .select('*')
        .eq('patient_id', patientData.id);

      if (progressError) throw progressError;
      
      const progressMap: Record<string, PatientProgress> = {};
      progressData.forEach((p) => {
        if (p.resource_id) {
          progressMap[p.resource_id] = {
            resource_id: p.resource_id,
            status: p.status as PatientProgress['status'],
            progress_percentage: p.progress_percentage,
            last_accessed_at: p.last_accessed_at,
            completed_at: p.completed_at,
          };
        }
      });
      setProgress(progressMap);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load education resources');
      setLoading(false);
    }
  };

  const getResourceProgress = (resourceId: string): PatientProgress => {
    return progress[resourceId] || {
      status: 'not_started',
      progress_percentage: 0,
      last_accessed_at: null,
      completed_at: null,
    };
  };

  const getDifficultyColor = (level: string | null | undefined): 'success' | 'warning' | 'error' | 'default' => {
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

  const filteredResources = selectedCategory
    ? resources.filter((resource) => resource.category_id === selectedCategory)
    : resources;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Categories
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            selected={!selectedCategory}
            onClick={() => {
              setSelectedCategory(null);
              if (isMobile) handleDrawerToggle();
            }}
          >
            <ListItemText primary="All Resources" />
          </ListItemButton>
        </ListItem>
        {categories.map((category) => (
          <ListItem key={category.id} disablePadding>
            <ListItemButton
              selected={selectedCategory === category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                if (isMobile) handleDrawerToggle();
              }}
            >
              <ListItemText primary={category.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box
        component="nav"
        sx={{ width: { md: 250 }, flexShrink: { md: 0 } }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            anchor="left"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - 250px)` },
          ml: { md: '250px' },
        }}
      >
        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              {isMobile && (
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ mr: 2, display: { md: 'none' } }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h4">Education Resources</Typography>
            </Stack>
          </Stack>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {filteredResources.map((resource) => {
              const progress = getResourceProgress(resource.id);
              const category = categories.find((c) => c.id === resource.category_id);

              return (
                <Grid item key={resource.id} xs={12} md={6}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="h6" sx={{ flex: 1, mr: 2 }}>
                            {resource.title}
                          </Typography>
                          <Stack direction="row" spacing={1}>
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
                          </Stack>
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                          {resource.description}
                        </Typography>

                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Progress
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {progress.progress_percentage}%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={progress.progress_percentage ?? 0}
                            color={progress.status === 'completed' ? 'success' : 'primary'}
                          />
                        </Box>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Status: {progress.status?.replace('_', ' ')}
                          </Typography>
                          {progress.last_accessed_at && (
                            <Typography variant="body2" color="text.secondary">
                              Last accessed: {new Date(progress.last_accessed_at).toLocaleDateString()}
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                    <Box sx={{ p: 2, pt: 0 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={
                          resource.media_type === 'video' ? (
                            <PlayCircleIcon />
                          ) : resource.media_type === 'image' ? (
                            <ImageIcon />
                          ) : (
                            <DescriptionIcon />
                          )
                        }
                        onClick={() => router.push(`/dashboard/education/${resource.id}`)}
                      >
                        {progress.status === 'completed' ? 'Review' : 'Start Learning'}
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      </Box>
    </Box>
  );
} 