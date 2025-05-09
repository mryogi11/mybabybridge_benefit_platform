'use server';

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { db } from '@/lib/db';
// Import appointments table schema
import { messages, message_attachments, users, appointments, providers } from '@/lib/db/schema';
import { eq, and, or, desc, sql, ne, countDistinct, max } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
// Assuming these types need updates as per errors
import { Provider, Message, MessageAttachment, User } from '@/types';
import { createClient } from '@supabase/supabase-js';

// Supabase SSR client helper
const createSupabaseServerClient = () => {
  const cookieStorePromise = cookies(); // Assign the promise
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookieStorePromise; // Await the promise here
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookieStorePromise; // Await the promise here
            cookieStore.set({ name, value, ...options }); // No await needed here per docs
          } catch (error) {
            console.warn(`Supabase client failed to set cookie \`${name}\` in Server Action/Component. Middleware might be needed.`, error);
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = await cookieStorePromise; // Await the promise here
            cookieStore.set({ name, value: '', ...options }); // No await needed here per docs
          } catch (error) {
            console.warn(`Supabase client failed to remove cookie \`${name}\` in Server Action/Component. Middleware might be needed.`, error);
          }
        },
      },
    }
  );
};

// Helper to create Supabase service role client
const createSupabaseServiceRoleClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase URL or Service Role Key');
    }
    return createClient<Database>(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
};

// --- Types for Return Values ---
type ActionResponse<T> = Promise<{ success: boolean; data?: T; error?: string }>;

// Updated interface for the combined contact list
interface CommunicationContact {
    id: string; // Provider User ID
    participant: User | null;
    last_message: Message | null; // Null if no messages yet
    unread_count: number; // 0 if no messages yet
    thread_id: string | null; // Null if no thread exists yet
}

// --- Server Actions ---

