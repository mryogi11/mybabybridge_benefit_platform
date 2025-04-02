'use client';

import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Chip,
  Card, 
  CardContent,
  Grid
} from '@mui/material';
import { 
  MarkEmailUnread, 
  Chat, 
  Notifications, 
  People,
  Forum
} from '@mui/icons-material';

export default function MessagesPage() {
  return (
    <Box sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        Messages
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          {/* Left sidebar for contacts would go here */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Contacts
              </Typography>
              <Button 
                startIcon={<People />} 
                size="small" 
                variant="outlined"
                sx={{ opacity: 0.7 }}
                disabled
              >
                New Chat
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <List sx={{ opacity: 0.6 }}>
              {[
                { name: 'Dr. Jane Smith', role: 'Speech Therapist', time: '2 days ago' },
                { name: 'Dr. Robert Johnson', role: 'Physical Therapist', time: '5 days ago' },
                { name: 'Sarah Wilson', role: 'Office Administrator', time: '1 week ago' }
              ].map((contact, index) => (
                <ListItem key={index} button disabled>
                  <ListItemAvatar>
                    <Avatar>{contact.name.charAt(0)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={contact.name} 
                    secondary={contact.role} 
                  />
                  <Typography variant="caption" color="text.secondary">
                    {contact.time}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          {/* Feature coming soon message */}
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4, textAlign: 'center' }}>
            <Forum sx={{ fontSize: 80, color: 'primary.light', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Secure Messaging Coming Soon
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 600 }}>
              We're working on a secure messaging system that will allow you to communicate directly with your healthcare providers, ask questions, and receive updates about your treatment.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mb: 3 }}>
              <Chip icon={<MarkEmailUnread />} label="Provider Messages" color="primary" />
              <Chip icon={<Chat />} label="Direct Chat" color="secondary" />
              <Chip icon={<Notifications />} label="Notifications" color="info" />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Expected launch: Q2 2023
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 