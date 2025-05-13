import React from 'react';
import { Box, CircularProgress } from '@mui/material';

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 200px)', // Adjust height as needed
      }}
    >
      <CircularProgress />
    </Box>
  );
} 