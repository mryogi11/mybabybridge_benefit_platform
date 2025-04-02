'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  IconButton,
  LinearProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Provider } from '@/types';

export default function ProviderProfilePage() {
  const [profile, setProfile] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const { user } = useAuth();
  const [newEducation, setNewEducation] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      showSnackbar('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Provider, value: string | string[]) => {
    setProfile((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const handleAddEducation = () => {
    setProfile((prev) => prev ? {
      ...prev,
      education: [...(prev.education || []), ''],
    } : null);
  };

  const removeEducation = (index: number) => {
    setProfile((prev) => prev ? {
      ...prev,
      education: prev.education?.filter((_, i) => i !== index) || [],
    } : null);
  };

  const handleAddCertification = () => {
    setProfile((prev) => prev ? {
      ...prev,
      certifications: [...(prev.certifications || []), ''],
    } : null);
  };

  const removeCertification = (index: number) => {
    setProfile((prev) => prev ? {
      ...prev,
      certifications: prev.certifications?.filter((_, i) => i !== index) || [],
    } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('providers')
        .upsert({
          ...profile,
          user_id: user?.id,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      showSnackbar('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!profile) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Provider Profile
        </Typography>
        <Typography color="error">
          Profile not found. Please contact support.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Provider Profile
      </Typography>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={profile.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={profile.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Specialization"
                value={profile.specialization}
                onChange={(e) => handleChange('specialization', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                value={profile.bio}
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
                value={profile.experience_years}
                onChange={(e) => handleChange('experience_years', e.target.value)}
                required
              />
            </Grid>

            {/* Education Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Education
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  placeholder="Add education"
                  value={newEducation}
                  onChange={(e) => setNewEducation(e.target.value)}
                />
                <IconButton
                  color="primary"
                  onClick={() => {
                    if (newEducation.trim()) {
                      setProfile((prev) => prev ? {
                        ...prev,
                        education: [...(prev.education || []), newEducation.trim()],
                      } : null);
                      setNewEducation('');
                    }
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
              {profile?.education?.map((edu, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    value={edu}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setProfile((prev) => prev ? {
                        ...prev,
                        education: (prev.education || []).map((item, i) => 
                          i === index ? newValue : item
                        ),
                      } : null);
                    }}
                  />
                  <IconButton
                    onClick={() => removeEducation(index)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Grid>

            {/* Certifications Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Certifications
                </Typography>
                <IconButton onClick={handleAddCertification} color="primary">
                  <AddIcon />
                </IconButton>
              </Box>
              {profile?.certifications?.map((cert, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    label={`Certification ${index + 1}`}
                    value={cert}
                    onChange={(e) => {
                      const newCertifications = [...(profile.certifications || [])];
                      newCertifications[index] = e.target.value;
                      handleChange('certifications', newCertifications);
                    }}
                  />
                  <IconButton
                    onClick={() => removeCertification(index)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 