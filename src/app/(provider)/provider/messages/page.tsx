'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
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
  Snackbar,
  Alert,
  Badge,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SearchIcon from '@mui/icons-material/Search';
import { format } from 'date-fns';
import { Message, MessageAttachment, User } from '@/types';
import AttachmentIcon from '@mui/icons-material/Attachment';
import {
    getCommunicationContactsForProvider,
    getMessagesForThread,
    sendMessage,
    getMessageUploadSignedUrl,
    createMessageWithAttachment,
} from '@/actions/messageActions';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

// Updated MessageThread interface from server action (adjust if needed)
interface CommunicationContact {
    id: string; // Participant User ID (as returned by action)
    participant: User | null; // The other person in the chat (patient or provider)
    last_message: Message | null;
    unread_count: number;
    thread_id: string | null; // Added thread_id to match action
}

export default function ProviderMessagesPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [threads, setThreads] = useState<CommunicationContact[]>([]);
  const [selectedThread, setSelectedThread] = useState<CommunicationContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, startSendingTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Supabase Realtime subscription (keep for live updates)
  const [supabase] = useState(() => createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  useEffect(() => {
    fetchMessageThreads();

    // Realtime Subscription Setup (Remains largely the same)
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('Realtime Message Received:', payload);
          fetchMessageThreads();
          if (selectedThread && payload.new.thread_id === selectedThread.thread_id) {
             fetchMessages(selectedThread.thread_id!);
          }
        }
      )
       // Also listen for changes to message_attachments if needed
       .on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'message_attachments'
        },
        (payload) => {
            console.log('Realtime Attachment Received:', payload);
            if (selectedThread) {
                fetchMessages(selectedThread.thread_id!);
            }
        }
       )
      .subscribe((status) => {
          console.log('Supabase Realtime Status:', status);
          if (status === 'SUBSCRIPTION_ERROR') {
              setError('Realtime connection failed. Live updates may not work.');
          }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    // Log when this effect runs and the value of selectedThread
    console.log('[ProviderMessagesPage] useEffect for selectedThread triggered:', selectedThread);
    if (selectedThread && selectedThread.thread_id) {
      console.log(`[ProviderMessagesPage] Calling fetchMessages for threadId: ${selectedThread.thread_id}`);
      fetchMessages(selectedThread.thread_id);
    } else {
      console.log('[ProviderMessagesPage] Clearing messages because selectedThread or thread_id is missing.');
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThread]); // Keep dependency as selectedThread

  const fetchMessageThreads = async () => {
    setLoadingThreads(true);
    setError(null);
    const { success, data, error } = await getCommunicationContactsForProvider();
    if (success && data) {
      setThreads(data);
      
      // --- Add default selection logic --- 
      // If threads loaded, there are threads, and none is currently selected
      if (!selectedThread && data.length > 0) {
           console.log("[ProviderMessagesPage] No thread selected, defaulting to first thread:", data[0]);
           setSelectedThread(data[0]); // Select the first thread
      }
      // --- End default selection logic ---
      
      // If a thread was previously selected, find its updated version
      else if (selectedThread) {
          const updatedSelected = data.find(c => c.thread_id === selectedThread.thread_id);
          if (updatedSelected) {
              setSelectedThread(updatedSelected);
          }
      }
    } else {
      setError(error || 'Failed to fetch message threads.');
      setThreads([]);
    }
    setLoadingThreads(false);
  };

  const fetchMessages = async (threadId: string) => {
    console.log(`[ProviderMessagesPage] fetchMessages called with threadId: ${threadId}`);
    setLoadingMessages(true);
    setError(null);
    const { success, data, error } = await getMessagesForThread(threadId);
    console.log('[ProviderMessagesPage] getMessagesForThread result:', { success, data, error });
    if (success && data) {
      setMessages(data);
      
      // Scroll container to bottom after setting messages
      if (data.length > 0) {
          const timer = setTimeout(() => {
              console.log('[ProviderMessagesPage] setTimeout in fetchMessages scrolling container');
              if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
              }
          }, 250); // Increased delay to 250ms
      }
    } else {
      setError(error || 'Failed to fetch messages.');
      setMessages([]);
    }
    setLoadingMessages(false);
  };

  const handleSendMessage = async () => {
    const textContent = newMessage.trim();
    const file = fileInputRef.current?.files?.[0];

    if (!textContent && !file) return;
    if (!selectedThread || !selectedThread.participant?.id || !selectedThread.thread_id) {
        setError('Cannot send message: recipient or thread ID not found.');
        return;
    }

    setError(null);
    const receiverId = selectedThread.participant.id;

    if (file) {
        setIsUploading(true);
        try {
            const signedUrlRes = await getMessageUploadSignedUrl(file.name, file.type);
            if (!signedUrlRes.success || !signedUrlRes.data) {
                throw new Error(signedUrlRes.error || 'Failed to get upload URL.');
            }

            const { signedUrl, path } = signedUrlRes.data;

            const uploadResponse = await fetch(signedUrl, {
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.statusText}`);
            }

            const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/attachments/${path}`;

            startSendingTransition(async () => {
                 const result = await createMessageWithAttachment({
                    receiverId: receiverId,
                    content: textContent || null,
                    attachmentUrl: publicUrl,
                    attachmentPath: path,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                });

                if (!result.success || !result.data) {
                     setError(result.error || 'Failed to send message with attachment.');
                } else {
                    setMessages(prev => [...prev, result.data!]);
                    setNewMessage('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            });

        } catch (uploadError: any) {
            console.error('Error during file upload or message creation:', uploadError);
            setError(uploadError.message || 'Failed to upload file or send message.');
        } finally {
            setIsUploading(false);
        }
    } else {
        // Handle text-only message
        startSendingTransition(async () => {
            const result = await sendMessage({
                receiverId: receiverId,
                content: textContent,
            });

            if (result.success && result.data) {
                setMessages(prev => [...prev, result.data!]);
                setNewMessage('');
            } else {
                setError(result.error || 'Failed to send message.');
            }
        });
    }
  };

  const filteredThreads = threads.filter(thread =>
    (thread.participant?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    (thread.participant?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  if (loadingThreads) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 64px - 48px)', display: 'flex', gap: 3 }}>
      <Paper sx={{ width: 300, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Conversations
            </Typography>
            <TextField
                fullWidth
                variant="outlined"
                size="small"
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
                sx={{ mb: 2 }}
            />
        </Box>
        <Divider />
        <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
            {filteredThreads.length > 0 ? (
            filteredThreads.map((thread) => (
                <ListItem
                button
                key={thread.thread_id ?? thread.id}
                onClick={() => {
                    console.log('[ProviderMessagesPage] ListItem clicked, setting selectedThread:', thread);
                    setSelectedThread(thread);
                }}
                selected={selectedThread?.thread_id === thread.thread_id}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                <ListItemAvatar>
                    <Avatar src={thread.participant?.avatar_url || undefined}>
                    {thread.participant?.first_name?.charAt(0)}
                    {thread.participant?.last_name?.charAt(0)}
                    </Avatar>
                </ListItemAvatar>
                <ListItemText
                    primary={`${thread.participant?.first_name || 'Unknown'} ${thread.participant?.last_name || 'User'}`}
                    secondary={
                        thread.last_message?.content
                        ? (thread.last_message.content.substring(0, 40) + (thread.last_message.content.length > 40 ? '...' : ''))
                        : (thread.last_message?.attachments && thread.last_message.attachments.length > 0 ? '[Attachment]' : 'No messages yet')
                    }
                    secondaryTypographyProps={{ noWrap: true }}
                />
                {thread.unread_count > 0 && (
                    <Badge color="error" badgeContent={thread.unread_count} />
                )}
                </ListItem>
            ))
            ) : (
            <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                No conversations found.
            </Typography>
            )}
        </List>
      </Paper>

      <Card sx={{ flexGrow: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
         <CardContent ref={scrollContainerRef} sx={{ flexGrow: 1, overflow: 'auto', p: 2, minHeight: 0 }}>
          {selectedThread ? (
            loadingMessages ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                    <CircularProgress />
                </Box>
            ) : messages.length > 0 ? (
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
                      elevation={1}
                      sx={{
                        p: 1.5,
                        maxWidth: '75%',
                        bgcolor: message.sender_id === currentUser?.id ? 'primary.light' : 'grey.200',
                        color: message.sender_id === currentUser?.id ? 'primary.contrastText' : 'text.primary',
                        borderRadius: message.sender_id === currentUser?.id ? '15px 15px 0 15px' : '15px 15px 15px 0',
                      }}
                    >
                       <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {message.content}
                      </Typography>
                      {message.attachments && message.attachments.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                              {message.attachments.map((att, idx) => (
                                  <Button
                                      key={idx}
                                      size="small"
                                      variant="outlined"
                                      startIcon={<AttachmentIcon />}
                                      href={att.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      sx={{
                                           borderColor: message.sender_id === currentUser?.id ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.23)',
                                           color: message.sender_id === currentUser?.id ? 'white' : 'inherit',
                                           mr: 1, mb: 1
                                      }}
                                  >
                                      {att.file_name || 'Attachment'}
                                  </Button>
                              ))}
                          </Box>
                      )}
                      <Typography variant="caption" display="block" sx={{ 
                           textAlign: message.sender_id === currentUser?.id ? 'right' : 'left',
                           mt: 0.5,
                           color: message.sender_id === currentUser?.id ? 'rgba(255,255,255,0.7)' : 'text.secondary'
                       }}>
                         {format(new Date(message.created_at), 'p')}
                      </Typography>
                    </Paper>
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Stack>
            ) : (
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 4 }}>
                No messages in this conversation yet.
              </Typography>
            )
          ) : (
            <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 4 }}>
              Select a conversation to view messages.
            </Typography>
          )}
        </CardContent>

        {selectedThread && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleSendMessage}
                disabled={isSending || isUploading}
              />
              <IconButton
                color="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || isUploading}
              >
                {isUploading ? <CircularProgress size={24} /> : <AttachFileIcon />}
              </IconButton>
              <TextField
                fullWidth
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                }}
                disabled={isSending || isUploading}
                multiline
                maxRows={4}
                size="small"
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={isSending || isUploading || (!newMessage.trim() && !fileInputRef.current?.files?.length)}
              >
                {isSending ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>
            </Stack>
          </Box>
        )}
      </Card>

      <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
              {error}
          </Alert>
      </Snackbar>
    </Box>
  );
} 