import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import { SvgIconComponent } from '@mui/icons-material'; // For icon type

interface KPICardProps {
  title: string;
  value: number | string | undefined | null;
  icon?: React.ReactElement<SvgIconComponent>; // Optional MUI Icon component instance
  isLoading?: boolean;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'; // Optional color theme
}

export default function KPICard({ title, value, icon, isLoading = false, color = 'primary' }: KPICardProps) {
  const theme = useTheme();

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          {icon && (
            <Box
              sx={{
                color: `${color}.main`,
                lineHeight: 0,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
        <Typography variant="h4" component="div">
          {isLoading ? <CircularProgress size={24} /> : (value ?? 'N/A')}
        </Typography>
        {/* Optional: Add comparison or trend indicator here */}
        {/* <Typography variant="caption" color="text.secondary">+10% from last month</Typography> */}
      </CardContent>
    </Card>
  );
} 