'use client';

import { Box, CircularProgress, Typography } from '@mui/material';

export default function DashboardLoading() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 200px)',
      }}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 4 }}>
        Loading Dashboard...
      </Typography>
    </Box>
  );
} 