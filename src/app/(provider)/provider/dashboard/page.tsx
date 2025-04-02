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
  Rating,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
} from '@mui/material';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface Provider {
  id: string;
  name: string;
  specialty: string;
  avatar_url?: string;
}

interface Patient {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface ProviderReview {
  id: string;
  patient_id: string;
  rating: number;
  review_text: string;
  category_id: string;
  is_anonymous: boolean;
  created_at: string;
  patient?: Patient;
  category?: {
    id: string;
    name: string;
  };
  response?: {
    id: string;
    response_text: string;
    created_at: string;
  };
}

interface TreatmentFeedback {
  id: string;
  patient_id: string;
  treatment_plan_id: string;
  rating: number;
  feedback_text: string;
  category_id: string;
  is_anonymous: boolean;
  created_at: string;
  patient?: Patient;
  treatment_plan?: {
    id: string;
    title: string;
  };
  category?: {
    id: string;
    name: string;
  };
  response?: {
    id: string;
    response_text: string;
    created_at: string;
  };
}

interface TreatmentPlan {
  id: string;
  patient_id: string;
  title: string;
  status: string;
  created_at: string;
  patient?: Patient;
}

interface Appointment {
  id: string;
  patient_id: string;
  date: string;
  status: string;
  type: string;
  patient?: Patient;
}

export default function ProviderDashboard() {
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [feedback, setFeedback] = useState<TreatmentFeedback[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [responseDialog, setResponseDialog] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<ProviderReview | TreatmentFeedback | null>(null);
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Fetch provider details
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (providerError) throw providerError;
      setProvider(providerData);

      // Fetch provider reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('provider_reviews')
        .select(`
          *,
          patient:patients(*),
          category:feedback_categories(*),
          response:feedback_responses(*)
        `)
        .eq('provider_id', providerData.id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData);

      // Fetch treatment feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('treatment_feedback')
        .select(`
          *,
          patient:patients(*),
          treatment_plan:treatment_plans(*),
          category:feedback_categories(*),
          response:feedback_responses(*)
        `)
        .eq('treatment_plan.provider_id', providerData.id)
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;
      setFeedback(feedbackData);

      // Fetch treatment plans
      const { data: plansData, error: plansError } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          patient:patients(*)
        `)
        .eq('provider_id', providerData.id)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;
      setTreatmentPlans(plansData);

      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(*)
        `)
        .eq('provider_id', providerData.id)
        .order('date', { ascending: true });

      if (appointmentsError) throw appointmentsError;
      setAppointments(appointmentsData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedFeedback || !responseText.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('feedback_responses')
        .insert({
          feedback_id: selectedFeedback.id,
          feedback_type: 'provider' in selectedFeedback ? 'provider' : 'treatment',
          responder_id: user.id,
          response_text: responseText,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      if ('provider_id' in selectedFeedback) {
        setReviews(reviews.map(review => 
          review.id === selectedFeedback.id
            ? { ...review, response: data }
            : review
        ));
      } else {
        setFeedback(feedback.map(item => 
          item.id === selectedFeedback.id
            ? { ...item, response: data }
            : item
        ));
      }

      setResponseDialog(false);
      setSelectedFeedback(null);
      setResponseText('');
    } catch (error) {
      console.error('Error submitting response:', error);
      setError('Failed to submit response');
    }
  };

  const calculateAverageRating = () => {
    const allRatings = [
      ...reviews.map(review => review.rating),
      ...feedback.map(item => item.rating)
    ];
    if (allRatings.length === 0) return 0;
    return allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments
      .filter(apt => new Date(apt.date) > now && apt.status === 'scheduled')
      .slice(0, 5);
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
        <Typography variant="h4">Provider Dashboard</Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Overview Cards */}
        <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', gap: 3 }}>
          <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(25% - 24px)' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Rating
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Rating value={calculateAverageRating()} precision={0.1} readOnly />
                <Typography variant="h6">
                  {calculateAverageRating().toFixed(1)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(25% - 24px)' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Patients
              </Typography>
              <Typography variant="h4">
                {new Set(treatmentPlans.map(plan => plan.patient_id)).size}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(25% - 24px)' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Treatment Plans
              </Typography>
              <Typography variant="h4">
                {treatmentPlans.length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(25% - 24px)' } }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Appointments
              </Typography>
              <Typography variant="h4">
                {getUpcomingAppointments().length}
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        {/* Recent Reviews and Feedback */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Reviews & Feedback
            </Typography>
            <Stack spacing={2}>
              {[...reviews, ...feedback]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map((item) => (
                  <Card key={item.id} variant="outlined">
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1">
                            {item.is_anonymous ? 'Anonymous' : item.patient?.first_name + ' ' + item.patient?.last_name}
                          </Typography>
                          <Rating value={item.rating} readOnly />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {'review_text' in item ? item.review_text : item.feedback_text}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={item.category?.name || 'Uncategorized'}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          {item.is_anonymous && (
                            <Chip
                              label="Anonymous"
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          Posted {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </Typography>
                        {!item.response && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setSelectedFeedback(item);
                              setResponseDialog(true);
                            }}
                          >
                            Respond
                          </Button>
                        )}
                        {item.response && (
                          <Box sx={{ mt: 2, pl: 2, borderLeft: 2, borderColor: 'divider' }}>
                            <Typography variant="subtitle2" color="primary">
                              Your Response
                            </Typography>
                            <Typography variant="body2">
                              {item.response.response_text}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(item.response.created_at), 'MMM d, yyyy')}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
            </Stack>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Upcoming Appointments
            </Typography>
            <Stack spacing={2}>
              {getUpcomingAppointments().map((appointment) => (
                <Card key={appointment.id} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack>
                        <Typography variant="subtitle1">
                          {appointment.patient?.first_name} {appointment.patient?.last_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {format(new Date(appointment.date), 'MMM d, yyyy h:mm a')}
                        </Typography>
                      </Stack>
                      <Chip
                        label={appointment.type}
                        color="primary"
                        variant="outlined"
                      />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Response Dialog */}
      <Dialog open={responseDialog} onClose={() => setResponseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Respond to Feedback</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="body1">
              {selectedFeedback && ('review_text' in selectedFeedback ? selectedFeedback.review_text : selectedFeedback.feedback_text)}
            </Typography>
            <TextField
              label="Your Response"
              fullWidth
              multiline
              rows={4}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResponseDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitResponse}
            disabled={!responseText.trim()}
          >
            Submit Response
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 