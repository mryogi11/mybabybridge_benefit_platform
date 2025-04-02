'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Divider,
  Chip,
  Paper,
  Button,
  CircularProgress,
  Card,
  FormControl,
  FormControlLabel,
  Switch,
  Stack,
} from '@mui/material';
import {
  Notifications,
  CalendarMonth,
  CheckCircle,
  NotificationsActive,
  Delete,
  Gavel,
  MedicalServices,
  Settings,
  Star,
  Flag,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { NotificationType } from '@/types';

interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  appointment_id?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    treatmentUpdates: true,
    systemAnnouncements: true,
  });

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Get the current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error fetching user:', userError);
          setError('Error fetching user data. Please try again later.');
          setLoading(false);
          return;
        }
        
        if (!userData.user) {
          console.error('No user data available');
          setError('User data not available. Try refreshing the page.');
          setLoading(false);
          return;
        }

        // Use mock notifications since the table likely doesn't exist yet
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Remove artificial delay, render immediately
        const mockNotifications: Notification[] = [
          {
            id: '1',
            user_id: userData.user.id,
            type: 'appointment_reminder',
            title: 'Upcoming Appointment',
            message: 'Reminder: You have an appointment with Dr. Jane Smith tomorrow at 10:00 AM.',
            appointment_id: '123',
            is_read: false,
            created_at: oneHourAgo
          },
          {
            id: '2',
            user_id: userData.user.id,
            type: 'milestone_completed',
            title: 'Milestone Completed',
            message: 'Congratulations! Your child has completed the "Basic Communication Skills" milestone.',
            is_read: false,
            created_at: oneDayAgo
          },
          {
            id: '3',
            user_id: userData.user.id,
            type: 'appointment_scheduled',
            title: 'New Appointment Scheduled',
            message: 'Your appointment with Dr. Robert Johnson has been scheduled for next Monday at 2:00 PM.',
            appointment_id: '124',
            is_read: true,
            created_at: threeDaysAgo
          },
          {
            id: '4',
            user_id: userData.user.id,
            type: 'appointment_cancelled',
            title: 'Appointment Cancelled',
            message: 'Your appointment scheduled for last Friday has been cancelled. Please reschedule at your convenience.',
            appointment_id: '125',
            is_read: true,
            created_at: oneWeekAgo
          }
        ];

        setNotifications(mockNotifications);
        setLoading(false);
      } catch (err) {
        console.error('Error in fetchNotifications:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === id ? { ...notification, is_read: true } : notification
      )
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.filter(notification => notification.id !== id)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification => ({ ...notification, is_read: true }))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'appointment_scheduled':
        return <CalendarMonth color="primary" />;
      case 'appointment_reminder':
        return <NotificationsActive color="warning" />;
      case 'appointment_cancelled':
        return <Flag color="error" />;
      case 'appointment_completed':
        return <CheckCircle color="success" />;
      case 'milestone_completed':
        return <Star color="secondary" />;
      default:
        return <Notifications color="info" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  const handlePreferenceChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPreferences({ ...preferences, [name]: event.target.checked });
  };

  const savePreferences = () => {
    console.log('Preferences saved:', preferences);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Notifications
        </Typography>
        <Paper sx={{ p: 3, bgcolor: '#fff8f8' }}>
          <Typography color="error">{error}</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        Notifications
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Box sx={{ flex: 3 }}>
          <Paper sx={{ p: 0, mb: 3 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Recent Notifications</Typography>
              <Box>
                {notifications.length > 0 && (
                  <>
                    <Button 
                      size="small" 
                      onClick={markAllAsRead}
                      sx={{ mr: 1 }}
                    >
                      Mark all as read
                    </Button>
                    <Button 
                      size="small" 
                      color="error" 
                      onClick={clearAllNotifications}
                    >
                      Clear all
                    </Button>
                  </>
                )}
              </Box>
            </Box>

            {notifications.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Notifications sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No notifications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You don't have any notifications at the moment.
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {notifications.map((notification) => (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        bgcolor: notification.is_read ? 'inherit' : 'rgba(0, 0, 0, 0.04)',
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          bgcolor: 'rgba(0, 0, 0, 0.06)',
                        },
                      }}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Delete />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>{getNotificationIcon(notification.type)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight={notification.is_read ? 'normal' : 'bold'}>
                              {notification.title}
                            </Typography>
                            {!notification.is_read && (
                              <Chip 
                                label="New" 
                                size="small" 
                                color="primary" 
                                sx={{ height: 20 }} 
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <React.Fragment>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                              display="block"
                              sx={{ mt: 0.5, mb: 1 }}
                            >
                              {notification.message}
                            </Typography>
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                            >
                              {getTimeAgo(notification.created_at)}
                            </Typography>
                            {!notification.is_read && (
                              <Button
                                size="small"
                                onClick={() => markAsRead(notification.id)}
                                sx={{ ml: 2 }}
                              >
                                Mark as read
                              </Button>
                            )}
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Box>

        <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 250 } }}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Settings sx={{ mr: 1 }} />
              <Typography variant="h6">Notification Settings</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <FormControl component="fieldset">
              <Stack spacing={1}>
                <Typography variant="subtitle2" gutterBottom>
                  Delivery Methods
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.emailNotifications}
                      onChange={handlePreferenceChange('emailNotifications')}
                    />
                  }
                  label="Email Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.smsNotifications}
                      onChange={handlePreferenceChange('smsNotifications')}
                    />
                  }
                  label="SMS Notifications"
                />

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Notification Types
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.appointmentReminders}
                      onChange={handlePreferenceChange('appointmentReminders')}
                    />
                  }
                  label="Appointment Reminders"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.treatmentUpdates}
                      onChange={handlePreferenceChange('treatmentUpdates')}
                    />
                  }
                  label="Treatment Updates"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.systemAnnouncements}
                      onChange={handlePreferenceChange('systemAnnouncements')}
                    />
                  }
                  label="System Announcements"
                />
              </Stack>
            </FormControl>
            <Button 
              variant="contained" 
              fullWidth 
              sx={{ mt: 3 }}
              onClick={savePreferences}
            >
              Save Preferences
            </Button>
          </Card>
        </Box>
      </Box>
    </Box>
  );
} 