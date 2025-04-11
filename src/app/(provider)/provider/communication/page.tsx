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
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Message, Patient } from '@/types';

interface PatientAppointment {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string;
  };
}

// Local interface to match API response
interface PatientItem {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
}

// Extend Message interface for local use
interface MessageWithAttachment extends Message {
  attachment_url?: string;
}

export default function ProviderCommunicationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);
  const [messages, setMessages] = useState<MessageWithAttachment[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPatients();
    return () => {
      // Cleanup subscription on unmount
      const channel = supabase.channel('messages');
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchMessages(selectedPatient.id);
      // Subscribe to new messages
      const channel = supabase.channel('messages');
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${selectedPatient.id},receiver_id=eq.${user?.id}`,
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
  }, [selectedPatient, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          patient:patient_id (
            id,
            first_name,
            last_name,
            date_of_birth
          )
        `)
        .eq('provider_id', user?.id ?? '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique patients
      const appointments = data as unknown as PatientAppointment[];
      const uniquePatients = appointments
        ?.map(item => item.patient)
        .filter((patient): patient is NonNullable<typeof patient> =>
          patient !== null &&
          patient !== undefined &&
          typeof patient?.id === 'string' &&
          typeof patient?.first_name === 'string' &&
          typeof patient?.last_name === 'string'
        )
        .filter((patient, index, self) =>
          index === self.findIndex((p) => p.id === patient.id)
        );
      setPatients(uniquePatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            first_name,
            last_name
          )
        `)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .eq('sender_id', patientId)
        .eq('receiver_id', patientId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as unknown as MessageWithAttachment[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !newMessage.trim()) return;

    try {
      let attachmentUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
      }

      const { error } = await supabase
        .from('messages')
        .insert(
          {
            sender_id: user?.id ?? '',
            receiver_id: selectedPatient.id,
            content: newMessage,
            attachment_url: attachmentUrl,
          },
        );

      if (error) throw error;

      setNewMessage('');
      setFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  if (loading) return <LinearProgress />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Patient Communication
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={3} sx={{ height: 'calc(100vh - 200px)' }}>
        {/* Patient List */}
        <Paper sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Patients
          </Typography>
          <List>
            {patients.map((patient) => (
              <ListItemButton
                key={patient.id}
                selected={selectedPatient?.id === patient.id}
                onClick={() => setSelectedPatient(patient)}
              >
                <ListItemAvatar>
                  <Avatar>
                    {patient.first_name[0]}
                    {patient.last_name[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${patient.first_name} ${patient.last_name}`}
                  secondary={new Date(patient.date_of_birth || '').toLocaleDateString()}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        {/* Messages */}
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedPatient ? (
            <>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  DOB: {new Date(selectedPatient.date_of_birth || '').toLocaleDateString()}
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
                      {message.attachment_url && (
                        <Button
                          href={message.attachment_url}
                          target="_blank"
                          size="small"
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
                    />
                    <input
                      type="file"
                      id="file-upload"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload">
                      <IconButton component="span" color="primary">
                        <AttachFileIcon />
                      </IconButton>
                    </label>
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
                Select a patient to start messaging
              </Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Box>
  );
} 