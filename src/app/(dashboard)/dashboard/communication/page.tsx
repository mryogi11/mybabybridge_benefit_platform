'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  LinearProgress,
  Alert,
  Stack,
  CircularProgress,
  Divider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  email: string;
}

interface ProviderAppointment {
  provider: Provider;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  attachments: string[];
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    role: string;
  };
  receiver?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export default function PatientCommunicationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchProviders();
    return () => {
      // Cleanup subscription on unmount
      const channel = supabase.channel('messages');
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      fetchMessages(selectedProvider.id);
      // Subscribe to new messages
      const channel = supabase.channel('messages');
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${selectedProvider.id},receiver_id=eq.${user?.id}`,
          },
          (payload) => {
            const newMessage = payload.new as Message;
            setMessages((prev) => [...prev, newMessage]);
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [selectedProvider, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          provider:provider_id (
            id,
            first_name,
            last_name,
            specialization
          )
        `)
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique providers
      const appointments = data as unknown as ProviderAppointment[];
      const uniqueProviders = appointments
        ?.map(item => item.provider)
        .filter((provider): provider is Provider => 
          provider !== null && 
          typeof provider.id === 'string' &&
          typeof provider.first_name === 'string' &&
          typeof provider.last_name === 'string' &&
          typeof provider.specialization === 'string'
        ) || [];
      setProviders(uniqueProviders);
    } catch (error) {
      console.error('Error fetching providers:', error);
      setError('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (providerId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (
            first_name,
            last_name,
            role
          ),
          receiver:profiles!receiver_id (
            first_name,
            last_name,
            role
          )
        `)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .eq('sender_id', providerId)
        .eq('receiver_id', providerId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !newMessage.trim()) return;

    try {
      let attachments: string[] = [];
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user?.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        attachments = [publicUrl];
      }

      const { error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user?.id,
            receiver_id: selectedProvider.id,
            content: newMessage,
            attachments,
          },
        ]);

      if (error) throw error;

      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage(event);
    }
  };

  if (loading) return <LinearProgress />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Provider Communication
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={3} sx={{ height: 'calc(100vh - 200px)' }}>
        {/* Provider List */}
        <Paper sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Providers
          </Typography>
          <List>
            {providers.map((provider) => (
              <ListItemButton
                key={provider.id}
                selected={selectedProvider?.id === provider.id}
                onClick={() => setSelectedProvider(provider)}
              >
                <ListItemAvatar>
                  <Avatar>
                    {provider.first_name[0]}
                    {provider.last_name[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${provider.first_name} ${provider.last_name}`}
                  secondary={provider.specialization}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        {/* Messages */}
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedProvider ? (
            <>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">
                  {selectedProvider.first_name} {selectedProvider.last_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedProvider.specialization}
                </Typography>
              </Box>

              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {messages.map((message) => (
                  <Box
                    key={message.id}
                    sx={{
                      display: 'flex',
                      justifyContent: message.sender_id === user?.id ? 'flex-end' : 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Paper
                      sx={{
                        p: 2,
                        maxWidth: '70%',
                        bgcolor: message.sender_id === user?.id ? 'primary.light' : 'grey.100',
                        color: message.sender_id === user?.id ? 'white' : 'text.primary',
                      }}
                    >
                      <Typography variant="body1">{message.content}</Typography>
                      {message.attachments && message.attachments.length > 0 && (
                        <Button
                          href={message.attachments[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          startIcon={<AttachFileIcon />}
                          sx={{ mt: 1 }}
                        >
                          View Attachment
                        </Button>
                      )}
                    </Paper>
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Box>

              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <form onSubmit={handleSendMessage}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <IconButton type="submit" color="primary">
                      <SendIcon />
                    </IconButton>
                  </Stack>
                </form>
              </Box>
            </>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="textSecondary">
                Select a provider to start messaging
              </Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Box>
  );
} 