'use server';

// Remove auth-helpers import
// import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { createServerClient } from '@supabase/ssr'; // Use ssr
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { User } from '@/types'; // <<< IMPORT User type
import type { Database } from '@/types/supabase'; // Assuming Database type
// Removed Database import temporarily - Please provide correct path later
// import { Database } from '@/lib/supabase/database.types'; 
import { z } from 'zod';
// Remove incorrect auth import
// import { auth } from '@/lib/auth/auth'; 
import { db } from '@/lib/db';
import { users, themeModeEnum } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { ThemeModeSetting } from '@/components/ThemeRegistry/ClientThemeProviders'; // Import the type
import { CookieOptions } from 'next/headers';

// Reuse the NewUserData interface definition or redefine if needed
// It's better to import it if possible to avoid duplication
interface NewUserData {
    first_name: string;
    last_name: string;
    email: string;
    password?: string;
    role: User['role']; // <<< USE User['role']
    specialization?: string;
    bio?: string;
    experience_years?: number;
}

export async function createUserAction(userData: NewUserData): Promise<{ success: boolean; error?: string }> {
    // Removed unused server action client based on ssr
    // const cookieStore = cookies();
    // const supabase = createServerClient<Database>(
    //     process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    //     { /* cookies config */ }
    // );

    // Admin client using Service Role remains the same
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error('[Server Action] Error: Supabase URL or Service Role Key is not configured in environment variables.');
        return { success: false, error: "Server configuration error." };
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl!, serviceKey!, {
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
            // Check for specific Supabase error code or message
            const isExistingUserError = authError.message.includes('User already exists') || (authError as any).code === 'email_exists';

            if (isExistingUserError) {
                console.warn("[Server Action] Auth user already exists for email:", userData.email, ". Retrieving existing ID.");
                // Attempt to find the user in auth.users via admin API to get the ID
                // Fetch users (potentially paginated - consider adding pagination if user base is large)
                const { data: { users: allUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers(); 

                if (listError) {
                    console.error("[Server Action] Supabase admin listUsers Error:", listError);
                    throw new Error(listError.message || "Failed to list users.");
                }

                // Filter the results manually to find the user in auth.users
                const existingAuthUser = allUsers.find(u => u.email === userData.email);

                if (!existingAuthUser) {
                    console.error(`[Server Action] Existing user with email ${userData.email} not found in auth.users.`);
                    throw new Error(`User with email ${userData.email} not found in authentication users.`);
                }
                
                newUserId = existingAuthUser.id;
                console.log("[Server Action] Found existing auth user ID:", newUserId);

                // Now, check if this user ID exists in public.users
                const { data: existingPublicUserData, error: publicUserError } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('id', newUserId)
                    .maybeSingle();
                
                if (publicUserError) {
                     console.error("[Server Action] Error checking public.users for existing user:", publicUserError);
                     throw new Error(`Failed to check public.users table. ${publicUserError.message}`);
                }

                // If user doesn't exist in public.users yet, proceed with upsert (warn is helpful)
                if (!existingPublicUserData) {
                     console.warn("[Server Action] Existing auth user found, but no corresponding row in public.users. Proceeding with upsert.");
                }
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
        // Ensure only columns that exist in the 'users' table are included
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
            const providerPayload = { // Construct payload explicitly
                 user_id: newUserId, 
                 first_name: userData.first_name,
                 last_name: userData.last_name,
                 specialization: userData.specialization,
                 bio: userData.bio,
                 experience_years: userData.experience_years,
             };
             console.log("[Server Action] Payload for providers upsert:", providerPayload); // <<< ADDED LOG
             const { error: providerTableError } = await supabaseAdmin // Use admin client
                .from('providers')
                .upsert(providerPayload, { onConflict: 'user_id' }); // Specify the conflict column

            if (providerTableError) {
                console.error("[Server Action] Supabase providers table upsert Error:", providerTableError);
                throw new Error(providerTableError.message || "Failed to upsert provider details.");
            }
            console.log("[Server Action] Provider details upserted successfully for user:", newUserId);
        }
        // Step 3b: If the role is 'patient', upsert into the 'patient_profiles' table
        else if (userData.role === 'patient') {
            console.log("[Server Action] User role is patient, attempting to upsert into patient_profiles table...");
            const { error: patientProfileTableError } = await supabaseAdmin
                .from('patient_profiles')
                .upsert({
                    user_id: newUserId,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    email: userData.email // Include email if it's part of patient_profiles schema
                    // Add other relevant patient fields if available in userData and schema
                }, { onConflict: 'user_id'}); // Ensure conflict column is correct
            
            if (patientProfileTableError) {
                console.error("[Server Action] Supabase patient_profiles table upsert Error:", patientProfileTableError);
                throw new Error(patientProfileTableError.message || "Failed to upsert patient details.");
            }
            console.log("[Server Action] Patient profile details upserted successfully for user:", newUserId);
        }

        console.log("[Server Action] User creation/update process completed successfully for:", newUserId);
        return { success: true };

    } catch (error: any) {
        console.error("[Server Action] Error during user creation/update:", error);
        return { success: false, error: error.message || "An unexpected server error occurred." };
    }
}

// Helper to get authenticated user (similar to one in benefitActions)
async function getAuthenticatedUser() {
    const cookieStore = await cookies();
    const supabaseAuthClient = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set(name: string, value: string, options: CookieOptions) { try { cookieStore.set({ name, value, ...options }); } catch (e) { /* ignore */ } },
                remove(name: string, options: CookieOptions) { try { cookieStore.set({ name, value: '', ...options }); } catch (e) { /* ignore */ } },
            },
        }
    );
    const { data: { user }, error } = await supabaseAuthClient.auth.getUser();
    if (error || !user) {
        throw new Error("User is not authenticated.");
    }
    return user;
}

const ThemePreferenceSchema = z.enum(themeModeEnum.enumValues);

export async function updateUserThemePreference(theme: string): Promise<{
    success: boolean;
    message: string;
    newTheme?: typeof themeModeEnum.enumValues[number];
}> {
    try {
        const authUser = await getAuthenticatedUser();
        const validatedTheme = ThemePreferenceSchema.parse(theme);

        await db.update(users)
            .set({ theme_preference: validatedTheme, updated_at: new Date() })
            .where(eq(users.id, authUser.id));

        console.log(`User ${authUser.id} updated theme preference to ${validatedTheme}`);
        return { success: true, message: 'Theme preference updated successfully.', newTheme: validatedTheme };
    } catch (error: any) {
        console.error('Error updating theme preference:', error);
        let errorMessage = 'Failed to update theme preference.';
        if (error instanceof z.ZodError) {
            errorMessage = 'Invalid theme value provided.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        return { success: false, message: errorMessage };
    }
} 