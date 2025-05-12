'use server';

import { db } from '@/lib/db'; // Assuming your Drizzle db instance is exported from here
import { activityLogs } from '@/lib/db/schema/activityLog';
import { users } from '@/lib/db/schema'; // For fetching user email if only id is provided
import { eq } from 'drizzle-orm';

export interface LogEntryParams {
  userId?: string | null; // Changed to optional, as some actions might be system-initiated or unauthenticated
  userEmail?: string | null; // Allow providing email directly
  actionType: string; // E.g., 'USER_LOGIN', 'SETTINGS_UPDATE'
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  details?: Record<string, any> | null; // For additional context, e.g., old/new values
  status?: 'SUCCESS' | 'FAILURE' | 'ATTEMPT' | 'INFO' | null;
  ipAddress?: string | null;
  description?: string | null;
}

export async function createActivityLog(params: LogEntryParams): Promise<void> {
  try {
    let emailToLog = params.userEmail;

    // If userId is provided but userEmail is not, try to fetch it
    if (params.userId && !params.userEmail) {
      try {
        const userResult = await db
          .select({
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, params.userId))
          .limit(1);
        if (userResult.length > 0) {
          emailToLog = userResult[0].email;
        }
      } catch (fetchError) {
        console.error('[LoggingService] Failed to fetch user email for log:', fetchError);
        // Continue without email if fetch fails
      }
    }

    await db.insert(activityLogs).values({
      user_id: params.userId,
      user_email: emailToLog,
      action_type: params.actionType,
      target_entity_type: params.targetEntityType,
      target_entity_id: params.targetEntityId,
      details: params.details,
      status: params.status,
      ip_address: params.ipAddress,
      description: params.description,
      // timestamp is handled by defaultNow() in the schema
    });

  } catch (error) {
    console.error('[LoggingService] Failed to create activity log:', error);
    // Depending on severity, you might want to re-throw or handle differently
    // For now, just logging the error to avoid breaking the calling operation
  }
} 