'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  CircularProgress,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import ActivityLogs from './ActivityLogs';

interface AnalyticsData {
  revenueByMonth: { month: string; revenue: number }[];
  treatmentsByType: { name: string; value: number }[];
  userGrowth: { month: string; users: number }[];
  successRates: { name: string; value: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const DEFAULT_DATA: AnalyticsData = {
  revenueByMonth: [],
  treatmentsByType: [],
  userGrowth: [],
  successRates: [
    { name: 'Successful', value: 0 },
    { name: 'In Progress', value: 0 },
    { name: 'Discontinued', value: 0 },
  ],
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch user growth
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('created_at');

        if (usersError) throw usersError;

        const userGrowth = usersData.reduce((acc: { month: string; users: number }[], user) => {
          if (!user.created_at) return acc;
          const month = new Date(user.created_at).toLocaleString('default', { month: 'short' });
          const existingMonth = acc.find((item) => item.month === month);
          
          if (existingMonth) {
            existingMonth.users += 1;
          } else {
            acc.push({ month, users: 1 });
          }
          
          return acc;
        }, []);

        // Set the data with only user growth for now
        setData({
          ...DEFAULT_DATA,
          userGrowth,
        });
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to fetch analytics data. Some features might be unavailable.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [supabase]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Analytics Dashboard
        </Typography>

        {error && (
          <Alert severity="warning" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Revenue Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, minHeight: 380 }}>
              <Typography variant="h6" gutterBottom>Revenue by Month</Typography>
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography variant="body1" color="textSecondary">
                  (Payment data not available)
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* User Growth Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                User Growth
              </Typography>
              {data.userGrowth.length > 0 ? (
                <LineChart width={500} height={300} data={data.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="#8884d8" />
                </LineChart>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography variant="body1" color="textSecondary">
                    No user growth data available
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Success Rates */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Treatment Success Rates
              </Typography>
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography variant="body1" color="textSecondary">
                  Treatment success data not available
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Future Chart Placeholder */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Platform Usage
              </Typography>
              <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                <Typography variant="body1" color="textSecondary">
                  Platform usage metrics coming soon
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Activity Logs Section */}
        <Grid container>
          <Grid item xs={12}>
            <ActivityLogs />
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}