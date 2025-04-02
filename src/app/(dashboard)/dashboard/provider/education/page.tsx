'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '@/lib/supabase/client';

interface EducationCategory {
  id: string;
  name: string;
  description: string;
  icon_url: string;
}

interface EducationResource {
  id: string;
  category_id: string;
  title: string;
  description: string;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | 'document' | null;
  reading_time: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
}

export default function ProviderEducationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<EducationCategory[]>([]);
  const [resources, setResources] = useState<EducationResource[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingResource, setEditingResource] = useState<EducationResource | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category_id: '',
    reading_time: '',
    difficulty_level: 'beginner',
    media_url: '',
    media_type: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('education_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData);

      // Fetch resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('education_resources')
        .select('*')
        .order('title');

      if (resourcesError) throw resourcesError;
      setResources(resourcesData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load education resources');
      setLoading(false);
    }
  };

  const handleOpenDialog = (resource?: EducationResource) => {
    if (resource) {
      setEditingResource(resource);
      setFormData({
        title: resource.title,
        description: resource.description,
        content: resource.content,
        category_id: resource.category_id,
        reading_time: resource.reading_time.toString(),
        difficulty_level: resource.difficulty_level,
        media_url: resource.media_url || '',
        media_type: resource.media_type || '',
      });
    } else {
      setEditingResource(null);
      setFormData({
        title: '',
        description: '',
        content: '',
        category_id: '',
        reading_time: '',
        difficulty_level: 'beginner',
        media_url: '',
        media_type: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingResource(null);
  };

  const handleSubmit = async () => {
    try {
      const resourceData = {
        ...formData,
        reading_time: parseInt(formData.reading_time),
        media_type: formData.media_type || null,
        media_url: formData.media_url || null,
      };

      if (editingResource) {
        const { error } = await supabase
          .from('education_resources')
          .update(resourceData)
          .eq('id', editingResource.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('education_resources')
          .insert([resourceData]);

        if (error) throw error;
      }

      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error('Error saving resource:', error);
      setError('Failed to save education resource');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const { error } = await supabase
        .from('education_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting resource:', error);
      setError('Failed to delete education resource');
    }
  };

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
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">Manage Education Resources</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Resource
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {resources.map((resource) => {
            const category = categories.find((c) => c.id === resource.category_id);

            return (
              <Grid key={resource.id} sx={{ width: { xs: '100%', md: '50%' } }}>
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">{resource.title}</Typography>
                        <Stack direction="row">
                          <IconButton onClick={() => handleOpenDialog(resource)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDelete(resource.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        {resource.description}
                      </Typography>

                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="body2">
                          Category: {category?.name}
                        </Typography>
                        <Typography variant="body2">
                          Difficulty: {resource.difficulty_level}
                        </Typography>
                        <Typography variant="body2">
                          Reading Time: {resource.reading_time} min
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingResource ? 'Edit Resource' : 'Add New Resource'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                label="Content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                fullWidth
                multiline
                rows={6}
                required
              />
              <TextField
                select
                label="Category"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                fullWidth
                required
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Reading Time (minutes)"
                type="number"
                value={formData.reading_time}
                onChange={(e) => setFormData({ ...formData, reading_time: e.target.value })}
                fullWidth
                required
              />
              <TextField
                select
                label="Difficulty Level"
                value={formData.difficulty_level}
                onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                fullWidth
                required
              >
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
              </TextField>
              <TextField
                label="Media URL"
                value={formData.media_url}
                onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                fullWidth
              />
              <TextField
                select
                label="Media Type"
                value={formData.media_type}
                onChange={(e) => setFormData({ ...formData, media_type: e.target.value })}
                fullWidth
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="video">Video</MenuItem>
                <MenuItem value="image">Image</MenuItem>
                <MenuItem value="document">Document</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingResource ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  );
} 