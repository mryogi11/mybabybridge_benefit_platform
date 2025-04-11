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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { supabase } from '@/lib/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface Category {
  id: string;
  name: string;
}

interface ResourceEngagement {
  resource_id: string;
  title: string;
  category_id?: string | null;
  total_views: number;
  completion_rate: number;
  average_time_spent: number;
  total_patients: number;
  completed_patients: number;
}

interface CategoryEngagement {
  category_id: string;
  name: string;
  total_views: number;
  completion_rate: number;
  average_time_spent: number;
  total_patients: number;
  completed_patients: number;
}

interface DailyEngagement {
  date: string;
  views: number;
  completions: number;
  average_time_spent: number;
}

export default function ProviderEducationAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [resourceEngagement, setResourceEngagement] = useState<ResourceEngagement[]>([]);
  const [categoryEngagement, setCategoryEngagement] = useState<CategoryEngagement[]>([]);
  const [dailyEngagement, setDailyEngagement] = useState<DailyEngagement[]>([]);

  useEffect(() => {
    fetchData();
  }, [selectedCategory, timeRange]);

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('education_categories')
        .select('id, name')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90));

      // Fetch resource engagement
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('education_resources')
        .select(`
          id,
          title,
          category_id,
          patient_education_progress (
            status,
            progress_percentage,
            last_accessed_at,
            completed_at
          )
        `)
        .eq(selectedCategory ? 'category_id' : 'id', selectedCategory || 'id');

      if (resourcesError) throw resourcesError;

      const engagementData = resourcesData.map((resource) => {
        const progress = resource.patient_education_progress || [];
        const totalPatients = progress.length;
        const completedPatients = progress.filter((p) => p.status === 'completed').length;
        const totalViews = progress.filter((p) => p.last_accessed_at).length;
        const averageTimeSpent = progress.reduce((acc, p) => acc + (p.progress_percentage || 0), 0) / totalPatients || 0;

        return {
          resource_id: resource.id,
          title: resource.title,
          category_id: resource.category_id,
          total_views: totalViews,
          completion_rate: (completedPatients / totalPatients) * 100 || 0,
          average_time_spent: averageTimeSpent,
          total_patients: totalPatients,
          completed_patients: completedPatients,
        };
      });

      if (resourcesError) throw resourcesError;

      setResourceEngagement(engagementData as any);

      // Calculate category engagement
      const categoryData = categoriesData.map((category) => {
        const categoryResources = engagementData.filter((r) => r.category_id === category.id);
        const totalViews = categoryResources.reduce((acc, r) => acc + r.total_views, 0);
        const totalPatients = categoryResources.reduce((acc, r) => acc + r.total_patients, 0);
        const completedPatients = categoryResources.reduce((acc, r) => acc + r.completed_patients, 0);
        const averageTimeSpent = categoryResources.reduce((acc, r) => acc + r.average_time_spent, 0) / categoryResources.length || 0;

        return {
          category_id: category.id,
          name: category.name,
          total_views: totalViews,
          completion_rate: (completedPatients / totalPatients) * 100 || 0,
          average_time_spent: averageTimeSpent,
          total_patients: totalPatients,
          completed_patients: completedPatients,
        };
      });

      setCategoryEngagement(categoryData as any);

      // Fetch daily engagement
      const { data: dailyData, error: dailyError } = await supabase
        .from('patient_education_progress')
        .select('last_accessed_at, completed_at, progress_percentage')
        .gte('last_accessed_at', startDate.toISOString())
        .order('last_accessed_at');

      if (dailyError) throw dailyError;

      // Aggregate daily stats
      const dailyStats = dailyData.reduce((acc: { [key: string]: DailyEngagement }, curr) => {
        // Check if last_accessed_at is a valid string
        if (!curr.last_accessed_at || typeof curr.last_accessed_at !== 'string') {
          return acc; // Skip this record if date is invalid
        }
        // Proceed if date is valid
        const date = new Date(curr.last_accessed_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            views: 0,
            completions: 0,
            average_time_spent: 0,
          };
        }

        acc[date].views++;
        if (curr.completed_at) {
          acc[date].completions++;
        }
        acc[date].average_time_spent += curr.progress_percentage ?? 0;
        return acc;
      }, {});

      setDailyEngagement(Object.values(dailyStats));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError('Failed to load analytics data');
      setLoading(false);
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
          <Typography variant="h4">Education Analytics</Typography>
          <Stack direction="row" spacing={2}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
              >
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="90d">Last 90 Days</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
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
        </Stack>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Category Engagement Overview */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Category Engagement Overview
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Total Views</TableCell>
                        <TableCell align="right">Completion Rate</TableCell>
                        <TableCell align="right">Average Time Spent</TableCell>
                        <TableCell align="right">Total Patients</TableCell>
                        <TableCell align="right">Completed Patients</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categoryEngagement.map((category) => (
                        <TableRow key={category.category_id}>
                          <TableCell>{category.name}</TableCell>
                          <TableCell align="right">{category.total_views}</TableCell>
                          <TableCell align="right">{category.completion_rate.toFixed(1)}%</TableCell>
                          <TableCell align="right">{category.average_time_spent.toFixed(1)}%</TableCell>
                          <TableCell align="right">{category.total_patients}</TableCell>
                          <TableCell align="right">{category.completed_patients}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Daily Engagement Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Daily Engagement
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyEngagement}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="views" stroke="#8884d8" name="Views" />
                      <Line type="monotone" dataKey="completions" stroke="#82ca9d" name="Completions" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Resource Engagement Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resource Engagement
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resourceEngagement}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="title" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completion_rate" fill="#8884d8" name="Completion Rate (%)" />
                      <Bar dataKey="average_time_spent" fill="#82ca9d" name="Average Time Spent (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Resource Details Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resource Details
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Resource</TableCell>
                        <TableCell align="right">Total Views</TableCell>
                        <TableCell align="right">Completion Rate</TableCell>
                        <TableCell align="right">Average Time Spent</TableCell>
                        <TableCell align="right">Total Patients</TableCell>
                        <TableCell align="right">Completed Patients</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resourceEngagement.map((resource) => (
                        <TableRow key={resource.resource_id}>
                          <TableCell>{resource.title}</TableCell>
                          <TableCell align="right">{resource.total_views}</TableCell>
                          <TableCell align="right">{resource.completion_rate.toFixed(1)}%</TableCell>
                          <TableCell align="right">{resource.average_time_spent.toFixed(1)}%</TableCell>
                          <TableCell align="right">{resource.total_patients}</TableCell>
                          <TableCell align="right">{resource.completed_patients}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
} 