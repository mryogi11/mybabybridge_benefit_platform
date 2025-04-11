'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  Paper,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SearchIcon from '@mui/icons-material/Search';
import { format } from 'date-fns';
import { Message, MessageAttachment, User } from '@/types';
import AttachmentIcon from '@mui/icons-material/Attachment';

// Local interface for attachment handling
interface FileAttachment {
  file_url: string;
  file_name?: string;
}

export default function ProviderMessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [threads, setThreads] = useState<Array<{
    id: string;
    patient: User | null;
    last_message: Message | null;
    unread_count: number;
  }>>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchMessageThreads();
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          if (selectedThread) {
            fetchMessages(selectedThread);
          }
          fetchMessageThreads();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread);
    }
  }, [selectedThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching current user:', error);
      return;
    }

    setCurrentUser(data);
  };

  const fetchMessageThreads = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .rpc('get_message_threads_for_provider' as any, { p_provider_id: user.id });

    if (error) {
      console.error('Error fetching message threads:', error);
      return;
    }

    // The RPC function returns data already formatted correctly for the state
    setThreads((data || []) as any);
    setLoading(false);
  };

  const fetchMessages = async (threadId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        receiver:receiver_id (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        attachments:message_attachments (*)
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data as any);
    markMessagesAsRead(threadId);
  };

  const markMessagesAsRead = async (threadId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true } as any)
      .eq('thread_id', threadId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
      return;
    }

    fetchMessageThreads();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !fileInputRef.current?.files?.length) return;

    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      let messageId: string | null = null;

      // Create message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert(
          {
            sender_id: user.id,
            receiver_id: threads.find(t => t.id === selectedThread)?.patient?.id || null,
            content: newMessage.trim(),
            thread_id: selectedThread,
          } as any // Cast to any to bypass strict type check
        )
        .select()
        .single();

      if (messageError) throw messageError;
      messageId = message.id;

      // Handle file upload if present
      if (fileInputRef.current?.files?.length) {
        const file = fileInputRef.current.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${messageId}/${Math.random()}.${fileExt}`;
        const filePath = `message-attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        // Create attachment record
        const { error: attachmentError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: messageId,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
          });

        if (attachmentError) throw attachmentError;
      }

      setNewMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredThreads = threads.filter(thread =>
    (thread.patient?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    (thread.patient?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 64px)' }}>
      <Grid container spacing={3} sx={{ height: '100%' }}>
        {/* Message Threads List */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">
                  Messages
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <List>
                  {filteredThreads.map((thread) => (
                    <ListItem
                      key={thread.id}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: selectedThread === thread.id ? 'action.selected' : 'transparent',
                      }}
                      onClick={() => setSelectedThread(thread.id)}
                    >
                      <ListItemAvatar>
                        <Avatar src={thread.patient?.avatar_url}>
                          {thread.patient?.first_name?.[0]}
                          {thread.patient?.last_name?.[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${thread.patient?.first_name || ''} ${thread.patient?.last_name || ''}`}
                        secondary={
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {thread.last_message?.content}
                          </Typography>
                        }
                      />
                      {thread.unread_count > 0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {thread.unread_count}
                        </Typography>
                      )}
                    </ListItem>
                  ))}
                </List>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Chat Window */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
              {selectedThread ? (
                <Stack spacing={2}>
                  {messages.map((message) => (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        justifyContent: message.sender_id === currentUser?.id ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: '70%',
                          bgcolor: message.sender_id === currentUser?.id ? 'primary.light' : 'grey.100',
                          color: message.sender_id === currentUser?.id ? 'white' : 'text.primary',
                        }}
                      >
                        <Typography variant="body1">{message.content}</Typography>
                        {message.attachments?.map((attachment, index) => {
                          // Handle both string attachments and attachment objects
                          if (typeof attachment === 'string') {
                            return (
                              <Box key={index} sx={{ mt: 1 }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<AttachmentIcon />}
                                  href={attachment}
                                  target="_blank"
                                >
                                  Attachment {index + 1}
                                </Button>
                              </Box>
                            );
                          }
                          
                          // For attachment objects (MessageAttachment type)
                          if (attachment && typeof attachment === 'object') {
                            const fileAttachment = attachment as unknown as FileAttachment;
                            return (
                              <Box key={index} sx={{ mt: 1 }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<AttachmentIcon />}
                                  href={fileAttachment.file_url}
                                  target="_blank"
                                >
                                  {fileAttachment.file_name || `Attachment ${index + 1}`}
                                </Button>
                              </Box>
                            );
                          }
                          
                          return null;
                        })}
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 1,
                            color: message.sender_id === currentUser?.id ? 'white' : 'text.secondary',
                          }}
                        >
                          {format(new Date(message.created_at), 'h:mm a')}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </Stack>
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography color="text.secondary">
                    Select a conversation to start messaging
                  </Typography>
                </Box>
              )}
            </CardContent>
            {selectedThread && (
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={1}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleSendMessage}
                  />
                  <IconButton
                    color="primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                  >
                    <AttachFileIcon />
                  </IconButton>
                  <TextField
                    fullWidth
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={sending}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={sending || (!newMessage.trim() && !fileInputRef.current?.files?.length)}
                  >
                    {sending ? <CircularProgress size={24} /> : <SendIcon />}
                  </IconButton>
                </Stack>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 