// Renamed and refactored function
export async function getCommunicationContactsForPatient(): ActionResponse<CommunicationContact[]> {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'User not authenticated.' };
    }
    const userId = user.id;

    try {
        // Step 1: Find all distinct USER IDs of providers the user has appointments with
        const appointmentProvidersQuery = db
            .selectDistinct({ providerUserId: providers.user_id })
            .from(appointments)
            .innerJoin(providers, eq(appointments.provider_id, providers.id))
            .where(eq(appointments.patient_id, userId));
        const appointmentProviders = await appointmentProvidersQuery;
        const appointmentProviderUserIds = new Set(appointmentProviders.map(p => p.providerUserId));

        if (appointmentProviderUserIds.size === 0) {
            console.log(`[getCommContacts] User ${userId} has no appointment providers.`);
            return { success: true, data: [] }; // User has no appointments
        }
        const providerUserIdList = Array.from(appointmentProviderUserIds);
        console.log(`[getCommContacts] Found providers from appointments:`, providerUserIdList);

        // Step 2: Fetch details for ALL these appointment providers
        const providerDetailsList = await db.select({
            id: users.id,
            first_name: users.first_name,
            last_name: users.last_name,
            role: users.role,
            email: users.email,
            created_at: users.created_at,
            updated_at: users.updated_at,
        })
        .from(users)
        .where(sql`${users.id} IN ${providerUserIdList}`); // Use IN operator
        
        const providerDetailsMap = new Map<string, User>();
        providerDetailsList.forEach(p => {
             const typedParticipant: User = { // Map to User type (string dates)
                id: p.id,
                email: p.email,
                first_name: p.first_name ?? undefined,
                last_name: p.last_name ?? undefined,
                role: p.role,
                created_at: p.created_at.toISOString(),
                updated_at: p.updated_at.toISOString(),
             };
             providerDetailsMap.set(p.id, typedParticipant as User);
        });
        console.log(`[getCommContacts] Fetched provider details count:`, providerDetailsMap.size);

        // Step 3: Fetch ALL existing message threads involving the user
        // We need thread_id, participant_id, last_message, unread_count for each thread
        // This query might be complex with Drizzle, consider RPC or carefully crafted SQL
        // Simplified approach: Get all threads, then fetch last msg/unread count per thread

        // Find distinct threads and participants
        const distinctThreadsResult = await db.execute(sql`
            SELECT DISTINCT
                thread_id,
                CASE WHEN sender_id = ${userId} THEN receiver_id ELSE sender_id END AS participant_id
            FROM ${messages}
            WHERE sender_id = ${userId} OR receiver_id = ${userId}
        `);
        const allUserThreads: { thread_id: string; participant_id: string }[] = distinctThreadsResult.rows as any;
        console.log(`[getCommContacts] Found all user threads count:`, allUserThreads.length);

        // Create a map to store existing thread data keyed by participant ID
        const existingThreadsMap = new Map<string, { thread_id: string; last_message: Message | null; unread_count: number }>();

        // Fetch details for each existing thread
        const threadDetailPromises = allUserThreads.map(async (thread) => {
            const threadId = thread.thread_id;
            const participantId = thread.participant_id;

            // Fetch last message
            const [lastMessageResult] = await db.select({
                id: messages.id,
                sender_id: messages.sender_id,
                receiver_id: messages.receiver_id,
                content: messages.content,
                thread_id: messages.thread_id,
                is_read: messages.is_read,
                created_at: messages.created_at,
                updated_at: messages.updated_at,
                attachments: sql<(MessageAttachment[] | null)>`(SELECT json_agg(ma.*) FROM ${message_attachments} ma WHERE ma.message_id = ${messages.id})`
            })
            .from(messages)
            .where(eq(messages.thread_id, threadId))
            .orderBy(desc(messages.created_at))
            .limit(1);
            
            const typedLastMessage: Message | null = lastMessageResult ? {
                id: lastMessageResult.id,
                sender_id: lastMessageResult.sender_id,
                receiver_id: lastMessageResult.receiver_id,
                content: lastMessageResult.content ?? '',
                is_read: lastMessageResult.is_read,
                created_at: lastMessageResult.created_at.toISOString(),
                attachments: lastMessageResult.attachments || [],
                updated_at: lastMessageResult.updated_at.toISOString(),
                thread_id: lastMessageResult.thread_id,
            } : null;

            // Fetch unread count
            const [unreadCountResult] = await db.select({ value: countDistinct(messages.id) })
                 .from(messages)
                 .where(and(eq(messages.thread_id, threadId), eq(messages.receiver_id, userId), eq(messages.is_read, false)));
             const unreadCount = unreadCountResult?.value ?? 0;

             existingThreadsMap.set(participantId, {
                 thread_id: threadId,
                 last_message: typedLastMessage as Message | null,
                 unread_count: unreadCount
             });
        });
        await Promise.all(threadDetailPromises); // Wait for all thread details to be fetched
        console.log(`[getCommContacts] Fetched existing thread details count:`, existingThreadsMap.size);

        // Step 4: Construct the final contact list based on appointment providers
        const communicationContacts: CommunicationContact[] = providerUserIdList.map(providerId => {
            const participantDetails = providerDetailsMap.get(providerId);
            const existingThreadData = existingThreadsMap.get(providerId);

            return {
                id: providerId, // Use provider User ID as the key
                participant: participantDetails || null,
                last_message: existingThreadData?.last_message || null,
                unread_count: existingThreadData?.unread_count || 0,
                thread_id: existingThreadData?.thread_id || null,
            };
        });

        // Step 5: Sort the final list (e.g., by last message time, then alphabetically)
        communicationContacts.sort((a, b) => {
            const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
            const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
            if (timeB !== timeA) {
                return timeB - timeA; // Sort by most recent message first
            }
            // Secondary sort by name if no messages or same timestamp
            const nameA = `${a.participant?.first_name} ${a.participant?.last_name}`.toLowerCase();
            const nameB = `${b.participant?.first_name} ${b.participant?.last_name}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        console.log(`[getCommContacts] Final contacts count:`, communicationContacts.length);
        return { success: true, data: communicationContacts };

    } catch (error: any) {
        console.error('[Server Action Error] getCommunicationContactsForPatient:', error);
        return { success: false, error: error.message || 'Failed to fetch communication contacts.' };
    }
}

// NOTE: getMessageThreadsForUser is now replaced by getCommunicationContactsForPatient
// Make sure the frontend calls the new function.

// --- ADDING getMessagesForThread BACK --- 
export async function getMessagesForThread(threadId: string): ActionResponse<Message[]> {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log(`[getMessagesForThread] Called with threadId: ${threadId} for user: ${user?.id}`); // Log entry

    if (authError || !user) {
        console.log('[getMessagesForThread] User not authenticated.');
        return { success: false, error: 'User not authenticated.' };
    }

    if (!threadId) {
         console.log('[getMessagesForThread] Thread ID is required.');
         return { success: false, error: 'Thread ID is required.' };
    }

    try {
        // Fetch messages and include all needed fields from sender
        const fetchedMessagesRaw = await db
            .select({
                id: messages.id,
                sender_id: messages.sender_id,
                receiver_id: messages.receiver_id,
                content: messages.content,
                thread_id: messages.thread_id,
                is_read: messages.is_read,
                created_at: messages.created_at,
                updated_at: messages.updated_at,
                sender: { // Select all needed fields from joined user (sender)
                    id: users.id,
                    first_name: users.first_name,
                    last_name: users.last_name,
                    role: users.role,
                    email: users.email,
                    created_at: users.created_at,
                    updated_at: users.updated_at,
                },
                attachments: sql<(MessageAttachment[] | null)>`(SELECT json_agg(ma.*) FROM ${message_attachments} ma WHERE ma.message_id = ${messages.id})`,
            })
            .from(messages)
            .leftJoin(users, eq(messages.sender_id, users.id))
            .where(eq(messages.thread_id, threadId))
            .orderBy(messages.created_at);

        console.log(`[getMessagesForThread] Found ${fetchedMessagesRaw.length} messages raw for threadId: ${threadId}`); // Log count

        await markMessagesAsRead(threadId);

        // Map raw results to the Message type
        const typedMessages: Message[] = fetchedMessagesRaw.map(msg => ({
            id: msg.id,
            sender_id: msg.sender_id, // Keep as potentially null
            receiver_id: msg.receiver_id, // Keep as potentially null
            content: msg.content ?? '', // Handle null
            is_read: msg.is_read, // Include is_read
            created_at: msg.created_at.toISOString(),
            attachments: msg.attachments || [],
            sender: msg.sender ? { // Map sender details
                 id: msg.sender.id,
                 email: msg.sender.email,
                 first_name: msg.sender.first_name ?? undefined, // Handle null name
                 last_name: msg.sender.last_name ?? undefined, // Handle null name
                 role: msg.sender.role,
                 created_at: msg.sender.created_at.toISOString(),
                 updated_at: msg.sender.updated_at.toISOString(),
             } : undefined,
            // Add fields expected by Message type
            updated_at: msg.updated_at.toISOString(),
            thread_id: msg.thread_id,
        })) as Message[];

        console.log(`[getMessagesForThread] Returning ${typedMessages.length} typed messages for threadId: ${threadId}`); // Log final count
        return { success: true, data: typedMessages };

    } catch (error: any) {
        console.error('[Server Action Error] getMessagesForThread:', error);
        return { success: false, error: error.message || 'Failed to fetch messages.' };
    }
}
// --- END ADDING getMessagesForThread BACK ---

// Zod schemas need to be defined before they are used
const sendMessageSchema = z.object({
    receiverId: z.string().uuid('Invalid receiver ID'),
    content: z.string().trim().min(1, 'Message content cannot be empty'),
    // threadId is determined internally
});

// sendMessage function using the schema
export async function sendMessage(payload: z.infer<typeof sendMessageSchema>): ActionResponse<Message> {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'User not authenticated.' };
    }

    const validation = sendMessageSchema.safeParse(payload);
    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const { receiverId, content } = validation.data;

    try {
        const currentThreadId = [user.id, receiverId].sort().join('__');

        // Insert and return the new message
        const [newMessageRaw] = await db
            .insert(messages)
            .values({
                sender_id: user.id,
                receiver_id: receiverId,
                content: content,
                thread_id: currentThreadId,
                is_read: false,
            })
            .returning(); // Return all columns

        // Fetch sender details (current user in this case, but fetch for consistency)
        const [senderDetails] = await db.select({
            id: users.id,
            first_name: users.first_name,
            last_name: users.last_name,
            role: users.role,
            email: users.email,
            created_at: users.created_at,
            updated_at: users.updated_at,
        }).from(users).where(eq(users.id, user.id));

        revalidatePath('/provider/messages');
        revalidatePath('/dashboard/communication');

        // Map raw result to Message type, including sender
        const typedNewMessage: Message = {
             id: newMessageRaw.id,
             sender_id: newMessageRaw.sender_id,
             receiver_id: newMessageRaw.receiver_id,
             content: newMessageRaw.content ?? '',
             is_read: newMessageRaw.is_read,
             created_at: newMessageRaw.created_at.toISOString(),
             attachments: [],
             updated_at: newMessageRaw.updated_at.toISOString(),
             thread_id: newMessageRaw.thread_id,
             sender: senderDetails ? { // Include sender details
                 id: senderDetails.id,
                 email: senderDetails.email,
                 first_name: senderDetails.first_name ?? undefined,
                 last_name: senderDetails.last_name ?? undefined,
                 role: senderDetails.role,
                 created_at: senderDetails.created_at.toISOString(),
                 updated_at: senderDetails.updated_at.toISOString(),
             } : undefined,
        };

        return { success: true, data: typedNewMessage as Message };

    } catch (error: any) {
        console.error('[Server Action Error] sendMessage:', error);
        return { success: false, error: error.message || 'Failed to send message.' };
    }
}

const createMessageWithAttachmentSchema = z.object({
    receiverId: z.string().uuid('Invalid receiver ID'),
    content: z.string().trim().optional().nullable(),
    // threadId determined internally
    attachmentUrl: z.string().url('Invalid attachment URL'),
    attachmentPath: z.string().min(1, 'Attachment path is required'),
    fileName: z.string().min(1, 'File name is required'),
    fileType: z.string().min(1, 'File type is required'),
    fileSize: z.number().positive('File size must be positive'),
});

// createMessageWithAttachment function using the schema
export async function createMessageWithAttachment(payload: z.infer<typeof createMessageWithAttachmentSchema>): ActionResponse<Message> {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'User not authenticated.' };
    }

    const validation = createMessageWithAttachmentSchema.safeParse(payload);
    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const { receiverId, content, attachmentUrl, attachmentPath, fileName, fileType, fileSize } = validation.data;

    try {
        const currentThreadId = [user.id, receiverId].sort().join('__');

        // Use transaction to insert message and attachment
        const resultRaw = await db.transaction(async (tx) => {
            const [newMessage] = await tx
                .insert(messages)
                .values({
                    sender_id: user.id,
                    receiver_id: receiverId,
                    content: content || null,
                    thread_id: currentThreadId,
                    is_read: false,
                })
                .returning(); // Return all columns

            const [attachment] = await tx.insert(message_attachments).values({
                message_id: newMessage.id,
                file_url: attachmentUrl,
                file_name: fileName,
                file_type: fileType,
                file_size: fileSize,
            }).returning(); // Return attachment details

            // Fetch sender details (current user)
            const [senderDetails] = await tx.select({
                id: users.id,
                first_name: users.first_name,
                last_name: users.last_name,
                role: users.role,
                email: users.email,
                created_at: users.created_at,
                updated_at: users.updated_at,
            }).from(users).where(eq(users.id, user.id));

            return { newMessage, attachment, senderDetails }; // Return all needed data
        });

        revalidatePath('/provider/messages');
        revalidatePath('/dashboard/communication');

        // Map raw result to Message type, including sender and attachment
        const typedResult: Message = {
            id: resultRaw.newMessage.id,
            sender_id: resultRaw.newMessage.sender_id,
            receiver_id: resultRaw.newMessage.receiver_id,
            content: resultRaw.newMessage.content ?? '',
            is_read: resultRaw.newMessage.is_read,
            created_at: resultRaw.newMessage.created_at.toISOString(),
            attachments: resultRaw.attachment ? [{
                id: resultRaw.attachment.id,
                message_id: resultRaw.attachment.message_id,
                file_url: resultRaw.attachment.file_url,
                file_name: resultRaw.attachment.file_name,
                file_type: resultRaw.attachment.file_type,
                file_size: resultRaw.attachment.file_size,
                created_at: resultRaw.attachment.created_at.toISOString(),
            }] : [],
            updated_at: resultRaw.newMessage.updated_at.toISOString(),
            thread_id: resultRaw.newMessage.thread_id,
            sender: resultRaw.senderDetails ? { // Include sender details
                id: resultRaw.senderDetails.id,
                email: resultRaw.senderDetails.email,
                first_name: resultRaw.senderDetails.first_name ?? undefined,
                last_name: resultRaw.senderDetails.last_name ?? undefined,
                role: resultRaw.senderDetails.role,
                created_at: resultRaw.senderDetails.created_at.toISOString(),
                updated_at: resultRaw.senderDetails.updated_at.toISOString(),
            } : undefined,
        };

        return { success: true, data: typedResult as Message };

    } catch (error: any) {
        console.error('[Server Action Error] createMessageWithAttachment:', error);
        return { success: false, error: error.message || 'Failed to send message with attachment.' };
    }
}

export async function getMessageUploadSignedUrl(fileName: string, fileType: string): ActionResponse<{ signedUrl: string; path: string }> {
    const supabase = createSupabaseServiceRoleClient();
    const { data: { user }, error: authError } = await createSupabaseServerClient().auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'User not authenticated.' };
    }

    const filePath = `message-attachments/${user.id}/${Date.now()}-${fileName}`;

    try {
        const { data, error } = await supabase.storage
            .from('attachments') // Ensure 'attachments' bucket exists and has correct policies
            .createSignedUploadUrl(filePath);

        if (error) throw error;

        return { success: true, data: { signedUrl: data.signedUrl, path: data.path } };
    } catch (error: any) {
        console.error('[Server Action Error] getMessageUploadSignedUrl:', error);
        return { success: false, error: error.message || 'Failed to create signed URL.' };
    }
}

export async function markMessagesAsRead(threadId: string): ActionResponse<null> {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'User not authenticated.' };
    }

    if (!threadId) {
         return { success: false, error: 'Thread ID is required.' };
    }

    try {
        await db
            .update(messages)
            .set({ is_read: true, updated_at: new Date() })
            .where(
                and(
                    eq(messages.thread_id, threadId),
                    eq(messages.receiver_id, user.id), // Only mark messages received by the current user
                    eq(messages.is_read, false)
                )
            );

        // Revalidate paths where unread counts might be displayed
        revalidatePath('/provider/messages');
        revalidatePath('/dashboard/communication');

        return { success: true };

    } catch (error: any) {
        console.error('[Server Action Error] markMessagesAsRead:', error);
        return { success: false, error: error.message || 'Failed to mark messages as read.' };
    }
}

// --- NEW ACTION for Providers ---
export async function getCommunicationContactsForProvider(): ActionResponse<CommunicationContact[]> {
    const supabase = createSupabaseServerClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
        return { success: false, error: 'Provider not authenticated.' };
    }
    const providerAuthUserId = authUser.id;

    try {
        // Step 1: Get the provider's profile ID from the 'providers' table
        const providerProfile = await db.query.providers.findFirst({
            where: eq(providers.user_id, providerAuthUserId),
            columns: { id: true }
        });

        if (!providerProfile) {
            console.error(`[getCommContactsProvider] No provider profile found for auth user ID: ${providerAuthUserId}`);
            return { success: false, error: 'Provider profile not found.' };
        }
        const providerProfileId = providerProfile.id; // This is the ID from the providers table PK

        // Step 2: Fetch distinct patient USER IDs from appointments with this provider
        const appointmentPatientRecords = await db.selectDistinct({ patientUserId: appointments.patient_id })
            .from(appointments)
            .where(eq(appointments.provider_id, providerProfileId));
        
        const patientUserIdsFromAppointments = new Set(appointmentPatientRecords.map(r => r.patientUserId));
        console.log(`[getCommContactsProvider] Patients from appointments:`, Array.from(patientUserIdsFromAppointments));

        // Step 3: Fetch distinct patient USER IDs from existing messages with this provider
        const distinctMessagePatientRecords = await db.execute(sql`
            SELECT DISTINCT
                CASE
                    WHEN sender_id = ${providerAuthUserId} THEN receiver_id
                    ELSE sender_id
                END AS patient_user_id
            FROM ${messages}
            WHERE (sender_id = ${providerAuthUserId} OR receiver_id = ${providerAuthUserId})
              AND CASE WHEN sender_id = ${providerAuthUserId} THEN receiver_id ELSE sender_id END IS NOT NULL
        `);
        const patientUserIdsFromMessages = new Set((distinctMessagePatientRecords.rows as { patient_user_id: string }[]).map(r => r.patient_user_id));
        console.log(`[getCommContactsProvider] Patients from messages:`, Array.from(patientUserIdsFromMessages));

        // Step 4: Combine and de-duplicate all potential patient contact USER IDs
        const allPatientContactUserIds = new Set([...patientUserIdsFromAppointments, ...patientUserIdsFromMessages]);
        const allPatientContactUserIdsArray = Array.from(allPatientContactUserIds);

        if (allPatientContactUserIdsArray.length === 0) {
            console.log(`[getCommContactsProvider] No potential contacts found for provider ${providerAuthUserId}.`);
            return { success: true, data: [] };
        }
        console.log(`[getCommContactsProvider] All potential patient contacts (user IDs):`, allPatientContactUserIdsArray);

        // Step 5: Fetch user details for all these patient USER IDs
        const patientUserDetailsList = await db.select({
            id: users.id,
            first_name: users.first_name,
            last_name: users.last_name,
            role: users.role,
            email: users.email,
            created_at: users.created_at,
            updated_at: users.updated_at,
        })
        .from(users)
        .where(sql`${users.id} IN ${allPatientContactUserIdsArray}`);
        
        const patientDetailsMap = new Map<string, User>();
        patientUserDetailsList.forEach(p => {
            patientDetailsMap.set(p.id, {
                id: p.id,
                email: p.email,
                first_name: p.first_name ?? undefined,
                last_name: p.last_name ?? undefined,
                role: p.role,
                created_at: p.created_at.toISOString(),
                updated_at: p.updated_at.toISOString(),
            } as User);
        });
        console.log(`[getCommContactsProvider] Fetched patient details count:`, patientDetailsMap.size);

        // Step 6: Fetch thread details (last message, unread count) for threads between provider and each patient
        const existingThreadsMap = new Map<string, { thread_id: string; last_message: Message | null; unread_count: number }>();
        const threadDetailPromises = allPatientContactUserIdsArray.map(async (patientUserId) => {
            // Determine thread_id (consistent with sendMessage)
            const threadId = [providerAuthUserId, patientUserId].sort().join('__');

            const [lastMessageResult] = await db.select({
                id: messages.id, sender_id: messages.sender_id, receiver_id: messages.receiver_id,
                content: messages.content, thread_id: messages.thread_id, is_read: messages.is_read,
                created_at: messages.created_at, updated_at: messages.updated_at,
                attachments: sql<(MessageAttachment[] | null)>`(SELECT json_agg(ma.*) FROM ${message_attachments} ma WHERE ma.message_id = ${messages.id})`
            })
            .from(messages)
            .where(eq(messages.thread_id, threadId))
            .orderBy(desc(messages.created_at))
            .limit(1);

            const typedLastMessage: Message | null = lastMessageResult ? {
                id: lastMessageResult.id, sender_id: lastMessageResult.sender_id, receiver_id: lastMessageResult.receiver_id,
                content: lastMessageResult.content ?? '', is_read: lastMessageResult.is_read,
                created_at: lastMessageResult.created_at.toISOString(), attachments: lastMessageResult.attachments || [],
                updated_at: lastMessageResult.updated_at.toISOString(), thread_id: lastMessageResult.thread_id,
            } : null;

            const [unreadCountResult] = await db.select({ value: countDistinct(messages.id) })
                 .from(messages)
                 .where(and(eq(messages.thread_id, threadId), eq(messages.receiver_id, providerAuthUserId), eq(messages.is_read, false)));
            const unreadCount = unreadCountResult?.value ?? 0;
            
            // For this function, we want all contacts from appointments, so we add them regardless of messages here.
            // The data structure `CommunicationContact` expects thread_id to be potentially null if no messages.
            existingThreadsMap.set(patientUserId, {
                thread_id: threadId, // Use the consistently generated threadId
                last_message: typedLastMessage,
                unread_count: unreadCount
            });
        });
        await Promise.all(threadDetailPromises);
        console.log(`[getCommContactsProvider] Fetched existing thread details count (for all potential contacts):`, existingThreadsMap.size);

        // Step 7: Construct the final contact list
        const communicationContacts: CommunicationContact[] = allPatientContactUserIdsArray.map(patientUserId => {
            const participantDetails = patientDetailsMap.get(patientUserId);
            const threadData = existingThreadsMap.get(patientUserId);
            // Ensure consistent thread_id generation if one wasn't found from existing messages for this contact pair
            const currentThreadId = threadData?.thread_id || [providerAuthUserId, patientUserId].sort().join('__');

            return {
                id: patientUserId, // The ID of the contact (patient)
                participant: participantDetails || null,
                last_message: threadData?.last_message || null,
                unread_count: threadData?.unread_count || 0,
                thread_id: currentThreadId, 
            };
        }).filter(contact => contact.participant !== null); // Ensure we only return contacts with details

        // Step 8: Sort contacts
        communicationContacts.sort((a, b) => {
            const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
            const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
            if (timeB !== timeA) return timeB - timeA;
            const nameA = `${a.participant?.first_name} ${a.participant?.last_name}`.toLowerCase();
            const nameB = `${b.participant?.first_name} ${b.participant?.last_name}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        console.log(`[getCommContactsProvider] Final contacts count:`, communicationContacts.length);
        return { success: true, data: communicationContacts };

    } catch (error: any) {
        console.error('[Server Action Error] getCommunicationContactsForProvider:', error);
        return { success: false, error: error.message || 'Failed to fetch communication contacts for provider.' };
    }
}
// --- END NEW ACTION ---