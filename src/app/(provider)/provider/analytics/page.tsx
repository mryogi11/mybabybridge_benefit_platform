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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { supabase } from '@/lib/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AnalyticsData {
  revenue: {
    date: string;
    amount: number;
  }[];
  treatmentSuccess: {
    status: string;
    count: number;
  }[];
  patientProgress: {
    month: string;
    completed: number;
    inProgress: number;
    pending: number;
  }[];
  appointmentStats: {
    status: string;
    count: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    revenue: [],
    treatmentSuccess: [],
    patientProgress: [],
    appointmentStats: [],
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch provider details
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (providerError) {
      console.error('Error fetching provider:', providerError);
      return;
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = subMonths(endDate, parseInt(timeRange));

    // Fetch revenue data
    const { data: revenueData, error: revenueError } = await supabase
      .rpc('get_provider_revenue', {
        provider_id: providerData.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

    if (revenueError) {
      console.error('Error fetching revenue:', revenueError);
      return;
    }

    // Fetch treatment success data
    const { data: treatmentData, error: treatmentError } = await supabase
      .rpc('get_treatment_success_rates', {
        provider_id: providerData.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

    if (treatmentError) {
      console.error('Error fetching treatment data:', treatmentError);
      return;
    }

    // Fetch patient progress data
    const { data: progressData, error: progressError } = await supabase
      .rpc('get_patient_progress', {
        provider_id: providerData.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

    if (progressError) {
      console.error('Error fetching progress data:', progressError);
      return;
    }

    // Fetch appointment statistics
    const { data: appointmentData, error: appointmentError } = await supabase
      .rpc('get_appointment_stats', {
        provider_id: providerData.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

    if (appointmentError) {
      console.error('Error fetching appointment data:', appointmentError);
      return;
    }

    setAnalyticsData({
      revenue: revenueData,
      treatmentSuccess: treatmentData,
      patientProgress: progressData.map(p => ({ ...p, inProgress: p.in_progress })) as AnalyticsData['patientProgress'],
      appointmentStats: appointmentData,
    });
    setLoading(false);
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Analytics Dashboard</Typography>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="3">Last 3 Months</MenuItem>
              <MenuItem value="6">Last 6 Months</MenuItem>
              <MenuItem value="12">Last 12 Months</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Revenue Chart */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Revenue Overview
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#8884d8"
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Treatment Success Rates */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Treatment Success Rates
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.treatmentSuccess}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {analyticsData.treatmentSuccess.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Patient Progress */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Patient Progress
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.patientProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" fill="#8884d8" />
                  <Bar dataKey="inProgress" name="In Progress" fill="#82ca9d" />
                  <Bar dataKey="pending" name="Pending" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Appointment Statistics */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Appointment Statistics
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.appointmentStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Appointments" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
} 