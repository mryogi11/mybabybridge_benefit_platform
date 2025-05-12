import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createActivityLog } from '@/lib/actions/loggingActions';

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
      await createActivityLog({
        actionType: 'USER_CREATE_VALIDATION_FAILURE',
        status: 'FAILURE',
        description: 'User creation request missing required fields.',
        details: { email, first_name, last_name, role }
      });
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
      await createActivityLog({
        actionType: 'USER_CREATE_AUTH_FAILURE',
        status: 'FAILURE',
        description: `Failed to create user in Supabase Auth. Error: ${authError.message}`,
        details: { email, first_name, last_name, role, error: authError.message }
      });
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
      await createActivityLog({
        actionType: 'USER_CREATE_DB_FAILURE',
        status: 'FAILURE',
        description: `Failed to upsert user in DB. Error: ${userError.message}`,
        details: { email, first_name, last_name, role, error: userError.message }
      });
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
        await createActivityLog({
          actionType: 'PROVIDER_PROFILE_CREATE_FAILURE',
          status: 'FAILURE',
          description: `User ${authUser.user.id} created, but failed to create provider profile. Error: ${providerError.message}`,
          details: { userId: authUser.user.id, error: providerError.message }
        });
      }
    }

    // Return success response
    await createActivityLog({
      userId: authUser.user.id,
      userEmail: email,
      actionType: 'USER_CREATE',
      status: 'SUCCESS',
      description: `User ${authUser.user.id} created successfully via admin API.`,
      details: { email, first_name, last_name, role }
    });
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
    await createActivityLog({
      actionType: 'USER_CREATE_FAILURE',
      status: 'FAILURE',
      description: `Error in create user API. Error: ${error.message}`,
      details: { error: error.message }
    });
    console.error('Error in create user API:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
} 