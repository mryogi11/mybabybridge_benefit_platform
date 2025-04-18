import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    // 1. Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      return NextResponse.json({ error: 'Failed to fetch auth users', details: authError }, { status: 500 });
    }

    // 2. Get all existing users from our custom table
    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('id');
    
    if (existingError) {
      return NextResponse.json({ error: 'Failed to fetch existing users', details: existingError }, { status: 500 });
    }

    // Create a set of existing user IDs for faster lookup
    const existingUserIds = new Set(existingUsers?.map(user => user.id) || []);

    // 3. Find users in auth.users that don't exist in our custom table
    const newUsers = authUsers.users.filter(user => !existingUserIds.has(user.id));

    // 4. Insert new users into our custom table
    if (newUsers.length > 0) {
      const usersToInsert = newUsers.map(user => ({
        id: user.id,
        email: user.email,
        role: 'patient', // Default role
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        created_at: user.created_at,
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('users')
        .insert(usersToInsert);
      
      if (insertError) {
        return NextResponse.json({ error: 'Failed to insert new users', details: insertError }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      message: 'User sync completed successfully',
      total_auth_users: authUsers.users.length,
      new_users_added: newUsers.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to sync users', details: error }, { status: 500 });
  }
} 