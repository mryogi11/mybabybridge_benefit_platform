// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

// Set up a secure key to prevent unauthorized access
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'test-secret-key-123';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, role, secretKey } = body;
    
    // Validate request
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }
    
    // Validate secret key
    if (secretKey !== API_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    cookieStore.set({ name, value: '', ...options });
                },
            },
        }
    );
    
    // Try to update role in 'users' table
    try {
      const { error: usersError } = await supabase
        .from('users')
        .update({ role })
        .eq('email', email);
      
      if (!usersError) {
        return NextResponse.json({ 
          success: true, 
          message: `Role updated to '${role}' for ${email} in users table` 
        });
      }
      console.warn(`[API update-role] Error updating users table (may not exist or RLS): ${usersError.message}`);
    } catch (err) {
      console.error('Error during users table update:', err);
    }
    
    // Try 'patient_profiles' or 'provider_profiles' table based on role?
    // This logic seems flawed, updating profiles table directly with role is unusual.
    // Commenting out the profiles part for now as it likely needs rethink.
    /*
    try {
      // Determine target profile table based on role?
      const profileTable = role === 'patient' ? 'patient_profiles' : (role === 'provider' ? 'providers' : null);
      if (!profileTable) { 
          throw new Error('Cannot update profile for role: ' + role);
      }
      const { error: profilesError } = await supabase
        .from(profileTable)
        // .update({ role }) // Profile tables usually don't have a 'role' column
        // Instead, you'd likely update the 'users' table role and maybe link profile
        .select('user_id') // Just check if profile exists for email? Very indirect.
        .eq('email', email); // Assuming email exists on profile tables?
      
      if (!profilesError) {
        return NextResponse.json({ 
          success: true, 
          message: `Role updated to '${role}' for ${email} in users table (profile check attempted)` 
        });
      }
    } catch (err) {
      console.error('Error updating profiles table:', err);
    }
    */
    
    // If users table update failed
    return NextResponse.json({ 
      success: false, 
      message: 'Could not update role in users table. User may not exist or table is not accessible.' 
    }, { status: 404 });
    
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 