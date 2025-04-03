'use client';

import React from 'react';
import { Box, Paper, Typography, alpha, useTheme } from '@mui/material';

interface DashboardWidgetProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color?: string; // Optional color theme key (e.g., 'primary', 'success')
}

export default function DashboardWidget({
  title,
  value,
  icon,
  color = 'primary', // Default color theme key
}: DashboardWidgetProps) {
  const theme = useTheme();

  // Determine the color to use from the theme palette
  // Added checks for common theme keys, fallback to primary
  const themeColor =
    color === 'primary' ? theme.palette.primary.main :
    color === 'secondary' ? theme.palette.secondary.main :
    color === 'error' ? theme.palette.error.main :
    color === 'warning' ? theme.palette.warning.main :
    color === 'info' ? theme.palette.info.main :
    color === 'success' ? theme.palette.success.main :
    theme.palette.primary.main; // Default fallback

  return (
    // Use Paper with theme defaults (border, no shadow, border-radius)
    <Paper
      sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {value}
        </Typography>
      </Box>
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Use the color prop for background/icon color
          backgroundColor: alpha(themeColor, 0.12),
          color: themeColor, // Icon color
        }}
      >
        {React.cloneElement(icon, {
          sx: { fontSize: 32 }, // Adjust icon size within the circle
        })}
      </Box>
    </Paper>
  );
}