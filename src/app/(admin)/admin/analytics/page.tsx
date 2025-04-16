'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  CircularProgress,
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

interface AnalyticsData {
  revenueByMonth: { month: string; revenue: number }[];
  treatmentsByType: { name: string; value: number }[];
  userGrowth: { month: string; users: number }[];
  successRates: { name: string; value: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch revenue by month
        // const { data: revenueData, error: revenueError } = await supabase
        //   .from('payments')
        //   .select('amount, created_at')
        //   .order('created_at');

        // if (revenueError) throw revenueError;

        // const revenueByMonth = revenueData.reduce((acc: { month: string; revenue: number }[], payment) => {
        //   const month = new Date(payment.created_at).toLocaleString('default', { month: 'short' });
        //   const existingMonth = acc.find((item) => item.month === month);
          
        //   if (existingMonth) {
        //     existingMonth.revenue += Number(payment.amount);
        //   } else {
        //     acc.push({ month, revenue: Number(payment.amount) });
        //   }
          
        //   return acc;
        // }, []);
        const revenueByMonth: { month: string; revenue: number }[] = []; // Provide empty array as default

        // Fetch treatments by type
        const { data: treatmentsData, error: treatmentsError } = await supabase
          .from('treatment_plans')
          .select('title');

        if (treatmentsError) throw treatmentsError;

        const treatmentsByType = treatmentsData.reduce((acc: { name: string; value: number }[], treatment) => {
          const typeName = treatment.title || 'Unknown Type';
          const existingType = acc.find((item) => item.name === typeName);
          
          if (existingType) {
            existingType.value += 1;
          } else {
            acc.push({ name: typeName, value: 1 });
          }
          
          return acc;
        }, []);

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

        // Calculate success rates (mock data for now)
        const successRates = [
          { name: 'Successful', value: 75 },
          { name: 'In Progress', value: 15 },
          { name: 'Discontinued', value: 10 },
        ];

        setData({
          revenueByMonth, // Use the empty array
          treatmentsByType,
          userGrowth,
          successRates,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
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

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>No data available</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Analytics Dashboard
        </Typography>
        <Grid container spacing={4}>
          {/* Revenue Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, minHeight: 380 }}> {/* Adjust size if needed */}
              <Typography variant="h6" gutterBottom>Revenue by Month</Typography>
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography variant="body1" color="textSecondary">
                  (Payment data not available)
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Treatments by Type */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Treatments by Type
              </Typography>
              <PieChart width={500} height={300}>
                <Pie
                  data={data.treatmentsByType}
                  cx={250}
                  cy={150}
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.treatmentsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </Paper>
          </Grid>

          {/* User Growth */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                User Growth
              </Typography>
              <LineChart width={500} height={300} data={data.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#82ca9d" />
              </LineChart>
            </Paper>
          </Grid>

          {/* Success Rates */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Treatment Success Rates
              </Typography>
              <PieChart width={500} height={300}>
                <Pie
                  data={data.successRates}
                  cx={250}
                  cy={150}
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.successRates.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
} 