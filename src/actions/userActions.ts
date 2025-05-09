'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr'; // Corrected CookieOptions import
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { User } from '@/types';
import type { Database } from '@/types/supabase';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users, themeModeEnum } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { ThemeModeSetting } from '@/components/ThemeRegistry/ClientThemeProviders'; // Import the type

// Interface for NewUserData
interface NewUserData {
    first_name: string;
    last_name: string;
    email: string;
    password?: string;
    role: User['role'];
    specialization?: string;
    bio?: string;
    experience_years?: number;
}

export async function createUserAction(userData: NewUserData): Promise<{ success: boolean; error?: string }> {
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
        let newUserId: string | null = null;

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
            const isExistingUserError = authError.message.includes('User already exists') || (authError as any).code === 'email_exists';
            if (isExistingUserError) {
                console.warn("[Server Action] Auth user already exists for email:", userData.email, ". Retrieving existing ID.");
                const { data: { users: allUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                if (listError) {
                    console.error("[Server Action] Supabase admin listUsers Error:", listError);
                    throw new Error(listError.message || "Failed to list users.");
                }
                const existingAuthUser = allUsers.find(u => u.email === userData.email);
                if (!existingAuthUser) {
                    console.error(`[Server Action] Existing user with email ${userData.email} not found in auth.users.`);
                    throw new Error(`User with email ${userData.email} not found in authentication users.`);
                }
                newUserId = existingAuthUser.id;
                console.log("[Server Action] Found existing auth user ID:", newUserId);

                const { data: existingPublicUserData, error: publicUserError } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('id', newUserId)
                    .maybeSingle();
                if (publicUserError) {
                    console.error("[Server Action] Error checking public.users for existing user:", publicUserError);
                    throw new Error(`Failed to check public.users table. ${publicUserError.message}`);
                }
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
            newUserId = authData.user.id;
            console.log("[Server Action] Auth user created successfully:", newUserId);
        }

        if (!newUserId) {
            console.error("[Server Action] Could not obtain user ID (new or existing).");
            throw new Error("Failed to get user ID for Auth user.");
        }

        console.log("[Server Action] Using User ID for upsert:", newUserId);
        const { error: usersTableError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: newUserId,
                email: userData.email,
                role: userData.role,
                first_name: userData.first_name,
                last_name: userData.last_name,
            }, { onConflict: 'id' });

        if (usersTableError) {
            console.error("[Server Action] Supabase users table upsert Error:", usersTableError);
            throw new Error(usersTableError.message || "Failed to upsert user into public users table.");
        }
        console.log("[Server Action] User upserted into public.users successfully.");

        if (userData.role === 'provider') {
            console.log("[Server Action] User role is provider, attempting to upsert into providers table...");
            const providerPayload = {
                user_id: newUserId,
                first_name: userData.first_name,
                last_name: userData.last_name,
                specialization: userData.specialization,
                bio: userData.bio,
                experience_years: userData.experience_years,
            };
            console.log("[Server Action] Payload for providers upsert:", providerPayload);
            const { error: providerTableError } = await supabaseAdmin
                .from('providers')
                .upsert(providerPayload, { onConflict: 'user_id' });
            if (providerTableError) {
                console.error("[Server Action] Supabase providers table upsert Error:", providerTableError);
                throw new Error(providerTableError.message || "Failed to upsert provider details.");
            }
            console.log("[Server Action] Provider details upserted successfully for user:", newUserId);
        } else if (userData.role === 'patient') {
            console.log("[Server Action] User role is patient, attempting to upsert into patient_profiles table...");
            const { error: patientProfileTableError } = await supabaseAdmin
                .from('patient_profiles')
                .upsert({
                    user_id: newUserId,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    email: userData.email
                }, { onConflict: 'user_id' });
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

// Helper to get authenticated user
async function getAuthenticatedUser() {
    const cookieStore = await cookies();
    const supabaseAuthClient = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set(name: string, value: string, options: CookieOptions) { 
                    try { 
                        cookieStore.set(name, value, options); 
                    } catch (e) { 
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    } 
                },
                remove(name: string, options: CookieOptions) { 
                    try { 
                        cookieStore.delete(name, options); 
                    } catch (e) { 
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    } 
                },
            },
        }
    );
    const { data: { user }, error } = await supabaseAuthClient.auth.getUser();
    if (error || !user) {
        console.error("[User Action - getAuthenticatedUser] Error or no user:", error);
        throw new Error("User is not authenticated or session is invalid.");
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

        revalidatePath('/admin/settings');
        revalidatePath('/profile');
        revalidatePath('/'); // Revalidate root layout as well for theme changes

        console.log(`[User Action] User ${authUser.id} theme preference updated to ${validatedTheme}`);
        return { success: true, message: "Theme preference updated successfully.", newTheme: validatedTheme };
    } catch (error) {
        console.error("[User Action] Error updating theme preference:", error);
        if (error instanceof z.ZodError) {
            return { success: false, message: `Invalid theme value: ${error.errors.map(e => e.message).join(', ')}` };
        }
        return { success: false, message: (error as Error).message || "Failed to update theme preference." };
    }
}

