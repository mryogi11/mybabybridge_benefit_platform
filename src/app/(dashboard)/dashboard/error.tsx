'use client';

import { useEffect } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 200px)',
        p: 3,
      }}
    >
      <Alert severity="error" sx={{ mb: 4, width: '100%', maxWidth: 600 }}>
        <Typography variant="h6" component="div" gutterBottom>
          Something went wrong!
        </Typography>
        <Typography variant="body1" gutterBottom>
          {error.message || 'An unexpected error occurred while loading the dashboard.'}
        </Typography>
        <Typography variant="caption" component="pre" sx={{ mt: 2, overflowX: 'auto' }}>
          Error ID: {error.digest}
        </Typography>
      </Alert>

      <Button
        variant="contained"
        color="primary"
        onClick={() => reset()}
        sx={{ mt: 2 }}
      >
        Try again
      </Button>

      <Button
        variant="outlined"
        color="secondary"
        onClick={() => window.location.href = '/'}
        sx={{ mt: 2 }}
      >
        Return to Home
      </Button>
    </Box>
  );
} 