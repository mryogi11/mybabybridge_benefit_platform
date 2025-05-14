'use client';

import React, { useEffect, useState } from 'react';
import {
  Grid,
  Typography,
  Box,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  MedicalServices as MedicalServicesIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { supabase } from '@/lib/supabase/client';

import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';

// Import the new widget
import DashboardWidget from '@/components/admin/DashboardWidget';

interface DashboardStats {
  totalUsers: number;
  totalPackages: number;
  totalRevenue: number;
}

// Interface for monthly chart data
interface MonthlyData {
  month: string;
  users: number;
  packages: number;
  [key: string]: string | number;
}

// Helper function to get month name from month index (0-11)
const getMonthName = (monthIndex: number) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex];
};

// Helper function to process raw timestamps into monthly counts
const processMonthlyChartData = (users: { created_at: string }[], packages: { created_at: string }[], monthsCount: number): MonthlyData[] => {
  const now = new Date();
  const monthlyCounts: { [key: string]: { users: number; packages: number } } = {};
  const monthLabels: string[] = [];

  // Initialize counts for the last `monthsCount` months
  for (let i = monthsCount - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const monthName = getMonthName(date.getMonth());
    monthlyCounts[monthKey] = { users: 0, packages: 0 };
    monthLabels.push(monthName);
  }

  // Process users
  users.forEach(user => {
    const createdAt = new Date(user.created_at);
    const monthKey = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    if (monthlyCounts[monthKey]) {
      monthlyCounts[monthKey].users += 1;
    }
  });

  // Process packages (assuming packages have created_at)
  packages.forEach(pkg => {
    const createdAt = new Date(pkg.created_at);
    const monthKey = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    if (monthlyCounts[monthKey]) {
      monthlyCounts[monthKey].packages += 1;
    }
  });

  // Format for chart
  return monthLabels.map((monthName, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1 - index), 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      return {
          month: monthName,
          users: monthlyCounts[monthKey]?.users || 0,
          packages: monthlyCounts[monthKey]?.packages || 0,
      };
  });
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPackages: 0,
    totalRevenue: 0,
  });
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const monthsToFetch = 6;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsToFetch);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      const startDateString = startDate.toISOString();

      // --- Fetch Stats Card Data (keep existing) --- 
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { count: packagesCount } = await supabase
        .from('packages')
        .select('*', { count: 'exact', head: true });

      // Fetch total revenue (Example: Sum of all package prices)
      const { data: packagePrices, error: priceError } = await supabase
        .from('packages')
        .select('monthly_cost'); // Use monthly_cost instead of price
      const totalRevenue = packagePrices?.reduce((sum, pkg) => sum + (pkg.monthly_cost || 0), 0) || 0; // Use monthly_cost

      setStats({
        totalUsers: usersCount || 0,
        totalPackages: packagesCount || 0,
        totalRevenue,
      });

      // --- Fetch Bar Chart Data (keep existing) ---
      const { data: recentUsers, error: usersError } = await supabase
          .from('users')
          .select('created_at')
          .gte('created_at', startDateString);
      const { data: recentPackages, error: packagesError } = await supabase
          .from('packages')
          .select('created_at') 
          .gte('created_at', startDateString);

      if (usersError) throw usersError;
      if (packagesError) console.warn("Error fetching package creation dates...", packagesError);

      const processedBarData = processMonthlyChartData(recentUsers || [], recentPackages || [], monthsToFetch);
      setMonthlyChartData(processedBarData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set empty chart data on error
      setMonthlyChartData(processMonthlyChartData([], [], 6));
    } finally {
      setLoading(false);
    }
  };

  // Define stat data with theme color keys instead of hex
  const statCardsData = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <PeopleIcon sx={{ fontSize: 32 }} />,
      color: 'primary', // Use theme key
    },
    {
      title: 'Total Packages',
      value: stats.totalPackages,
      icon: <ShoppingCartIcon sx={{ fontSize: 32 }} />,
      color: 'success', // Use theme key
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: <TrendingUpIcon sx={{ fontSize: 32 }} />,
      color: 'secondary', // Use theme key (maps to our soft green)
    },
  ];

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      {/* <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Dashboard Overview
      </Typography> */}
      {/* Statistics Grid - Now uses DashboardWidget */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCardsData.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.title}>
            {/* Use the new DashboardWidget component */}
            <DashboardWidget 
              title={item.title}
              value={item.value}
              icon={item.icon}
              color={item.color}
            />
          </Grid>
        ))}
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Bar Chart - Now uses dynamic data */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Users & Packages (Last 6 Months)
            </Typography>
            {monthlyChartData.length > 0 ? (
                <BarChart
                  dataset={monthlyChartData} // Use state data
                  xAxis={[{ scaleType: 'band', dataKey: 'month' }]}
                  series={[
                    { dataKey: 'users', label: 'New Users', color: '#1976d2' },
                    { dataKey: 'packages', label: 'Packages Added', color: '#2e7d32' }, // Renamed label slightly
                  ]}
                  height={300}
                  margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
                />
            ) : (
                 <Typography sx={{ textAlign: 'center', p: 4 }}>No data available for chart.</Typography>
            )}
          </Paper>
        </Grid>

        {/* Line Chart - Now uses dynamic data */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Treatments Started (Last 6 Months)
            </Typography>
            {/*
            {treatmentTrendData.months.length > 0 && treatmentTrendData.counts.length > 0 ? (
                <LineChart
                  xAxis={[{ 
                      scaleType: 'point', 
                      data: treatmentTrendData.months 
                  }]}
                  series={[
                    {
                      data: treatmentTrendData.counts,
                      label: 'New Treatments',
                      color: '#ed6c02',
                      // Optional: Add area fill, markers etc.
                      // area: true, 
                      // showMark: false,
                    },
                  ]}
                  height={300} // Consistent height
                  margin={{ top: 10, bottom: 30, left: 40, right: 10 }} 
                />
            ) : (
                <Typography sx={{ textAlign: 'center', p: 4 }}>No data available for chart.</Typography>
            )}
            */}
             <Paper sx={{ p: 2, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                    Treatment trends chart placeholder.
                </Typography>
            </Paper>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 