// Schema for admin profile updates
const AdminProfileUpdateSchema = z.object({
    first_name: z.string().min(1, "First name cannot be empty."),
    last_name: z.string().min(1, "Last name cannot be empty."),
    // email: z.string().email("Invalid email address.").optional(), // Email updates need careful consideration
});

export type AdminProfileUpdateData = z.infer<typeof AdminProfileUpdateSchema>;

export async function updateAdminProfile(
    data: AdminProfileUpdateData
): Promise<{ success: boolean; error?: string; data?: AdminProfileUpdateData }> {
    try {
        const authUser = await getAuthenticatedUser();

        // Double-check role from DB for critical operations if user_metadata isn't fully trusted
        const userRecord = await db.query.users.findFirst({ where: eq(users.id, authUser.id) });
        if (userRecord?.role !== 'admin') {
            console.warn(`[User Action] Unauthorized attempt to update admin profile by user ${authUser.id}. DB role: ${userRecord?.role}`);
            return { success: false, error: "Unauthorized: Insufficient privileges." };
        }

        const validatedData = AdminProfileUpdateSchema.parse(data);
        console.log(`[User Action] Attempting to update admin profile for user ${authUser.id} with data:`, validatedData);

        const updatePayload: Partial<typeof users.$inferInsert> = {
            first_name: validatedData.first_name,
            last_name: validatedData.last_name,
            updated_at: new Date(),
        };

        await db.update(users)
            .set(updatePayload)
            .where(eq(users.id, authUser.id));

        console.log(`[User Action] Admin profile for user ${authUser.id} updated successfully.`);

        revalidatePath('/admin/settings');
        // Revalidate other paths where admin's first/last name might be displayed
        revalidatePath('/admin'); 

        return { success: true, data: validatedData };

    } catch (error: any) {
        console.error(`[User Action] Error updating admin profile for user ${authUser.id}:`, error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors.map(e => e.message).join(', ') };
        }
        return { success: false, error: error.message || "An unexpected error occurred while updating the profile." };
    }
}

// Schema for password update
const PasswordUpdateSchema = z.object({
    // currentPassword: z.string().min(1, "Current password is required."), // Not strictly needed for supabase.auth.updateUser by the logged-in user
    newPassword: z.string().min(8, "New password must be at least 8 characters long."),
});

export async function updateUserPassword(
    data: z.infer<typeof PasswordUpdateSchema>
): Promise<{ success: boolean; error?: string }> {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; },
                    set(name: string, value: string, options: CookieOptions) { 
                        try { cookieStore.set(name, value, options); } catch (e) { /* ignore */ } 
                    },
                    remove(name: string, options: CookieOptions) { 
                        try { cookieStore.delete(name, options); } catch (e) { /* ignore */ } 
                    },
                },
            }
        );

        const { data: { user } , error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('[User Action - updateUserPassword] User not authenticated:', userError);
            return { success: false, error: "User not authenticated. Please log in again." };
        }

        const validatedData = PasswordUpdateSchema.parse(data);
        console.log(`[User Action] Attempting to update password for user ${user.id}`);

        const { error: updateError } = await supabase.auth.updateUser({
            password: validatedData.newPassword,
        });

        if (updateError) {
            console.error(`[User Action] Supabase error updating password for user ${user.id}:`, updateError);
            // Provide more specific error messages if possible
            let errorMessage = updateError.message;
            if (updateError.message.includes("New password should be different from the old password.")) {
                errorMessage = "New password must be different from your current password.";
            }
            // Add other common Supabase auth error message checks here if needed
            return { success: false, error: errorMessage || "Failed to update password." };
        }

        console.log(`[User Action] Password updated successfully for user ${user.id}`);
        return { success: true };

    } catch (error: any) {
        console.error(`[User Action] Error updating password:`, error);
        if (error instanceof z.ZodError) {
            return { success: false, error: error.errors.map(e => e.message).join(', ') };
        }
        return { success: false, error: error.message || "An unexpected error occurred while updating password." };
    }
}