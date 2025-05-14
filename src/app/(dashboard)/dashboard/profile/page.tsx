'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Avatar,
  useTheme,
  Alert,
  Snackbar,
} from '@mui/material';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import ContactsIcon from '@mui/icons-material/Contacts';
import HistoryIcon from '@mui/icons-material/History';
import md5 from 'crypto-js/md5';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarList, updateUserAvatar } from '@/actions/userActions';
import Image from 'next/image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
}

interface MedicalHistory {
  id: string;
  condition: string;
  diagnosis_date?: string | null;
  treatment?: string | null;
  notes?: string | null;
}

export default function PatientProfilePage() {
  const router = useRouter();
  const theme = useTheme();
  const { user: authUser, profile: authProfile, fetchAndSetProfile } = useAuth();
  const [loading, setLoading] = useState({
    initial: true,
    savingProfile: false,
    emergencyContacts: false,
    medicalHistory: false,
    savingAvatar: false,
  });
  const [saving, setSaving] = useState(false);
  const [gravatarUrl, setGravatarUrl] = useState('');
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    insurance_provider: '',
    insurance_id: '',
    blood_type: '',
    allergies: '',
    medications: '',
  });
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory[]>([]);
  const [openContactDialog, setOpenContactDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [editingHistory, setEditingHistory] = useState<MedicalHistory | null>(null);
  const [newContact, setNewContact] = useState<Partial<EmergencyContact>>({});
  const [newHistory, setNewHistory] = useState<Partial<MedicalHistory>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for avatar selection
  const [availableAvatars, setAvailableAvatars] = useState<string[]>([]);
  const [selectedAvatarForUpdate, setSelectedAvatarForUpdate] = useState<string | null>(null);
  const [avatarSnackbar, setAvatarSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        await Promise.all([
          fetchProfile(),
          fetchEmergencyContacts(),
          fetchMedicalHistory()
        ]);
        
        if (isMounted) {
          setLoading(prev => ({ ...prev, initial: false }));
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
        if (isMounted) {
          setLoading(prev => ({ ...prev, initial: false }));
        }
      }
    };

    // Fetch available avatars
    const fetchAvatars = async () => {
      try {
        const avatars = await getAvatarList();
        if (isMounted) {
          setAvailableAvatars(avatars);
        }
      } catch (err) {
        console.error("Error fetching avatar list:", err);
        if (isMounted) {
          setAvatarSnackbar({ open: true, message: 'Could not load avatar choices.', severity: 'error' });
        }
      }
    };

    loadData();
    fetchAvatars();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Generate Gravatar URL when email changes
  useEffect(() => {
    if (profile.email && !authProfile?.avatar_filename) {
      const hash = md5(profile.email.trim().toLowerCase()).toString();
      setGravatarUrl(`https://www.gravatar.com/avatar/${hash}?d=mp&s=200`);
    } else if (authProfile?.avatar_filename) {
      setGravatarUrl('');
    }
  }, [profile.email, authProfile?.avatar_filename]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('patient_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        setError('Failed to load profile.');
      } else if (data) {
        console.log("Fetched profile data:", data);
        // Use 'as any' cast to bypass strict type check for build
        setProfile(data as any);
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
    }
  };

  const fetchEmergencyContacts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching emergency contacts:', error);
      return;
    }

    setEmergencyContacts(data as any || []);
  };

  const fetchMedicalHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('medical_history')
      .select('*')
      .eq('patient_id', user.id)
      .order('diagnosis_date', { ascending: false });

    if (error) {
      console.error('Error fetching medical history:', error);
      return;
    }

    setMedicalHistory(data as any || []);
  };

  const handleSaveProfile = async () => {
    setLoading(prev => ({ ...prev, savingProfile: true }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('patient_profiles')
      .upsert({
        user_id: user.id,
        ...profile,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving profile:', error);
      return;
    }

    setLoading(prev => ({ ...prev, savingProfile: false }));
  };

  const handleSaveContact = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingContact) {
      setLoading(prev => ({ ...prev, emergencyContacts: true }));
      try {
        const { error } = await supabase
          .from('emergency_contacts')
          .update({
            ...editingContact,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', editingContact.id);

        if (error) {
          console.error('Error updating contact:', error);
          setError('Failed to update contact.');
        } else {
          fetchEmergencyContacts();
          setOpenContactDialog(false);
        }
      } catch(err) {
        console.error('Exception updating contact:', err);
        setError('An unexpected error occurred.');
      } finally {
        setLoading(prev => ({ ...prev, emergencyContacts: false }));
      }
    } else {
      const contactToInsert = {
        patient_id: user.id,
        name: newContact.name || '',
        relationship: newContact.relationship || '',
        phone: newContact.phone || '',
        email: newContact.email || null,
      };
      const { error } = await supabase
        .from('emergency_contacts')
        .insert(contactToInsert);

      if (error) {
        console.error('Error creating contact:', error);
        return;
      }
    }

    setOpenContactDialog(false);
    setEditingContact(null);
    setNewContact({});
    fetchEmergencyContacts();
  };

  const handleSaveHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingHistory) {
      setLoading(prev => ({ ...prev, medicalHistory: true }));
      try {
        const { error } = await supabase
          .from('medical_history')
          .update({
            ...editingHistory,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', editingHistory.id);

        if (error) {
          console.error('Error updating history:', error);
          setError('Failed to update medical history.');
        } else {
          fetchMedicalHistory();
          setOpenHistoryDialog(false);
        }
      } catch(err) {
        console.error('Exception updating history:', err);
        setError('An unexpected error occurred.');
      } finally {
        setLoading(prev => ({ ...prev, medicalHistory: false }));
      }
    } else {
      const historyToInsert = {
        patient_id: user.id,
        condition: newHistory.condition || '',
        diagnosis_date: newHistory.diagnosis_date || null,
        treatment: newHistory.treatment || null,
        notes: newHistory.notes || null,
      };
      const { error } = await supabase
        .from('medical_history')
        .insert(historyToInsert as any);

      if (error) {
        console.error('Error creating history:', error);
        return;
      }
    }

    setOpenHistoryDialog(false);
    setEditingHistory(null);
    setNewHistory({});
    fetchMedicalHistory();
  };

  const handleDeleteContact = async (id: string) => {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting contact:', error);
      return;
    }

    fetchEmergencyContacts();
  };

  const handleDeleteHistory = async (id: string) => {
    const { error } = await supabase
      .from('medical_history')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting history:', error);
      return;
    }

    fetchMedicalHistory();
  };

  const handleAddContact = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(prev => ({ ...prev, emergencyContacts: true }));
    try {
      const contactToInsert = {
        patient_id: user.id,
        name: newContact.name || '',
        relationship: newContact.relationship || '',
        phone: newContact.phone || '',
        email: newContact.email || null,
      };

      const { error } = await supabase
        .from('emergency_contacts')
        .insert(contactToInsert);

      if (error) {
        throw error;
      }

      fetchEmergencyContacts();
      setNewContact({});
      setOpenContactDialog(false);
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      setError('Failed to add contact.');
    } finally {
      setLoading(prev => ({ ...prev, emergencyContacts: false }));
    }
  };

  const handleAddHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(prev => ({ ...prev, medicalHistory: true }));
    try {
      const historyToInsert = {
        patient_id: user.id,
        condition: newHistory.condition || '',
        diagnosis_date: newHistory.diagnosis_date || null,
        treatment: newHistory.treatment || null,
        notes: newHistory.notes || null,
      };

      const { error } = await supabase
        .from('medical_history')
        .insert(historyToInsert as any);

      if (error) {
        throw error;
      }

      fetchMedicalHistory();
      setNewHistory({});
      setOpenHistoryDialog(false);
    } catch (error) {
      console.error('Error adding medical history:', error);
      setError('Failed to add medical history.');
    } finally {
      setLoading(prev => ({ ...prev, medicalHistory: false }));
    }
  };

  const handleSaveAvatar = async () => {
    if (!authUser?.id || !selectedAvatarForUpdate) {
      setAvatarSnackbar({ open: true, message: 'Please select an avatar first.', severity: 'error' });
      return;
    }
    setLoading(prev => ({ ...prev, savingAvatar: true }));
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
      console.error("Error saving avatar:", err);
      setAvatarSnackbar({ open: true, message: err.message || 'An unexpected error occurred.', severity: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, savingAvatar: false }));
    }
  };

  const handleCloseAvatarSnackbar = () => {
    setAvatarSnackbar(null);
  };

  // Determine current avatar display URL
  const currentAvatarDisplayUrl = authProfile?.avatar_filename 
    ? `/images/avatar/${authProfile.avatar_filename}` 
    : gravatarUrl;

  if (loading.initial) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body1">Loading your profile...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Profile Header */}
      <Box 
        sx={{ 
          mb: 4,
          background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          borderRadius: 2,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 2
        }}
      >
        <Box 
          sx={{ 
            position: 'absolute',
            top: 0,
            right: 0,
            width: '30%',
            height: '100%',
            background: 'rgba(255,255,255,0.1)',
            transform: 'skewX(-15deg)',
            transformOrigin: 'top right'
          }}
        />
        
        <Grid container>
          <Grid item xs={12} sm={8} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar 
                src={currentAvatarDisplayUrl || '/images/avatar/default.png'}
                alt={authProfile?.first_name || authUser?.email || 'User Avatar'}
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: theme.palette.secondary.main,
                  fontSize: '2rem',
                  border: '4px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  mr: 3
                }}
              >
                {(!currentAvatarDisplayUrl && (authProfile?.first_name || authUser?.email)) 
                  ? (authProfile?.first_name || authUser?.email)?.[0].toUpperCase() 
                  : null}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {profile.first_name && profile.last_name 
                    ? `${profile.first_name} ${profile.last_name}` 
                    : 'Complete Your Profile'}
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                  {profile.email || 'Add your information below'}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body1" sx={{ maxWidth: 600, mb: 2 }}>
              Your profile information helps us provide personalized care for your child. Please keep it up to date.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4} sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
            <Button 
              variant="contained" 
              onClick={handleSaveProfile}
              disabled={loading.savingProfile}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.15)', 
                '&:hover': { 
                  bgcolor: 'rgba(255,255,255,0.25)'
                },
                backdropFilter: 'blur(8px)',
                px: 3,
                py: 1
              }}
            >
              {loading.savingProfile ? 'Saving...' : 'Save All Changes'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Profile Picture Section - NEW */}
      <Card elevation={1} sx={{ borderRadius: 2, overflow: 'hidden', mt: 4, mb: 4 }}>
        <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'background.subtle', p: 2 }}>
          <Typography variant="h6" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1, color: theme.palette.primary.main }} fontSize="small" />
            Profile Picture
          </Typography>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" gutterBottom>Current Avatar</Typography>
              <Avatar
                src={currentAvatarDisplayUrl || '/images/avatar/default.png'}
                alt={authProfile?.first_name || authUser?.email || 'User Avatar'}
                sx={{ width: 120, height: 120, margin: '0 auto', mb: 2, fontSize: '3rem', bgcolor: 'secondary.main' }}
              >
                {(!currentAvatarDisplayUrl && (authProfile?.first_name || authUser?.email)) 
                  ? (authProfile?.first_name || authUser?.email)?.[0].toUpperCase() 
                  : null}
              </Avatar>
            </Grid>
            <Grid item xs={12} md={9}>
              <Typography variant="subtitle1" gutterBottom>Choose a new Avatar</Typography>
              {availableAvatars.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {availableAvatars.map((avatarFile) => (
                    <Box 
                      key={avatarFile} 
                      onClick={() => setSelectedAvatarForUpdate(avatarFile)}
                      sx={{ 
                        cursor: 'pointer', 
                        position: 'relative',
                        border: selectedAvatarForUpdate === avatarFile ? `3px solid ${theme.palette.primary.main}` : `3px solid transparent`,
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
                      {selectedAvatarForUpdate === avatarFile && (
                        <CheckCircleIcon 
                          sx={{ 
                            position: 'absolute', 
                            bottom: 0, 
                            right: 0, 
                            color: theme.palette.success.main,
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            fontSize: '1.5rem'
                          }} 
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography>No other avatars available at the moment.</Typography>
              )}
              <Button
                variant="contained"
                onClick={handleSaveAvatar}
                disabled={loading.savingAvatar || !selectedAvatarForUpdate}
                sx={{ mt: 3 }}
              >
                {loading.savingAvatar ? <CircularProgress size={24} /> : 'Save Avatar'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Stack spacing={3}>
        {/* Personal Information */}
        <Card elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'background.subtle', p: 2 }}>
            <Typography variant="h6" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1, color: theme.palette.primary.main }} fontSize="small" />
              Personal Information
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="Enter your first name"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="Enter your last name"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="Your email address"
                  type="email"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="Your phone number"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  type="date"
                  value={profile.date_of_birth}
                  onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="Your street address"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="Your city"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="State"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="State"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="ZIP Code"
                  value={profile.zip_code}
                  onChange={(e) => setProfile({ ...profile, zip_code: e.target.value })}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="ZIP code"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Insurance Information */}
        <Card elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'background.subtle', p: 2 }}>
            <Typography variant="h6" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center' }}>
              <LocalHospitalIcon sx={{ mr: 1, color: theme.palette.primary.main }} fontSize="small" />
              Insurance Information
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Insurance Provider"
                  value={profile.insurance_provider}
                  onChange={(e) => setProfile({ ...profile, insurance_provider: e.target.value })}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="Your insurance company"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Insurance ID"
                  value={profile.insurance_id}
                  onChange={(e) => setProfile({ ...profile, insurance_id: e.target.value })}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="Your insurance ID number"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'background.subtle', p: 2 }}>
            <Typography variant="h6" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center' }}>
              <MedicalServicesIcon sx={{ mr: 1, color: theme.palette.primary.main }} fontSize="small" />
              Medical Information
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Blood Type"
                  value={profile.blood_type}
                  onChange={(e) => setProfile({ ...profile, blood_type: e.target.value })}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="Your blood type"
                  select
                  SelectProps={{ native: true }}
                >
                  <option value=""></option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Allergies"
                  value={profile.allergies}
                  onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                  multiline
                  rows={2}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="List any allergies you have"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Current Medications"
                  value={profile.medications}
                  onChange={(e) => setProfile({ ...profile, medications: e.target.value })}
                  multiline
                  rows={2}
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  placeholder="List medications you are currently taking"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'background.subtle', p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center' }}>
              <ContactsIcon sx={{ mr: 1, color: theme.palette.primary.main }} fontSize="small" />
              Emergency Contacts
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              size="small"
              color="primary"
              onClick={() => {
                setEditingContact(null);
                setNewContact({});
                setOpenContactDialog(true);
              }}
              sx={{ px: 2 }}
            >
              Add Contact
            </Button>
          </Box>
          <CardContent sx={{ p: 0 }}>
            {emergencyContacts.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No emergency contacts added yet.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Add important contacts that can be reached in case of an emergency.
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {emergencyContacts.map((contact, index) => (
                  <ListItem 
                    key={contact.id} 
                    divider={index < emergencyContacts.length - 1}
                    sx={{ 
                      px: 3, 
                      py: 2,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      }
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        bgcolor: theme.palette.primary.light, 
                        color: 'white',
                        mr: 2,
                      }}
                    >
                      {contact.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight="medium">
                          {contact.name}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                            {contact.relationship}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                            {contact.phone} • {contact.email}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => {
                          setEditingContact(contact);
                          setOpenContactDialog(true);
                        }}
                        sx={{ color: theme.palette.primary.main }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteContact(contact.id)}
                        sx={{ color: theme.palette.error.main, ml: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Medical History */}
        <Card elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'background.subtle', p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center' }}>
              <HistoryIcon sx={{ mr: 1, color: theme.palette.primary.main }} fontSize="small" />
              Medical History
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              size="small"
              color="primary"
              onClick={() => {
                setEditingHistory(null);
                setNewHistory({});
                setOpenHistoryDialog(true);
              }}
              sx={{ px: 2 }}
            >
              Add Condition
            </Button>
          </Box>
          <CardContent sx={{ p: 0 }}>
            {medicalHistory.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No medical history added yet.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Add relevant medical conditions and history for better care.
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {medicalHistory.map((history, index) => (
                  <ListItem 
                    key={history.id} 
                    divider={index < medicalHistory.length - 1}
                    sx={{ 
                      px: 3, 
                      py: 2,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight="medium">
                          {history.condition}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                            <strong>Diagnosed:</strong> {history.diagnosis_date ? new Date(history.diagnosis_date).toLocaleDateString() : 'N/A'}
                          </Typography>
                          {history.treatment && (
                            <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
                              <strong>Treatment:</strong> {history.treatment}
                            </Typography>
                          )}
                          {history.notes && (
                            <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.5 }}>
                              {history.notes}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => {
                          setEditingHistory(history);
                          setOpenHistoryDialog(true);
                        }}
                        sx={{ color: theme.palette.primary.main }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteHistory(history.id)}
                        sx={{ color: theme.palette.error.main, ml: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Emergency Contact Dialog */}
      <Dialog 
        open={openContactDialog} 
        onClose={() => setOpenContactDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'background.subtle', pb: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ContactsIcon color="primary" />
            <Typography variant="h6">
              {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={editingContact?.name || newContact.name || ''}
              onChange={(e) => {
                if (editingContact) {
                  setEditingContact({ ...editingContact, name: e.target.value });
                } else {
                  setNewContact({ ...newContact, name: e.target.value });
                }
              }}
              variant="outlined"
              placeholder="Full name of contact"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              label="Relationship"
              value={editingContact?.relationship || newContact.relationship || ''}
              onChange={(e) => {
                if (editingContact) {
                  setEditingContact({ ...editingContact, relationship: e.target.value });
                } else {
                  setNewContact({ ...newContact, relationship: e.target.value });
                }
              }}
              variant="outlined"
              placeholder="e.g. Parent, Sibling, Spouse"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              label="Phone"
              value={editingContact?.phone || newContact.phone || ''}
              onChange={(e) => {
                if (editingContact) {
                  setEditingContact({ ...editingContact, phone: e.target.value });
                } else {
                  setNewContact({ ...newContact, phone: e.target.value });
                }
              }}
              variant="outlined"
              placeholder="Phone number with area code"
              InputLabelProps={{ shrink: true }}
              required
              type="tel"
            />
            <TextField
              fullWidth
              label="Email"
              value={editingContact?.email || newContact.email || ''}
              onChange={(e) => {
                if (editingContact) {
                  setEditingContact({ ...editingContact, email: e.target.value });
                } else {
                  setNewContact({ ...newContact, email: e.target.value });
                }
              }}
              variant="outlined"
              placeholder="Email address"
              InputLabelProps={{ shrink: true }}
              type="email"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button 
            onClick={() => setOpenContactDialog(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={editingContact ? handleSaveContact : handleAddContact} 
            variant="contained"
            startIcon={editingContact ? <EditIcon /> : <AddIcon />}
          >
            {editingContact ? 'Save Changes' : 'Add Contact'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Medical History Dialog */}
      <Dialog 
        open={openHistoryDialog} 
        onClose={() => setOpenHistoryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'background.subtle', pb: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <HistoryIcon color="primary" />
            <Typography variant="h6">
              {editingHistory ? 'Edit Medical History' : 'Add Medical History'}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Condition"
              value={editingHistory?.condition || newHistory.condition || ''}
              onChange={(e) => {
                if (editingHistory) {
                  setEditingHistory({ ...editingHistory, condition: e.target.value });
                } else {
                  setNewHistory({ ...newHistory, condition: e.target.value });
                }
              }}
              variant="outlined"
              placeholder="Medical condition or diagnosis"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              label="Diagnosis Date"
              type="date"
              value={editingHistory?.diagnosis_date || newHistory.diagnosis_date || ''}
              onChange={(e) => {
                if (editingHistory) {
                  setEditingHistory({ ...editingHistory, diagnosis_date: e.target.value });
                } else {
                  setNewHistory({ ...newHistory, diagnosis_date: e.target.value });
                }
              }}
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              required
            />
            <TextField
              fullWidth
              label="Treatment"
              value={editingHistory?.treatment || newHistory.treatment || ''}
              onChange={(e) => {
                if (editingHistory) {
                  setEditingHistory({ ...editingHistory, treatment: e.target.value });
                } else {
                  setNewHistory({ ...newHistory, treatment: e.target.value });
                }
              }}
              variant="outlined"
              placeholder="Current or past treatments"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Notes"
              value={editingHistory?.notes || newHistory.notes || ''}
              onChange={(e) => {
                if (editingHistory) {
                  setEditingHistory({ ...editingHistory, notes: e.target.value });
                } else {
                  setNewHistory({ ...newHistory, notes: e.target.value });
                }
              }}
              multiline
              rows={3}
              variant="outlined"
              placeholder="Additional information or notes"
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button 
            onClick={() => setOpenHistoryDialog(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={editingHistory ? handleSaveHistory : handleAddHistory} 
            variant="contained"
            startIcon={editingHistory ? <EditIcon /> : <AddIcon />}
          >
            {editingHistory ? 'Save Changes' : 'Add History'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for avatar updates */}
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
    </Box>
  );
} 