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
  Container,
  Avatar as MuiAvatar,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarList, updateUserAvatar } from '@/actions/userActions';
import Image from 'next/image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import { Provider } from '@/types';

export default function ProviderProfilePage() {
  const [profile, setProfile] = useState<Provider | null>(null);
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
  const { user: authUser, profile: authProfile, fetchAndSetProfile } = useAuth();
  const [newEducation, setNewEducation] = useState('');

  const [pageLoadingStates, setPageLoadingStates] = useState({
    initialProfile: true,
    savingProfile: false,
    savingAvatar: false,
  });

  const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);
  const [selectedAvatarForUpdate, setSelectedAvatarForUpdate] = useState<string | null>(null);
  const [avatarSnackbar, setAvatarSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadProviderData = async () => {
      if (isMounted) {
        setPageLoadingStates(prev => ({ ...prev, initialProfile: true }));
      }
      await fetchProviderSpecificProfile();
      if (isMounted) {
        setPageLoadingStates(prev => ({ ...prev, initialProfile: false }));
      }
    };

    const fetchAvatars = async () => {
      try {
        const avatars = await getAvatarList();
        if (isMounted) {
          setAvailableAvatars(avatars);
        }
      } catch (err) {
        console.error("Error fetching avatar list for provider:", err);
        if (isMounted) {
          setAvatarSnackbar({ open: true, message: 'Could not load avatar choices.', severity: 'error' });
        }
      }
    };
    
    loadProviderData();
    fetchAvatars();

    return () => {
      isMounted = false;
    };
  }, [authUser]);

  const fetchProviderSpecificProfile = async () => {
    try {
      if (!authUser) {
        return;
      }

      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (error) throw error;

      setProfile(data as any);
    } catch (error) {
      console.error('Error fetching provider-specific profile:', error);
      showSnackbar('Failed to load provider details', 'error');
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
          user_id: authUser?.id,
          updated_at: new Date().toISOString(),
        } as any);

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

  const handleSaveAvatar = async () => {
    if (!authUser?.id || !selectedAvatarForUpdate) {
      setAvatarSnackbar({ open: true, message: 'Please select an avatar first.', severity: 'error' });
      return;
    }
    setPageLoadingStates(prev => ({ ...prev, savingAvatar: true }));
    setAvatarSnackbar(null);

    try {
      const result = await updateUserAvatar(authUser.id, selectedAvatarForUpdate);
      if (result.success) {
        setAvatarSnackbar({ open: true, message: 'Avatar updated successfully!', severity: 'success' });
        await fetchAndSetProfile(authUser.id);
      } else {
        setAvatarSnackbar({ open: true, message: result.error || 'Failed to update avatar.', severity: 'error' });
      }
    } catch (err: any) {
      console.error("Error saving avatar for provider:", err);
      setAvatarSnackbar({ open: true, message: err.message || 'An unexpected error occurred.', severity: 'error' });
    } finally {
      setPageLoadingStates(prev => ({ ...prev, savingAvatar: false }));
    }
  };

  const handleCloseAvatarSnackbar = () => {
    setAvatarSnackbar(null);
  };

  const currentAvatarDisplayUrl = authProfile?.avatar_filename 
    ? `/images/avatar/${authProfile.avatar_filename}` 
    : (authProfile?.first_name ? '' : '/images/avatar/default.png');

  if (pageLoadingStates.initialProfile) {
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
    <Container maxWidth="lg" sx={{py:3}}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        My Provider Profile
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{display: 'flex', alignItems: 'center'}}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            Profile Picture
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" gutterBottom>Current Avatar</Typography>
              <MuiAvatar
                src={currentAvatarDisplayUrl}
                alt={authProfile?.first_name || authUser?.email || 'Provider Avatar'}
                sx={{ width: 120, height: 120, margin: '0 auto', mb: 2, fontSize: '3rem' }}
              >
                {(!currentAvatarDisplayUrl && (authProfile?.first_name || authUser?.email)) 
                  ? (authProfile.first_name || authUser.email)?.[0].toUpperCase() 
                  : null}
              </MuiAvatar>
            </Grid>
            <Grid item xs={12} md={9}>
              <Typography variant="subtitle1" gutterBottom>Choose a new Avatar</Typography>
              {availableAvatars.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {availableAvatars.map((avatarFile) => {
                    const isHighlighted = selectedAvatarForUpdate
                      ? avatarFile === selectedAvatarForUpdate
                      : authProfile?.avatar_filename === avatarFile;

                    return (
                      <Box 
                        key={avatarFile} 
                        onClick={() => setSelectedAvatarForUpdate(avatarFile)}
                        sx={{ 
                          cursor: 'pointer', 
                          position: 'relative',
                          border: isHighlighted ? (theme) => `3px solid ${theme.palette.primary.main}` : `3px solid transparent`,
                          borderRadius: '50%',
                          padding: '2px',
                          transition: 'border-color 0.2s ease-in-out'
                        }}
                      >
                        <Image 
                          src={`/images/avatar/${avatarFile}`} 
                          alt={`Avatar ${avatarFile}`} 
                          width={80} 
                          height={80} 
                          style={{ borderRadius: '50%', display: 'block' }}
                        />
                        {isHighlighted && (
                          <CheckCircleIcon 
                            sx={{ 
                              position: 'absolute', 
                              bottom: 0, 
                              right: 0, 
                              color: (theme) => theme.palette.success.main,
                              backgroundColor: 'white',
                              borderRadius: '50%',
                              fontSize: '1.5rem'
                            }} 
                          />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                 pageLoadingStates.initialProfile ? <CircularProgress size={24} /> : <Typography>No other avatars available.</Typography>
              )}
              <Button
                variant="contained"
                onClick={handleSaveAvatar}
                disabled={pageLoadingStates.savingAvatar || !selectedAvatarForUpdate}
                sx={{ mt: 3 }}
              >
                {pageLoadingStates.savingAvatar ? <CircularProgress size={24} color="inherit" /> : 'Save Avatar'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Profile Information
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Placeholder for viewing and editing provider profile details (Specialization, Bio, Experience, etc.).
        </Typography>
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
                disabled={saving || pageLoadingStates.savingProfile}
              >
                {saving || pageLoadingStates.savingProfile ? <CircularProgress size={24} color="inherit"/> : 'Save Profile Changes'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {avatarSnackbar && (
        <Snackbar
          open={avatarSnackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseAvatarSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseAvatarSnackbar} severity={avatarSnackbar.severity} sx={{ width: '100%' }}>
            {avatarSnackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Container>
  );
} 