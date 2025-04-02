'use client';

import React, { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  MedicalServices as MedicalServicesIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { supabase } from '@/lib/supabase/client';

interface DashboardStats {
  totalUsers: number;
  totalPackages: number;
  activeTreatments: number;
  totalRevenue: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPackages: 0,
    activeTreatments: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch total users
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch total packages
      const { count: packagesCount } = await supabase
        .from('packages')
        .select('*', { count: 'exact', head: true });

      // Fetch active treatments
      const { count: treatmentsCount } = await supabase
        .from('treatments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      // Fetch total revenue
      const { data: packages } = await supabase
        .from('packages')
        .select('price');

      const totalRevenue = packages?.reduce((sum, pkg) => sum + Number(pkg.price), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalPackages: packagesCount || 0,
        activeTreatments: treatmentsCount || 0,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
    },
    {
      title: 'Total Packages',
      value: stats.totalPackages,
      icon: <ShoppingCartIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
    },
    {
      title: 'Active Treatments',
      value: stats.activeTreatments,
      icon: <MedicalServicesIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      color: '#9c27b0',
    },
  ];

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>
      <Grid container spacing={3}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ color: card.color, mr: 2 }}>
                    {card.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {card.title}
                  </Typography>
                </Box>
                <Typography variant="h4" component="div">
                  {card.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
} 