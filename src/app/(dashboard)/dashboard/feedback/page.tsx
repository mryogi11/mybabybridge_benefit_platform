'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Alert,
  Chip,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface FeedbackCategory {
  id: string;
  name: string;
  description: string;
}

interface Provider {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specialization?: string | null;
}

interface TreatmentPlan {
  id: string;
  title: string;
  provider_id: string;
  provider?: Provider;
}

interface ProviderReview {
  id: string;
  provider_id: string;
  rating: number;
  review_text: string;
  category_id: string;
  is_anonymous: boolean;
  created_at: string;
  provider?: Provider;
  category?: FeedbackCategory;
  response?: {
    id: string;
    response_text: string;
    created_at: string;
  };
}

interface TreatmentFeedback {
  id: string;
  treatment_plan_id: string;
  rating: number;
  feedback_text: string;
  category_id: string;
  is_anonymous: boolean;
  created_at: string;
  treatment_plan?: TreatmentPlan;
  category?: FeedbackCategory;
  response?: {
    id: string;
    response_text: string;
    created_at: string;
  };
}

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [categories, setCategories] = useState<FeedbackCategory[]>([]);
  const [providerReviews, setProviderReviews] = useState<ProviderReview[]>([]);
  const [treatmentFeedback, setTreatmentFeedback] = useState<TreatmentFeedback[]>([]);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentPlan | null>(null);
  const [newReview, setNewReview] = useState({
    rating: 0,
    review_text: '',
    category_id: '',
    is_anonymous: false,
  });
  const [newFeedback, setNewFeedback] = useState({
    rating: 0,
    feedback_text: '',
    category_id: '',
    is_anonymous: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Fetch providers
      const { data: providersData, error: providersError } = await supabase
        .from('providers')
        .select('id, user_id, first_name, last_name, specialization');

      if (providersError) throw providersError;

      // Explicitly map providersData
      const typedProviders: Provider[] = (providersData || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        specialization: p.specialization,
      }));
      setProviders(typedProviders);

      // Fetch treatment plans
      const { data: plansData, error: plansError } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          provider:providers(*)
        `)
        .eq('patient_id', user.id);

      if (plansError) throw plansError;
      setTreatmentPlans(plansData);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('feedback_categories')
        .select('*');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData);

      // Fetch provider reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('provider_reviews')
        .select(`
          *,
          provider:providers(*),
          category:feedback_categories(*),
          response:feedback_responses(*)
        `)
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      setProviderReviews(reviewsData);

      // Fetch treatment feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('treatment_feedback')
        .select(`
          *,
          treatment_plan:treatment_plans(*),
          category:feedback_categories(*),
          response:feedback_responses(*)
        `)
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;
      setTreatmentFeedback(feedbackData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedProvider) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('provider_reviews')
        .insert({
          patient_id: user.id,
          provider_id: selectedProvider.id,
          ...newReview,
        })
        .select(`
          *,
          provider:providers(*),
          category:feedback_categories(*)
        `)
        .single();

      if (error) throw error;

      setProviderReviews([data, ...providerReviews]);
      setReviewDialog(false);
      setSelectedProvider(null);
      setNewReview({
        rating: 0,
        review_text: '',
        category_id: '',
        is_anonymous: false,
      });
    } catch (error) {
      console.error('Error submitting review:', error);
      setError('Failed to submit review');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedTreatment) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('treatment_feedback')
        .insert({
          patient_id: user.id,
          treatment_plan_id: selectedTreatment.id,
          ...newFeedback,
        })
        .select(`
          *,
          treatment_plan:treatment_plans(*),
          category:feedback_categories(*)
        `)
        .single();

      if (error) throw error;

      setTreatmentFeedback([data, ...treatmentFeedback]);
      setFeedbackDialog(false);
      setSelectedTreatment(null);
      setNewFeedback({
        rating: 0,
        feedback_text: '',
        category_id: '',
        is_anonymous: false,
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError('Failed to submit feedback');
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
        <Typography variant="h4">My Feedback</Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ mb: 3 }}
            >
              <Tab label="Provider Reviews" />
              <Tab label="Treatment Feedback" />
            </Tabs>

            {activeTab === 0 ? (
              <Stack spacing={3}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Provider Reviews</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setReviewDialog(true)}
                  >
                    Write a Review
                  </Button>
                </Stack>

                <Stack spacing={2}>
                  {providerReviews.map((review) => (
                    <Card key={review.id} variant="outlined">
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1">
                              {review.is_anonymous ? 'Anonymous Review' : review.provider?.first_name}
                            </Typography>
                            <Rating value={review.rating} readOnly />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {review.review_text}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Chip
                              label={review.category?.name || 'Uncategorized'}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            {review.is_anonymous && (
                              <Chip
                                label="Anonymous"
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            Posted {format(new Date(review.created_at), 'MMM d, yyyy')}
                          </Typography>
                          {review.response && (
                            <Box sx={{ mt: 2, pl: 2, borderLeft: 2, borderColor: 'divider' }}>
                              <Typography variant="subtitle2" color="primary">
                                Provider Response
                              </Typography>
                              <Typography variant="body2">
                                {review.response.response_text}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(review.response.created_at), 'MMM d, yyyy')}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={3}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Treatment Feedback</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setFeedbackDialog(true)}
                  >
                    Provide Feedback
                  </Button>
                </Stack>

                <Stack spacing={2}>
                  {treatmentFeedback.map((feedback) => (
                    <Card key={feedback.id} variant="outlined">
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1">
                              {feedback.is_anonymous ? 'Anonymous Feedback' : feedback.treatment_plan?.title}
                            </Typography>
                            <Rating value={feedback.rating} readOnly />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {feedback.feedback_text}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Chip
                              label={feedback.category?.name || 'Uncategorized'}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            {feedback.is_anonymous && (
                              <Chip
                                label="Anonymous"
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            Posted {format(new Date(feedback.created_at), 'MMM d, yyyy')}
                          </Typography>
                          {feedback.response && (
                            <Box sx={{ mt: 2, pl: 2, borderLeft: 2, borderColor: 'divider' }}>
                              <Typography variant="subtitle2" color="primary">
                                Provider Response
                              </Typography>
                              <Typography variant="body2">
                                {feedback.response.response_text}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(feedback.response.created_at), 'MMM d, yyyy')}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Provider Review Dialog */}
      <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Write a Provider Review</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              select
              label="Select Provider"
              fullWidth
              value={selectedProvider?.id || ''}
              onChange={(e) => {
                const provider = providers.find(p => p.id === e.target.value);
                setSelectedProvider(provider || null);
              }}
            >
              {providers.map((provider) => (
                <MenuItem key={provider.id} value={provider.id}>
                  {`${provider.first_name} ${provider.last_name}`}
                </MenuItem>
              ))}
            </TextField>
            <Rating
              value={newReview.rating}
              onChange={(_, value) => setNewReview({ ...newReview, rating: value || 0 })}
            />
            <TextField
              select
              label="Category"
              fullWidth
              value={newReview.category_id}
              onChange={(e) => setNewReview({ ...newReview, category_id: e.target.value })}
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Review"
              fullWidth
              multiline
              rows={4}
              value={newReview.review_text}
              onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newReview.is_anonymous}
                  onChange={(e) => setNewReview({ ...newReview, is_anonymous: e.target.checked })}
                />
              }
              label="Post anonymously"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitReview}
            disabled={!selectedProvider || !newReview.rating || !newReview.review_text}
          >
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>

      {/* Treatment Feedback Dialog */}
      <Dialog open={feedbackDialog} onClose={() => setFeedbackDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Provide Treatment Feedback</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              select
              label="Select Treatment"
              fullWidth
              value={selectedTreatment?.id || ''}
              onChange={(e) => {
                const treatment = treatmentPlans.find(t => t.id === e.target.value);
                setSelectedTreatment(treatment || null);
              }}
            >
              {treatmentPlans.map((plan) => (
                <MenuItem key={plan.id} value={plan.id}>
                  {plan.title} - {plan.provider?.first_name}
                </MenuItem>
              ))}
            </TextField>
            <Rating
              value={newFeedback.rating}
              onChange={(_, value) => setNewFeedback({ ...newFeedback, rating: value || 0 })}
            />
            <TextField
              select
              label="Category"
              fullWidth
              value={newFeedback.category_id}
              onChange={(e) => setNewFeedback({ ...newFeedback, category_id: e.target.value })}
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Feedback"
              fullWidth
              multiline
              rows={4}
              value={newFeedback.feedback_text}
              onChange={(e) => setNewFeedback({ ...newFeedback, feedback_text: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newFeedback.is_anonymous}
                  onChange={(e) => setNewFeedback({ ...newFeedback, is_anonymous: e.target.checked })}
                />
              }
              label="Post anonymously"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitFeedback}
            disabled={!selectedTreatment || !newFeedback.rating || !newFeedback.feedback_text}
          >
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 