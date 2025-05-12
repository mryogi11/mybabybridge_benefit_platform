'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { supabase } from '@/lib/supabase/client';
import { Provider } from '@/types';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState<Partial<Provider>>({
    first_name: '',
    last_name: '',
    specialization: '',
    bio: '',
    experience_years: 0,
    education: [''],
    certifications: [''],
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data: rawData, error } = await supabase
        .from('providers')
        .select('*');

      if (error) throw error;

      const transformedData = (rawData || []).map(provider => ({
        ...provider,
        specialization: provider.specialization === undefined ? null : provider.specialization,
        bio: provider.bio === undefined ? null : provider.bio,
        experience_years: provider.experience_years === undefined ? null : provider.experience_years,
        education: provider.education === undefined ? null : provider.education,
        certifications: provider.certifications === undefined ? null : provider.certifications,
      }));

      setProviders(transformedData as Provider[]);
    } catch (error) {
      console.error('Error fetching providers:', error);
      setError('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (provider: Provider) => {
    setEditingProvider(provider);
    setFormData(provider);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProvider(null);
    setFormData({
      first_name: '',
      last_name: '',
      specialization: '',
      bio: '',
      experience_years: 0,
      education: [''],
      certifications: [''],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProvider) {
        const updateData: Partial<Provider> = { ...formData };
        if (updateData.specialization === '') updateData.specialization = null;
        if (updateData.bio === '') updateData.bio = null;
        if (updateData.education && updateData.education.length === 1 && updateData.education[0] === '') {
            updateData.education = null;
        }
        if (updateData.certifications && updateData.certifications.length === 1 && updateData.certifications[0] === '') {
            updateData.certifications = null;
        }
        
        const { error } = await supabase
          .from('providers')
          .update(updateData)
          .eq('id', editingProvider.id);

        if (error) throw error;
      }

      handleCloseDialog();
      fetchProviders();
    } catch (error) {
      console.error('Error saving provider:', error);
      setError('Failed to save provider');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;

    try {
      const { error } = await supabase
        .from('providers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchProviders();
    } catch (error) {
      console.error('Error deleting provider:', error);
      setError('Failed to delete provider');
    }
  };

  const handleChange = (field: keyof Provider, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: 'education' | 'certifications', index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field]?.map((item, i) => (i === index ? value : item)) || [],
    }));
  };

  const addArrayItem = (field: 'education' | 'certifications') => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), ''],
    }));
  };

  const removeArrayItem = (field: 'education' | 'certifications', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field]?.filter((_, i) => i !== index) || [],
    }));
  };

  if (loading) return <LinearProgress />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Providers</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Specialization</TableCell>
              <TableCell>Experience</TableCell>
              <TableCell>Education</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {providers.map((provider) => (
              <TableRow key={provider.id}>
                <TableCell>{`${provider.first_name} ${provider.last_name}`}</TableCell>
                <TableCell>{provider.specialization}</TableCell>
                <TableCell>{`${provider.experience_years} years`}</TableCell>
                <TableCell>
                  {provider.education?.map((edu, index) => (
                    <Chip key={index} label={edu} size="small" sx={{ mr: 1, mb: 1 }} />
                  ))}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(provider)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(provider.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Specialization"
                  value={formData.specialization}
                  onChange={(e) => handleChange('specialization', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  multiline
                  rows={4}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Years of Experience"
                  type="number"
                  value={formData.experience_years}
                  onChange={(e) => handleChange('experience_years', parseInt(e.target.value))}
                  required
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Education
                </Typography>
                {formData.education?.map((edu, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      fullWidth
                      value={edu}
                      onChange={(e) => handleArrayChange('education', index, e.target.value)}
                      placeholder="Degree/Certification"
                    />
                    <IconButton onClick={() => removeArrayItem('education', index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => addArrayItem('education')}
                  sx={{ mt: 1 }}
                >
                  Add Education
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Certifications
                </Typography>
                {formData.certifications?.map((cert, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      fullWidth
                      value={cert}
                      onChange={(e) => handleArrayChange('certifications', index, e.target.value)}
                      placeholder="Certification"
                    />
                    <IconButton onClick={() => removeArrayItem('certifications', index)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => addArrayItem('certifications')}
                  sx={{ mt: 1 }}
                >
                  Add Certification
                </Button>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingProvider ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
} 