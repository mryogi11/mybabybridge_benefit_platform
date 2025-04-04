'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { UserRole } from '@/types';
// Removed Database import temporarily - Please provide correct path later
// import { Database } from '@/lib/supabase/database.types'; 

// Reuse the NewUserData interface definition or redefine if needed
// It's better to import it if possible to avoid duplication
interface NewUserData {
    first_name: string;
    last_name: string;
    email: string;
    password?: string;
    role: UserRole;
    specialization?: string;
    bio?: string;
    experience_years?: number;
}

export async function createUserAction(userData: NewUserData): Promise<{ success: boolean; error?: string }> {
    // Client for database operations (can use RLS if needed, though service role bypasses it)
    // Removed <Database> type temporarily
    const supabase = createServerActionClient({ cookies });

    // Direct Admin Client using Service Role Key from environment variables
    // Ensure these are set in your .env.local or server environment!
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error('[Server Action] Error: Supabase URL or Service Role Key is not configured in environment variables.');
        return { success: false, error: "Server configuration error." };
    }

    // Removed <Database> type temporarily
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { 
            autoRefreshToken: false, 
            persistSession: false 
        }
    });

    console.log("[Server Action] Attempting to create user:", userData.email, "Role:", userData.role);

    if (!userData.password) {
        console.error("[Server Action] Error: Password is required.");
        return { success: false, error: "Password is required." };
    }

    try {
        let newUserId: string | null = null; // Declare userId variable

        // Step 1: Attempt to create the user in Supabase Auth
        console.log("[Server Action] Using Supabase Admin client for auth.admin.createUser...");
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true, 
            user_metadata: {
                role: userData.role,
                first_name: userData.first_name,
                last_name: userData.last_name,
            },
        });

        if (authError) {
            if (authError.message.includes('User already exists')) {
                console.warn("[Server Action] Auth user already exists for email:", userData.email, ". Retrieving existing ID.");
                const { data: existingUserData, error: getUserError } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('email', userData.email)
                    .single();

                if (getUserError || !existingUserData) {
                    console.error("[Server Action] Auth user exists, but failed to retrieve ID from public table:", getUserError);
                    throw new Error(`Auth user exists, but couldn't retrieve ID. ${getUserError?.message || ''}`);
                }
                newUserId = existingUserData.id; // Assign existing ID
                console.log("[Server Action] Found existing user ID:", newUserId);
            } else {
                console.error("[Server Action] Supabase Auth Error:", authError);
                if (authError.message === 'User not allowed') {
                    console.error("[Server Action] CRITICAL: 'User not allowed' error even with explicit Service Role Client. Check Service Key validity?!");
                }
                throw new Error(authError.message || "Failed to create user in Auth.");
            }
        } else if (authData?.user) {
            newUserId = authData.user.id; // Assign new ID
            console.log("[Server Action] Auth user created successfully:", newUserId);
        }

        // Ensure we have a user ID before proceeding
        if (!newUserId) {
            console.error("[Server Action] Could not obtain user ID (new or existing).");
            throw new Error("Failed to get user ID for Auth user.");
        }

        console.log("[Server Action] Using User ID for upsert:", newUserId);

        // Step 2: Upsert into the public 'users' table using the Admin Client
        const { error: usersTableError } = await supabaseAdmin // Use admin client
            .from('users')
            .upsert({
                id: newUserId, // Use the obtained ID
                email: userData.email,
                role: userData.role,
                first_name: userData.first_name,
                last_name: userData.last_name,
            }, { onConflict: 'id' }); // Specify the conflict column

        if (usersTableError) {
            console.error("[Server Action] Supabase users table upsert Error:", usersTableError);
            throw new Error(usersTableError.message || "Failed to upsert user into public users table.");
        }

        console.log("[Server Action] User upserted into public.users successfully.");

        // Step 3: If the role is 'provider', upsert into the 'providers' table using the Admin Client
        if (userData.role === 'provider') {
            console.log("[Server Action] User role is provider, attempting to upsert into providers table...");
            const { error: providerTableError } = await supabaseAdmin // Use admin client
                .from('providers')
                .upsert({
                    user_id: newUserId, // Match on this column (assuming it's unique or PK)
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    specialization: userData.specialization,
                    bio: userData.bio,
                    experience_years: userData.experience_years,
                }, { onConflict: 'user_id' }); // Specify the conflict column

            if (providerTableError) {
                console.error("[Server Action] Supabase providers table upsert Error:", providerTableError);
                throw new Error(providerTableError.message || "Failed to upsert provider details.");
            }
            console.log("[Server Action] Provider details upserted successfully for user:", newUserId);
        }

        console.log("[Server Action] User creation/update process completed successfully for:", newUserId);
        return { success: true };

    } catch (error: any) {
        console.error("[Server Action] Error during user creation/update:", error);
        return { success: false, error: error.message || "An unexpected server error occurred." };
    }
} 