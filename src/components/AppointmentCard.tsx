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
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { Appointment } from '@/types';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
}

export default function AppointmentCard({
  appointment,
  onEdit,
  onCancel,
  onComplete,
}: AppointmentCardProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'scheduled':
        return 'primary';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {appointment.type}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Provider: Dr. {appointment.provider?.first_name} {appointment.provider?.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Date: {format(new Date(appointment.appointment_date), 'MMMM d, yyyy')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Specialization: {appointment.provider?.specialization}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              color={getStatusColor(appointment.status)}
              size="small"
            />
            <IconButton size="small" onClick={handleClick}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>

        {appointment.notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {appointment.notes}
          </Typography>
        )}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          {appointment.status === 'scheduled' && (
            <>
              <MenuItem onClick={() => { handleClose(); onEdit?.(); }}>
                Edit
              </MenuItem>
              <MenuItem onClick={() => { handleClose(); onCancel?.(); }}>
                Cancel
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