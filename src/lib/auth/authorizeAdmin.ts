import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { db } from '@/lib/db';
import { users, userRoleEnum } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Database } from '@/types/supabase';
import type { User } from '@supabase/supabase-js'; // Import User type

/**
 * Authorizes if the current user is an admin.
 * Throws errors for authentication/authorization failures.
 * Returns the Supabase user object on success.
 */
export async function authorizeAdmin(request: NextRequest): Promise<{ authorized: boolean; user: User | null; error?: string }> {
    console.log('[authorizeAdmin] Starting authorization...');
    let supabase;
    try {
        supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value;
                    },
                    // Set/remove not needed for auth check in this context
                    set(name: string, value: string, options: any) {},
                    remove(name: string, options: any) {},
                },
            }
        );
        console.log('[authorizeAdmin] Supabase client created.');
    } catch (err) {
        console.error('[authorizeAdmin] CRITICAL: Failed to create Supabase client:', err);
        return { authorized: false, user: null, error: 'Failed to initialize auth client.' };
    }

    console.log('[authorizeAdmin] Attempting to get user from Supabase...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
        console.error('[authorizeAdmin] Supabase getUser error:', userError);
        return { authorized: false, user: null, error: "Authentication error checking user." };
    }
    if (!user) {
        console.warn('[authorizeAdmin] No authenticated user found.');
        return { authorized: false, user: null, error: "User is not authenticated." };
    }
    console.log(`[authorizeAdmin] User found: ${user.id}`);

    console.log(`[authorizeAdmin] Checking user role in DB for user: ${user.id}`);
    let userRecord;
    try {
        userRecord = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1);
        console.log(`[authorizeAdmin] DB check completed. Records found: ${userRecord.length}`);
    } catch (dbError) {
        console.error(`[authorizeAdmin] CRITICAL: Database error checking user role for ${user.id}:`, dbError);
        return { authorized: false, user: user, error: "Database error during authorization." }; // Return user even if DB fails?
    }

    if (!userRecord.length || userRecord[0].role !== userRoleEnum.enumValues[0]) { // 'admin'
        console.warn(`[authorizeAdmin] User ${user.id} is not an admin. Role found: ${userRecord[0]?.role}`);
        return { authorized: false, user: user, error: "User is not authorized." };
    }

    console.log(`[authorizeAdmin] SUCCESS: User ${user.id} authorized as admin.`);
    return { authorized: true, user: user };
} 