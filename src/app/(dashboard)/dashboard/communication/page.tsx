'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon, // Keep if needed for icons
  Stack,
  TextField,
  IconButton,
  CircularProgress,
  LinearProgress,
  Avatar,
  Badge,
  Snackbar,
  Alert,
  Chip,
  Button, // Added for attachment button
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import AttachmentIcon from '@mui/icons-material/Attachment'; // For attachment button icon
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
// Assume types match the latest definitions
import { Provider, Message, MessageAttachment, User } from '@/types';
// Import Server Actions - **UPDATED**
import {
    getCommunicationContactsForPatient, // Renamed action
    getMessagesForThread,
    sendMessage,
    getMessageUploadSignedUrl,
    createMessageWithAttachment,
} from '@/actions/messageActions';

// Import the new interface from actions (or define locally if preferred)
// Ideally, this should live in @/types if used elsewhere
interface CommunicationContact {
    id: string; // Provider User ID
    participant: User | null;
    last_message: Message | null;
    unread_count: number;
    thread_id: string | null; // Null if no thread exists yet
}

export default function PatientCommunicationPage() {
  const [loadingContacts, setLoadingContacts] = useState(true); // Renamed state
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<CommunicationContact[]>([]); // Renamed state, updated type
  const [selectedContact, setSelectedContact] = useState<CommunicationContact | null>(null); // Renamed state, updated type
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, startSendingTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ref for the scrollable message container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Supabase Realtime subscription (keep for live updates)
  const [supabase] = useState(() => createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  useEffect(() => {
    fetchContacts(); // Call renamed function

    // Realtime Subscription Setup
    const channel = supabase.channel('patient-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // Filter more specifically if possible, e.g., based on receiver_id = user?.id
        },
        (payload) => {
            console.log('Realtime Message Received (Patient):', payload);
            // Refetch contacts to update unread counts and last messages
            fetchContacts();
            // If the new message belongs to the currently selected contact's thread, refetch messages
            // Check if selectedContact exists and if the payload's thread_id matches
            if (selectedContact && selectedContact.thread_id && payload.new.thread_id === selectedContact.thread_id) {
                fetchMessages(selectedContact.thread_id);
            } else if (selectedContact && !selectedContact.thread_id && payload.new.sender_id === selectedContact.id && payload.new.receiver_id === user?.id) {
                 // Handle case where first message arrives for a newly selected contact
                 fetchContacts(); // Refresh contacts to get the new thread_id etc.
            }
        }
      )
      .on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'message_attachments'
        },
        (payload) => {
            console.log('Realtime Attachment Received (Patient):', payload);
            // Refetch messages if an attachment for the current thread arrives
            if (selectedContact && selectedContact.thread_id) {
                 const messageId = payload.new.message_id;
                 // Check if the messageId belongs to the current thread (might need extra fetch or check messages state)
                 if (messages.some(m => m.id === messageId)) {
                      fetchMessages(selectedContact.thread_id);
                 }
            }
        }
       )
      .subscribe((status) => {
            console.log('Supabase Realtime Status (Patient):', status);
            if (status === 'SUBSCRIPTION_ERROR') {
                setError('Realtime connection failed. Live updates may not work.');
            }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]); // Removed selectedContact dependency

  useEffect(() => {
    if (selectedContact && selectedContact.thread_id) {
      fetchMessages(selectedContact.thread_id); // Fetch only if thread exists
    } else {
      setMessages([]); // Clear messages if no thread selected or no thread exists yet
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact]);

  // Renamed function
  const fetchContacts = async () => {
      setLoadingContacts(true);
      setError(null);
      // Call the new action
      const { success, data, error: fetchError } = await getCommunicationContactsForPatient();
      if (success && data) {
          setContacts(data);

          // --- Add default selection logic --- 
          if (!selectedContact && data.length > 0) {
              console.log("[PatientCommunicationPage] No contact selected, defaulting to first contact:", data[0]);
              setSelectedContact(data[0]); // Select the first contact
          }
          // --- End default selection logic ---
          
          // If a contact was previously selected, find its updated version
          else if (selectedContact) {
              const updatedSelected = data.find(c => c.id === selectedContact.id);
              if (updatedSelected) {
                   setSelectedContact(updatedSelected);
              } else {
                   // The previously selected contact is no longer available (e.g., appointment removed?)
                   setSelectedContact(null);
              }
          }
      } else {
          setError(fetchError || 'Failed to load provider contacts.');
          setContacts([]);
      }
      setLoadingContacts(false);
  };

  const fetchMessages = async (threadId: string) => {
    setLoadingMessages(true);
    setError(null);
    if (!user?.id) {
        setError('User not authenticated.');
        setLoadingMessages(false);
        return;
    }
    // Only fetch if threadId is valid
    if (!threadId) {
         console.log("Fetch messages skipped: No valid thread ID.");
         setMessages([]);
         setLoadingMessages(false);
         return;
    }

    try {
      const { success, data, error: fetchError } = await getMessagesForThread(threadId);
      if (success && data) {
        setMessages(data);
        // ADD Scroll logic here, after setting messages
        if (data.length > 0) {
            const timer = setTimeout(() => {
                console.log('[PatientCommunicationPage] setTimeout in fetchMessages scrolling container');
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                }
            }, 250); // Use 250ms delay
        }
      } else {
        throw new Error(fetchError || 'Failed to load messages');
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'Failed to load messages');
      setMessages([]);
    } finally {
       setLoadingMessages(false);
    }
  };

 const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const textContent = newMessage.trim();
    const file = selectedFile;

    if (!textContent && !file) return;
    // Ensure selectedContact and participant exist before proceeding
    if (!selectedContact || !selectedContact.participant?.id) {
        setError('Cannot send message: recipient not found.');
        return;
    }
    if (!user?.id) {
        setError('Cannot send message: user not authenticated.');
        return;
    }

    setError(null);
    // Define these variables here so they are accessible in both blocks
    const receiverId = selectedContact.participant.id;
    const currentContent = newMessage.trim(); // Use a different name to avoid conflict

    // --- Handle File Upload First (if applicable) ---
    if (file) {
        setIsUploading(true);
        try {
            // Added non-null assertions for file
            const signedUrlRes = await getMessageUploadSignedUrl(file!.name, file!.type);
            if (!signedUrlRes.success || !signedUrlRes.data) {
                throw new Error(signedUrlRes.error || 'Failed to get upload URL.');
            }
            const { signedUrl, path } = signedUrlRes.data;

            const uploadResponse = await fetch(signedUrl, { method: 'PUT', body: file });
            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.statusText}`);
            }
            const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/attachments/${path}`;

            startSendingTransition(async () => {
                const result = await createMessageWithAttachment({
                    receiverId: receiverId,
                    content: currentContent || null, // Use currentContent
                    // threadId removed - handled by action
                    attachmentUrl: publicUrl,
                    attachmentPath: path,
                    // Added non-null assertions for file
                    fileName: file!.name,
                    fileType: file!.type,
                    fileSize: file!.size,
                });
                if (!result.success || !result.data) {
                    setError(result.error || 'Failed to send message with attachment.');
                } else {
                    // Optimistic Update:
                    setMessages(prevMessages => [...prevMessages, result.data!]);
                    setNewMessage('');
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            });

        } catch (uploadError: any) {
            console.error('Error during file upload or message creation:', uploadError);
            setError(uploadError.message || 'Failed to upload file or send message.');
        } finally {
            setIsUploading(false);
        }
    }
    // --- Handle Text-Only Message ---
    // This block runs only if 'file' is null/undefined AND 'currentContent' is truthy
    else if (currentContent) {
        startSendingTransition(async () => {
            const result = await sendMessage({
                receiverId: receiverId,
                content: currentContent, // Use currentContent
                // threadId removed - handled by action
            });
            if (!result.success || !result.data) {
                setError(result.error || 'Failed to send message.');
            } else {
                // Optimistic Update:
                setMessages(prevMessages => [...prevMessages, result.data!]);
                setNewMessage('');
            }
        });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Limit file size (e.g., 5MB)
      if (file.size > 5 * 1024 * 1024) {
         setError('File size exceeds 5MB limit.');
         setSelectedFile(null);
         if(fileInputRef.current) fileInputRef.current.value = '';
         return;
      }
      setSelectedFile(file);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      handleSendMessage(event);
    }
  };

  // Use loadingContacts state
  if (loadingContacts) return <LinearProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Communicate with Providers
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ height: 'calc(100vh - 64px - 48px - 24px)' }}> {/* Adjust height calculation */}
        {/* Contact List */}
        <Paper sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0, p: 2, overflowY: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Providers
          </Typography>
          <List component="nav" disablePadding>
            {contacts.length > 0 ? (
                contacts.map((contact) => ( // Use contact variable
              <ListItemButton
                key={contact.id} // Use provider user ID as key
                selected={selectedContact?.id === contact.id}
                onClick={() => setSelectedContact(contact)} // Set selected contact
              >
                 <ListItemIcon> {/* Use ListItemIcon for avatar */}
                    <Avatar src={contact.participant?.avatar_url || undefined} sx={{ width: 32, height: 32 }}>
                        {/* Use initials if no avatar */}
                        {contact.participant?.first_name?.charAt(0)}
                        {contact.participant?.last_name?.charAt(0)}
                    </Avatar>
                 </ListItemIcon>
                <ListItemText
                    primary={`${contact.participant?.first_name || 'Unknown'} ${contact.participant?.last_name || 'Provider'}`}
                    // Optionally show last message preview
                    secondary={contact.last_message?.content ? (
                        <Typography variant="caption" noWrap color="text.secondary">
                            {contact.last_message.content}
                        </Typography>
                    ) : (
                         <Typography variant="caption" noWrap color="text.secondary">
                            {contact.participant?.role}
                        </Typography>
                    )}
                     primaryTypographyProps={{ fontWeight: contact.unread_count > 0 ? 'bold' : 'normal' }}
                />
                 {contact.unread_count > 0 && (
                    <Badge color="error" badgeContent={contact.unread_count} max={9} />
                 )}
              </ListItemButton>
            )))
             : (
                <Typography color="textSecondary" variant="body2" sx={{p: 2}}>
                    No providers available to message. Book an appointment first.
                </Typography>
             )
            }
          </List>
        </Paper>

        {/* Message Area */}
        <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}> {/* Use full height */}
          {selectedContact ? ( // Check selectedContact
            <>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">
                  {`${selectedContact.participant?.first_name || ''} ${selectedContact.participant?.last_name || ''}`}
                </Typography>
              </Box>

              {/* Message Display Area - Attach scrollContainerRef */}
              <Box ref={scrollContainerRef} sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                {loadingMessages ? (
                     <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                        <CircularProgress />
                    </Box>
                ) : !selectedContact.thread_id ? ( // Show prompt if no thread exists yet
                    <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 4 }}>
                       Start the conversation by sending a message.
                    </Typography>
                ) : messages.length > 0 ? (
                  <Stack spacing={2}>
                    {messages.map((message) => (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: message.sender_id === user?.id ? 'flex-end' : 'flex-start',
                        }}
                      >
                         <Paper
                              elevation={1}
                              sx={{
                                p: 1.5,
                                maxWidth: '75%',
                                bgcolor: message.sender_id === user?.id ? 'secondary.light' : 'grey.200',
                                color: message.sender_id === user?.id ? 'secondary.contrastText' : 'text.primary',
                                borderRadius: message.sender_id === user?.id ? '15px 15px 0 15px' : '15px 15px 15px 0',
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
                                                  borderColor: message.sender_id === user?.id ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.23)',
                                                  color: message.sender_id === user?.id ? 'white' : 'inherit',
                                                  mr: 1, mb: 1,
                                                  textTransform: 'none', // Prevent uppercase
                                                  fontSize: '0.8rem', // Smaller font
                                                  maxWidth: '100%', // Ensure button fits
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                  whiteSpace: 'nowrap',
                                                  display: 'inline-block', // For ellipsis
                                                }}
                                                title={att.file_name || 'Attachment'} // Show full name on hover
                                          >
                                              {att.file_name || 'Attachment'}
                                          </Button>
                                      ))}
                                  </Box>
                              )}
                               <Typography variant="caption" display="block" sx={{
                                   textAlign: message.sender_id === user?.id ? 'right' : 'left',
                                   mt: 0.5,
                                   color: message.sender_id === user?.id ? 'rgba(255,255,255,0.7)' : 'text.secondary'
                               }}>
                                 {format(new Date(message.created_at), 'p')} {/* Format string date */}
                              </Typography>
                            </Paper>
                      </Box>
                    ))}
                    <div ref={messagesEndRef} />
                  </Stack>
                ) : ( // Thread exists but no messages yet
                  <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 4 }}>
                     No messages with this provider yet.
                  </Typography>
                )}
              </Box>

              {/* Input Area */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <form onSubmit={handleSendMessage}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                       disabled={isSending || isUploading}
                       accept="image/*,application/pdf,.doc,.docx,.txt" // Specify acceptable file types
                    />
                     <IconButton
                        color="primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending || isUploading}
                        title="Attach file (Max 5MB)"
                     >
                         {isUploading ? <CircularProgress size={24} /> : <AttachFileIcon />}
                     </IconButton>
                     {selectedFile && (
                        <Chip
                            label={selectedFile.name}
                            size="small"
                            onDelete={() => {
                                setSelectedFile(null);
                                if(fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            sx={{ maxWidth: 150 }}
                            title={selectedFile.name}
                        />
                     )}
                    <TextField
                      fullWidth
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                       disabled={isSending || isUploading}
                       multiline
                       maxRows={4}
                       size="small"
                       sx={{ flexGrow: 1 }}
                    />
                    <IconButton
                        type="submit"
                        color="primary"
                        disabled={isSending || isUploading || (!newMessage.trim() && !selectedFile)}
                    >
                      {isSending ? <CircularProgress size={24} /> : <SendIcon />}
                    </IconButton>
                  </Stack>
                </form>
              </Box>
            </>
          ) : (
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, textAlign: 'center' }}>
              <Typography color="textSecondary">
                Select a provider from the list to start messaging
              </Typography>
            </Box>
          )}
        </Paper>
      </Stack>
       {/* Snackbar for Errors */}
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
