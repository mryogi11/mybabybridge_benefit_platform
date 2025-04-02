'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress,
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { TreatmentPlan } from '@/types';

interface TreatmentPlanCardProps {
  plan: TreatmentPlan;
  onEdit?: () => void;
  onDiscontinue?: () => void;
  onComplete?: () => void;
}

export default function TreatmentPlanCard({
  plan,
  onEdit,
  onDiscontinue,
  onComplete,
}: TreatmentPlanCardProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getStatusColor = (status: TreatmentPlan['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'active':
        return 'primary';
      case 'discontinued':
        return 'error';
      default:
        return 'default';
    }
  };

  const calculateProgress = () => {
    if (!plan.milestones?.length) return 0;
    const completedMilestones = plan.milestones.filter(m => m.status === 'completed').length;
    return (completedMilestones / plan.milestones.length) * 100;
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {plan.type}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Provider: Dr. {plan.provider?.first_name} {plan.provider?.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Start Date: {format(new Date(plan.start_date), 'MMMM d, yyyy')}
            </Typography>
            {plan.end_date && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                End Date: {format(new Date(plan.end_date), 'MMMM d, yyyy')}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
              color={getStatusColor(plan.status)}
              size="small"
            />
            <IconButton size="small" onClick={handleClick}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          {plan.description}
        </Typography>

        {plan.milestones && plan.milestones.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(calculateProgress())}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={calculateProgress()}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          {plan.status === 'active' && (
            <>
              <MenuItem onClick={() => { handleClose(); onEdit?.(); }}>
                Edit
              </MenuItem>
              <MenuItem onClick={() => { handleClose(); onDiscontinue?.(); }}>
                Discontinue
              </MenuItem>
              <MenuItem onClick={() => { handleClose(); onComplete?.(); }}>
                Mark as Completed
              </MenuItem>
            </>
          )}
        </Menu>
      </CardContent>
    </Card>
  );
} 