import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for user creation');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    // Get user data from request
    const userData = await request.json();
    const { email, password, first_name, last_name, role } = userData;

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create user in Supabase auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name,
        last_name
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    // If user is created successfully in auth, handle the public tables
    // Use upsert for the users table to handle potential conflict with the trigger
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: authUser.user.id,
        email,
        first_name,
        last_name,
        role // Ensure the correct role from the form is set/updated
      });

    if (userError) {
      console.error('Error upserting into users table:', userError);
      // Attempt to delete the auth user if we couldn't add/update the users table record
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: `Failed to create or update user profile record: ${userError.message}` },
        { status: 500 }
      );
    }

    // If the role is 'provider', also create a record in the providers table
    if (role === 'provider') {
      const { error: providerError } = await supabase
        .from('providers')
        .insert({ 
            user_id: authUser.user.id,
            // Add default values for any non-nullable columns in providers table if necessary
            // Example: first_name: first_name, last_name: last_name 
          });

      if (providerError) {
        // Log the error, but proceed with user creation success for now.
        // Consider more robust error handling (e.g., deleting the user or returning a specific warning).
        console.warn(`User ${authUser.user.id} created, but failed to create corresponding provider profile record:`, providerError);
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        email,
        first_name,
        last_name,
        role
      }
    });
  } catch (error: any) {
    console.error('Error in create user API:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
} 