'use client';

import React from 'react';
import { Box, Skeleton, Container, Paper, Grid, Card, CardContent, Typography } from '@mui/material';

type SkeletonLoaderProps = {
  type?: 'dashboard' | 'list' | 'form' | 'profile' | 'detail';
};

export default function SkeletonLoader({ type = 'dashboard' }: SkeletonLoaderProps) {
  const renderDashboardSkeleton = () => (
    <Box sx={{ width: '100%' }}>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width="30%" height={40} />
        <Skeleton variant="text" width="60%" height={24} sx={{ mt: 1 }} />
      </Box>

      {/* Stats cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[1, 2, 3, 4].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item}>
            <Card>
              <CardContent>
                <Skeleton variant="circular" width={40} height={40} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="60%" height={32} />
                <Skeleton variant="text" width="40%" height={24} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main content area */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="80%" height={20} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="60%" height={20} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderListSkeleton = () => (
    <Box sx={{ width: '100%' }}>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width="25%" height={40} />
        <Skeleton variant="text" width="50%" height={24} sx={{ mt: 1 }} />
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Skeleton variant="rectangular" width={180} height={40} />
        <Skeleton variant="rectangular" width={120} height={40} />
      </Box>

      {/* List items */}
      <Paper>
        {[1, 2, 3, 4, 5].map((item) => (
          <Box key={item} sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center' }}>
            <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" height={24} />
              <Skeleton variant="text" width="70%" height={20} />
            </Box>
            <Skeleton variant="rectangular" width={80} height={36} />
          </Box>
        ))}
      </Paper>
      
      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Skeleton variant="rectangular" width={300} height={36} />
      </Box>
    </Box>
  );

  const renderFormSkeleton = () => (
    <Box sx={{ width: '100%' }}>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width="25%" height={40} />
        <Skeleton variant="text" width="50%" height={24} sx={{ mt: 1 }} />
      </Box>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" width="100%" height={56} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" width="100%" height={56} />
          </Grid>
          <Grid item xs={12}>
            <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" width="100%" height={56} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" width="100%" height={56} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" width="100%" height={56} />
          </Grid>
          <Grid item xs={12}>
            <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" width="100%" height={120} />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Skeleton variant="rectangular" width={120} height={40} />
        </Box>
      </Paper>
    </Box>
  );

  const renderProfileSkeleton = () => (
    <Box sx={{ width: '100%' }}>
      {/* Header with avatar */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Skeleton variant="circular" width={80} height={80} sx={{ mr: 2 }} />
        <Box>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="text" width={120} height={24} />
        </Box>
      </Box>

      {/* Tab navigation */}
      <Skeleton variant="rectangular" width="100%" height={48} sx={{ mb: 3 }} />

      {/* Profile sections */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={56} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={56} />
              </Grid>
              <Grid item xs={12}>
                <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={56} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="80%" height={20} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderDetailSkeleton = () => (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Skeleton variant="text" width={250} height={40} />
          <Skeleton variant="text" width={150} height={24} sx={{ mt: 1 }} />
        </Box>
        <Skeleton variant="rectangular" width={100} height={40} />
      </Box>

      {/* Main content area */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="text" width="50%" height={32} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="90%" height={20} sx={{ mb: 2 }} />
            
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ my: 3 }} />
            
            <Skeleton variant="text" width="40%" height={28} sx={{ mt: 3, mb: 2 }} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="70%" height={20} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Skeleton variant="text" width="60%" height={28} sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="100%" height={20} />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="100%" height={20} />
              </Box>
              
              <Box>
                <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="100%" height={20} />
              </Box>
              
              <Skeleton variant="rectangular" width="100%" height={40} sx={{ mt: 3 }} />
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  switch (type) {
    case 'list':
      return renderListSkeleton();
    case 'form':
      return renderFormSkeleton();
    case 'profile':
      return renderProfileSkeleton();
    case 'detail':
      return renderDetailSkeleton();
    case 'dashboard':
    default:
      return renderDashboardSkeleton();
  }
} 