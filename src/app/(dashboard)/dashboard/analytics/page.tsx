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
  Alert,
} from '@mui/material';
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
import { supabase } from '@/lib/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface AnalyticsMetric {
  id: string;
  metric_type: string;
  metric_value: {
    total_sessions?: number;
    active_days?: number;
    event_counts?: Record<string, number>;
    total_plans?: number;
    completed_plans?: number;
    milestone_completion_rate?: number;
    total_appointments?: number;
    attended_appointments?: number;
    cancelled_appointments?: number;
    attendance_rate?: number;
  };
  period_start: string;
  period_end: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [timeRange, setTimeRange] = useState('7d');
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

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

      // Calculate date range
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(new Date(), parseInt(timeRange)));

      // Fetch metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('analytics_metrics')
        .select('*')
        .eq('patient_id', patientData.id)
        .gte('period_start', startDate.toISOString())
        .lte('period_end', endDate.toISOString())
        .order('period_start', { ascending: true });

      if (metricsError) throw metricsError;

      // Explicitly cast metric_value to the expected type
      const typedMetricsData = metricsData.map(metric => ({
        ...metric,
        metric_value: metric.metric_value as AnalyticsMetric['metric_value'],
      }));

      setMetrics(typedMetricsData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load analytics data');
      setLoading(false);
    }
  };

  const getEngagementData = () => {
    return metrics
      .filter(m => m.metric_type === 'patient_engagement')
      .map(m => ({
        date: format(new Date(m.period_start), 'MMM dd'),
        sessions: m.metric_value.total_sessions || 0,
        activeDays: m.metric_value.active_days || 0,
      }));
  };

  const getTreatmentData = () => {
    const treatmentMetrics = metrics.filter(m => m.metric_type === 'treatment_success');
    if (treatmentMetrics.length === 0) return [];

    const latest = treatmentMetrics[treatmentMetrics.length - 1];
    return [
      {
        name: 'Completed',
        value: latest.metric_value.completed_plans || 0,
      },
      {
        name: 'In Progress',
        value: (latest.metric_value.total_plans || 0) - (latest.metric_value.completed_plans || 0),
      },
    ];
  };

  const getAppointmentData = () => {
    return metrics
      .filter(m => m.metric_type === 'appointments')
      .map(m => ({
        date: format(new Date(m.period_start), 'MMM dd'),
        attended: m.metric_value.attended_appointments || 0,
        cancelled: m.metric_value.cancelled_appointments || 0,
      }));
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
          <Typography variant="h4">Analytics Dashboard</Typography>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Engagement Metrics */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Patient Engagement
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getEngagementData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="#8884d8"
                    name="Daily Sessions"
                  />
                  <Line
                    type="monotone"
                    dataKey="activeDays"
                    stroke="#82ca9d"
                    name="Active Days"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Treatment Success */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Treatment Plan Progress
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getTreatmentData()}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {getTreatmentData()?.map((entry, index) => (
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

        {/* Appointment Attendance */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Appointment Attendance
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getAppointmentData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="attended"
                    fill="#8884d8"
                    name="Attended"
                  />
                  <Bar
                    dataKey="cancelled"
                    fill="#ff8042"
                    name="Cancelled"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', gap: 3 }}>
          {metrics.length > 0 && (
            <>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(25% - 24px)' } }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Treatment Success Rate
                    </Typography>
                    <Typography variant="h4">
                      {metrics
                        .filter(m => m.metric_type === 'treatment_success')
                        .slice(-1)[0]?.metric_value.milestone_completion_rate || 0}%
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(25% - 24px)' } }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Appointment Attendance Rate
                    </Typography>
                    <Typography variant="h4">
                      {metrics
                        .filter(m => m.metric_type === 'appointments')
                        .slice(-1)[0]?.metric_value.attendance_rate || 0}%
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(25% - 24px)' } }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Active Days
                    </Typography>
                    <Typography variant="h4">
                      {metrics
                        .filter(m => m.metric_type === 'patient_engagement')
                        .slice(-1)[0]?.metric_value.active_days || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(25% - 24px)' } }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Total Sessions
                    </Typography>
                    <Typography variant="h4">
                      {metrics
                        .filter(m => m.metric_type === 'patient_engagement')
                        .slice(-1)[0]?.metric_value.total_sessions || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </>
          )}
        </Stack>
      </Stack>
    </Box>
  );
} 