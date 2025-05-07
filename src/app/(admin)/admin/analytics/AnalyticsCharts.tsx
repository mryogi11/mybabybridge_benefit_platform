'use client'; // This component needs to be a client component

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  LineChart,
  PieChart,
  ChartsXAxis,
  ChartsYAxis,
  ChartsTooltip,
  ChartsLegend,
  ChartsGrid,
} from '@mui/x-charts';
import { PieValueType } from '@mui/x-charts';
import type { Enums } from '@/types/supabase'; // Import Enums if needed for prop types

// Define the expected shape of the initial data prop
interface AnalyticsData {
  userGrowth: { month: string; users: number }[];
  packageStatusCounts: { status: Enums<"package_status">, count: number }[];
  kpis: {
    totalPatients: number;
    newUsersThisMonth: number;
    activePackages: number;
    completedPackages: number;
  };
}

// Define the props for the client component
interface AnalyticsChartsProps {
  initialData: AnalyticsData | null;
  fetchError: string | null;
  kpis: {
    totalPatients: number;
    newUsersThisMonth: number;
    activePackages: number;
    completedPackages: number;
  };
}

// Import KPI Card and Icons
import KPICard from './KPICard';
import PeopleIcon from '@mui/icons-material/People';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// Client component to render charts
export default function AnalyticsCharts({ initialData, fetchError }: AnalyticsChartsProps) {
  // Use state to hold the data - includes KPIs now
  const [data, setData] = useState<AnalyticsData | null>(initialData);
  const [error, setError] = useState<string | null>(fetchError);

  // --- Mock Data Generation (Moved here for potential fallback) ---
  const generateMonthlyData = (key: 'revenue' | 'users'): { month: string; revenue?: number; users?: number }[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIndex = new Date().getMonth();
    return months.slice(0, currentMonthIndex + 1).map((month, index) => {
      const value = Math.floor(Math.random() * (key === 'revenue' ? 5000 : 50) + (key === 'revenue' ? 1000 : 10) * (index + 1));
      if (key === 'revenue') {
          return { month, revenue: value };
      } else {
          return { month, users: value };
      }
    });
  };

  const generatePieData = (labels: string[]): PieValueType[] => {
      return labels.map((label, index) => ({
          id: index,
          value: Math.floor(Math.random() * 100) + 20,
          label: label,
      }));
  };

  // --- Loading/Error Handling (Simplified as initial load happens on server) ---
  // We primarily rely on the initialData and fetchError props.
  // A full client-side loading state might be needed if we add client-side re-fetching.

  if (fetchError && !initialData) {
    // If server fetch failed completely and provided no fallback data
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography variant="h6" color="error" gutterBottom>Error Loading Analytics</Typography>
        <Typography color="error">{fetchError}</Typography>
        <Typography sx={{mt: 2}}>Please check server logs or try refreshing.</Typography>
      </Box>
    );
  }

  if (!data) {
    // Should ideally not happen if server provides initialData or fallback
    // Could show a loading spinner if we expect client-side updates
    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          {/* <CircularProgress /> */}
          <Typography>No analytics data available.</Typography>
        </Box>
    );
  }

  // --- Map packageStatusCounts to PieValueType for the chart ---
  // Define the labels based on the possible statuses received from the server
  const packageStatusLabels: Record<Enums<"package_status">, string> = {
    active: 'Active',
    completed: 'Completed',
    expired: 'Expired',
    purchased: 'Purchased',
    // Add mappings for any other statuses you might receive
  };

  const successRatesChartData: PieValueType[] = data.packageStatusCounts
      .map((item, index) => ({
          id: index,
          value: item.count,
          label: packageStatusLabels[item.status] || item.status, // Use defined label or status itself
      }));


  // --- Render KPIs and Charts ---
  return (
    <>
      {fetchError && (
           <Typography color="error" sx={{ mb: 2 }}>
               Warning: Could not load all live data. Displaying fallback or partial data. Error: {fetchError}
           </Typography>
       )}

      {/* KPI Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total Patients"
            value={data?.kpis?.totalPatients}
            icon={<PeopleIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="New Users (This Month)"
            value={data?.kpis?.newUsersThisMonth}
            icon={<NewReleasesIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Active Packages"
            value={data?.kpis?.activePackages}
            icon={<PlayCircleOutlineIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Completed Packages"
            value={data?.kpis?.completedPackages}
            icon={<CheckCircleOutlineIcon />}
            color="primary"
          />
        </Grid>
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={4}>
          {/* User Growth Chart */} 
          <Grid item xs={12}>
             <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>User Growth</Typography>
               {data.userGrowth.length > 0 ? (
               <Box sx={{ width: '100%', flexGrow: 1 }}>
                 <LineChart
                   dataset={data.userGrowth}
                   series={[
                     { dataKey: 'users', label: 'New Users', color: '#82ca9d' },
                   ]}
                   xAxis={[{ scaleType: 'band', dataKey: 'month' }]}
                   margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                   grid={{ vertical: true, horizontal: true }}
                 >
                    <ChartsGrid strokeDasharray="3 3" />
                    <ChartsXAxis />
                    <ChartsYAxis />
                    <ChartsTooltip />
                    <ChartsLegend />
                 </LineChart>
                </Box>
              ) : (
                 <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                   <Typography variant="body1" color="textSecondary">
                     (No user growth data available)
                   </Typography>
                 </Box>
               )}
            </Paper>
          </Grid>

          {/* Package Status Chart */} 
           <Grid item xs={12}>
             <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
               <Typography variant="h6" gutterBottom>Patient Package Status</Typography>
               {successRatesChartData.length > 0 ? (
               <Box sx={{ width: '100%', flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                 <PieChart
                   series={[
                     {
                       data: successRatesChartData, // Use the mapped data
                       outerRadius: 120,
                       highlightScope: { faded: 'global', highlighted: 'item' },
                       faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
                     },
                   ]}
                   margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
                 >
                   <ChartsTooltip />
                   <ChartsLegend />
                 </PieChart>
                 </Box>
               ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography variant="body1" color="textSecondary">
                        (No patient package status data available)
                    </Typography>
                  </Box>
               )}
             </Paper>
           </Grid>
      </Grid>
    </>
  );
} 