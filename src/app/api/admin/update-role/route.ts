import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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
    
    // Create a Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
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
    } catch (err) {
      console.error('Error updating users table:', err);
    }
    
    // If users table update failed, try 'profiles' table
    try {
      const { error: profilesError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('email', email);
      
      if (!profilesError) {
        return NextResponse.json({ 
          success: true, 
          message: `Role updated to '${role}' for ${email} in profiles table` 
        });
      }
    } catch (err) {
      console.error('Error updating profiles table:', err);
    }
    
    // If we couldn't find a table to update
    return NextResponse.json({ 
      success: false, 
      message: 'Could not update role in any table. User may not exist or tables are not accessible.' 
    }, { status: 404 });
    
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 